// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title IComplianceRegistry
 * @notice Minimal interface the token contracts call before allowing a
 *         transfer. A contract that implements `canTransfer` may apply any
 *         policy it likes — KYC whitelist, jurisdiction rules, accredited
 *         status, etc. Returning false aborts the transfer.
 */
interface IComplianceRegistry {
    function canTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 amount
    ) external view returns (bool);
}

/**
 * @title ComplianceRegistry
 * @notice On-chain mirror of the off-chain KYC/sanctions status, with optional
 *         per-property jurisdiction rules. Backend services controlled by the
 *         COMPLIANCE_OPERATOR role flip addresses on/off as their KYC state
 *         changes.
 *
 * Policy:
 *  - The sender (`from`) must NOT be on a blocked list (sanctions hit).
 *  - The recipient (`to`) MUST be KYC-approved.
 *  - If `propertyRestricted[tokenId]` is true, the recipient's jurisdiction
 *    must be allowed for that property.
 *  - Mints and burns (`from == address(0)` or `to == address(0)`) skip the
 *    recipient/sender check respectively but still require the live party
 *    to satisfy policy.
 */
contract ComplianceRegistry is AccessControl, IComplianceRegistry {

    bytes32 public constant COMPLIANCE_OPERATOR = keccak256("COMPLIANCE_OPERATOR");

    // KYC approval status per address.
    mapping(address => bool) public isKycApproved;
    // Sanctions/PEP/adverse-media block per address.
    mapping(address => bool) public isBlocked;
    // Stored jurisdiction code (e.g., "US", "AE"). Empty when not set.
    mapping(address => bytes32) public investorJurisdiction;

    // Per-token jurisdiction policy. When `propertyRestricted[tokenId]` is
    // true, `propertyAllowedJurisdiction[tokenId][jurisdiction]` must be
    // true for that recipient.
    mapping(uint256 => bool) public propertyRestricted;
    mapping(uint256 => mapping(bytes32 => bool)) public propertyAllowedJurisdiction;

    event AddressApproved(address indexed addr, bytes32 jurisdiction);
    event AddressRevoked(address indexed addr);
    event AddressBlocked(address indexed addr, string reason);
    event AddressUnblocked(address indexed addr);
    event PropertyJurisdictionRulesSet(uint256 indexed tokenId, bool restricted);
    event PropertyJurisdictionAllowed(uint256 indexed tokenId, bytes32 indexed jurisdiction, bool allowed);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COMPLIANCE_OPERATOR, admin);
    }

    // -------------------------------------------------------------
    // KYC management
    // -------------------------------------------------------------
    function approve(address addr, bytes32 jurisdiction) external onlyRole(COMPLIANCE_OPERATOR) {
        require(addr != address(0), "Zero address");
        require(!isBlocked[addr], "Address is blocked");
        isKycApproved[addr] = true;
        investorJurisdiction[addr] = jurisdiction;
        emit AddressApproved(addr, jurisdiction);
    }

    function revoke(address addr) external onlyRole(COMPLIANCE_OPERATOR) {
        isKycApproved[addr] = false;
        emit AddressRevoked(addr);
    }

    function block_(address addr, string calldata reason) external onlyRole(COMPLIANCE_OPERATOR) {
        require(addr != address(0), "Zero address");
        isBlocked[addr] = true;
        isKycApproved[addr] = false;
        emit AddressBlocked(addr, reason);
    }

    function unblock(address addr) external onlyRole(COMPLIANCE_OPERATOR) {
        isBlocked[addr] = false;
        emit AddressUnblocked(addr);
    }

    // -------------------------------------------------------------
    // Per-property jurisdiction policy
    // -------------------------------------------------------------
    function setPropertyRestricted(uint256 tokenId, bool restricted)
        external
        onlyRole(COMPLIANCE_OPERATOR)
    {
        propertyRestricted[tokenId] = restricted;
        emit PropertyJurisdictionRulesSet(tokenId, restricted);
    }

    function setPropertyAllowedJurisdiction(
        uint256 tokenId,
        bytes32 jurisdiction,
        bool allowed
    ) external onlyRole(COMPLIANCE_OPERATOR) {
        propertyAllowedJurisdiction[tokenId][jurisdiction] = allowed;
        emit PropertyJurisdictionAllowed(tokenId, jurisdiction, allowed);
    }

    // -------------------------------------------------------------
    // Policy evaluation — called by token contracts
    // -------------------------------------------------------------
    function canTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 amount
    ) external view override returns (bool) {
        amount; // unused — included for future per-amount throttles

        // Burns (to == zero) only require the sender not to be sanctioned.
        if (to == address(0)) {
            return !isBlocked[from];
        }

        // Recipient must be KYC-approved and not blocked.
        if (!isKycApproved[to] || isBlocked[to]) {
            return false;
        }

        // For mints (from == zero), the recipient check above is enough.
        // For real transfers, the sender must also not be sanctioned.
        if (from != address(0) && isBlocked[from]) {
            return false;
        }

        // Jurisdiction policy for restricted properties.
        if (propertyRestricted[tokenId]) {
            bytes32 jur = investorJurisdiction[to];
            if (jur == bytes32(0)) return false;
            if (!propertyAllowedJurisdiction[tokenId][jur]) return false;
        }

        return true;
    }
}
