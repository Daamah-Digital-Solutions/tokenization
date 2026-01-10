"""
Management command to populate blockchain networks in database.

This command sets up the blockchain networks (Polygon Mumbai, BSC Testnet,
and their mainnet versions) in the database for the Capimax Tokenization Platform.
"""
from django.core.management.base import BaseCommand
from blockchain.models import BlockchainNetwork


class Command(BaseCommand):
    help = 'Setup blockchain networks (Polygon Mumbai, BSC Testnet, and mainnets)'

    def handle(self, *args, **kwargs):
        networks = [
            {
                'name': 'Polygon Amoy Testnet',
                'network_type': 'polygon',
                'environment': 'testnet',
                'chain_id': 80002,  # Amoy testnet (Mumbai replacement)
                'rpc_url': 'https://rpc-amoy.polygon.technology/',
                'explorer_url': 'https://amoy.polygonscan.com',
                'native_currency': 'MATIC',
                'gas_price_gwei': 30.0,
                'block_confirmation_count': 12,
                'is_active': True
            },
            {
                'name': 'BNB Smart Chain Testnet',
                'network_type': 'bsc',
                'environment': 'testnet',
                'chain_id': 97,
                'rpc_url': 'https://data-seed-prebsc-1-s1.binance.org:8545',
                'explorer_url': 'https://testnet.bscscan.com',
                'native_currency': 'BNB',
                'gas_price_gwei': 10.0,
                'block_confirmation_count': 15,
                'is_active': True
            },
            {
                'name': 'Polygon Mainnet',
                'network_type': 'polygon',
                'environment': 'mainnet',
                'chain_id': 137,
                'rpc_url': 'https://polygon-rpc.com',
                'explorer_url': 'https://polygonscan.com',
                'native_currency': 'MATIC',
                'gas_price_gwei': 50.0,
                'block_confirmation_count': 128,
                'is_active': False  # Not active yet - will be enabled for production
            },
            {
                'name': 'BNB Smart Chain Mainnet',
                'network_type': 'bsc',
                'environment': 'mainnet',
                'chain_id': 56,
                'rpc_url': 'https://bsc-dataseed.binance.org',
                'explorer_url': 'https://bscscan.com',
                'native_currency': 'BNB',
                'gas_price_gwei': 5.0,
                'block_confirmation_count': 20,
                'is_active': False  # Not active yet - will be enabled for production
            },
        ]

        self.stdout.write(self.style.SUCCESS('\nSetting up blockchain networks...\n'))

        for network_data in networks:
            # Try to get existing network by network_type and environment (unique together)
            # or by chain_id
            try:
                network = BlockchainNetwork.objects.get(
                    network_type=network_data['network_type'],
                    environment=network_data['environment']
                )
                # Update all fields
                for key, value in network_data.items():
                    setattr(network, key, value)
                network.save()
                self.stdout.write(
                    self.style.WARNING(f'[WARNING] Updated {network.name} (already existed)')
                )
                created = False
            except BlockchainNetwork.DoesNotExist:
                # Create new network
                network = BlockchainNetwork.objects.create(**network_data)
                self.stdout.write(
                    self.style.SUCCESS(f'[OK] Created {network.name}')
                )
                created = True

        self.stdout.write(self.style.SUCCESS('\n[SUCCESS] All networks configured successfully!\n'))

        # Display active networks
        active_networks = BlockchainNetwork.objects.filter(is_active=True)
        self.stdout.write(self.style.SUCCESS(f'\nActive Networks ({active_networks.count()}):'))
        for network in active_networks:
            self.stdout.write(f'  - {network.name} (Chain ID: {network.chain_id})')

        # Display inactive networks
        inactive_networks = BlockchainNetwork.objects.filter(is_active=False)
        if inactive_networks.exists():
            self.stdout.write(self.style.WARNING(f'\nInactive Networks ({inactive_networks.count()}):'))
            for network in inactive_networks:
                self.stdout.write(f'  - {network.name} (Chain ID: {network.chain_id})')

        self.stdout.write('')
