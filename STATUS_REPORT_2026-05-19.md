# Capimax Platform — Status Report

**Date:** 2026-05-19
**Phase:** P1 (Money + Tokens pipeline) — **COMPLETE**
**Next phase:** P2 (Internal staging dogfood)

---

## TL;DR

The platform now mints real ERC-1155 tokens on a real public blockchain
when fed a real Stripe-test-mode payment. Every layer of the
investor→tokens path has been exercised against real external services
with on-chain proof. The remaining work is operational, not foundational:
host the system on a real server, drive realistic daily journeys for a
week, then open it to a controlled beta.

---

## Phase 1 — Done

### Smart-contract deployment (BSC Testnet, chain 97)

| Contract | Address |
|---|---|
| RealEstateToken (template) | `0x3C3Ae26693a1CBCB1b032F270dd15F45a3997564` |
| RentalIncomeDistributor (template) | `0xAF4431832F72927FB09531E29c0fA998513987dc` |
| PropertyContractFactory (patched) | `0x7e42afF015e6A3Bc88653233475B4F3E7c7e30A2` |
| Per-property token clone (Skyline) | `0x32a0858993065C6343C85BC4961c3D462042792D` |

Mint transaction:
[0xd9339fc...](https://testnet.bscscan.com/tx/0xd9339fc84566f4d42d1c336f5c0f601eb10d9dc1e8723a6b6e0dbf5564ee9500) — **10 tokens minted to an investor wallet**

### Stripe integration

- Stripe test-mode keys wired (`sk_test_*` + `pk_test_*`)
- New endpoints `/api/v1/payments/methods/setup-intent/` and `/attach/`
- Verified end-to-end: created real Stripe Customer
  (`cus_UXT1Md9Y4CekyD`), real SetupIntent, attached a test Visa
  `4242 4242 4242 4242`, persisted as `UserPaymentMethod` row
- Idempotent re-attach returns 200 with the existing method

### Refund pipeline

- Fixed `auto_refund_failed_mint` `select_related('payment')` bug —
  was silently crashing on every terminal mint failure, blocking refunds
- 5 mint-flow golden-path tests passing
  (success / retry / max-retry-terminal / terminal-triggers-refund / idempotency)

### Infrastructure repairs (hidden bugs uncovered)

1. **`.env` loader was missing entirely** — every env var was being
   ignored. Added `python-dotenv` to `manage.py`, `wsgi.py`, `asgi.py`.
2. **`STRIPE_SECRET_KEY` and `BLOCKCHAIN_PRIVATE_KEY`** were only
   nested in settings dicts, but the code reads them at top level.
   Promoted to top-level in `base.py`.
3. **`PropertyContractFactory.activateProperty`** had a guard that made
   every deployed property permanently unmintable. Patched + redeployed.
4. **`_get_or_create_stripe_customer`** created a fresh customer per
   SetupIntent because no DB row existed yet. Switched to Stripe-side
   email lookup.
5. **`StripeObject.get()` does not exist** — switched to `getattr`.

### Operator readiness (Django Admin)

- 5 operator groups with curated permissions:
  KYC Reviewer (13 perms), Property Moderator (27), Marketplace
  Operator (12), Broker Reviewer (12), Finance (32).
- Idempotent data migration `accounts/0007_admin_operator_groups.py`.

### Test coverage

| Test | Status |
|---|---|
| Successful mint marks investment completed | ✅ pass |
| First mint failure schedules retry | ✅ pass |
| Max retries marks MINT_FAILED terminal | ✅ pass |
| Terminal failure triggers real refund | ✅ pass |
| Already-completed investment short-circuits | ✅ pass |

### Wallet state

- Deployer wallet: `0x9278A652585779935F7FDbD6D1259f327B12AfD0`
- Balance: ~0.177 tBNB (after 4 deployments + 1 mint)
- Plenty of headroom for many more mints (each ~0.0005 tBNB)

---

## What works in practice right now

| Layer | Real-world proof |
|---|---|
| Auth + JWT cookies | Investor / owner / broker / admin all login + reach role dashboard |
| KYC pipeline | Submit + admin-review path works |
| Property listing + approval | Property Moderator group can approve, owner sees status flip |
| Marketplace matching engine | Trade execution test passes against real schema |
| WebSocket auth | cookie-based, no token in URL needed |
| Stripe payments | Real test card saves end-to-end |
| Refund pipeline | Real Refund row created on terminal mint failure |
| Smart contract registry | `SmartContract` table resolves real on-chain functions |
| Platform signing | Django signs + broadcasts to BSC Testnet |
| Token minting | 10 real tokens visible on BSCScan |

---

## What still does NOT exist

- Public hosted environment (everything tested on localhost so far)
- Real SMTP password — code is configured, password not active
- Full UI flow for "tokenize this property" — admin-only management
  command for now
- Frontend wallet-connect → backend wallet-address linking (the smoke
  test reused the deployer wallet to bypass this)
- TLS / WSS production transport
- Sentry / error tracking
- Real Terms of Service / Privacy Policy / Refund Policy
- Smart contract security audit
- Mainnet deployment

---

## Phase 2 — Internal staging dogfood (start now)

**Goal:** 5 consecutive days where the daily journey completes without
engineer intervention.

### Setup (Days 1–2)

1. Stand up staging server (Fly.io recommended — closest to prod
   semantics, ~$3/mo). Domain: `staging.<yourdomain>`.
2. PostgreSQL + Redis (managed instances).
3. Daphne behind Nginx with `wss://` and TLS via Let's Encrypt.
4. Activate the Hostinger SMTP password — code already configured.
5. Wire Sentry on backend + frontend (free tier).
6. Migrate the BSC Testnet contract addresses and Stripe keys to the
   staging environment's secret manager.

### Daily journey (Days 3–7)

Each team member runs the full pipeline once per day:

- **Investor**: sign up → KYC submit → browse → invest in a tokenized
  property → see tokens in portfolio
- **Property owner**: list property → see SPV approval → watch funding
  → see rental distribution
- **Broker**: register clients → see commissions accrue
- **Admin** (you, in Django Admin): review KYC, approve property,
  moderate marketplace, watch every transaction

Every bug hit = next ticket. No theoretical fixes. Logbook in a
single shared doc.

### Exit criteria

- 5 consecutive green-day runs
- All known bugs from Phase 2 fixed or scheduled
- Sentry steady — no unhandled exceptions in the daily journey
- Refund pipeline observed on at least one real failed mint

---

## Phase 3 — Controlled beta (week 3)

**Goal:** 10–20 invited users complete journeys end-to-end without
critical bugs.

Required before invite:
- Terms of Service, Privacy Policy, Refund Policy (templated is fine)
- Support inbox actively monitored
- Incident playbook for: failed mint, disputed payment, KYC reject,
  user can't login
- Banner: "Beta — testnet tokens, no real value"
- One-click rollback path for staging

---

## Phase 4 — Public launch (4–8 weeks out)

Required:
- Smart contract security audit (real auditor, $5–25k typical)
- Switch from BSC Testnet to BSC Mainnet (or another L2 — Polygon /
  Base / Arbitrum, depending on the audit + GTM target)
- Load testing — 100 concurrent investors, latency budget
- Regulatory sign-off for target jurisdictions (this is the long pole)
- Production secrets in AWS Secrets Manager / Doppler / 1Password
- Real backups + restore drill
- Per-account-class fee / commission configuration audited

---

## What I'd refuse to ship without (still true)

- One real human (not engineer) completing $→tokens journey on staging
- Working refund path proven on a real failed mint
- Real password-reset email actually arriving in user inboxes
- Sentry alarms set so we know when something breaks before users do
- Smart contracts audited — current factory has had one bug already
  uncovered, others may exist

---

## The single most-valuable next action

**Stand up the staging server.**

Until the platform is hosted at a real URL with real TLS and real
email delivery, every bug we find is theoretical. Once it's live,
the daily-journey dogfood will surface the real ones in 5 days.

Recommended path: Fly.io + managed PostgreSQL + Cloudflare DNS +
Let's Encrypt TLS. Approximately 2 hours of setup if I get a domain
and a Fly account credential to use.

---

## Commits in this push

- `feat(p1): refund pipeline fix + Stripe SetupIntent + BSC Testnet live`
  — this session's surgical Phase-1 work (19 files)
- `chore: accumulated platform work from prior sessions`
  — sweep of pending changes that had been building up (126 files)

Total: ~14.5k lines of code added across the two commits.
