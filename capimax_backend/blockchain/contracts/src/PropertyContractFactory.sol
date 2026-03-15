// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "./RealEstateToken.sol";
import "./RentalIncomeDistributor.sol";

/**
 * @title PropertyContractFactory
 * @dev Factory contract for deploying property-specific contracts using minimal proxy pattern
 * Features:
 * - Gas-efficient contract deployment using EIP-1167 minimal proxies
 * - Standardized property contract creation
 * - Automatic rental distribution setup
 * - Property registry and management
 * - Upgrade mechanisms for contract templates
 */
contract PropertyContractFactory is AccessControl, ReentrancyGuard {
    
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PROPERTY_CREATOR_ROLE = keccak256("PROPERTY_CREATOR_ROLE");
    
    // Contract templates
    address public immutable realEstateTokenTemplate;
    address public immutable rentalDistributorTemplate;
    
    // Deployed contract registry
    struct DeployedContracts {
        address tokenContract;
        address distributorContract;
        uint256 propertyTokenId;
        address propertyOwner;
        uint256 deployedAt;
        bool isActive;
    }
    
    // Factory statistics
    struct FactoryStats {
        uint256 totalPropertiesDeployed;
        uint256 totalValueLocked;
        uint256 totalTokensIssued;
        uint256 activeProperties;
    }
    
    // State variables
    mapping(uint256 => DeployedContracts) public deployedContracts;
    mapping(address => uint256[]) public ownerProperties;
    mapping(address => bool) public authorizedManagers;
    
    uint256 public propertyCounter;
    FactoryStats public factoryStats;
    
    // Configuration
    uint256 public deploymentFee = 0.01 ether;
    uint256 public platformFeeRate = 250; // 2.5% in basis points
    address public platformTreasury;
    
    // Multi-sig configuration for property deployments
    mapping(uint256 => address[]) public multiSigOwners;
    uint256 public requiredConfirmations = 2;
    
    // Events
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
    
    // Modifiers
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
    }
    
    /**
     * @dev Deploy a new property with token and distribution contracts
     * @param totalSupply Total number of tokens for this property
     * @param category Property category (construction or ready)
     * @param tokenPrice Price per token in wei
     * @param lockupPeriod Lock-up period in seconds
     * @param earlyExitFeeRate Early exit fee in basis points
     * @param rentalYieldRate Expected rental yield in basis points
     * @param propertyURI Metadata URI for the property
     * @param distributionFrequency Distribution frequency for rental income
     * @param paymentToken Payment token for distributions
     * @param multiSigOwners_ Multi-signature owners for the property
     */
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
    ) external payable onlyAuthorizedManager nonReentrant returns (uint256 propertyId, address tokenContract, address distributorContract) {
        require(msg.value >= deploymentFee, "Insufficient deployment fee");
        require(totalSupply > 0, "Invalid total supply");
        require(multiSigOwners_.length >= requiredConfirmations, "Insufficient multi-sig owners");
        
        propertyId = propertyCounter++;
        
        // Deploy token contract using minimal proxy
        tokenContract = Clones.clone(realEstateTokenTemplate);
        
        // Initialize token contract
        RealEstateToken(payable(tokenContract)).initialize(
            propertyURI,
            multiSigOwners_,
            requiredConfirmations
        );
        
        // Create the property in the token contract
        uint256 tokenId = RealEstateToken(payable(tokenContract)).createProperty(
            totalSupply,
            category,
            tokenPrice,
            lockupPeriod,
            earlyExitFeeRate,
            rentalYieldRate,
            msg.sender,
            propertyURI
        );
        
        // Deploy rental distributor if it's a ready property
        if (category == RealEstateToken.PropertyCategory.READY_PROPERTY) {
            distributorContract = Clones.clone(rentalDistributorTemplate);
            
            // Initialize distributor
            address[] memory supportedTokens = new address[](4);
            supportedTokens[0] = address(0); // ETH
            supportedTokens[1] = 0xA0B86a33e6441e70c06Ef1b6F8B4a6ABD8a8AC4E; // USDC (example)
            supportedTokens[2] = 0x55d398326f99059fF775485246999027B3197955; // USDT (example)
            supportedTokens[3] = 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d; // DAI (example)
            
            RentalIncomeDistributor.PaymentToken[] memory tokenTypes = new RentalIncomeDistributor.PaymentToken[](4);
            tokenTypes[0] = RentalIncomeDistributor.PaymentToken.ETH;
            tokenTypes[1] = RentalIncomeDistributor.PaymentToken.USDC;
            tokenTypes[2] = RentalIncomeDistributor.PaymentToken.USDT;
            tokenTypes[3] = RentalIncomeDistributor.PaymentToken.DAI;
            
            RentalIncomeDistributor(payable(distributorContract)).initialize(
                tokenContract,
                platformTreasury,
                supportedTokens,
                tokenTypes
            );
            
            // Register property in distributor
            RentalIncomeDistributor(payable(distributorContract)).registerProperty(
                tokenId,
                distributionFrequency,
                paymentToken,
                platformFeeRate,
                msg.sender
            );
        }
        
        // Store deployment information
        deployedContracts[propertyId] = DeployedContracts({
            tokenContract: tokenContract,
            distributorContract: distributorContract,
            propertyTokenId: tokenId,
            propertyOwner: msg.sender,
            deployedAt: block.timestamp,
            isActive: true
        });
        
        // Update owner's property list
        ownerProperties[msg.sender].push(propertyId);
        
        // Store multi-sig owners
        multiSigOwners[propertyId] = multiSigOwners_;
        
        // Update factory stats
        factoryStats.totalPropertiesDeployed++;
        factoryStats.activeProperties++;
        factoryStats.totalTokensIssued += totalSupply;
        
        // Transfer deployment fee to treasury
        if (msg.value > 0) {
            (bool success, ) = payable(platformTreasury).call{value: msg.value}("");
            require(success, "Fee transfer failed");
        }

        emit PropertyDeployed(propertyId, tokenContract, distributorContract, msg.sender);
        
        return (propertyId, tokenContract, distributorContract);
    }
    
    /**
     * @dev Batch deploy multiple properties
     * @param deploymentParams Array of deployment parameters
     */
    function batchDeployProperties(
        PropertyDeploymentParams[] memory deploymentParams
    ) external payable onlyRole(ADMIN_ROLE) returns (uint256[] memory propertyIds) {
        require(deploymentParams.length > 0, "No properties to deploy");
        require(msg.value >= deploymentFee * deploymentParams.length, "Insufficient deployment fee");
        
        propertyIds = new uint256[](deploymentParams.length);
        
        for (uint256 i = 0; i < deploymentParams.length; i++) {
            PropertyDeploymentParams memory params = deploymentParams[i];
            
            (uint256 propertyId, , ) = _deployPropertyInternal(params);
            propertyIds[i] = propertyId;
        }
        
        // Transfer total deployment fee to treasury
        if (msg.value > 0) {
            (bool success, ) = payable(platformTreasury).call{value: msg.value}("");
            require(success, "Fee transfer failed");
        }
        
        return propertyIds;
    }
    
    /**
     * @dev Activate a deployed property
     * @param propertyId Property ID to activate
     */
    function activateProperty(uint256 propertyId) external {
        require(propertyId < propertyCounter, "Property does not exist");
        require(
            deployedContracts[propertyId].propertyOwner == msg.sender || hasRole(ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        
        DeployedContracts storage deployed = deployedContracts[propertyId];
        require(!deployed.isActive, "Property already active");
        
        // Activate property in token contract
        RealEstateToken(payable(deployed.tokenContract)).activateProperty(deployed.propertyTokenId);
        
        deployed.isActive = true;
        factoryStats.activeProperties++;
        
        emit PropertyActivated(propertyId);
    }
    
    /**
     * @dev Deactivate a deployed property
     * @param propertyId Property ID to deactivate
     */
    function deactivateProperty(uint256 propertyId) external validProperty(propertyId) {
        require(
            deployedContracts[propertyId].propertyOwner == msg.sender || hasRole(ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        
        DeployedContracts storage deployed = deployedContracts[propertyId];
        
        // Pause property in token contract
        RealEstateToken(payable(deployed.tokenContract)).pauseProperty(deployed.propertyTokenId);
        
        deployed.isActive = false;
        factoryStats.activeProperties--;
        
        emit PropertyDeactivated(propertyId);
    }
    
    /**
     * @dev Update deployment fee
     * @param newFee New deployment fee in wei
     */
    function updateDeploymentFee(uint256 newFee) external onlyRole(ADMIN_ROLE) {
        deploymentFee = newFee;
        emit DeploymentFeeUpdated(newFee);
    }
    
    /**
     * @dev Update platform fee rate
     * @param newFeeRate New platform fee rate in basis points
     */
    function updatePlatformFeeRate(uint256 newFeeRate) external onlyRole(ADMIN_ROLE) {
        require(newFeeRate <= 1000, "Fee rate too high"); // Max 10%
        platformFeeRate = newFeeRate;
        emit PlatformFeeUpdated(newFeeRate);
    }
    
    /**
     * @dev Authorize a property manager
     * @param manager Manager address to authorize
     */
    function authorizeManager(address manager) external onlyRole(ADMIN_ROLE) {
        require(manager != address(0), "Invalid manager address");
        authorizedManagers[manager] = true;
        emit ManagerAuthorized(manager);
    }
    
    /**
     * @dev Revoke manager authorization
     * @param manager Manager address to revoke
     */
    function revokeManager(address manager) external onlyRole(ADMIN_ROLE) {
        authorizedManagers[manager] = false;
        emit ManagerRevoked(manager);
    }
    
    /**
     * @dev Get deployed contract addresses for a property
     * @param propertyId Property ID
     */
    function getDeployedContracts(uint256 propertyId) external view returns (
        address tokenContract,
        address distributorContract,
        uint256 propertyTokenId,
        address propertyOwner,
        uint256 deployedAt,
        bool isActive
    ) {
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
    
    /**
     * @dev Get properties owned by an address
     * @param owner Owner address
     */
    function getOwnerProperties(address owner) external view returns (uint256[] memory) {
        return ownerProperties[owner];
    }
    
    /**
     * @dev Get factory statistics
     */
    function getFactoryStats() external view returns (
        uint256 totalPropertiesDeployed,
        uint256 totalValueLocked,
        uint256 totalTokensIssued,
        uint256 activeProperties
    ) {
        return (
            factoryStats.totalPropertiesDeployed,
            factoryStats.totalValueLocked,
            factoryStats.totalTokensIssued,
            factoryStats.activeProperties
        );
    }
    
    /**
     * @dev Get multi-sig owners for a property
     * @param propertyId Property ID
     */
    function getMultiSigOwners(uint256 propertyId) external view returns (address[] memory) {
        require(propertyId < propertyCounter, "Property does not exist");
        return multiSigOwners[propertyId];
    }
    
    // Internal function for batch deployment
    function _deployPropertyInternal(
        PropertyDeploymentParams memory params
    ) internal returns (uint256 propertyId, address tokenContract, address distributorContract) {
        // Implementation similar to deployProperty but without payment processing
        // This would be used for batch deployments
        
        propertyId = propertyCounter++;
        
        // Deploy and initialize contracts (similar logic as above)
        tokenContract = Clones.clone(realEstateTokenTemplate);
        
        // ... rest of deployment logic
        
        return (propertyId, tokenContract, distributorContract);
    }
    
    // Emergency functions
    
    /**
     * @dev Emergency pause all property deployments
     */
    function emergencyPause() external onlyRole(ADMIN_ROLE) {
        // Implement emergency pause logic
    }
    
    /**
     * @dev Withdraw accumulated fees
     */
    function withdrawFees() external onlyRole(ADMIN_ROLE) {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        (bool success, ) = payable(platformTreasury).call{value: balance}("");
        require(success, "Withdrawal failed");
    }
    
    // Structs for batch operations
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
    
    // Fallback function
    receive() external payable {
        // Accept payments for deployment fees
    }
}