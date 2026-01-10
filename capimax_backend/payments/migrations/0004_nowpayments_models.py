"""
Migration to add NOWPayments models for cryptocurrency payment tracking.
"""

from django.db import migrations, models
import django.db.models.deletion
import uuid
from decimal import Decimal


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0003_banktransfer'),
    ]

    operations = [
        migrations.CreateModel(
            name='NOWPaymentsTransaction',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, help_text='Unique identifier for the NOWPayments transaction', primary_key=True, serialize=False)),
                ('nowpayments_payment_id', models.CharField(help_text='NOWPayments payment ID', max_length=255, unique=True)),
                ('order_id', models.CharField(help_text='Internal order ID', max_length=255)),
                ('payment_status', models.CharField(choices=[('waiting', 'Waiting'), ('confirming', 'Confirming'), ('confirmed', 'Confirmed'), ('sending', 'Sending'), ('partially_paid', 'Partially Paid'), ('finished', 'Finished'), ('failed', 'Failed'), ('refunded', 'Refunded'), ('expired', 'Expired')], default='waiting', help_text='NOWPayments payment status', max_length=20)),
                ('pay_address', models.CharField(help_text='Cryptocurrency address for payment', max_length=255)),
                ('pay_amount', models.DecimalField(decimal_places=8, help_text='Amount to pay in cryptocurrency', max_digits=18)),
                ('pay_currency', models.CharField(help_text='Cryptocurrency to pay (BTC, ETH, USDT, etc.)', max_length=10)),
                ('price_amount', models.DecimalField(decimal_places=2, help_text='Amount in base currency', max_digits=12)),
                ('price_currency', models.CharField(help_text='Base currency (USD, EUR, etc.)', max_length=10)),
                ('order_description', models.TextField(blank=True, help_text='Order description')),
                ('invoice_id', models.CharField(blank=True, help_text='NOWPayments invoice ID', max_length=255, null=True)),
                ('invoice_url', models.URLField(blank=True, help_text='Invoice payment URL', null=True)),
                ('ipn_callback_url', models.URLField(blank=True, help_text='IPN callback URL', null=True)),
                ('actually_paid', models.DecimalField(decimal_places=8, default=Decimal('0'), help_text='Actually paid amount', max_digits=18)),
                ('outcome_amount', models.DecimalField(blank=True, decimal_places=8, help_text='Outcome amount', max_digits=18, null=True)),
                ('outcome_currency', models.CharField(blank=True, help_text='Outcome currency', max_length=10, null=True)),
                ('network_fee', models.DecimalField(blank=True, decimal_places=8, help_text='Network transaction fee', max_digits=10, null=True)),
                ('transaction_hash', models.CharField(blank=True, help_text='Blockchain transaction hash', max_length=255, null=True)),
                ('burning_percent', models.DecimalField(blank=True, decimal_places=2, help_text='Burning percentage', max_digits=5, null=True)),
                ('expiration_estimate_date', models.DateTimeField(blank=True, help_text='Payment expiration date', null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('payment', models.OneToOneField(help_text='Associated payment record', on_delete=django.db.models.deletion.CASCADE, related_name='nowpayments_transaction', to='payments.payment')),
            ],
            options={
                'verbose_name': 'NOWPayments Transaction',
                'verbose_name_plural': 'NOWPayments Transactions',
                'db_table': 'payments_nowpayments_transaction',
                'ordering': ['-created_at'],
                'indexes': [
                    models.Index(fields=['nowpayments_payment_id'], name='payments_no_nowpaym_idx'),
                    models.Index(fields=['order_id'], name='payments_no_order_i_idx'),
                    models.Index(fields=['payment_status'], name='payments_no_payment_idx'),
                    models.Index(fields=['pay_currency'], name='payments_no_pay_cur_idx'),
                    models.Index(fields=['created_at'], name='payments_no_created_idx'),
                ],
            },
        ),
    ]
