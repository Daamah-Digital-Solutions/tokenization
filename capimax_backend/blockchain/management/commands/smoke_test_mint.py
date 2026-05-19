"""
End-to-end smoke test: tokenize a property and mint tokens on real chain.

Steps:
  1. Pick (or create) a Property and reset its on-chain state.
  2. Call PropertyContractFactory.deployProperty() to deploy a per-property
     RealEstateToken + RentalIncomeDistributor via clones.
  3. Persist the deployed addresses into the Property model and create
     SmartContract registry rows pointing at the per-property contracts.
  4. Assign a real wallet address to a test investor.
  5. Mint a small number of tokens directly on the deployed contract.
  6. Print BSCScan links for every transaction submitted.

Run after ``register_deployed_contracts`` has bound the factory addresses.

Usage:
    python manage.py smoke_test_mint --property-id <uuid-or-skyline>
"""

import time
from decimal import Decimal

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from accounts.models import User
from blockchain.models import BlockchainNetwork, SmartContract
from properties.models import Property
from web3 import Web3
from eth_account import Account


def _bscscan(tx_hash: str) -> str:
    return f"https://testnet.bscscan.com/tx/0x{tx_hash}"


class Command(BaseCommand):
    help = "Tokenize a property + mint tokens against the live deployed factory."

    def add_arguments(self, parser):
        parser.add_argument('--property-id', default='skyline',
                            help="UUID of property to tokenize, or 'skyline' (default) for the seeded demo row.")
        parser.add_argument('--investor-email', default='investor@test.com',
                            help="Email of investor to mint tokens to.")
        parser.add_argument('--tokens', type=int, default=10,
                            help="Number of tokens to mint.")
        parser.add_argument('--installments', type=int, default=0,
                            help="If >0, mint as an installment plan and run that many "
                                 "processInstallment() calls. Each call releases "
                                 "tokens/installments to the investor's wallet.")

    def handle(self, *args, **opts):
        # ----- Resolve property + investor ------------------------------------
        if opts['property_id'] == 'skyline':
            prop = Property.objects.filter(title__icontains='Skyline').first()
            if not prop:
                raise CommandError("No 'Skyline' property found.")
        else:
            prop = Property.objects.get(id=opts['property_id'])

        investor = User.objects.get(email=opts['investor_email'])

        # ----- Resolve network + factory --------------------------------------
        bsc = BlockchainNetwork.objects.get(chain_id=97)
        factory_sc = SmartContract.objects.get(network=bsc, contract_type='property_factory')

        w3 = Web3(Web3.HTTPProvider(bsc.rpc_url))
        signer = Account.from_key(settings.BLOCKCHAIN_PRIVATE_KEY)
        self.stdout.write(f"Signer: {signer.address}")
        self.stdout.write(f"Balance: {w3.from_wei(w3.eth.get_balance(signer.address), 'ether')} tBNB")

        factory = w3.eth.contract(
            address=Web3.to_checksum_address(factory_sc.contract_address),
            abi=factory_sc.abi,
        )

        # ----- 1. Use signer wallet as the investor wallet --------------------
        # The seeded test wallets are placeholders. To do a real mint we need
        # the platform signer to mint to an address it controls.
        investor.wallet_address = signer.address
        investor.save(update_fields=['wallet_address'])
        self.stdout.write(f"Investor {investor.email} → wallet {signer.address}")

        # ----- 2. Reset property on-chain state if needed ---------------------
        # If a previous run wired a fake or stale address, clear it so we
        # can deploy a fresh per-property contract.
        has_real_address = (
            prop.smart_contract_address
            and prop.smart_contract_address.startswith('0x')
            and len(prop.smart_contract_address) == 42
        )
        if prop.smart_contract_address and not has_real_address:
            self.stdout.write(self.style.WARNING(
                f"Clearing stale contract address: {prop.smart_contract_address}"))
            prop.smart_contract_address = ''
            prop.save(update_fields=['smart_contract_address'])
            has_real_address = False

        # Idempotency: skip deployment if a real per-property contract is
        # already wired. Look up the propertyId by querying the chain.
        skip_deploy = has_real_address and SmartContract.objects.filter(
            property_reference=prop, contract_type='real_estate_token').exists()

        token_contract_address = prop.smart_contract_address if skip_deploy else None
        property_id_on_chain = None
        deploy_tx_hash = None

        if skip_deploy:
            self.stdout.write(self.style.WARNING(
                f"Property already tokenized at {prop.smart_contract_address} — skipping deployProperty."
            ))
            # ``property_id_on_chain`` here is the FACTORY's propertyId,
            # used for factory.activateProperty(). Inside the clone token
            # contract every property starts at tokenId=0 because each clone
            # holds exactly one property — see _mint() / _process_installments
            # where we explicitly pass 0 to the clone.
            sc_row = SmartContract.objects.get(property_reference=prop, contract_type='real_estate_token')
            property_id_on_chain = int(sc_row.constructor_args.get('property_id', 0))

        # ----- 3. Call factory.deployProperty() --------------------------------
        # Inputs (matching the on-chain ABI):
        #   totalSupply, category, tokenPrice, lockupPeriod, earlyExitFeeRate,
        #   rentalYieldRate, propertyURI, distributionFrequency, paymentToken,
        #   multiSigOwners_
        if skip_deploy:
            self.stdout.write(f"Reusing on-chain propertyId={property_id_on_chain}")
            # Jump straight to mint section.
            self._mint(w3, signer, prop, property_id_on_chain, opts['tokens'],
                       None, None, installments=opts['installments'])
            return

        deployment_fee = factory.functions.deploymentFee().call()
        self.stdout.write(f"Deployment fee: {w3.from_wei(deployment_fee, 'ether')} BNB")

        total_supply = int(prop.total_tokens or 1000)
        token_price_wei = w3.to_wei(Decimal(str(prop.token_price or 10)), 'ether')
        # Category: 0 = under construction, 1 = ready property
        category = 1 if str(prop.property_category) == 'ready_property' else 0

        deploy_tx = factory.functions.deployProperty(
            total_supply,
            category,
            token_price_wei,
            365 * 24 * 60 * 60,  # lockup 1 year
            1000,                # earlyExitFeeRate 10% (basis points)
            500,                 # rentalYieldRate 5% (basis points)
            f"capimax://property/{prop.id}",
            1,                   # distributionFrequency: 0=monthly, 1=quarterly
            0,                   # paymentToken: 0 = native
            # multiSigOwners — the factory requires at least
            # ``requiredConfirmations`` (default 2) entries. Both must be
            # distinct; we use the signer + a sentinel test address that
            # nobody controls (no funds, just satisfies the length check).
            [
                signer.address,
                Web3.to_checksum_address('0x000000000000000000000000000000000000dEaD'),
            ],
        ).build_transaction({
            'from': signer.address,
            'value': deployment_fee,
            'nonce': w3.eth.get_transaction_count(signer.address, 'pending'),
            'gas': 7_000_000,
            'gasPrice': w3.eth.gas_price,
            'chainId': 97,
        })
        signed = w3.eth.account.sign_transaction(deploy_tx, settings.BLOCKCHAIN_PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction).hex()
        self.stdout.write(self.style.SUCCESS(f"deployProperty tx: {_bscscan(tx_hash)}"))

        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=180)
        if receipt.status != 1:
            raise CommandError(f"deployProperty reverted: {_bscscan(tx_hash)}")

        # Decode the PropertyDeployed event to extract the new contract addresses.
        token_contract_address = None
        distributor_contract_address = None
        property_id_on_chain = None
        for log in receipt.logs:
            try:
                evt = factory.events.PropertyDeployed().process_log(log)
                property_id_on_chain = evt.args.propertyId
                token_contract_address = evt.args.tokenContract
                distributor_contract_address = evt.args.distributorContract
                break
            except Exception:
                continue

        if not token_contract_address:
            raise CommandError(
                "Could not decode PropertyDeployed event. "
                f"Inspect: {_bscscan(tx_hash)}"
            )

        self.stdout.write(self.style.SUCCESS(
            f"  on-chain propertyId={property_id_on_chain}"))
        self.stdout.write(self.style.SUCCESS(
            f"  tokenContract={token_contract_address}"))
        self.stdout.write(self.style.SUCCESS(
            f"  distributorContract={distributor_contract_address}"))

        # ----- 4. Persist into Property + SmartContract registry --------------
        prop.smart_contract_address = token_contract_address
        prop.status = 'tokenized'
        prop.save(update_fields=['smart_contract_address', 'status'])

        # Reuse the template ABIs since clones share their parent's ABI.
        token_template = SmartContract.objects.get(network=bsc, contract_type='real_estate_token',
                                                   property_reference__isnull=True)
        distributor_template = SmartContract.objects.get(network=bsc, contract_type='rental_distributor',
                                                         property_reference__isnull=True)

        token_sc, _ = SmartContract.objects.update_or_create(
            network=bsc,
            property_reference=prop,
            contract_type='real_estate_token',
            defaults={
                'contract_address': token_contract_address,
                'contract_name': 'RealEstateToken (clone)',
                'abi': token_template.abi,
                'compiler_version': token_template.compiler_version,
                'constructor_args': {
                    'parent_template': token_template.contract_address,
                    'property_id': int(property_id_on_chain),
                },
                'status': 'active',
            },
        )
        # The factory only deploys a distributor for READY_PROPERTY. Under-
        # construction properties get the zero address — don't persist that
        # as a SmartContract row, both because it's not actually a contract
        # and because the unique (network, contract_address) constraint
        # would collide with any other under-construction property.
        if distributor_contract_address and \
                int(distributor_contract_address, 16) != 0:
            SmartContract.objects.update_or_create(
                network=bsc,
                property_reference=prop,
                contract_type='rental_distributor',
                defaults={
                    'contract_address': distributor_contract_address,
                    'contract_name': 'RentalIncomeDistributor (clone)',
                    'abi': distributor_template.abi,
                    'compiler_version': distributor_template.compiler_version,
                    'constructor_args': {'parent_template': distributor_template.contract_address},
                    'status': 'active',
                },
            )

        # ----- 5. Mint tokens directly on the per-property contract -----------
        mint_hash = self._mint(w3, signer, prop, property_id_on_chain, opts['tokens'],
                               token_contract_address, token_template.abi,
                               installments=opts['installments'])

        # ----- 6. Final summary ----------------------------------------------
        self.stdout.write(self.style.SUCCESS("\n" + "=" * 60))
        self.stdout.write(self.style.SUCCESS("  Tokenization + mint complete."))
        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write(f"  Property: {prop.title} ({prop.id})")
        self.stdout.write(f"  Token contract: {token_contract_address}")
        self.stdout.write(f"  Investor wallet: {signer.address}")
        self.stdout.write(f"  Deploy tx:  {_bscscan(tx_hash)}")
        self.stdout.write(f"  Mint tx:    {_bscscan(mint_hash)}")

    def _mint(self, w3, signer, prop, property_id_on_chain, tokens_to_mint,
              token_contract_address=None, token_abi=None, installments=0):
        """Submit the on-chain mint and verify the resulting balance.

        ``property_id_on_chain`` is the FACTORY's propertyId, used only for
        factory-level calls (activateProperty). On the per-property clone we
        always reference tokenId=0 since each clone holds exactly one
        property.

        If ``installments`` > 0, mints as an installment plan (tokens escrowed
        on the contract) and runs that many ``processInstallment`` calls to
        release tokens gradually to the investor.
        """
        # If we got here from the idempotent path, resolve the contract from DB.
        if token_contract_address is None or token_abi is None:
            sc = SmartContract.objects.get(property_reference=prop, contract_type='real_estate_token')
            token_contract_address = sc.contract_address
            token_abi = sc.abi

        # Inside the cloned token contract, the property is always at tokenId=0.
        CLONE_TOKEN_ID = 0

        token = w3.eth.contract(
            address=Web3.to_checksum_address(token_contract_address),
            abi=token_abi,
        )

        # Property status comes out of the factory as DRAFT. Mint requires
        # ACTIVE. ADMIN_ROLE on the cloned token contract is held by the
        # factory itself (granted to ``msg.sender`` during initialize, which
        # is the factory) — so we must go through the factory's
        # ``activateProperty`` shim, which is callable by the property owner.
        info = token.functions.properties(CLONE_TOKEN_ID).call()
        # PropertyInfo.status is at index 3 (matches the struct ordering).
        # PropertyStatus enum: 0=DRAFT, 1=ACTIVE, 2=PAUSED, 3=COMPLETED, 4=CANCELLED
        if info[3] != 1:
            self.stdout.write(self.style.WARNING(
                f"Property status={info[3]} (need 1=ACTIVE) — calling factory.activateProperty"
            ))
            bsc_local = BlockchainNetwork.objects.get(chain_id=97)
            factory_sc_local = SmartContract.objects.get(network=bsc_local, contract_type='property_factory')
            factory_local = w3.eth.contract(
                address=Web3.to_checksum_address(factory_sc_local.contract_address),
                abi=factory_sc_local.abi,
            )
            act_tx = factory_local.functions.activateProperty(property_id_on_chain).build_transaction({
                'from': signer.address,
                'nonce': w3.eth.get_transaction_count(signer.address, 'pending'),
                'gas': 200_000,
                'gasPrice': w3.eth.gas_price,
                'chainId': 97,
            })
            signed_act = w3.eth.account.sign_transaction(act_tx, settings.BLOCKCHAIN_PRIVATE_KEY)
            act_hash = w3.eth.send_raw_transaction(signed_act.raw_transaction).hex()
            self.stdout.write(f"factory.activateProperty tx: {_bscscan(act_hash)}")
            act_receipt = w3.eth.wait_for_transaction_receipt(act_hash, timeout=180)
            if act_receipt.status != 1:
                raise CommandError(f"factory.activateProperty reverted: {_bscscan(act_hash)}")

        # mintTokens(uint256 tokenId, address investor, uint256 amount,
        #            bool isInstallment, uint256 totalInstallments)
        is_installment = installments > 0
        mint_tx = token.functions.mintTokens(
            CLONE_TOKEN_ID,
            signer.address,
            tokens_to_mint,
            is_installment,
            installments,
        ).build_transaction({
            'from': signer.address,
            'nonce': w3.eth.get_transaction_count(signer.address, 'pending'),
            'gas': 500_000,
            'gasPrice': w3.eth.gas_price,
            'chainId': 97,
        })
        signed_mint = w3.eth.account.sign_transaction(mint_tx, settings.BLOCKCHAIN_PRIVATE_KEY)
        mint_hash = w3.eth.send_raw_transaction(signed_mint.raw_transaction).hex()
        self.stdout.write(self.style.SUCCESS(
            f"mintTokens tx ({'installment' if is_installment else 'upfront'}): {_bscscan(mint_hash)}"
        ))

        mint_receipt = w3.eth.wait_for_transaction_receipt(mint_hash, timeout=180)
        if mint_receipt.status != 1:
            raise CommandError(f"mintTokens reverted: {_bscscan(mint_hash)}")

        if is_installment:
            # Tokens are held in escrow on the contract; the investor wallet
            # balance is 0 until processInstallment runs.
            escrow = token.functions.balanceOf(
                Web3.to_checksum_address(token_contract_address),
                CLONE_TOKEN_ID,
            ).call()
            self.stdout.write(self.style.SUCCESS(
                f"  on-chain escrow balance (contract holds): {escrow} tokens"
            ))
            self._process_installments(
                w3, signer, prop, CLONE_TOKEN_ID,
                tokens_to_mint, installments,
                token_contract_address, token_abi,
            )
        else:
            balance = token.functions.balanceOf(signer.address, CLONE_TOKEN_ID).call()
            self.stdout.write(self.style.SUCCESS(
                f"  on-chain balance of {signer.address} = {balance} tokens (expected >= {tokens_to_mint})"
            ))
        return mint_hash

    def _process_installments(self, w3, signer, prop, property_id_on_chain,
                              total_tokens, installments, token_contract_address,
                              token_abi):
        """Walk through ``installments`` processInstallment calls and verify
        each one moves tokens from the contract's escrow to the investor."""
        token = w3.eth.contract(
            address=Web3.to_checksum_address(token_contract_address),
            abi=token_abi,
        )
        # Even split of total tokens across installments. Remainder goes to
        # the last installment so we always end up at exactly total_tokens.
        per_installment = total_tokens // installments
        tx_hashes = []
        for i in range(installments):
            tokens_this_round = per_installment if i < installments - 1 \
                else (total_tokens - per_installment * (installments - 1))
            tx = token.functions.processInstallment(
                property_id_on_chain,
                signer.address,
                tokens_this_round,
            ).build_transaction({
                'from': signer.address,
                'nonce': w3.eth.get_transaction_count(signer.address, 'pending'),
                'gas': 300_000,
                'gasPrice': w3.eth.gas_price,
                'chainId': 97,
            })
            signed = w3.eth.account.sign_transaction(tx, settings.BLOCKCHAIN_PRIVATE_KEY)
            tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction).hex()
            self.stdout.write(self.style.SUCCESS(
                f"  Installment {i+1}/{installments} ({tokens_this_round} tokens): {_bscscan(tx_hash)}"
            ))
            receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=180)
            if receipt.status != 1:
                raise CommandError(f"processInstallment {i+1} reverted: {_bscscan(tx_hash)}")
            tx_hashes.append(tx_hash)

        # Final assertions: investor balance == total_tokens, escrow == 0.
        investor_balance = token.functions.balanceOf(
            signer.address, property_id_on_chain
        ).call()
        escrow_balance = token.functions.balanceOf(
            Web3.to_checksum_address(token_contract_address), property_id_on_chain
        ).call()
        self.stdout.write(self.style.SUCCESS(
            f"  After {installments} installments: investor={investor_balance}, "
            f"escrow={escrow_balance} (expected {total_tokens} / 0)"
        ))
        if investor_balance != total_tokens or escrow_balance != 0:
            raise CommandError(
                f"Final balance mismatch: investor={investor_balance}/"
                f"{total_tokens}, escrow={escrow_balance}/0"
            )
        return tx_hashes
