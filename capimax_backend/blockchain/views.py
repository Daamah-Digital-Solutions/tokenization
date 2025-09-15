"""
Blockchain API Views for Capimax Real Estate Tokenization Platform.

This module provides comprehensive REST API endpoints for blockchain operations
including contract management, transaction monitoring, and token operations.
"""

import logging
from decimal import Decimal
from typing import Dict, Any, Optional

from django.db.models import Q, Sum, Count, Avg
from django.utils import timezone
from django.conf import settings
from django.core.cache import cache

from rest_framework import status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination

from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from .models import (
    BlockchainNetwork, SmartContract, TokenTransaction, 
    ContractEvent, TokenBalance, RentalDistribution, GasTracker
)
from .serializers import (
    BlockchainNetworkSerializer, SmartContractSerializer, SmartContractSummarySerializer,
    TokenTransactionSerializer, ContractEventSerializer, TokenBalanceSerializer,
    RentalDistributionSerializer, GasTrackerSerializer, ContractDeploymentRequestSerializer,
    TokenMintRequestSerializer, RentalDistributionRequestSerializer, BlockchainStatsSerializer,
    UserTokenPortfolioSerializer
)
from .services.web3_service import Web3Service
from .services.contract_deployment import ContractDeploymentService
from .services.transaction_monitor import TransactionMonitor
from .services.property_tokenization_service import PropertyTokenizationService


logger = logging.getLogger(__name__)


