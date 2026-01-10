"""
Test script to verify Web3 connection to blockchain networks.

This script tests connectivity to all active blockchain networks configured
in the Capimax Tokenization Platform and reports connection status, chain info,
and account balances.
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'capimax_backend.settings.development')
django.setup()

from blockchain.services.web3_service import Web3Service
from blockchain.models import BlockchainNetwork
from web3 import Web3


def test_network_connection(network):
    """Test connection to a specific network"""
    print(f"\n{'='*60}")
    print(f"Testing: {network.name}")
    print(f"{'='*60}")

    try:
        # Initialize Web3 service
        service = Web3Service()
        success = service.initialize_network(str(network.id))

        if not success:
            print(f"[FAIL] Failed to initialize {network.name}")
            return False

        # Get chain info
        chain_id = service.w3.eth.chain_id
        latest_block = service.w3.eth.block_number

        print(f"[OK] Connected to {network.name}")
        print(f"   Chain ID: {chain_id}")
        print(f"   Latest Block: {latest_block}")

        # Test account
        if service.account:
            balance = service.w3.eth.get_balance(service.account.address)
            balance_ether = Web3.from_wei(balance, 'ether')
            print(f"   Account: {service.account.address}")
            print(f"   Balance: {balance_ether:.4f} {network.native_currency}")

            if balance == 0:
                print(f"   [WARNING] Account has zero balance!")
                print(f"   Get testnet tokens from faucet:")
                if network.network_type == 'polygon':
                    print(f"   https://faucet.polygon.technology/")
                elif network.network_type == 'bsc':
                    print(f"   https://testnet.bnbchain.org/faucet-smart")
        else:
            print(f"   [WARNING] No account configured")
            print(f"   Set BLOCKCHAIN_PRIVATE_KEY in .env to test account balance")

        return True

    except Exception as e:
        print(f"[FAIL] Error connecting to {network.name}: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def main():
    print("\n" + "="*60)
    print("BLOCKCHAIN NETWORK CONNECTION TEST")
    print("Capimax Real Estate Tokenization Platform")
    print("="*60)

    # Get all active networks
    networks = BlockchainNetwork.objects.filter(is_active=True)

    if not networks.exists():
        print("[FAIL] No active networks found!")
        print("Run: python manage.py setup_networks")
        return

    print(f"\nFound {networks.count()} active network(s)")

    results = {}
    for network in networks:
        results[network.name] = test_network_connection(network)

    # Summary
    print(f"\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")

    for network_name, success in results.items():
        status = "[PASS]" if success else "[FAIL]"
        print(f"{status} - {network_name}")

    all_passed = all(results.values())
    if all_passed:
        print(f"\n[SUCCESS] All networks connected successfully!")
        print("\nNext Steps:")
        print("1. If account balance is 0, fund testnet account from faucets")
        print("2. Deploy smart contracts: brownie run scripts/deploy.py --network polygon-mumbai")
        print("3. Proceed to Phase 2 of the blockchain roadmap")
    else:
        print(f"\n[FAIL] Some networks failed to connect")
        print("\nTroubleshooting:")
        print("1. Check network RPC URLs in database")
        print("2. Verify internet connection")
        print("3. Check firewall settings")
        print("4. Try alternative RPC endpoints")
        sys.exit(1)


if __name__ == '__main__':
    main()
