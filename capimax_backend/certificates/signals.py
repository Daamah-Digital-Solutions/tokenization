"""Every save of a purchase or installment plan re-syncs its certificate, after the commit."""

import logging

from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)


def _later(fn, model, pk):
    def run():
        try:
            obj = model.objects.select_related(*fn.related).get(pk=pk)
            fn(obj)
        except model.DoesNotExist:
            pass
        except Exception:  # noqa: BLE001 — a certificate problem never breaks a purchase
            logger.exception('Certificate sync failed for %s %s', model.__name__, pk)
    transaction.on_commit(run)


@receiver(post_save, sender='investments.Investment')
def investment_saved(sender, instance, raw=False, **kwargs):
    if raw:
        return
    from .services import sync_investment
    _later(sync_investment, sender, instance.pk)


@receiver(post_save, sender='properties.ConstructionInstallment')
def plan_saved(sender, instance, raw=False, **kwargs):
    if raw:
        return
    from .services import sync_plan
    _later(sync_plan, sender, instance.pk)
