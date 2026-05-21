"""
Register the latest hardhat deployment into the SmartContract registry.

Reads ``blockchain/contracts/deployments/<network>-latest.json`` (written by
``scripts/deploy.js``) and the corresponding artifact ABIs, then upserts a
``SmartContract`` row per deployed contract.

This is the canonical way to bind a fresh deployment into Django — it is
idempotent (uses ``update_or_create``) so re-running it after a redeploy
just overwrites the addresses and ABIs.

Usage:
    python manage.py register_deployed_contracts --network bscTestnet
"""

import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from blockchain.models import BlockchainNetwork, SmartContract


# Maps the hardhat ``network.name`` key to the BlockchainNetwork ``chain_id``
# we use to look it up. Mirrors the rows seeded by ``setup_networks``.
NETWORK_CHAIN_ID = {
    'bscTestnet': 97,
    'amoy': 80002,
    'bscMainnet': 56,
    'polygon': 137,
}

# Maps the deployment JSON keys to (CONTRACT_TYPE, artifact_basename).
# These names mirror what ``scripts/deploy.js`` emits.
CONTRACT_SPECS = [
    ('RealEstateTokenTemplate', 'real_estate_token', 'RealEstateToken'),
    ('RentalIncomeDistributorTemplate', 'rental_distributor', 'RentalIncomeDistributor'),
    ('PropertyContractFactory', 'property_factory', 'PropertyContractFactory'),
]


class Command(BaseCommand):
    help = "Register the latest hardhat deployment into the SmartContract table."

    def add_arguments(self, parser):
        parser.add_argument(
            '--network',
            default='bscTestnet',
            help="Hardhat network name (matches *-latest.json prefix).",
        )

    def handle(self, *args, **opts):
        network_name = opts['network']
        chain_id = NETWORK_CHAIN_ID.get(network_name)
        if not chain_id:
            raise CommandError(f"Unknown hardhat network: {network_name}. "
                               f"Known: {sorted(NETWORK_CHAIN_ID)}")

        try:
            network = BlockchainNetwork.objects.get(chain_id=chain_id)
        except BlockchainNetwork.DoesNotExist:
            raise CommandError(
                f"BlockchainNetwork with chain_id={chain_id} not found. "
                f"Run ``python manage.py setup_networks`` first."
            )

        # Resolve paths.
        contracts_dir = Path(__file__).resolve().parents[3] / 'blockchain' / 'contracts'
        deployment_file = contracts_dir / 'deployments' / f'{network_name}-latest.json'
        if not deployment_file.exists():
            raise CommandError(
                f"Deployment file not found: {deployment_file}. "
                f"Run ``npx hardhat run scripts/deploy.js --network {network_name}`` first."
            )

        deployment = json.loads(deployment_file.read_text())
        addresses = deployment['contracts']
        deployer = deployment['deployer']
        platform_treasury = addresses.get('PlatformTreasury', deployer)

        # Compiler version from hardhat config (kept in sync manually for now).
        compiler_version = '0.8.19'

        for deploy_key, contract_type, artifact_name in CONTRACT_SPECS:
            address = addresses.get(deploy_key)
            if not address:
                self.stdout.write(self.style.WARNING(
                    f"Skipping {deploy_key} — not present in deployment JSON."
                ))
                continue

            # Pull ABI. Prefer the committed `abis/<name>.json` (ABI-only,
            # ~25 KB, checked in) over the hardhat artifact (~100 KB,
            # gitignored because the bytecode is regenerated on every
            # compile). Falling back to the artifact keeps the local dev
            # path working when devs have just run `hardhat compile`.
            abi = None
            abi_only_path = contracts_dir / 'abis' / f'{artifact_name}.json'
            artifact_path = (
                contracts_dir / 'artifacts' / 'src' / f'{artifact_name}.sol' / f'{artifact_name}.json'
            )
            if abi_only_path.exists():
                abi = json.loads(abi_only_path.read_text())['abi']
            elif artifact_path.exists():
                abi = json.loads(artifact_path.read_text())['abi']
            else:
                raise CommandError(
                    f"ABI not found for {artifact_name}. Tried:\n"
                    f"  {abi_only_path}\n  {artifact_path}\n"
                    f"Run `npx hardhat compile` to regenerate artifacts, or "
                    f"`python -m blockchain.scripts.extract_abis` to refresh "
                    f"the committed ABI-only files."
                )

            # Constructor args — only the factory has any.
            constructor_args = {}
            if deploy_key == 'PropertyContractFactory':
                constructor_args = {
                    'tokenTemplate': addresses['RealEstateTokenTemplate'],
                    'distributorTemplate': addresses['RentalIncomeDistributorTemplate'],
                    'platformTreasury': platform_treasury,
                }

            obj, created = SmartContract.objects.update_or_create(
                network=network,
                contract_type=contract_type,
                property_reference=None,  # These are templates, not per-property instances.
                defaults={
                    'contract_address': address,
                    'contract_name': artifact_name,
                    'abi': abi,
                    'compiler_version': compiler_version,
                    'constructor_args': constructor_args,
                    'status': 'active',
                },
            )
            verb = 'Created' if created else 'Updated'
            self.stdout.write(self.style.SUCCESS(
                f"  [{verb}] {artifact_name} @ {address}"
            ))

        self.stdout.write(self.style.SUCCESS(
            f"\nRegistered deployment ({network_name}, chain {chain_id}, "
            f"deployed by {deployer})."
        ))
