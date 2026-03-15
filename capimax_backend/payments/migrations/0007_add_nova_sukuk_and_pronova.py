# Generated manually for Nova Sukuk and Pronova payment models

import uuid
from decimal import Decimal
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0006_add_wallet_payment_method'),
        ('investments', '0002_add_blockchain_fields'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Update PaymentMethod choices on Payment model
        migrations.AlterField(
            model_name='payment',
            name='payment_method',
            field=models.CharField(
                choices=[
                    ('cryptocurrency', 'Cryptocurrency'),
                    ('credit_card', 'Credit Card'),
                    ('bank_transfer', 'Bank Transfer'),
                    ('paypal', 'PayPal'),
                    ('wallet', 'Wallet'),
                    ('nova_sukuk', 'Nova Sukuk'),
                    ('pronova', 'Pronova'),
                ],
                help_text='Payment method used',
                max_length=20,
            ),
        ),
        # Update PaymentMethod choices on UserPaymentMethod model
        migrations.AlterField(
            model_name='userpaymentmethod',
            name='method_type',
            field=models.CharField(
                choices=[
                    ('cryptocurrency', 'Cryptocurrency'),
                    ('credit_card', 'Credit Card'),
                    ('bank_transfer', 'Bank Transfer'),
                    ('paypal', 'PayPal'),
                    ('wallet', 'Wallet'),
                    ('nova_sukuk', 'Nova Sukuk'),
                    ('pronova', 'Pronova'),
                ],
                help_text='Type of payment method',
                max_length=20,
            ),
        ),
        # Create NovaSukukPayment model
        migrations.CreateModel(
            name='NovaSukukPayment',
            fields=[
                ('id', models.UUIDField(
                    default=uuid.uuid4, editable=False, primary_key=True, serialize=False
                )),
                ('sukuk_pdf', models.FileField(upload_to='nova_sukuk_documents/')),
                ('sukuk_reference_number', models.CharField(max_length=100)),
                ('status', models.CharField(
                    choices=[
                        ('pending', 'Pending Review'),
                        ('approved', 'Approved'),
                        ('rejected', 'Rejected'),
                    ],
                    default='pending',
                    max_length=20,
                )),
                ('review_note', models.TextField(blank=True)),
                ('reviewed_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('investment', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='nova_sukuk_payments',
                    to='investments.investment',
                )),
                ('payment', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='nova_sukuk_detail',
                    to='payments.payment',
                )),
                ('reviewed_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='reviewed_sukuk_payments',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        # Create PronovaPayment model
        migrations.CreateModel(
            name='PronovaPayment',
            fields=[
                ('id', models.UUIDField(
                    default=uuid.uuid4, editable=False, primary_key=True, serialize=False
                )),
                ('pronova_amount', models.DecimalField(decimal_places=8, max_digits=18)),
                ('usd_equivalent', models.DecimalField(decimal_places=2, max_digits=12)),
                ('discount_applied', models.DecimalField(
                    decimal_places=2,
                    default=Decimal('5.00'),
                    help_text='Discount percentage applied (default 5%)',
                    max_digits=5,
                )),
                ('discounted_amount', models.DecimalField(
                    decimal_places=2,
                    help_text='USD amount after discount',
                    max_digits=12,
                )),
                ('tx_hash', models.CharField(blank=True, max_length=66)),
                ('platform_wallet_address', models.CharField(max_length=42)),
                ('sender_wallet_address', models.CharField(blank=True, max_length=42)),
                ('status', models.CharField(
                    choices=[
                        ('pending', 'Pending Payment'),
                        ('confirming', 'Confirming on Chain'),
                        ('confirmed', 'Confirmed'),
                        ('failed', 'Failed'),
                    ],
                    default='pending',
                    max_length=20,
                )),
                ('confirmations', models.PositiveIntegerField(default=0)),
                ('confirmed_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('investment', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='pronova_payments',
                    to='investments.investment',
                )),
                ('payment', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='pronova_detail',
                    to='payments.payment',
                )),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