class BlockchainNetworkViewSet(ModelViewSet):
    """
    ViewSet for blockchain network management.
    
    Provides CRUD operations for blockchain network configurations
    and network status information.
    """
    
    queryset = BlockchainNetwork.objects.all()
    serializer_class = BlockchainNetworkSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_permissions(self):
        """Custom permissions based on action."""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [permissions.IsAdminUser]
        else:
            permission_classes = [permissions.IsAuthenticated]
        
        return [permission() for permission in permission_classes]
    
    @swagger_auto_schema(
        operation_description="Get network status and current block information",
        responses={200: openapi.Response('Network status', openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'network_name': openapi.Schema(type=openapi.TYPE_STRING),
                'chain_id': openapi.Schema(type=openapi.TYPE_INTEGER),
                'current_block': openapi.Schema(type=openapi.TYPE_INTEGER),
                'gas_price_gwei': openapi.Schema(type=openapi.TYPE_NUMBER),
                'connected': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                'block_timestamp': openapi.Schema(type=openapi.TYPE_INTEGER),
            }
        ))}
    )
    @action(detail=True, methods=['get'])
    def status(self, request, pk=None):
        """Get current network status and information."""
        network = self.get_object()
        
        try:
            web3_service = Web3Service(str(network.id))
            network_info = web3_service.get_network_info()
            
            return Response({
                'success': True,
                'data': network_info
            })
            
        except Exception as e:
            logger.error(f"Error getting network status: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @swagger_auto_schema(
        operation_description="Update gas prices for the network",
        responses={200: openapi.Response('Gas prices updated')}
    )
    @action(detail=True, methods=['post'])
    def update_gas_prices(self, request, pk=None):
        """Update gas prices for the network."""
        network = self.get_object()
        
        try:
            web3_service = Web3Service(str(network.id))
            success = web3_service.update_gas_prices()
            
            if success:
                return Response({
                    'success': True,
                    'message': 'Gas prices updated successfully'
                })
            else:
                return Response({
                    'success': False,
                    'error': 'Failed to update gas prices'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"Error updating gas prices: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SmartContractViewSet(ModelViewSet):
    """
    ViewSet for smart contract management.
    
    Provides CRUD operations for deployed smart contracts and
    contract interaction capabilities.
    """
    
    queryset = SmartContract.objects.select_related('network', 'property_reference').all()
    serializer_class = SmartContractSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['network', 'contract_type', 'status', 'is_verified']
    search_fields = ['contract_name', 'contract_address']
    ordering_fields = ['created_at', 'deployment_block']
    ordering = ['-created_at']
    
    def get_permissions(self):
        """Custom permissions based on action."""
        if self.action in ['create', 'destroy']:
            permission_classes = [permissions.IsAdminUser]
        elif self.action in ['update', 'partial_update']:
            permission_classes = [permissions.IsAuthenticated]  # Simplified for now
        else:
            permission_classes = [permissions.IsAuthenticated]
        
        return [permission() for permission in permission_classes]
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return SmartContractSummarySerializer
        return SmartContractSerializer
    
    @swagger_auto_schema(
        operation_description="Deploy a new smart contract for a property",
        request_body=ContractDeploymentRequestSerializer,
        responses={201: openapi.Response('Contract deployed', SmartContractSerializer)}
    )
    @action(detail=False, methods=['post'])
    def deploy(self, request):
        """Deploy a new smart contract."""
        serializer = ContractDeploymentRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        validated_data = serializer.validated_data
        
        try:
            deployment_service = ContractDeploymentService(str(validated_data['network'].id))
            
            gas_settings = {}
            if validated_data.get('gas_limit'):
                gas_settings['gas_limit'] = validated_data['gas_limit']
            if validated_data.get('gas_price'):
                gas_settings['gas_price'] = validated_data['gas_price']
            
            result = deployment_service.deploy_property_contracts(
                str(validated_data['property'].id),
                validated_data['multi_sig_owners'],
                gas_settings if gas_settings else None
            )
            
            if result['token_contract']:
                contract_serializer = SmartContractSerializer(result['token_contract'])
                return Response({
                    'success': True,
                    'data': {
                        'token_contract': contract_serializer.data,
                        'distributor_contract': SmartContractSerializer(result['distributor_contract']).data if result['distributor_contract'] else None
                    }
                }, status=status.HTTP_201_CREATED)
            else:
                return Response({
                    'success': False,
                    'error': 'Contract deployment failed'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"Error deploying contract: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TokenTransactionViewSet(ReadOnlyModelViewSet):
    """
    ViewSet for blockchain token transactions.
    
    Provides read-only access to transaction records and monitoring.
    """
    
    queryset = TokenTransaction.objects.select_related(
        'contract__network', 'property_reference', 'user', 'investment_reference'
    ).all()
    serializer_class = TokenTransactionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['contract', 'transaction_type', 'status', 'user']
    search_fields = ['transaction_hash', 'from_address', 'to_address']
    ordering_fields = ['submitted_at', 'confirmed_at', 'block_number']
    ordering = ['-submitted_at']
    
    def get_queryset(self):
        """Filter queryset based on user permissions."""
        queryset = super().get_queryset()
        
        if self.request.user.is_staff:
            return queryset
        
        # Regular users can only see their own transactions
        return queryset.filter(
            Q(user=self.request.user) |
            Q(from_address__iexact=getattr(self.request.user, 'wallet_address', '')) |
            Q(to_address__iexact=getattr(self.request.user, 'wallet_address', ''))
        )


class TokenBalanceViewSet(ReadOnlyModelViewSet):
    """
    ViewSet for token balance tracking.
    
    Provides read-only access to user token balances and portfolio data.
    """
    
    queryset = TokenBalance.objects.select_related(
        'contract__network', 'user', 'property_reference'
    ).all()
    serializer_class = TokenBalanceSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['contract', 'user', 'property_reference', 'is_installment_investor']
    ordering_fields = ['balance', 'created_at', 'updated_at']
    ordering = ['-balance']
    
    def get_queryset(self):
        """Filter queryset based on user permissions."""
        queryset = super().get_queryset()
        
        if self.request.user.is_staff:
            return queryset
        
        # Regular users can only see their own balances
        return queryset.filter(user=self.request.user)


class RentalDistributionViewSet(ReadOnlyModelViewSet):
    """
    ViewSet for rental income distributions.
    
    Provides access to rental distribution records and claiming functionality.
    """
    
    queryset = RentalDistribution.objects.select_related(
        'contract__network', 'property_reference', 'distribution_transaction'
    ).all()
    serializer_class = RentalDistributionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['contract', 'property_reference', 'status', 'payment_token']
    ordering_fields = ['distribution_period', 'distributed_at', 'total_amount']
    ordering = ['-distribution_period']


class TokenOperationsView(APIView):
    """
    API view for token operations like minting and burning.
    """
    
    permission_classes = [permissions.IsAdminUser]  # Simplified for now
    
    @swagger_auto_schema(
        operation_description="Mint tokens for an investor",
        request_body=TokenMintRequestSerializer,
        responses={200: openapi.Response('Tokens minted successfully')}
    )
    def post(self, request):
        """Mint tokens for an investor."""
        serializer = TokenMintRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        validated_data = serializer.validated_data
        
        try:
            # Get contract
            contract = SmartContract.objects.get(
                contract_address__iexact=validated_data['contract_address'],
                status__in=['active', 'deployed']
            )
            
            # Initialize Web3 service
            web3_service = Web3Service(str(contract.network.id))
            
            # Call mint function
            result = web3_service.call_contract_function(
                contract_address=contract.contract_address,
                abi=contract.abi,
                function_name='mintTokens',
                args=[
                    0,  # tokenId (first property in contract)
                    validated_data['investor_address'],
                    validated_data['token_amount'],
                    validated_data['is_installment'],
                    validated_data.get('total_installments', 0)
                ]
            )
            
            if result and result['status'] == 1:
                # Create transaction record
                from accounts.models import User
                user = User.objects.filter(wallet_address__iexact=validated_data['investor_address']).first()
                
                tx_record = TokenTransaction.objects.create(
                    contract=contract,
                    property_reference=contract.property_reference,
                    user=user,
                    transaction_type='mint',
                    transaction_hash=result['transaction_hash'],
                    from_address=web3_service.account.address,
                    to_address=validated_data['investor_address'],
                    token_id=0,
                    token_amount=Decimal(str(validated_data['token_amount'])),
                    gas_used=result['gas_used'],
                    transaction_fee=Decimal(str(result['transaction_fee'])),
                    block_number=result['block_number'],
                    status='confirmed'
                )
                
                return Response({
                    'success': True,
                    'data': {
                        'transaction_hash': result['transaction_hash'],
                        'tokens_minted': validated_data['token_amount'],
                        'investor_address': validated_data['investor_address'],
                        'transaction_id': tx_record.id
                    }
                })
            else:
                return Response({
                    'success': False,
                    'error': 'Token minting failed'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"Error minting tokens: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BlockchainStatsView(APIView):
    """
    API view for blockchain statistics and analytics.
    """
    
    permission_classes = [permissions.IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="Get comprehensive blockchain statistics",
        responses={200: openapi.Response('Blockchain statistics', BlockchainStatsSerializer)}
    )
    def get(self, request):
        """Get comprehensive blockchain statistics."""
        try:
            # Cache key for stats
            cache_key = 'blockchain_stats'
            cached_stats = cache.get(cache_key)
            
            if cached_stats:
                return Response({
                    'success': True,
                    'data': cached_stats
                })
            
            # Calculate stats
            stats = {
                'total_contracts': SmartContract.objects.count(),
                'active_contracts': SmartContract.objects.filter(status='active').count(),
                'total_transactions': TokenTransaction.objects.count(),
                'confirmed_transactions': TokenTransaction.objects.filter(status='confirmed').count(),
                'total_volume': TokenTransaction.objects.filter(
                    status='confirmed'
                ).aggregate(Sum('value_wei'))['value_wei__sum'] or 0,
                'total_gas_used': TokenTransaction.objects.filter(
                    status='confirmed'
                ).aggregate(Sum('gas_used'))['gas_used__sum'] or 0,
                'average_gas_price': TokenTransaction.objects.filter(
                    status='confirmed'
                ).aggregate(Avg('gas_price'))['gas_price__avg'] or 0,
            }
            
            # Network-specific stats
            network_stats = {}
            for network in BlockchainNetwork.objects.filter(is_active=True):
                network_contracts = SmartContract.objects.filter(network=network)
                network_stats[network.name] = {
                    'contracts': network_contracts.count(),
                    'active_contracts': network_contracts.filter(status='active').count(),
                    'transactions': TokenTransaction.objects.filter(contract__network=network).count()
                }
            
            stats['network_stats'] = network_stats
            
            # Property-specific stats
            stats['properties_tokenized'] = SmartContract.objects.filter(
                contract_type='real_estate_token'
            ).count()
            
            stats['total_tokens_minted'] = TokenBalance.objects.aggregate(
                Sum('balance')
            )['balance__sum'] or 0
            
            stats['active_investors'] = TokenBalance.objects.values('user').distinct().count()
            
            stats['rental_distributions_count'] = RentalDistribution.objects.count()
            
            stats['total_rental_distributed'] = RentalDistribution.objects.filter(
                status='completed'
            ).aggregate(Sum('net_amount'))['net_amount__sum'] or 0
            
            # Cache stats for 5 minutes
            cache.set(cache_key, stats, 300)
            
            return Response({
                'success': True,
                'data': stats
            })
            
        except Exception as e:
            logger.error(f"Error getting blockchain stats: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GasTrackerViewSet(ReadOnlyModelViewSet):
    """
    ViewSet for gas price tracking and optimization.
    """
    
    queryset = GasTracker.objects.select_related('network').all()
    serializer_class = GasTrackerSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['network']
    ordering = ['-timestamp']


class ContractEventViewSet(ReadOnlyModelViewSet):
    """
    ViewSet for contract event monitoring.
    """
    
    queryset = ContractEvent.objects.select_related(
        'transaction__contract', 'contract__network'
    ).all()
    serializer_class = ContractEventSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['contract', 'event_type', 'transaction__status']
    ordering = ['-created_at']


class PropertyTokenizationView(APIView):
    """
    API view for property tokenization operations.
    """
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get_permissions(self):
        """Custom permissions based on action."""
        if self.request.method == 'POST':
            permission_classes = [permissions.IsAuthenticated]  # Property owners and admins
        else:
            permission_classes = [permissions.IsAuthenticated]
        
        return [permission() for permission in permission_classes]
    
    @swagger_auto_schema(
        operation_description="Tokenize a property by deploying smart contracts",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'property_id': openapi.Schema(type=openapi.TYPE_STRING),
                'total_tokens': openapi.Schema(type=openapi.TYPE_INTEGER),
                'token_price': openapi.Schema(type=openapi.TYPE_NUMBER),
                'lockup_period_days': openapi.Schema(type=openapi.TYPE_INTEGER, default=365),
                'early_exit_fee_rate': openapi.Schema(type=openapi.TYPE_INTEGER, default=1000),
                'rental_yield_rate': openapi.Schema(type=openapi.TYPE_INTEGER, default=500),
                'multi_sig_owners': openapi.Schema(type=openapi.TYPE_ARRAY, items=openapi.Schema(type=openapi.TYPE_STRING)),
                'network_id': openapi.Schema(type=openapi.TYPE_STRING)
            },
            required=['property_id', 'total_tokens', 'token_price']
        ),
        responses={200: openapi.Response('Property tokenized successfully')}
    )
    def post(self, request):
        """Tokenize a property."""
        try:
            data = request.data
            network_id = data.get('network_id')
            
            tokenization_service = PropertyTokenizationService(network_id)
            
            result = tokenization_service.tokenize_property(
                property_id=data['property_id'],
                total_tokens=data['total_tokens'],
                token_price=Decimal(str(data['token_price'])),
                lockup_period_days=data.get('lockup_period_days', 365),
                early_exit_fee_rate=data.get('early_exit_fee_rate', 1000),
                rental_yield_rate=data.get('rental_yield_rate', 500),
                multi_sig_owners=data.get('multi_sig_owners')
            )
            
            return Response(result, status=status.HTTP_200_OK if result['success'] else status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            logger.error(f"Error in property tokenization: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @swagger_auto_schema(
        operation_description="Get tokenization statistics for a property",
        responses={200: openapi.Response('Property tokenization statistics')}
    )
    def get(self, request):
        """Get property tokenization statistics."""
        property_id = request.query_params.get('property_id')
        network_id = request.query_params.get('network_id')
        
        if not property_id:
            return Response({
                'success': False,
                'error': 'property_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            tokenization_service = PropertyTokenizationService(network_id)
            result = tokenization_service.get_property_tokenization_stats(property_id)
            
            return Response(result, status=status.HTTP_200_OK if result['success'] else status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            logger.error(f"Error getting tokenization stats: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class InvestmentProcessingView(APIView):
    """
    API view for processing investments and minting tokens.
    """
    
    permission_classes = [permissions.IsAuthenticated]  # Simplified for now
    
    @swagger_auto_schema(
        operation_description="Process a confirmed investment by minting tokens",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'investment_id': openapi.Schema(type=openapi.TYPE_STRING),
                'mint_tokens_immediately': openapi.Schema(type=openapi.TYPE_BOOLEAN, default=True),
                'network_id': openapi.Schema(type=openapi.TYPE_STRING)
            },
            required=['investment_id']
        ),
        responses={200: openapi.Response('Investment processed successfully')}
    )
    def post(self, request):
        """Process an investment by minting tokens."""
        try:
            data = request.data
            network_id = data.get('network_id')
            
            tokenization_service = PropertyTokenizationService(network_id)
            
            result = tokenization_service.process_investment(
                investment_id=data['investment_id'],
                mint_tokens_immediately=data.get('mint_tokens_immediately', True)
            )
            
            return Response(result, status=status.HTTP_200_OK if result['success'] else status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            logger.error(f"Error processing investment: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RentalIncomeView(APIView):
    """
    API view for rental income distribution operations.
    """
    
    permission_classes = [permissions.IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="Distribute rental income to token holders",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'property_id': openapi.Schema(type=openapi.TYPE_STRING),
                'total_amount': openapi.Schema(type=openapi.TYPE_NUMBER),
                'distribution_period': openapi.Schema(type=openapi.TYPE_STRING),
                'network_id': openapi.Schema(type=openapi.TYPE_STRING)
            },
            required=['property_id', 'total_amount', 'distribution_period']
        ),
        responses={200: openapi.Response('Rental income distributed successfully')}
    )
    def post(self, request):
        """Distribute rental income."""
        try:
            data = request.data
            network_id = data.get('network_id')
            
            tokenization_service = PropertyTokenizationService(network_id)
            
            result = tokenization_service.distribute_rental_income(
                property_id=data['property_id'],
                total_amount=Decimal(str(data['total_amount'])),
                distribution_period=data['distribution_period']
            )
            
            return Response(result, status=status.HTTP_200_OK if result['success'] else status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            logger.error(f"Error distributing rental income: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @swagger_auto_schema(
        operation_description="Claim rental income for an investor",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'property_id': openapi.Schema(type=openapi.TYPE_STRING),
                'distribution_ids': openapi.Schema(type=openapi.TYPE_ARRAY, items=openapi.Schema(type=openapi.TYPE_INTEGER)),
                'network_id': openapi.Schema(type=openapi.TYPE_STRING)
            },
            required=['property_id']
        ),
        responses={200: openapi.Response('Rental income claimed successfully')}
    )
    def patch(self, request):
        """Claim rental income for the authenticated user."""
        try:
            data = request.data
            network_id = data.get('network_id')
            
            tokenization_service = PropertyTokenizationService(network_id)
            
            result = tokenization_service.claim_rental_income(
                user_id=str(request.user.id),
                property_id=data['property_id'],
                distribution_ids=data.get('distribution_ids')
            )
            
            return Response(result, status=status.HTTP_200_OK if result['success'] else status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            logger.error(f"Error claiming rental income: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class InvestorPortfolioView(APIView):
    """
    API view for investor blockchain portfolio.
    """
    
    permission_classes = [permissions.IsAuthenticated]
    
    @swagger_auto_schema(
        operation_description="Get comprehensive blockchain portfolio for an investor",
        responses={200: openapi.Response('Investor portfolio', UserTokenPortfolioSerializer)}
    )
    def get(self, request):
        """Get investor portfolio."""
        user_id = request.query_params.get('user_id', str(request.user.id))
        network_id = request.query_params.get('network_id')
        
        # Only allow users to view their own portfolio unless they're staff
        if user_id != str(request.user.id) and not request.user.is_staff:
            return Response({
                'success': False,
                'error': 'Permission denied'
            }, status=status.HTTP_403_FORBIDDEN)
        
        try:
            tokenization_service = PropertyTokenizationService(network_id)
            result = tokenization_service.get_investor_portfolio(user_id)
            
            return Response(result, status=status.HTTP_200_OK if result['success'] else status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            logger.error(f"Error getting investor portfolio: {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BlockchainHealthView(APIView):
    """
    API view for blockchain service health and status.
    """
    
    permission_classes = [permissions.AllowAny]  # Public health check
    
    @swagger_auto_schema(
        operation_description="Check blockchain service health and connectivity",
        responses={200: openapi.Response('Service health status')}
    )
    def get(self, request):
        """Get blockchain service health."""
        health_data = {
            'service_name': 'Capimax Blockchain Service',
            'version': '1.0.0',
            'timestamp': timezone.now().isoformat(),
            'networks': [],
            'overall_status': 'healthy'
        }
        
        try:
            # Check all active networks
            networks = BlockchainNetwork.objects.filter(is_active=True)
            issues_found = 0
            
            for network in networks:
                try:
                    web3_service = Web3Service(str(network.id))
                    if web3_service.w3 and web3_service.w3.is_connected():
                        current_block = web3_service.get_current_block_number()
                        network_data = {
                            'network_id': str(network.id),
                            'network_name': network.name,
                            'chain_id': network.chain_id,
                            'status': 'connected',
                            'current_block': current_block,
                            'rpc_url': network.rpc_url,
                            'last_checked': timezone.now().isoformat()
                        }
                    else:
                        network_data = {
                            'network_id': str(network.id),
                            'network_name': network.name,
                            'chain_id': network.chain_id,
                            'status': 'disconnected',
                            'error': 'Failed to connect to RPC',
                            'rpc_url': network.rpc_url,
                            'last_checked': timezone.now().isoformat()
                        }
                        issues_found += 1
                        
                except Exception as e:
                    network_data = {
                        'network_id': str(network.id),
                        'network_name': network.name,
                        'chain_id': network.chain_id,
                        'status': 'error',
                        'error': str(e),
                        'rpc_url': network.rpc_url,
                        'last_checked': timezone.now().isoformat()
                    }
                    issues_found += 1
                
                health_data['networks'].append(network_data)
            
            # Update overall status
            if issues_found == len(networks) and len(networks) > 0:
                health_data['overall_status'] = 'unhealthy'
            elif issues_found > 0:
                health_data['overall_status'] = 'degraded'
            
            # Add service statistics
            health_data['statistics'] = {
                'total_networks': len(networks),
                'connected_networks': len(networks) - issues_found,
                'total_contracts': SmartContract.objects.count(),
                'active_contracts': SmartContract.objects.filter(status='active').count(),
                'total_transactions': TokenTransaction.objects.count(),
                'confirmed_transactions': TokenTransaction.objects.filter(status='confirmed').count()
            }
            
            return Response(health_data)
            
        except Exception as e:
            logger.error(f"Error checking blockchain health: {str(e)}")
            health_data['overall_status'] = 'error'
            health_data['error'] = str(e)
            return Response(health_data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
