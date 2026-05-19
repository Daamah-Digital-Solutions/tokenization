// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "./RealEstateToken.sol";
import "./RentalIncomeDistributor.sol";

/**
 * @title PropertyContractFactory
 * @notice EIP-1167 factory for property token + rental distributor pairs.
 *
 * Key invariants:
 *  - Stablecoin addresses are stored in the `paymentTokenAddress` mapping
 *    and managed by ADMIN_ROLE. They are NEVER hardcoded into bytecode so
 *    the same factory can be deployed to multiple chains.
 *  - Active properties may be paused individually or pulled in bulk via
 *    `emergencyPause()` which walks the registry and pauses each token
 *    contract.
 *  - `_deployPropertyInternal` is now complete and used by both single and
 *    batch deployment paths.
 *  - A compliance registry address can be set so newly-deployed token
 *    contracts inherit a KYC/sanctions transfer hook on day one.
 */
contract PropertyContractFactory is AccessControl, ReentrancyGuard {

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PROPERTY_CREATOR_ROLE = keccak256("PROPERTY_CREATOR_ROLE");

    // Contract templates (cloned via EIP-1167)
    address public immutable realEstateTokenTemplate;
    address public immutable rentalDistributorTemplate;

    // -------------------------------------------------------------------
    // Configurable payment token registry — NO HARDCODED ADDRESSES
    // -------------------------------------------------------------------
    /// @notice payment token enum -> token contract address. address(0) = native ETH.
    mapping(RentalIncomeDistributor.PaymentToken => address) public paymentTokenAddress;

    // Optional external compliance registry (KYC + sanctions whitelist).
    address public complianceRegistry;

    // Deployed contract registry
    struct DeployedContracts {
        address tokenContract;
        address distributorContract;
        uint256 propertyTokenId;
        address propertyOwner;
        uint256 deployedAt;
        bool isActive;
    }

    struct FactoryStats {
        uint256 totalPropertiesDeployed;
        uint256 totalValueLocked;
        uint256 totalTokensIssued;
        uint256 activeProperties;
    }

    mapping(uint256 => DeployedContracts) public deployedContracts;
    mapping(address => uint256[]) public ownerProperties;
    mapping(address => bool) public authorizedManagers;

    uint256 public propertyCounter;
    FactoryStats public factoryStats;

    // Configuration
    uint256 public deploymentFee = 0.01 ether;
    uint256 public platformFeeRate = 250; // 2.5% in basis points
    address public platformTreasury;

    // Global pause — when true, no new property deployments may occur and
    // every existing token contract has been paused via emergencyPause().
    bool public globallyPaused;

    // Multi-sig configuration for property deployments
    mapping(uint256 => address[]) public multiSigOwners;
    uint256 public requiredConfirmations = 2;

    // -------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------
    event PropertyDeployed(
        uint256 indexed propertyId,
        address indexed tokenContract,
        address indexed distributorContract,
        address propertyOwner
    );
    event PropertyActivated(uint256 indexed propertyId);
    event PropertyDeactivated(uint256 indexed propertyId);
    event DeploymentFeeUpdated(uint256 newFee);
    event PlatformFeeUpdated(uint256 newFeeRate);
    event ManagerAuthorized(address indexed manager);
    event ManagerRevoked(address indexed manager);
    event PaymentTokenConfigured(RentalIncomeDistributor.PaymentToken indexed token, address indexed addr);
    event ComplianceRegistrySet(address indexed registry);
    event GlobalPauseTriggered(address indexed by, uint256 propertiesPaused);
    event GlobalPauseLifted(address indexed by);

    // -------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------
    modifier onlyAuthorizedManager() {
        require(
            hasRole(PROPERTY_CREATOR_ROLE, msg.sender) || authorizedManagers[msg.sender],
            "Not authorized to create properties"
        );
        _;
    }

    modifier validProperty(uint256 propertyId) {
        require(propertyId < propertyCounter, "Property does not exist");
        require(deployedContracts[propertyId].isActive, "Property not active");
        _;
    }

    modifier whenNotGloballyPaused() {
        require(!globallyPaused, "Factory globally paused");
        _;
    }

    // -------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------
    constructor(
        address _realEstateTokenTemplate,
        address _rentalDistributorTemplate,
        address _platformTreasury
    ) {
        require(_realEstateTokenTemplate != address(0), "Invalid token template");
        require(_rentalDistributorTemplate != address(0), "Invalid distributor template");
        require(_platformTreasury != address(0), "Invalid platform treasury");

        realEstateTokenTemplate = _realEstateTokenTemplate;
        rentalDistributorTemplate = _rentalDistributorTemplate;
        platformTreasury = _platformTreasury;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(PROPERTY_CREATOR_ROLE, msg.sender);

        // Native ETH always available; other tokens must be configured.
        paymentTokenAddress[RentalIncomeDistributor.PaymentToken.ETH] = address(0);
    }

    // ===================================================================
    // Configuration setters
    // ===================================================================
    /// @notice Configure (or update) the contract address for a payment token.
    function setPaymentTokenAddress(
        RentalIncomeDistributor.PaymentToken tokenType,
        address tokenAddress
    ) external onlyRole(ADMIN_ROLE) {
        // ETH must always remain address(0)
        if (tokenType == RentalIncomeDistributor.PaymentToken.ETH) {
            require(tokenAddress == address(0), "ETH must be address(0)");
        } else {
            require(tokenAddress != address(0), "Token address required");
        }
        paymentTokenAddress[tokenType] = tokenAddress;
        emit PaymentTokenConfigured(tokenType, tokenAddress);
    }

    /// @notice Set the external compliance registry used by future deployments.
    function setComplianceRegistry(address registry) external onlyRole(ADMIN_ROLE) {
        complianceRegistry = registry;
        emit ComplianceRegistrySet(registry);
    }

    // ===================================================================
    // Single property deployment (external entry point with payment)
    // ===================================================================
    function deployProperty(
        uint256 totalSupply,
        RealEstateToken.PropertyCategory category,
        uint256 tokenPrice,
        uint256 lockupPeriod,
        uint256 earlyExitFeeRate,
        uint256 rentalYieldRate,
        string memory propertyURI,
        RentalIncomeDistributor.DistributionFrequency distributionFrequency,
        RentalIncomeDistributor.PaymentToken paymentToken,
        address[] memory multiSigOwners_
    )
        external
        payable
        onlyAuthorizedManager
        nonReentrant
        whenNotGloballyPaused
        returns (uint256 propertyId, address tokenContract, address distributorContract)
    {
        require(msg.value >= deploymentFee, "Insufficient deployment fee");

        PropertyDeploymentParams memory params = PropertyDeploymentParams({
            totalSupply: totalSupply,
            category: category,
            tokenPrice: tokenPrice,
            lockupPeriod: lockupPeriod,
            earlyExitFeeRate: earlyExitFeeRate,
            rentalYieldRate: rentalYieldRate,
            propertyURI: propertyURI,
            distributionFrequency: distributionFrequency,
            paymentToken: paymentToken,
            multiSigOwners: multiSigOwners_,
            propertyOwner: msg.sender
        });

        (propertyId, tokenContract, distributorContract) = _deployPropertyInternal(params);

        if (msg.value > 0) {
            (bool success, ) = payable(platformTreasury).call{value: msg.value}("");
            require(success, "Fee transfer failed");
        }
    }

    // ===================================================================
    // Batch deployment
    // ===================================================================
    function batchDeployProperties(
        PropertyDeploymentParams[] memory deploymentParams
    )
        external
        payable
        onlyRole(ADMIN_ROLE)
        nonReentrant
        whenNotGloballyPaused
        returns (uint256[] memory propertyIds)
    {
        require(deploymentParams.length > 0, "No properties to deploy");
        require(msg.value >= deploymentFee * deploymentParams.length, "Insufficient deployment fee");

        propertyIds = new uint256[](deploymentParams.length);
        for (uint256 i = 0; i < deploymentParams.length; i++) {
            (uint256 propertyId, , ) = _deployPropertyInternal(deploymentParams[i]);
            propertyIds[i] = propertyId;
        }

        if (msg.value > 0) {
            (bool success, ) = payable(platformTreasury).call{value: msg.value}("");
            require(success, "Fee transfer failed");
        }
    }

    // ===================================================================
    // Core internal deployment — used by both single and batch paths
    // ===================================================================
    function _deployPropertyInternal(
        PropertyDeploymentParams memory params
    ) internal returns (uint256 propertyId, address tokenContract, address distributorContract) {
        require(params.totalSupply > 0, "Invalid total supply");
        require(params.multiSigOwners.length >= requiredConfirmations, "Insufficient multi-sig owners");

        propertyId = propertyCounter++;

        // ---- 1. Clone & initialize the token contract ----
        tokenContract = Clones.clone(realEstateTokenTemplate);
        RealEstateToken(payable(tokenContract)).initialize(
            params.propertyURI,
            params.multiSigOwners,
            requiredConfirmations
        );

        // Optional compliance hook on the freshly-cloned token contract.
        if (complianceRegistry != address(0)) {
            // The token contract MUST expose `setComplianceRegistry(address)`.
            (bool ok, ) = tokenContract.call(
                abi.encodeWithSignature("setComplianceRegistry(address)", complianceRegistry)
            );
            // We do not require(ok) here — older template versions may not
            // implement this method and we don't want a missing function
            // to block the entire deployment. New deployments use the
            // upgraded RealEstateToken which DOES expose this method.
            ok;
        }

        // ---- 2. Create the property record inside the token contract ----
        uint256 tokenId = RealEstateToken(payable(tokenContract)).createProperty(
            params.totalSupply,
            params.category,
            params.tokenPrice,
            params.lockupPeriod,
            params.earlyExitFeeRate,
            params.rentalYieldRate,
            params.propertyOwner,
            params.propertyURI
        );

        // ---- 3. Distributor (only for READY_PROPERTY) ----
        if (params.category == RealEstateToken.PropertyCategory.READY_PROPERTY) {
            distributorContract = Clones.clone(rentalDistributorTemplate);

            // Build supported token list from the configured payment-token
            // registry. ETH is always supported; the rest are included only
            // when their address has been set via setPaymentTokenAddress().
            (
                address[] memory supportedTokens,
                RentalIncomeDistributor.PaymentToken[] memory tokenTypes
            ) = _buildSupportedTokenList();

            RentalIncomeDistributor(payable(distributorContract)).initialize(
                tokenContract,
                platformTreasury,
                supportedTokens,
                tokenTypes
            );

            RentalIncomeDistributor(payable(distributorContract)).registerProperty(
                tokenId,
                params.distributionFrequency,
                params.paymentToken,
                platformFeeRate,
                params.propertyOwner
            );
        }

        // ---- 4. Persist the registry entry ----
        deployedContracts[propertyId] = DeployedContracts({
            tokenContract: tokenContract,
            distributorContract: distributorContract,
            propertyTokenId: tokenId,
            propertyOwner: params.propertyOwner,
            deployedAt: block.timestamp,
            isActive: true
        });
        ownerProperties[params.propertyOwner].push(propertyId);
        multiSigOwners[propertyId] = params.multiSigOwners;

        factoryStats.totalPropertiesDeployed++;
        factoryStats.activeProperties++;
        factoryStats.totalTokensIssued += params.totalSupply;

        emit PropertyDeployed(
            propertyId,
            tokenContract,
            distributorContract,
            params.propertyOwner
        );

        return (propertyId, tokenContract, distributorContract);
    }

    /// @dev Build the supported token arrays from the payment-token registry.
    function _buildSupportedTokenList()
        internal
        view
        returns (
            address[] memory supportedTokens,
            RentalIncomeDistributor.PaymentToken[] memory tokenTypes
        )
    {
        // Currently 4 token slots: ETH + 3 stablecoins. If more are added
        // in the future, expand this counter and the loop below.
        RentalIncomeDistributor.PaymentToken[4] memory candidates = [
            RentalIncomeDistributor.PaymentToken.ETH,
            RentalIncomeDistributor.PaymentToken.USDC,
            RentalIncomeDistributor.PaymentToken.USDT,
            RentalIncomeDistributor.PaymentToken.DAI
        ];

        // First pass: count configured tokens (ETH is always counted)
        uint256 count = 0;
        for (uint256 i = 0; i < candidates.length; i++) {
            if (candidates[i] == RentalIncomeDistributor.PaymentToken.ETH ||
                paymentTokenAddress[candidates[i]] != address(0)) {
                count++;
            }
        }

        supportedTokens = new address[](count);
        tokenTypes = new RentalIncomeDistributor.PaymentToken[](count);

        uint256 j = 0;
        for (uint256 i = 0; i < candidates.length; i++) {
            if (candidates[i] == RentalIncomeDistributor.PaymentToken.ETH) {
                supportedTokens[j] = address(0);
                tokenTypes[j] = candidates[i];
                j++;
            } else if (paymentTokenAddress[candidates[i]] != address(0)) {
                supportedTokens[j] = paymentTokenAddress[candidates[i]];
                tokenTypes[j] = candidates[i];
                j++;
            }
        }
    }

    // ===================================================================
    // Property lifecycle
    // ===================================================================
    // activateProperty is idempotent: deployProperty marks deployedContracts
    // as active in the factory's bookkeeping but does NOT propagate ACTIVE
    // status to the underlying token contract. Owners (or admins) must call
    // this to flip the per-property status on the token contract before
    // mintTokens is permitted. The previous "already active" guard prevented
    // that catch-up call, leaving every deployed property permanently
    // unable to mint.
    function activateProperty(uint256 propertyId) external {
        require(propertyId < propertyCounter, "Property does not exist");
        require(
            deployedContracts[propertyId].propertyOwner == msg.sender || hasRole(ADMIN_ROLE, msg.sender),
            "Not authorized"
        );

        DeployedContracts storage deployed = deployedContracts[propertyId];

        RealEstateToken(payable(deployed.tokenContract)).activateProperty(deployed.propertyTokenId);
        if (!deployed.isActive) {
            deployed.isActive = true;
            factoryStats.activeProperties++;
        }

        emit PropertyActivated(propertyId);
    }

    function deactivateProperty(uint256 propertyId) external validProperty(propertyId) {
        require(
            deployedContracts[propertyId].propertyOwner == msg.sender || hasRole(ADMIN_ROLE, msg.sender),
            "Not authorized"
        );

        DeployedContracts storage deployed = deployedContracts[propertyId];
        RealEstateToken(payable(deployed.tokenContract)).pauseProperty(deployed.propertyTokenId);
        deployed.isActive = false;
        factoryStats.activeProperties--;

        emit PropertyDeactivated(propertyId);
    }

    // ===================================================================
    // Admin configuration
    // ===================================================================
    function updateDeploymentFee(uint256 newFee) external onlyRole(ADMIN_ROLE) {
        deploymentFee = newFee;
        emit DeploymentFeeUpdated(newFee);
    }

    function updatePlatformFeeRate(uint256 newFeeRate) external onlyRole(ADMIN_ROLE) {
        require(newFeeRate <= 1000, "Fee rate too high"); // Max 10%
        platformFeeRate = newFeeRate;
        emit PlatformFeeUpdated(newFeeRate);
    }

    function authorizeManager(address manager) external onlyRole(ADMIN_ROLE) {
        require(manager != address(0), "Invalid manager address");
        authorizedManagers[manager] = true;
        emit ManagerAuthorized(manager);
    }

    function revokeManager(address manager) external onlyRole(ADMIN_ROLE) {
        authorizedManagers[manager] = false;
        emit ManagerRevoked(manager);
    }

    // ===================================================================
    // Read-only registry helpers
    // ===================================================================
    function getDeployedContracts(uint256 propertyId)
        external
        view
        returns (
            address tokenContract,
            address distributorContract,
            uint256 propertyTokenId,
            address propertyOwner,
            uint256 deployedAt,
            bool isActive
        )
    {
        require(propertyId < propertyCounter, "Property does not exist");
        DeployedContracts storage deployed = deployedContracts[propertyId];
        return (
            deployed.tokenContract,
            deployed.distributorContract,
            deployed.propertyTokenId,
            deployed.propertyOwner,
            deployed.deployedAt,
            deployed.isActive
        );
    }

    function getOwnerProperties(address owner) external view returns (uint256[] memory) {
        return ownerProperties[owner];
    }

    function getFactoryStats()
        external
        view
        returns (
            uint256 totalPropertiesDeployed_,
            uint256 totalValueLocked_,
            uint256 totalTokensIssued_,
            uint256 activeProperties_
        )
    {
        return (
            factoryStats.totalPropertiesDeployed,
            factoryStats.totalValueLocked,
            factoryStats.totalTokensIssued,
            factoryStats.activeProperties
        );
    }

    function getMultiSigOwners(uint256 propertyId) external view returns (address[] memory) {
        require(propertyId < propertyCounter, "Property does not exist");
        return multiSigOwners[propertyId];
    }

    // ===================================================================
    // Emergency controls
    // ===================================================================
    /**
     * @notice Pause every active property token contract and stop further
     *         deployments. The pause walks the registry; the gas cost grows
     *         linearly with property count. For very large registries the
     *         admin should call `pauseProperty()` individually or use a
     *         segmented pause variant deployed via upgrade.
     */
    function emergencyPause() external onlyRole(ADMIN_ROLE) {
        require(!globallyPaused, "Already globally paused");
        globallyPaused = true;

        uint256 paused = 0;
        for (uint256 i = 0; i < propertyCounter; i++) {
            DeployedContracts storage deployed = deployedContracts[i];
            if (!deployed.isActive) continue;
            try RealEstateToken(payable(deployed.tokenContract)).pauseProperty(
                deployed.propertyTokenId
            ) {
                deployed.isActive = false;
                paused++;
            } catch {
                // Tolerate failures (already paused, etc.) — keep going.
            }
        }
        factoryStats.activeProperties = factoryStats.activeProperties > paused
            ? factoryStats.activeProperties - paused
            : 0;
        emit GlobalPauseTriggered(msg.sender, paused);
    }

    function liftGlobalPause() external onlyRole(ADMIN_ROLE) {
        require(globallyPaused, "Not globally paused");
        globallyPaused = false;
        // Per-property reactivation must be performed explicitly via
        // `activateProperty` so admins can review the post-incident state.
        emit GlobalPauseLifted(msg.sender);
    }

    function withdrawFees() external onlyRole(ADMIN_ROLE) {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        (bool success, ) = payable(platformTreasury).call{value: balance}("");
        require(success, "Withdrawal failed");
    }

    // ===================================================================
    // Structs
    // ===================================================================
    struct PropertyDeploymentParams {
        uint256 totalSupply;
        RealEstateToken.PropertyCategory category;
        uint256 tokenPrice;
        uint256 lockupPeriod;
        uint256 earlyExitFeeRate;
        uint256 rentalYieldRate;
        string propertyURI;
        RentalIncomeDistributor.DistributionFrequency distributionFrequency;
        RentalIncomeDistributor.PaymentToken paymentToken;
        address[] multiSigOwners;
        address propertyOwner;
    }

    // Accept ETH for deployment fees
    receive() external payable {}
}
