# CapimaxRT Operational Runbooks

> Incident response procedures for every alert in `monitoring/alerts/capimax.yml`.
> Designed for an engineer who has been paged at 3am and needs to act fast
> without re-reading the whole codebase.

---

## How to use this document

1. **Find the alert by name** in the table of contents below.
2. **Read the "First minute" section first** — it gives you the one or two
   commands that triage 80% of cases.
3. **Only escalate** if the alert remains firing after the runbook's
   recommended mitigation, or if the runbook explicitly says to.

If the situation doesn't match any runbook, fall back to
[Generic Incident Response](#generic-incident-response).

---

## Severity definitions

| Level | Response time | Wakes someone up? | Examples |
|---|---|---|---|
| **P1 / critical** | 15 min | Yes — page on-call | Postgres down, mint failure spike, cap-table drift, signature attack |
| **P2 / warning** | 1 hour | No — Slack alert only | High Django 5xx rate, queue backlog, high CPU |
| **P3** | Next business day | No | Disk usage trends, slow query alerts |

The `severity` label on each Prometheus rule maps directly to P1 (critical)
or P2 (warning).

---

## Table of contents

### Financial / blockchain (P1, team: blockchain)
- [HighMintFailureRate](#alert-highmintfailurerate)
- [TokenBalanceDrift](#alert-tokenbalancedrift)
- [MintProcessorIdle](#alert-mintprocessoridle)

### Payments (team: payments / security)
- [PaymentsPendingTooLong](#alert-paymentspendingtoolong)
- [WebhookSignatureFailures](#alert-webhooksignaturefailures)

### Infrastructure (team: ops)
- [PostgresDown](#alert-postgresdown)
- [RedisDown](#alert-redisdown)
- [CeleryQueueDepthHigh](#alert-celeryqueuedepthhigh)
- [DjangoErrorRateHigh](#alert-djangoerrorratehigh)
- [HostHighCPU](#alert-hosthighcpu)
- [HostDiskFull](#alert-hostdiskfull)

### Cross-cutting
- [Generic Incident Response](#generic-incident-response)
- [Common diagnostic commands](#common-diagnostic-commands)
- [Manual reconciliation procedures](#manual-reconciliation-procedures)
- [Communication templates](#communication-templates)

---

## Alert: HighMintFailureRate

**Threshold:** >5% of mints fail in the last 5 minutes
**Severity:** P1
**Team:** blockchain

### What it means
The `process_single_mint` Celery task is returning `success=False` from
`_execute_blockchain_mint` more often than acceptable. Real investors'
tokens are not being created on-chain. The auto-refund task may already
be running for the failing investments.

### Likely root causes (ranked by frequency)
1. **Blockchain RPC outage** — Infura/Alchemy/BSC node down or rate-limited.
2. **Insufficient gas** — wallet ETH/MATIC/BNB balance below the gas
   floor for a mint.
3. **Contract revert** — RealEstateToken contract paused, or the SPV's
   `ComplianceRegistry` is rejecting the investor.
4. **Web3 / library version mismatch** after a deploy.

### First minute
```bash
# 1. Pull the most recent failures and group by error.
docker exec -it capimax-web python manage.py shell -c "
from investments.models import Investment
from django.utils import timezone
from datetime import timedelta
fails = Investment.objects.filter(
    status__in=['mint_failed','minting'],
    updated_at__gte=timezone.now() - timedelta(minutes=15),
).values('mint_error_message').distinct()
for f in fails: print(f)
"

# 2. Check Celery worker logs for the actual exception.
docker logs --since 15m capimax-celery 2>&1 | grep -i "mint" | tail -30

# 3. Confirm RPC health.
docker exec -it capimax-web python -c "
from web3 import Web3
import os
w3 = Web3(Web3.HTTPProvider(os.environ['ETHEREUM_RPC_URL']))
print('connected:', w3.is_connected(), 'block:', w3.eth.block_number)
"
```

### Mitigation
- **RPC outage:** failover to backup RPC (env var `ETHEREUM_RPC_URL_BACKUP`),
  then restart the workers: `docker-compose restart celery`. The dispatcher
  picks up where it left off because PENDING_MINT investments are
  idempotently re-queued.
- **Insufficient gas:** top up the platform wallet (`BLOCKCHAIN_KMS_KEY_ID`
  associated address). Monitor `eth_balance` going forward.
- **Contract paused:** check `RealEstateToken.paused()` and `factory.paused()`
  on the relevant chains. If paused intentionally, leave it — the
  PENDING_MINT investments will be picked up after unpause. If unintentional,
  follow the unpause flow in `ADMIN_PROCEDURES.md`.
- **Compliance reject:** the affected investor's `ComplianceRegistry`
  entry is missing or revoked. Re-publish via the admin panel under
  `/admin/blockchain/compliance/`.

### When to escalate
- Mint failure rate stays > 5% for 30 minutes after mitigation.
- Auto-refund task is also failing — investors have money debited but no
  tokens AND no refund.
- More than 50 investments are stuck in MINTING/MINT_FAILED state.

Escalate to: blockchain team lead + CTO. Open a status-page incident.

### Post-incident
- Confirm every stuck investment ended in either COMPLETED or REFUNDED.
- Confirm `capimax_token_balance_drift_count` reads zero after the
  reconciliation task completes.
- Write a 1-page postmortem within 24 hours.

---

## Alert: TokenBalanceDrift

**Threshold:** `sum(capimax_token_balance_drift_count) > 0` for 5 minutes
**Severity:** P1
**Team:** blockchain

### What it means
`blockchain.tasks.reconcile_token_balances` found at least one
`TokenBalance` row in our DB whose `available_tokens` doesn't match
`balanceOf(holder, tokenId)` on-chain. Either the chain is right and we
sold/transferred tokens we didn't record, OR we are right and someone
moved tokens we didn't authorize. **Both possibilities are serious.**

### Likely root causes
1. **Race condition** — a marketplace trade completed on-chain but the
   trade transaction's post-process step crashed before updating DB.
2. **Unauthorized transfer** — an investor's wallet was compromised and
   tokens moved outside our marketplace. The compliance registry should
   have blocked this; if it didn't, that's an emergency.
3. **Direct admin tx** — someone executed `safeTransferFrom` from a
   privileged role bypassing the platform.

### First minute
```bash
# 1. Find the drifting balances.
docker exec capimax-web python manage.py shell -c "
from blockchain.models import TokenBalance
drift = TokenBalance.objects.filter(last_drift_check_at__isnull=False, drift_detected=True)
for tb in drift[:20]:
    print(tb.user_id, tb.token_id, 'db:', tb.available_tokens, 'chain:', tb.last_chain_balance)
"

# 2. Pull the most recent on-chain transfer events for those tokenIds.
# Use whatever tool — etherscan/bscscan API, the-graph, or web3 logs.
```

### Mitigation
Do NOT silently sync the DB to the chain. That hides whether the chain
or DB is the source of truth and erases evidence.

1. **Freeze the affected token IDs** by calling `RealEstateToken.pause()`
   via the admin panel — stops further movement.
2. **Open an investigation ticket** with timestamps, holders, token IDs,
   and the on-chain tx hashes.
3. **Audit the cap-table** for the relevant SPV: every Transfer event
   on-chain must have a matching CapTableEntry. Run:
   ```python
   from blockchain.services.audit import audit_cap_table_vs_chain
   audit_cap_table_vs_chain(legal_entity_id='...')
   ```
4. **Only after attribution is complete**, decide:
   - Race condition → write the missing CapTableEntry as an ADJUSTMENT
     with the originating tx hash in `blockchain_tx_hash` field.
   - Theft → coordinate with legal counsel before reversing. Burn /
     reissue may be needed.

### When to escalate
**Always.** Any token balance drift is a P1 that wakes the blockchain
lead, the CTO, and legal counsel. There is no "minor" drift.

### Post-incident
- Status page must announce affected SPVs.
- Insurance / E&O carrier notified per the standard playbook.
- Postmortem within 48 hours, distributed to the board.

---

## Alert: MintProcessorIdle

**Threshold:** `time() - max(capimax_mint_processor_last_run_timestamp) > 600`
for 5 minutes
**Severity:** P1
**Team:** blockchain

### What it means
`process_pending_mints` has not emitted a heartbeat in over 10 minutes.
The Celery beat scheduler runs it every 2 minutes, so this means
something has stopped the scheduler or the workers themselves.

### Likely root causes
1. **Celery beat container crashed.**
2. **Celery workers all stuck** (e.g. on a long-running mint that
   exhausted the lock TTL).
3. **Redis broker down** (Celery uses Redis — see [RedisDown](#alert-redisdown)).
4. **Database lock cascade** preventing the dispatcher from acquiring
   `select_for_update(skip_locked=True)`.

### First minute
```bash
# Container health
docker-compose ps celery celery-beat redis db

# Beat container logs — should show task firing every 2 min.
docker logs --since 30m capimax-celery-beat | tail -50

# Worker container logs
docker logs --since 30m capimax-celery | tail -50

# Are there any PENDING_MINT investments waiting?
docker exec capimax-web python manage.py shell -c "
from investments.models import Investment
print(Investment.objects.filter(status='pending_mint').count())
"
```

### Mitigation
- **Beat crashed:** `docker-compose restart celery-beat`. The dispatcher
  is idempotent (uses Redis lock + DB `select_for_update`), so restarting
  is safe.
- **Workers stuck:** `docker-compose restart celery`. In-flight tasks
  will be re-queued by Celery's at-least-once delivery.
- **Redis down:** follow [RedisDown](#alert-redisdown) first; this alert
  will clear itself once Celery can reach Redis again.

### When to escalate
- After restart, no heartbeat for another 5 minutes.
- Worker logs show repeated exceptions on every dispatcher run.

### Post-incident
- Check the lag: how many investments accumulated in PENDING_MINT during
  the outage? Confirm they all transitioned to COMPLETED within an hour
  of resumption.

---

## Alert: PaymentsPendingTooLong

**Threshold:** A payment has been in PENDING status for >2 hours
**Severity:** P2
**Team:** payments

### What it means
`expire_pending_payments` is supposed to cancel any payment still
PENDING after 2 hours. It is scheduled by Celery beat every 10 minutes.
If this alert fires, either:
- That task hasn't run, or
- It ran but failed to expire one or more specific payments.

### First minute
```bash
docker exec capimax-web python manage.py shell -c "
from payments.models import Payment, PaymentStatus
from django.utils import timezone
from datetime import timedelta
stuck = Payment.objects.filter(
    status=PaymentStatus.PENDING,
    created_at__lt=timezone.now() - timedelta(hours=2),
)
for p in stuck[:20]:
    print(p.id, p.payment_method, p.amount, p.created_at)
"
```

### Mitigation
- **If beat task is stuck:** restart Celery beat. The next run will
  expire all eligible payments.
- **If specific payments are sticky:** manually expire via shell:
  ```python
  from payments.models import Payment, PaymentStatus
  p = Payment.objects.get(id='...')
  p.status = PaymentStatus.CANCELLED
  p.save()
  ```
  Then trigger the corresponding refund manually if money was already
  captured.

### When to escalate
- Customer support reports any user whose money was debited but whose
  investment never created.
- Stuck payments include sums > $10,000.

---

## Alert: WebhookSignatureFailures

**Threshold:** >10 webhook signature failures per minute for 1 minute
**Severity:** P1
**Team:** security

### What it means
Stripe or NOWPayments webhook endpoints are receiving requests whose
signatures don't validate. Three possible reasons, in increasing
seriousness:
1. The webhook secret was just rotated and one of the providers still
   uses the old one.
2. The provider's signature scheme changed (rare).
3. **Active attack** — someone is probing the endpoint trying to forge
   webhooks.

### First minute
```bash
# Which provider is failing? (look at the recent logs)
docker logs --since 15m capimax-web 2>&1 | grep -i "signature" | tail -30

# Are the requests coming from known provider IPs?
docker logs --since 15m capimax-nginx 2>&1 | grep -E "POST /api/v1/payments/webhooks" | tail -20
```

### Mitigation
- **Secret rotation mismatch:** confirm `STRIPE_WEBHOOK_SECRET` /
  `NOWPAYMENTS_IPN_SECRET` env vars match the value in the provider's
  dashboard. Update and `docker-compose restart web`.
- **Unknown IPs:** add provider IP allowlist at the nginx layer
  (Stripe publishes their ranges; NOWPayments support can provide
  theirs). Drop traffic from anywhere else.
- **Confirmed attack:** rate-limit the webhook endpoints to ~100
  req/min per IP at the nginx layer. Notify the security team and
  preserve logs for forensics. The application's signature check ensures
  no forged webhook actually executes anything, so this is more about
  reducing log noise and avoiding DoS.

### When to escalate
- Rate exceeds 100 failures/min sustained.
- Pattern matches a known scanner / botnet.
- Any other endpoint also seeing elevated 4xx/5xx (could be broader
  intrusion attempt).

---

## Alert: PostgresDown

**Threshold:** `pg_up == 0` for 1 minute
**Severity:** P1
**Team:** ops

### What it means
The Postgres exporter cannot reach the database. The entire platform
is effectively down because all reads and writes go through this
database.

### First minute
```bash
docker-compose ps db
docker logs --since 5m capimax-db | tail -50
docker exec capimax-db pg_isready -U "$DB_USER"
```

### Mitigation
- **Container crashed:** `docker-compose up -d db`. Then verify with
  `pg_isready`. Investigate the crash from the logs you captured.
- **Disk full** (very common cause): see [HostDiskFull](#alert-hostdiskfull).
  Postgres refuses writes when the volume is full.
- **Connection limit exceeded:** check `max_connections` and active
  connections. Increase the limit or restart the web/celery containers
  to drop stale connections.
- **Corruption:** if Postgres won't start cleanly, do NOT run
  `pg_resetwal`. Restore from the latest `/backups/capimax_*.dump.zst`
  per [Manual reconciliation](#restore-from-backup).

### When to escalate
- Database doesn't restart within 5 minutes.
- Logs show data file corruption errors.
- Last successful backup is older than 24 hours.

---

## Alert: RedisDown

**Threshold:** `redis_up == 0` for 1 minute
**Severity:** P1
**Team:** ops

### What it means
Redis exporter cannot reach Redis. Knock-on effects:
- Celery cannot enqueue or dequeue tasks (mint, payment timeout, etc.).
- Django sessions stored in Redis become unavailable; some users may be
  logged out.
- Idempotency cache and webhook replay protection stop working — but
  the DB-level guards still protect us, just with reduced defense in
  depth.

### First minute
```bash
docker-compose ps redis
docker exec capimax-redis redis-cli -a "$REDIS_PASSWORD" ping
docker logs --since 5m capimax-redis | tail -50
```

### Mitigation
- **Container crashed:** `docker-compose up -d redis`. Most Redis state
  in this app is ephemeral (locks, idempotency keys, sessions) so a
  cold restart is acceptable.
- **Out of memory:** Redis is configured with `maxmemory` and an LRU
  eviction policy. If hitting limits, increase memory or evict more
  aggressively. Persistent data (Celery queues if Redis is also the
  broker) may have been dropped — check Celery for unprocessed tasks.

### When to escalate
- Redis won't restart.
- The Celery broker uses Redis AND there were unprocessed mint or
  payment tasks at the time of failure — those tasks may need manual
  replay.

---

## Alert: CeleryQueueDepthHigh

**Threshold:** Queue length > 100 for 5 minutes
**Severity:** P2
**Team:** ops

### What it means
Tasks are being enqueued faster than workers can process them. Common
queues: `default`, `mints`, `payments`, `notifications`.

### First minute
```bash
# Inspect queue depth per queue
docker exec capimax-celery celery -A capimax_backend inspect active
docker exec capimax-celery celery -A capimax_backend inspect reserved

# How many workers are running?
docker-compose ps celery
```

### Mitigation
- **Worker outage:** restart workers if stuck.
- **Legitimate spike:** scale workers: `docker-compose up -d --scale celery=4`.
  Increase `CELERY_CONCURRENCY` in env if individual workers are
  under-utilised.
- **Specific task slow:** inspect Flower (`/flower/`) for the slowest
  tasks. Often a slow downstream (RPC, payment provider) — see the
  corresponding subsystem runbook.

### When to escalate
- Queue depth keeps growing despite added workers — points to a
  downstream bottleneck.
- Time-sensitive tasks (mints, refunds) are aging beyond their SLOs.

---

## Alert: DjangoErrorRateHigh

**Threshold:** 5xx rate > 2% over 5 minutes
**Severity:** P2
**Team:** backend

### What it means
Application code is throwing exceptions at an elevated rate. Often
points to a deploy that introduced a regression.

### First minute
```bash
# Sentry should already have a notification with the top issues.
# If not:
docker logs --since 15m capimax-web 2>&1 | grep -E "ERROR|Traceback" | tail -40

# nginx access logs grouped by status code
docker logs --since 15m capimax-nginx 2>&1 | awk '{print $9}' | sort | uniq -c
```

### Mitigation
- **Recent deploy:** roll back to the previous image tag. The deploy
  pipeline retains the previous 3 images.
- **External dependency degraded:** identify the dependency (RPC,
  payment provider, KYC service) and reduce its blast radius — switch
  to backup endpoint, increase circuit-breaker sensitivity, or
  temporarily disable the feature.
- **Specific bad request pattern:** if Sentry shows one exception
  dominating, fix the underlying handler. Patterns the golden-path
  tests are now guarding against (caught during the test sprint): wrong
  FK names, URL-pattern collisions, swallowed PermissionDenied.

### When to escalate
- Rollback doesn't lower the rate.
- Affected endpoints include the mint dispatcher or payment webhooks
  (re-classify as P1).

---

## Alert: HostHighCPU

**Threshold:** CPU > 90% for 10 minutes on any host
**Severity:** P2
**Team:** ops

### What it means
Sustained CPU pressure — usually means the host is undersized for the
current load, or a runaway process is consuming a core.

### First minute
```bash
ssh <host>
top -b -n1 | head -30
# Look for CPU-bound containers
docker stats --no-stream
```

### Mitigation
- **Specific container hot:** identify it from `docker stats`. If it's
  the web app, see [DjangoErrorRateHigh](#alert-djangoerrorratehigh).
  If it's Celery, see [CeleryQueueDepthHigh](#alert-celeryqueuedepthhigh).
- **Whole host hot:** scale vertically (resize VM) or horizontally
  (add another host and rebalance). Document the new normal.
- **Backup job:** if `backup_postgres.sh` is running, that's OK — let
  it finish. Consider moving backups off-hours.

---

## Alert: HostDiskFull

**Threshold:** Root filesystem < 10% free for 5 minutes
**Severity:** P1
**Team:** ops

### What it means
The host is about to refuse writes. Postgres will refuse new writes
(triggering [PostgresDown](#alert-postgresdown)). Logs will be lost.

### First minute
```bash
ssh <host>
df -h
# Likely culprits, in order:
du -sh /var/lib/docker /backups /var/log 2>/dev/null | sort -h
```

### Mitigation
- **Old backups:** `/backups/capimax_*.dump.zst` files older than 7 days
  should already be pruned by the cron job in `scripts/backup_postgres.sh`.
  If they're not, the cron job isn't running — investigate. Manually
  prune: `find /backups -name 'capimax_*.dump.zst' -mtime +7 -delete`.
- **Docker images:** `docker image prune -a -f` reclaims old layers.
- **Logs:** rotate them: `journalctl --vacuum-time=7d`.
- **Postgres WAL:** if WAL has grown unexpectedly, check for stale
  replication slots: `SELECT * FROM pg_replication_slots;`. Drop slots
  with `restart_lsn` too far behind.

### When to escalate
- Disk hits 100% — Postgres has likely already refused writes.
- After cleanup, free space is still < 20% → resize the disk.

---

## Generic Incident Response

If an alert fires that isn't in this document, follow this template:

### First 5 minutes
1. **Acknowledge the page** so others know you're on it.
2. **Identify the user impact.** "Can I still register? Invest?
   Withdraw?" Open the SPA in your browser and try the affected flow.
3. **Look at Grafana / Sentry first**, not the code. The dashboards
   exist to localise problems fast.
4. **Decide: degrade vs. fix.** If a feature is broken but isolated
   (e.g. NOWPayments down), put up a banner and disable that payment
   method. Don't fix it under fire if a degrade is safer.

### First 30 minutes
1. **Open a status page incident.** Communication first, code second.
2. **Start a chronological incident channel** (`#incident-YYYYMMDD-X`)
   so the postmortem has source material.
3. **One person leads.** Others gather data. Don't have 5 engineers
   typing into the same shell.

### After resolution
1. Status page → resolved.
2. Postmortem doc within 48 hours, using the template at
   `docs/POSTMORTEM_TEMPLATE.md` (create one if it doesn't exist).
3. Action items go in the project tracker with owners and due dates.

---

## Common diagnostic commands

```bash
# Service health
docker-compose ps
docker stats --no-stream

# Recent errors in the web app
docker logs --since 15m capimax-web 2>&1 | grep -E "ERROR|CRITICAL" | tail -30

# Active connections to Postgres
docker exec capimax-db psql -U "$DB_USER" -d "$DB_NAME" -c \
  "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"

# Long-running queries
docker exec capimax-db psql -U "$DB_USER" -d "$DB_NAME" -c \
  "SELECT pid, now() - query_start AS age, state, query
   FROM pg_stat_activity
   WHERE state != 'idle' AND query_start < now() - interval '30 seconds'
   ORDER BY query_start;"

# Redis stats
docker exec capimax-redis redis-cli -a "$REDIS_PASSWORD" info stats | head -20

# Celery worker status
docker exec capimax-celery celery -A capimax_backend status
docker exec capimax-celery celery -A capimax_backend inspect active

# Recent mint failures grouped by error
docker exec capimax-web python manage.py shell -c "
from investments.models import Investment
from django.db.models import Count
print(list(Investment.objects.filter(
    status='mint_failed'
).values('mint_error_message').annotate(c=Count('id')).order_by('-c')[:10]))
"

# Recent webhook signature failures (Stripe)
docker logs --since 1h capimax-web 2>&1 | grep "Invalid Stripe signature" | wc -l
```

---

## Manual reconciliation procedures

### Restore from backup

```bash
# 1. Pick the backup to restore (most recent that pre-dates the corruption).
ls -lh /backups/capimax_*.dump.zst | tail -5

# 2. Decompress and inspect.
zstd -d /backups/capimax_20260517T020000Z.dump.zst -o /tmp/restore.dump
pg_restore --list /tmp/restore.dump | head -20

# 3. Drop the corrupted DB and restore.
docker exec capimax-db psql -U postgres -c "DROP DATABASE IF EXISTS ${DB_NAME}_restore;"
docker exec capimax-db psql -U postgres -c "CREATE DATABASE ${DB_NAME}_restore;"
docker exec -i capimax-db pg_restore -U postgres -d "${DB_NAME}_restore" < /tmp/restore.dump

# 4. Verify by counting key tables.
docker exec capimax-db psql -U postgres -d "${DB_NAME}_restore" -c \
  "SELECT (SELECT count(*) FROM auth_user) AS users,
          (SELECT count(*) FROM investments_investment) AS investments,
          (SELECT count(*) FROM payments_payment) AS payments;"

# 5. Only AFTER verification, swap the database names.
# Rename the live (broken) DB and promote the restore.
docker exec capimax-db psql -U postgres <<SQL
  ALTER DATABASE $DB_NAME RENAME TO ${DB_NAME}_corrupted_$(date +%s);
  ALTER DATABASE ${DB_NAME}_restore RENAME TO $DB_NAME;
SQL

# 6. Restart the app.
docker-compose restart web celery celery-beat
```

### Manual mint retry

If `process_single_mint` exhausted retries but you've fixed the
underlying RPC issue:

```bash
docker exec capimax-web python manage.py shell <<PY
from investments.models import Investment, InvestmentStatus
from investments import tasks
inv_id = 'PASTE-INVESTMENT-UUID'
inv = Investment.objects.get(id=inv_id)
inv.status = InvestmentStatus.PENDING_MINT
inv.mint_retry_count = 0
inv.mint_scheduled_at = None
inv.save()
tasks.process_single_mint.delay(str(inv.id))
PY
```

### Manual payment refund

When the automated `RefundService` fails (e.g. Stripe webhook missed):

```bash
docker exec capimax-web python manage.py shell <<PY
from payments.services import RefundService
RefundService.create_refund(
    payment_id='PASTE-PAYMENT-UUID',
    reason='Manual ops refund — incident ID 2026-X-Y',
    initiated_by_user_id='YOUR-ADMIN-UUID',
)
PY
```

---

## Communication templates

### Status page — initial investigation
> We are investigating reports of [delayed mints / payment failures / etc.].
> Investors' funds are safe. Updates every 30 minutes.

### Status page — confirmed incident
> We have identified a [brief cause]. Affected: [scope]. Estimated
> resolution: [time or "investigating"]. Next update in [interval].

### Status page — resolved
> The issue is resolved. Affected: [scope]. Root cause: [one-sentence].
> A postmortem will be published within 7 days.

### Internal investor email — for confirmed token / payment issues
Coordinate with legal counsel before sending. Standard template lives
at `docs/EMAIL_TEMPLATES.md` (create if missing).

---

## On-call rotation

- Primary on-call: rotates weekly, Mon 9am → Mon 9am UTC.
- Secondary on-call: same week, picks up if primary doesn't ack in 15 min.
- Pager: PagerDuty service `capimax-backend`.
- Slack: `#capimax-oncall` for routine; `#incident-*` channels spawn
  per incident.

| Week of (Mon) | Primary | Secondary |
|---|---|---|
| _Maintain this table; auto-fill from PagerDuty if possible._ | | |

---

*This document supersedes any informal procedures. If you find a gap or
a step that doesn't match reality, fix this document in the same PR
that fixes the underlying issue.*
