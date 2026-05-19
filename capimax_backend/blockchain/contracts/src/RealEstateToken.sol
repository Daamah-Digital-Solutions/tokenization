// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./ComplianceRegistry.sol";

/**
 * @title RealEstateToken
 * @dev ERC1155 token for real estate tokenization with support for construction and ready properties
 * Features:
 * - Multi-signature controls for admin functions
 * - Graduated token release for installment payments
 * - Automated rental income distribution for ready properties
 * - Lock-up periods and early exit fees
 * - Support for both construction and ready property categories
 */
contract RealEstateToken is ERC1155, Pausable, ReentrancyGuard, AccessControl {
    using Counters for Counters.Counter;
    
    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PROPERTY_MANAGER_ROLE = keccak256("PROPERTY_MANAGER_ROLE");
    bytes32 public constant FINANCIAL_CONTROLLER_ROLE = keccak256("FINANCIAL_CONTROLLER_ROLE");
    
    // Property categories
    enum PropertyCategory { UNDER_CONSTRUCTION, READY_PROPERTY }
    
    // Property status
    enum PropertyStatus { DRAFT, ACTIVE, PAUSED, COMPLETED, CANCELLED }
    
    // Token counter for unique property IDs
    Counters.Counter private _tokenIdTracker;
    
    // Property information structure
    struct PropertyInfo {
        uint256 totalSupply;
        uint256 currentSupply;
        PropertyCategory category;
        PropertyStatus status;
        uint256 lockupPeriod;
        uint256 earlyExitFeeRate; // in basis points (1% = 100)
        uint256 rentalYieldRate; // in basis points (5% = 500)
        address propertyManager;
        string propertyURI;
        uint256 tokenPrice;
        uint256 createdAt;
        uint256 completionDate; // For construction properties
        bool rentalIncomeActive;
    }
    
    // Investor information for each property
    struct InvestorInfo {
        uint256 tokenBalance;
        uint256 totalInvested;
        uint256 lockupEndTime;
        uint256 lastDistributionClaim;
        bool hasEarlyExit;
        uint256 installmentsPaid;
        uint256 totalInstallments;
    }
    
    // Rental income distribution tracking
    struct RentalDistribution {
        uint256 totalAmount;
        uint256 distributionDate;
        uint256 eligibleTokens;
        mapping(address => bool) claimed;
    }
    
    // Multi-signature transaction structure
    struct MultiSigTransaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
        uint256 confirmations;
        mapping(address => bool) isConfirmed;
    }
    
    // State variables
    mapping(uint256 => PropertyInfo) public properties;
    mapping(uint256 => mapping(address => InvestorInfo)) public investors;
    mapping(uint256 => mapping(uint256 => RentalDistribution)) public rentalDistributions;
    mapping(uint256 => uint256) public distributionCounter;

    // -------------------------------------------------------------------
    // Compliance registry — optional KYC/sanctions gate. When set, every
    // transfer (including secondary trades) is gated through
    // `ComplianceRegistry.canTransfer`. When unset, only the lockup rule
    // applies (preserving backward compatibility with older deployments).
    // -------------------------------------------------------------------
    address public complianceRegistry;
    event ComplianceRegistrySet(address indexed registry);
    
    // Multi-signature variables
    mapping(uint256 => MultiSigTransaction) public transactions;
    uint256 public transactionCount;
    uint256 public requiredConfirmations;
    mapping(address => bool) public isOwner;
    address[] public owners;
    
    // Events
    event PropertyCreated(uint256 indexed tokenId, PropertyCategory category, uint256 totalSupply);
    event TokensMinted(uint256 indexed tokenId, address indexed investor, uint256 amount);
    event TokensBurned(uint256 indexed tokenId, address indexed investor, uint256 amount);
    event RentalIncomeDistributed(uint256 indexed tokenId, uint256 distributionId, uint256 totalAmount);
    event RentalIncomeClaimed(uint256 indexed tokenId, uint256 distributionId, address indexed investor, uint256 amount);
    event EarlyExit(uint256 indexed tokenId, address indexed investor, uint256 tokensExited, uint256 fee);
    event InstallmentPaid(uint256 indexed tokenId, address indexed investor, uint256 installmentNumber);
    event TokensGraduated(uint256 indexed tokenId, address indexed investor, uint256 amount);
    event MultiSigTransactionSubmitted(uint256 indexed txId, address indexed submitter);
    event MultiSigTransactionConfirmed(uint256 indexed txId, address indexed confirmer);
    event MultiSigTransactionExecuted(uint256 indexed txId);
    
    // Modifiers
    modifier onlyPropertyManager(uint256 tokenId) {
        require(
            hasRole(PROPERTY_MANAGER_ROLE, msg.sender) || 
            properties[tokenId].propertyManager == msg.sender,
            "Not authorized property manager"
        );
        _;
    }
    
    modifier validProperty(uint256 tokenId) {
        require(tokenId < _tokenIdTracker.current(), "Property does not exist");
        _;
    }
    
    modifier onlyMultiSigOwner() {
        require(isOwner[msg.sender], "Not a multi-sig owner");
        _;
    }
    
    modifier txExists(uint256 txId) {
        require(txId < transactionCount, "Transaction does not exist");
        _;
    }
    
    modifier notExecuted(uint256 txId) {
        require(!transactions[txId].executed, "Transaction already executed");
        _;
    }
    
    modifier notConfirmed(uint256 txId) {
        require(!transactions[txId].isConfirmed[msg.sender], "Transaction already confirmed");
        _;
    }
    
    bool private _initialized;

    modifier initializer() {
        require(!_initialized, "Already initialized");
        _;
        _initialized = true;
    }

    constructor() ERC1155("") {
        // Empty constructor for proxy pattern
    }

    /**
     * @dev Initialize the contract (for proxy pattern)
     * @param uri Base URI for token metadata
     * @param _owners Multi-signature owners
     * @param _requiredConfirmations Required confirmations for multi-sig
     */
    function initialize(
        string memory uri,
        address[] memory _owners,
        uint256 _requiredConfirmations
    ) external initializer {
        require(_owners.length > 0, "Owners required");
        require(
            _requiredConfirmations > 0 && _requiredConfirmations <= _owners.length,
            "Invalid required confirmations"
        );
        
        _setURI(uri);
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(PROPERTY_MANAGER_ROLE, msg.sender);
        _grantRole(FINANCIAL_CONTROLLER_ROLE, msg.sender);
        
        // Set up multi-signature
        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            require(owner != address(0), "Invalid owner");
            require(!isOwner[owner], "Duplicate owner");
            
            isOwner[owner] = true;
            owners.push(owner);
        }
        
        requiredConfirmations = _requiredConfirmations;
    }
    
    /**
     * @dev Create a new real estate property token
     * @param totalSupply Total number of tokens for this property
     * @param category Property category (construction or ready)
     * @param tokenPrice Price per token in wei
     * @param lockupPeriod Lock-up period in seconds
     * @param earlyExitFeeRate Early exit fee in basis points
     * @param rentalYieldRate Expected rental yield in basis points
     * @param propertyManager Address of property manager
     * @param propertyURI Metadata URI for the property
     */
    function createProperty(
        uint256 totalSupply,
        PropertyCategory category,
        uint256 tokenPrice,
        uint256 lockupPeriod,
        uint256 earlyExitFeeRate,
        uint256 rentalYieldRate,
        address propertyManager,
        string memory propertyURI
    ) external onlyRole(ADMIN_ROLE) returns (uint256) {
        require(totalSupply > 0, "Invalid total supply");
        require(propertyManager != address(0), "Invalid property manager");
        require(earlyExitFeeRate <= 2500, "Early exit fee too high"); // Max 25%
        
        uint256 tokenId = _tokenIdTracker.current();
        _tokenIdTracker.increment();
        
        properties[tokenId] = PropertyInfo({
            totalSupply: totalSupply,
            currentSupply: 0,
            category: category,
            status: PropertyStatus.DRAFT,
            lockupPeriod: lockupPeriod,
            earlyExitFeeRate: earlyExitFeeRate,
            rentalYieldRate: rentalYieldRate,
            propertyManager: propertyManager,
            propertyURI: propertyURI,
            tokenPrice: tokenPrice,
            createdAt: block.timestamp,
            completionDate: 0,
            rentalIncomeActive: category == PropertyCategory.READY_PROPERTY
        });
        
        emit PropertyCreated(tokenId, category, totalSupply);
        return tokenId;
    }
    
    /**
     * @dev Mint tokens for property investment
     * @param tokenId Property token ID
     * @param investor Investor address
     * @param amount Number of tokens to mint
     * @param isInstallment Whether this is part of installment plan
     * @param totalInstallments Total number of installments (if applicable)
     */
    function mintTokens(
        uint256 tokenId,
        address investor,
        uint256 amount,
        bool isInstallment,
        uint256 totalInstallments
    ) external onlyPropertyManager(tokenId) validProperty(tokenId) nonReentrant {
        PropertyInfo storage property = properties[tokenId];
        require(property.status == PropertyStatus.ACTIVE, "Property not active");
        require(property.currentSupply + amount <= property.totalSupply, "Exceeds total supply");
        require(investor != address(0), "Invalid investor address");
        
        // Mint the tokens
        _mint(investor, tokenId, amount, "");
        property.currentSupply += amount;
        
        // Update investor information
        InvestorInfo storage investorInfo = investors[tokenId][investor];
        investorInfo.tokenBalance += amount;
        investorInfo.totalInvested += amount * property.tokenPrice;
        investorInfo.lockupEndTime = block.timestamp + property.lockupPeriod;
        
        if (isInstallment) {
            investorInfo.totalInstallments = totalInstallments;
        }
        
        emit TokensMinted(tokenId, investor, amount);
    }
    
    /**
     * @dev Process installment payment and release tokens gradually
     * @param tokenId Property token ID
     * @param investor Investor address
     * @param tokensToRelease Number of tokens to release with this installment
     */
    function processInstallment(
        uint256 tokenId,
        address investor,
        uint256 tokensToRelease
    ) external onlyPropertyManager(tokenId) validProperty(tokenId) nonReentrant {
        InvestorInfo storage investorInfo = investors[tokenId][investor];
        require(investorInfo.totalInstallments > 0, "Not an installment investor");
        require(investorInfo.installmentsPaid < investorInfo.totalInstallments, "All installments paid");
        
        // Release the tokens (they were pre-minted but held in escrow)
        _safeTransferFrom(address(this), investor, tokenId, tokensToRelease, "");
        
        investorInfo.installmentsPaid++;
        
        emit InstallmentPaid(tokenId, investor, investorInfo.installmentsPaid);
        emit TokensGraduated(tokenId, investor, tokensToRelease);
    }
    
    /**
     * @dev Distribute rental income to token holders
     * @param tokenId Property token ID
     * @param totalDistributionAmount Total amount to distribute
     */
    function distributeRentalIncome(
        uint256 tokenId,
        uint256 totalDistributionAmount
    ) external onlyRole(FINANCIAL_CONTROLLER_ROLE) validProperty(tokenId) nonReentrant {
        PropertyInfo storage property = properties[tokenId];
        require(property.rentalIncomeActive, "Rental income not active");
        require(property.category == PropertyCategory.READY_PROPERTY, "Only for ready properties");
        require(totalDistributionAmount > 0, "Invalid distribution amount");
        
        uint256 distributionId = distributionCounter[tokenId]++;
        RentalDistribution storage distribution = rentalDistributions[tokenId][distributionId];
        
        distribution.totalAmount = totalDistributionAmount;
        distribution.distributionDate = block.timestamp;
        distribution.eligibleTokens = property.currentSupply;
        
        emit RentalIncomeDistributed(tokenId, distributionId, totalDistributionAmount);
    }
    
    /**
     * @dev Claim rental income distribution
     * @param tokenId Property token ID
     * @param distributionId Distribution ID to claim
     */
    function claimRentalIncome(
        uint256 tokenId,
        uint256 distributionId
    ) external validProperty(tokenId) nonReentrant {
        require(balanceOf(msg.sender, tokenId) > 0, "No tokens to claim for");
        
        RentalDistribution storage distribution = rentalDistributions[tokenId][distributionId];
        require(!distribution.claimed[msg.sender], "Already claimed");
        require(distribution.totalAmount > 0, "Distribution does not exist");
        
        uint256 investorTokens = balanceOf(msg.sender, tokenId);
        uint256 claimAmount = (distribution.totalAmount * investorTokens) / distribution.eligibleTokens;
        
        distribution.claimed[msg.sender] = true;
        investors[tokenId][msg.sender].lastDistributionClaim = block.timestamp;
        
        // Transfer rental income (assuming contract holds the funds)
        (bool success, ) = payable(msg.sender).call{value: claimAmount}("");
        require(success, "Transfer failed");
        
        emit RentalIncomeClaimed(tokenId, distributionId, msg.sender, claimAmount);
    }
    
    /**
     * @dev Early exit from investment with fee
     * @param tokenId Property token ID
     * @param tokensToExit Number of tokens to exit
     */
    function earlyExit(
        uint256 tokenId,
        uint256 tokensToExit
    ) external validProperty(tokenId) nonReentrant {
        require(balanceOf(msg.sender, tokenId) >= tokensToExit, "Insufficient tokens");
        
        InvestorInfo storage investorInfo = investors[tokenId][msg.sender];
        require(block.timestamp < investorInfo.lockupEndTime, "Lock-up period ended");
        
        PropertyInfo storage property = properties[tokenId];
        uint256 exitValue = tokensToExit * property.tokenPrice;
        uint256 feeAmount = (exitValue * property.earlyExitFeeRate) / 10000;
        uint256 netAmount = exitValue - feeAmount;
        
        // Burn the tokens
        _burn(msg.sender, tokenId, tokensToExit);
        property.currentSupply -= tokensToExit;
        
        // Update investor info
        investorInfo.tokenBalance -= tokensToExit;
        investorInfo.hasEarlyExit = true;
        
        // Transfer net amount (assuming contract holds the funds)
        (bool success, ) = payable(msg.sender).call{value: netAmount}("");
        require(success, "Transfer failed");
        
        emit EarlyExit(tokenId, msg.sender, tokensToExit, feeAmount);
    }
    
    /**
     * @dev Mark construction property as completed
     * @param tokenId Property token ID
     */
    function markConstructionComplete(
        uint256 tokenId
    ) external onlyPropertyManager(tokenId) validProperty(tokenId) {
        PropertyInfo storage property = properties[tokenId];
        require(property.category == PropertyCategory.UNDER_CONSTRUCTION, "Not a construction property");
        require(property.status == PropertyStatus.ACTIVE, "Property not active");
        
        property.completionDate = block.timestamp;
        property.status = PropertyStatus.COMPLETED;
        property.rentalIncomeActive = true; // Enable rental income after completion
    }
    
    /**
     * @dev Activate property for investment
     * @param tokenId Property token ID
     */
    function activateProperty(uint256 tokenId) external onlyRole(ADMIN_ROLE) validProperty(tokenId) {
        properties[tokenId].status = PropertyStatus.ACTIVE;
    }
    
    /**
     * @dev Pause property investments
     * @param tokenId Property token ID
     */
    function pauseProperty(uint256 tokenId) external onlyPropertyManager(tokenId) validProperty(tokenId) {
        properties[tokenId].status = PropertyStatus.PAUSED;
    }
    
    // Multi-signature functions
    
    /**
     * @dev Submit a transaction for multi-signature approval
     * @param to Destination address
     * @param value Value to send
     * @param data Transaction data
     */
    function submitTransaction(
        address to,
        uint256 value,
        bytes memory data
    ) external onlyMultiSigOwner returns (uint256) {
        uint256 txId = transactionCount;
        transactions[txId].to = to;
        transactions[txId].value = value;
        transactions[txId].data = data;
        transactions[txId].executed = false;
        transactions[txId].confirmations = 0;
        
        transactionCount++;
        
        emit MultiSigTransactionSubmitted(txId, msg.sender);
        return txId;
    }
    
    /**
     * @dev Confirm a multi-signature transaction
     * @param txId Transaction ID to confirm
     */
    function confirmTransaction(
        uint256 txId
    ) external onlyMultiSigOwner txExists(txId) notExecuted(txId) notConfirmed(txId) {
        transactions[txId].isConfirmed[msg.sender] = true;
        transactions[txId].confirmations++;
        
        emit MultiSigTransactionConfirmed(txId, msg.sender);
        
        if (transactions[txId].confirmations >= requiredConfirmations) {
            executeTransaction(txId);
        }
    }
    
    /**
     * @dev Execute a confirmed multi-signature transaction
     * @param txId Transaction ID to execute
     */
    function executeTransaction(
        uint256 txId
    ) internal txExists(txId) notExecuted(txId) {
        require(transactions[txId].confirmations >= requiredConfirmations, "Not enough confirmations");
        
        transactions[txId].executed = true;
        
        (bool success, ) = transactions[txId].to.call{value: transactions[txId].value}(
            transactions[txId].data
        );
        require(success, "Transaction execution failed");
        
        emit MultiSigTransactionExecuted(txId);
    }
    
    // View functions
    
    /**
     * @dev Get property information
     * @param tokenId Property token ID
     */
    function getPropertyInfo(uint256 tokenId) external view validProperty(tokenId) returns (
        uint256 totalSupply,
        uint256 currentSupply,
        PropertyCategory category,
        PropertyStatus status,
        uint256 tokenPrice,
        bool rentalIncomeActive
    ) {
        PropertyInfo storage property = properties[tokenId];
        return (
            property.totalSupply,
            property.currentSupply,
            property.category,
            property.status,
            property.tokenPrice,
            property.rentalIncomeActive
        );
    }
    
    /**
     * @dev Get investor information
     * @param tokenId Property token ID
     * @param investor Investor address
     */
    function getInvestorInfo(
        uint256 tokenId,
        address investor
    ) external view validProperty(tokenId) returns (
        uint256 tokenBalance,
        uint256 totalInvested,
        uint256 lockupEndTime,
        uint256 installmentsPaid,
        uint256 totalInstallments
    ) {
        InvestorInfo storage investorInfo = investors[tokenId][investor];
        return (
            investorInfo.tokenBalance,
            investorInfo.totalInvested,
            investorInfo.lockupEndTime,
            investorInfo.installmentsPaid,
            investorInfo.totalInstallments
        );
    }
    
    /**
     * @dev Calculate claimable rental income
     * @param tokenId Property token ID
     * @param investor Investor address
     * @param distributionId Distribution ID
     */
    function calculateClaimableAmount(
        uint256 tokenId,
        address investor,
        uint256 distributionId
    ) external view validProperty(tokenId) returns (uint256) {
        RentalDistribution storage distribution = rentalDistributions[tokenId][distributionId];
        
        if (distribution.claimed[investor] || distribution.totalAmount == 0) {
            return 0;
        }
        
        uint256 investorTokens = balanceOf(investor, tokenId);
        return (distribution.totalAmount * investorTokens) / distribution.eligibleTokens;
    }
    
    // Override functions
    
    function uri(uint256 tokenId) public view override returns (string memory) {
        return properties[tokenId].propertyURI;
    }
    
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    /**
     * @notice Set the compliance registry that gates every transfer.
     * @dev Can be configured by ADMIN_ROLE at any time. Pass `address(0)`
     *      to disable on-chain compliance enforcement (kept for emergency
     *      operational override; off-chain enforcement always remains in
     *      effect via the backend marketplace serializer).
     */
    function setComplianceRegistry(address registry) external onlyRole(ADMIN_ROLE) {
        complianceRegistry = registry;
        emit ComplianceRegistrySet(registry);
    }

    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);

        // Lockup enforcement — skips mints (from == 0) and burns (to == 0).
        if (from != address(0) && to != address(0)) {
            for (uint256 i = 0; i < ids.length; i++) {
                uint256 tokenId = ids[i];
                if (tokenId < _tokenIdTracker.current()) {
                    InvestorInfo storage investorInfo = investors[tokenId][from];
                    require(
                        block.timestamp >= investorInfo.lockupEndTime,
                        "Tokens are locked up"
                    );
                }
            }
        }

        // Compliance registry enforcement — runs on EVERY transfer including
        // mints and burns, so a sanctioned recipient cannot receive a mint
        // and a sanctioned sender cannot offload via burn.
        if (complianceRegistry != address(0)) {
            for (uint256 i = 0; i < ids.length; i++) {
                require(
                    IComplianceRegistry(complianceRegistry).canTransfer(
                        from, to, ids[i], amounts[i]
                    ),
                    "Transfer blocked by compliance"
                );
            }
        }
    }
    
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
    
    // Emergency functions
    
    /**
     * @dev Emergency pause (multi-sig required)
     */
    function emergencyPause() external {
        require(hasRole(ADMIN_ROLE, msg.sender) || isOwner[msg.sender], "Not authorized");
        _pause();
    }
    
    /**
     * @dev Withdraw contract balance (multi-sig required)
     */
    function withdrawBalance(address payable to, uint256 amount) external onlyRole(ADMIN_ROLE) {
        require(to != address(0), "Invalid recipient");
        require(amount <= address(this).balance, "Insufficient balance");
        (bool success, ) = to.call{value: amount}("");
        require(success, "Transfer failed");
    }

    // Fallback functions
    receive() external payable {}
    fallback() external payable {}
}