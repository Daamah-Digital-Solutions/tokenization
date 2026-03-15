// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./RealEstateToken.sol";

/**
 * @title RentalIncomeDistributor
 * @dev Automated rental income distribution contract for ready properties
 * Features:
 * - Automated monthly/quarterly distributions
 * - Support for multiple payment tokens (ETH, USDC, USDT)
 * - Gas-efficient batch distributions
 * - Unclaimed income rollover
 * - Platform fee deduction
 * - Emergency withdrawal mechanisms
 */
contract RentalIncomeDistributor is ReentrancyGuard, AccessControl, Pausable {
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PROPERTY_MANAGER_ROLE = keccak256("PROPERTY_MANAGER_ROLE");
    bytes32 public constant FINANCIAL_CONTROLLER_ROLE = keccak256("FINANCIAL_CONTROLLER_ROLE");
    
    // Distribution frequency options
    enum DistributionFrequency { MONTHLY, QUARTERLY, SEMI_ANNUAL, ANNUAL }
    
    // Payment token types
    enum PaymentToken { ETH, USDC, USDT, DAI }
    
    // Distribution status
    enum DistributionStatus { PENDING, PROCESSING, COMPLETED, CANCELLED }
    
    // Property distribution configuration
    struct PropertyDistribution {
        uint256 propertyTokenId;
        RealEstateToken tokenContract;
        DistributionFrequency frequency;
        PaymentToken paymentToken;
        address paymentTokenAddress;
        uint256 platformFeeRate; // in basis points (1% = 100)
        uint256 lastDistributionTime;
        uint256 nextDistributionTime;
        uint256 totalDistributed;
        uint256 totalFeeCollected;
        bool isActive;
        address propertyManager;
    }
    
    // Individual distribution record
    struct DistributionRecord {
        uint256 propertyTokenId;
        uint256 distributionId;
        uint256 totalAmount;
        uint256 netAmount; // After platform fees
        uint256 eligibleTokens;
        uint256 distributionTime;
        PaymentToken paymentToken;
        DistributionStatus status;
        mapping(address => bool) claimed;
        mapping(address => uint256) claimAmounts;
        uint256 totalClaimed;
        uint256 totalUnclaimed;
    }
    
    // Batch distribution for gas optimization
    struct BatchDistribution {
        address[] recipients;
        uint256[] amounts;
        uint256 totalAmount;
        bool processed;
    }
    
    // State variables (moved to initialization section)
    
    mapping(uint256 => PropertyDistribution) public propertyDistributions;
    mapping(uint256 => mapping(uint256 => DistributionRecord)) public distributionRecords;
    mapping(uint256 => uint256) public distributionCounters;
    mapping(address => bool) public supportedTokens;
    mapping(PaymentToken => address) public paymentTokenAddresses;
    
    // Unclaimed income tracking
    mapping(uint256 => mapping(address => uint256)) public unclaimedIncome;
    mapping(address => uint256) public totalUnclaimedByInvestor;
    
    // Gas optimization settings
    uint256 public constant MAX_BATCH_SIZE = 50;
    uint256 public gasLimitPerClaim = 100000;
    
    // Events
    event PropertyRegistered(uint256 indexed propertyTokenId, DistributionFrequency frequency, PaymentToken paymentToken);
    event DistributionInitiated(uint256 indexed propertyTokenId, uint256 indexed distributionId, uint256 totalAmount);
    event DistributionCompleted(uint256 indexed propertyTokenId, uint256 indexed distributionId);
    event IncomeClaimed(uint256 indexed propertyTokenId, uint256 indexed distributionId, address indexed investor, uint256 amount);
    event BatchDistributionProcessed(uint256 indexed propertyTokenId, uint256 indexed distributionId, uint256 batchNumber);
    event UnclaimedIncomeRolledOver(uint256 indexed propertyTokenId, address indexed investor, uint256 amount);
    event EmergencyWithdrawal(address indexed token, uint256 amount, address indexed recipient);
    event PlatformFeeUpdated(uint256 indexed propertyTokenId, uint256 newFeeRate);
    
    // Modifiers
    modifier onlyPropertyManager(uint256 propertyTokenId) {
        require(
            hasRole(PROPERTY_MANAGER_ROLE, msg.sender) || 
            propertyDistributions[propertyTokenId].propertyManager == msg.sender,
            "Not authorized property manager"
        );
        _;
    }
    
    modifier validProperty(uint256 propertyTokenId) {
        require(propertyDistributions[propertyTokenId].isActive, "Property not registered");
        _;
    }
    
    modifier supportedToken(address tokenAddress) {
        require(tokenAddress == address(0) || supportedTokens[tokenAddress], "Token not supported");
        _;
    }
    
    // State variables for initialization
    RealEstateToken private _realEstateToken;
    address private _platformTreasury;
    bool private _initialized;

    modifier initializer() {
        require(!_initialized, "Already initialized");
        _;
        _initialized = true;
    }

    constructor() {
        // Empty constructor for proxy pattern
    }

    /**
     * @dev Initialize the contract (for proxy pattern)
     * @param _realEstateTokenAddr Real estate token contract address
     * @param _platformTreasuryAddr Platform treasury address
     * @param _supportedTokenAddresses Supported token addresses
     * @param _tokenTypes Token types corresponding to addresses
     */
    function initialize(
        address _realEstateTokenAddr,
        address _platformTreasuryAddr,
        address[] memory _supportedTokenAddresses,
        PaymentToken[] memory _tokenTypes
    ) external initializer {
        require(_realEstateTokenAddr != address(0), "Invalid real estate token address");
        require(_platformTreasuryAddr != address(0), "Invalid platform treasury address");
        require(_supportedTokenAddresses.length == _tokenTypes.length, "Mismatched token arrays");
        
        _realEstateToken = RealEstateToken(payable(_realEstateTokenAddr));
        _platformTreasury = _platformTreasuryAddr;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(FINANCIAL_CONTROLLER_ROLE, msg.sender);
        
        // Set up supported tokens
        for (uint256 i = 0; i < _supportedTokenAddresses.length; i++) {
            if (_supportedTokenAddresses[i] != address(0)) {
                supportedTokens[_supportedTokenAddresses[i]] = true;
            }
            paymentTokenAddresses[_tokenTypes[i]] = _supportedTokenAddresses[i];
        }
    }

    /**
     * @dev Get real estate token contract
     */
    function realEstateToken() public view returns (RealEstateToken) {
        return _realEstateToken;
    }

    /**
     * @dev Get platform treasury address
     */
    function platformTreasury() public view returns (address) {
        return _platformTreasury;
    }
    
    /**
     * @dev Register a property for automated rental income distribution
     * @param propertyTokenId Token ID of the property
     * @param frequency Distribution frequency
     * @param paymentToken Payment token type
     * @param platformFeeRate Platform fee rate in basis points
     * @param propertyManager Property manager address
     */
    function registerProperty(
        uint256 propertyTokenId,
        DistributionFrequency frequency,
        PaymentToken paymentToken,
        uint256 platformFeeRate,
        address propertyManager
    ) external onlyRole(ADMIN_ROLE) {
        require(propertyManager != address(0), "Invalid property manager");
        require(platformFeeRate <= 1000, "Fee rate too high"); // Max 10%
        
        address tokenAddress = paymentTokenAddresses[paymentToken];
        require(tokenAddress == address(0) || supportedTokens[tokenAddress], "Unsupported payment token");
        
        // Verify property exists and is ready
        (, , RealEstateToken.PropertyCategory category, , , bool rentalActive) = 
            realEstateToken().getPropertyInfo(propertyTokenId);
        require(category == RealEstateToken.PropertyCategory.READY_PROPERTY, "Not a ready property");
        require(rentalActive, "Rental income not active");
        
        propertyDistributions[propertyTokenId] = PropertyDistribution({
            propertyTokenId: propertyTokenId,
            tokenContract: realEstateToken(),
            frequency: frequency,
            paymentToken: paymentToken,
            paymentTokenAddress: tokenAddress,
            platformFeeRate: platformFeeRate,
            lastDistributionTime: 0,
            nextDistributionTime: _calculateNextDistributionTime(frequency),
            totalDistributed: 0,
            totalFeeCollected: 0,
            isActive: true,
            propertyManager: propertyManager
        });
        
        emit PropertyRegistered(propertyTokenId, frequency, paymentToken);
    }
    
    /**
     * @dev Initiate rental income distribution for a property
     * @param propertyTokenId Token ID of the property
     * @param totalAmount Total rental income to distribute
     */
    function initiateDistribution(
        uint256 propertyTokenId,
        uint256 totalAmount
    ) external onlyPropertyManager(propertyTokenId) validProperty(propertyTokenId) nonReentrant {
        require(totalAmount > 0, "Invalid distribution amount");
        require(block.timestamp >= propertyDistributions[propertyTokenId].nextDistributionTime, "Too early for distribution");
        
        PropertyDistribution storage propDist = propertyDistributions[propertyTokenId];
        uint256 distributionId = distributionCounters[propertyTokenId]++;
        
        // Calculate platform fee
        uint256 platformFee = (totalAmount * propDist.platformFeeRate) / 10000;
        uint256 netAmount = totalAmount - platformFee;
        
        // Get eligible token supply
        (, uint256 eligibleTokens, , , , ) = realEstateToken().getPropertyInfo(propertyTokenId);
        
        DistributionRecord storage record = distributionRecords[propertyTokenId][distributionId];
        record.propertyTokenId = propertyTokenId;
        record.distributionId = distributionId;
        record.totalAmount = totalAmount;
        record.netAmount = netAmount;
        record.eligibleTokens = eligibleTokens;
        record.distributionTime = block.timestamp;
        record.paymentToken = propDist.paymentToken;
        record.status = DistributionStatus.PENDING;
        record.totalClaimed = 0;
        record.totalUnclaimed = netAmount;
        
        // Update property distribution info
        propDist.lastDistributionTime = block.timestamp;
        propDist.nextDistributionTime = _calculateNextDistributionTime(propDist.frequency);
        propDist.totalDistributed += netAmount;
        propDist.totalFeeCollected += platformFee;
        
        // Transfer platform fee
        if (platformFee > 0) {
            _transferPayment(propDist.paymentTokenAddress, platformTreasury(), platformFee);
        }
        
        emit DistributionInitiated(propertyTokenId, distributionId, totalAmount);
        
        // Start batch processing
        _processBatchDistribution(propertyTokenId, distributionId);
    }
    
    /**
     * @dev Process batch distribution for gas optimization
     * @param propertyTokenId Token ID of the property
     * @param distributionId Distribution ID
     */
    function _processBatchDistribution(
        uint256 propertyTokenId,
        uint256 distributionId
    ) internal {
        DistributionRecord storage record = distributionRecords[propertyTokenId][distributionId];
        record.status = DistributionStatus.PROCESSING;
        
        // This would typically be called by a keeper or through a separate transaction
        // For now, we'll mark it as ready for individual claims
        record.status = DistributionStatus.COMPLETED;
        
        emit DistributionCompleted(propertyTokenId, distributionId);
    }
    
    /**
     * @dev Claim rental income from a distribution
     * @param propertyTokenId Token ID of the property
     * @param distributionId Distribution ID
     */
    function claimIncome(
        uint256 propertyTokenId,
        uint256 distributionId
    ) external nonReentrant {
        require(realEstateToken().balanceOf(msg.sender, propertyTokenId) > 0, "No tokens to claim for");
        
        DistributionRecord storage record = distributionRecords[propertyTokenId][distributionId];
        require(record.status == DistributionStatus.COMPLETED, "Distribution not ready");
        require(!record.claimed[msg.sender], "Already claimed");
        
        uint256 investorTokens = realEstateToken().balanceOf(msg.sender, propertyTokenId);
        uint256 claimAmount = (record.netAmount * investorTokens) / record.eligibleTokens;
        
        require(claimAmount > 0, "No income to claim");
        
        // Mark as claimed
        record.claimed[msg.sender] = true;
        record.claimAmounts[msg.sender] = claimAmount;
        record.totalClaimed += claimAmount;
        record.totalUnclaimed -= claimAmount;
        
        // Transfer payment
        PropertyDistribution storage propDist = propertyDistributions[propertyTokenId];
        _transferPayment(propDist.paymentTokenAddress, msg.sender, claimAmount);
        
        emit IncomeClaimed(propertyTokenId, distributionId, msg.sender, claimAmount);
    }
    
    /**
     * @dev Claim all available income for an investor across all distributions
     * @param propertyTokenId Token ID of the property
     */
    function claimAllAvailableIncome(uint256 propertyTokenId) external nonReentrant {
        require(realEstateToken().balanceOf(msg.sender, propertyTokenId) > 0, "No tokens to claim for");
        
        uint256 totalClaimable = 0;
        uint256 distributionCount = distributionCounters[propertyTokenId];
        
        for (uint256 i = 0; i < distributionCount; i++) {
            DistributionRecord storage record = distributionRecords[propertyTokenId][i];
            
            if (record.status == DistributionStatus.COMPLETED && !record.claimed[msg.sender]) {
                uint256 investorTokens = realEstateToken().balanceOf(msg.sender, propertyTokenId);
                uint256 claimAmount = (record.netAmount * investorTokens) / record.eligibleTokens;
                
                if (claimAmount > 0) {
                    record.claimed[msg.sender] = true;
                    record.claimAmounts[msg.sender] = claimAmount;
                    record.totalClaimed += claimAmount;
                    record.totalUnclaimed -= claimAmount;
                    totalClaimable += claimAmount;
                    
                    emit IncomeClaimed(propertyTokenId, i, msg.sender, claimAmount);
                }
            }
        }
        
        require(totalClaimable > 0, "No income to claim");
        
        // Transfer total payment
        PropertyDistribution storage propDist = propertyDistributions[propertyTokenId];
        _transferPayment(propDist.paymentTokenAddress, msg.sender, totalClaimable);
    }
    
    /**
     * @dev Roll over unclaimed income to the next distribution
     * @param propertyTokenId Token ID of the property
     * @param distributionId Distribution ID with unclaimed income
     */
    function rolloverUnclaimedIncome(
        uint256 propertyTokenId,
        uint256 distributionId
    ) external onlyPropertyManager(propertyTokenId) {
        DistributionRecord storage record = distributionRecords[propertyTokenId][distributionId];
        require(record.status == DistributionStatus.COMPLETED, "Distribution not completed");
        require(record.totalUnclaimed > 0, "No unclaimed income");
        
        // Add to next distribution or hold for future distributions
        uint256 nextDistributionId = distributionCounters[propertyTokenId];
        if (nextDistributionId > distributionId + 1) {
            // Add to existing next distribution
            DistributionRecord storage nextRecord = distributionRecords[propertyTokenId][nextDistributionId - 1];
            nextRecord.netAmount += record.totalUnclaimed;
            nextRecord.totalUnclaimed += record.totalUnclaimed;
        }
        
        record.totalUnclaimed = 0;
    }
    
    /**
     * @dev Get claimable amount for an investor
     * @param propertyTokenId Token ID of the property
     * @param distributionId Distribution ID
     * @param investor Investor address
     */
    function getClaimableAmount(
        uint256 propertyTokenId,
        uint256 distributionId,
        address investor
    ) external view returns (uint256) {
        DistributionRecord storage record = distributionRecords[propertyTokenId][distributionId];
        
        if (record.status != DistributionStatus.COMPLETED || record.claimed[investor]) {
            return 0;
        }
        
        uint256 investorTokens = realEstateToken().balanceOf(investor, propertyTokenId);
        return (record.netAmount * investorTokens) / record.eligibleTokens;
    }
    
    /**
     * @dev Get total claimable amount across all distributions for an investor
     * @param propertyTokenId Token ID of the property
     * @param investor Investor address
     */
    function getTotalClaimableAmount(
        uint256 propertyTokenId,
        address investor
    ) external view returns (uint256) {
        uint256 totalClaimable = 0;
        uint256 distributionCount = distributionCounters[propertyTokenId];
        
        for (uint256 i = 0; i < distributionCount; i++) {
            DistributionRecord storage record = distributionRecords[propertyTokenId][i];
            
            if (record.status == DistributionStatus.COMPLETED && !record.claimed[investor]) {
                uint256 investorTokens = realEstateToken().balanceOf(investor, propertyTokenId);
                uint256 claimAmount = (record.netAmount * investorTokens) / record.eligibleTokens;
                totalClaimable += claimAmount;
            }
        }
        
        return totalClaimable;
    }
    
    /**
     * @dev Update platform fee rate for a property
     * @param propertyTokenId Token ID of the property
     * @param newFeeRate New fee rate in basis points
     */
    function updatePlatformFee(
        uint256 propertyTokenId,
        uint256 newFeeRate
    ) external onlyRole(ADMIN_ROLE) validProperty(propertyTokenId) {
        require(newFeeRate <= 1000, "Fee rate too high"); // Max 10%
        
        propertyDistributions[propertyTokenId].platformFeeRate = newFeeRate;
        emit PlatformFeeUpdated(propertyTokenId, newFeeRate);
    }
    
    /**
     * @dev Emergency withdrawal function
     * @param token Token address (address(0) for ETH)
     * @param amount Amount to withdraw
     * @param recipient Recipient address
     */
    function emergencyWithdraw(
        address token,
        uint256 amount,
        address recipient
    ) external onlyRole(ADMIN_ROLE) {
        require(recipient != address(0), "Invalid recipient");
        
        if (token == address(0)) {
            require(amount <= address(this).balance, "Insufficient ETH balance");
            (bool success, ) = payable(recipient).call{value: amount}("");
            require(success, "ETH transfer failed");
        } else {
            IERC20 tokenContract = IERC20(token);
            require(amount <= tokenContract.balanceOf(address(this)), "Insufficient token balance");
            require(tokenContract.transfer(recipient, amount), "Token transfer failed");
        }
        
        emit EmergencyWithdrawal(token, amount, recipient);
    }
    
    /**
     * @dev Pause the contract
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
    
    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }
    
    /**
     * @dev Calculate next distribution time based on frequency
     * @param frequency Distribution frequency
     */
    function _calculateNextDistributionTime(DistributionFrequency frequency) internal view returns (uint256) {
        if (frequency == DistributionFrequency.MONTHLY) {
            return block.timestamp + 30 days;
        } else if (frequency == DistributionFrequency.QUARTERLY) {
            return block.timestamp + 90 days;
        } else if (frequency == DistributionFrequency.SEMI_ANNUAL) {
            return block.timestamp + 180 days;
        } else { // ANNUAL
            return block.timestamp + 365 days;
        }
    }
    
    /**
     * @dev Transfer payment (ETH or ERC20)
     * @param tokenAddress Token address (address(0) for ETH)
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function _transferPayment(address tokenAddress, address to, uint256 amount) internal {
        if (tokenAddress == address(0)) {
            // Transfer ETH
            require(address(this).balance >= amount, "Insufficient ETH balance");
            (bool success, ) = payable(to).call{value: amount}("");
            require(success, "ETH transfer failed");
        } else {
            // Transfer ERC20 token
            IERC20 token = IERC20(tokenAddress);
            require(token.balanceOf(address(this)) >= amount, "Insufficient token balance");
            require(token.transfer(to, amount), "Token transfer failed");
        }
    }
    
    // View functions
    
    /**
     * @dev Get property distribution info
     * @param propertyTokenId Token ID of the property
     */
    function getPropertyDistribution(uint256 propertyTokenId) external view returns (
        DistributionFrequency frequency,
        PaymentToken paymentToken,
        uint256 platformFeeRate,
        uint256 nextDistributionTime,
        uint256 totalDistributed,
        bool isActive
    ) {
        PropertyDistribution storage propDist = propertyDistributions[propertyTokenId];
        return (
            propDist.frequency,
            propDist.paymentToken,
            propDist.platformFeeRate,
            propDist.nextDistributionTime,
            propDist.totalDistributed,
            propDist.isActive
        );
    }
    
    /**
     * @dev Get distribution record
     * @param propertyTokenId Token ID of the property
     * @param distributionId Distribution ID
     */
    function getDistributionRecord(
        uint256 propertyTokenId,
        uint256 distributionId
    ) external view returns (
        uint256 totalAmount,
        uint256 netAmount,
        uint256 distributionTime,
        DistributionStatus status,
        uint256 totalClaimed,
        uint256 totalUnclaimed
    ) {
        DistributionRecord storage record = distributionRecords[propertyTokenId][distributionId];
        return (
            record.totalAmount,
            record.netAmount,
            record.distributionTime,
            record.status,
            record.totalClaimed,
            record.totalUnclaimed
        );
    }
    
    // Fallback functions to receive payments
    receive() external payable {}
    fallback() external payable {}
}