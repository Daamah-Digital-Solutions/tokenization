import django.core.validators
import django.db.models.deletion
import uuid
from decimal import Decimal
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0010_bankwithdrawalrequest_crypto_address_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='PlatformBankAccount',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('label', models.CharField(blank=True, help_text="Internal nickname, e.g. 'Primary USD account'.", max_length=100)),
                ('account_holder_name', models.CharField(max_length=255)),
                ('bank_name', models.CharField(max_length=255)),
                ('account_number', models.CharField(help_text='IBAN / account number.', max_length=64)),
                ('routing_number', models.CharField(blank=True, help_text='Routing / sort code.', max_length=64)),
                ('swift_code', models.CharField(blank=True, help_text='SWIFT / BIC.', max_length=20)),
                ('bank_address', models.CharField(blank=True, max_length=255)),
                ('bank_country', models.CharField(blank=True, help_text='ISO-3166 alpha-2.', max_length=2)),
                ('currency', models.CharField(default='USD', max_length=3)),
                ('instructions', models.TextField(blank=True, help_text="Shown to the investor, e.g. 'Use your account email as the transfer reference so we can match your deposit.'")),
                ('is_active', models.BooleanField(db_index=True, default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'payments_platform_bank_account',
                'ordering': ['-is_active', 'bank_name'],
            },
        ),
        migrations.CreateModel(
            name='BankDepositRequest',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('amount', models.DecimalField(decimal_places=2, help_text='Amount the investor says they transferred (USD).', max_digits=12, validators=[django.core.validators.MinValueValidator(Decimal('1.00'))])),
                ('currency', models.CharField(default='USD', max_length=3)),
                ('reference', models.CharField(blank=True, help_text='Transfer reference the investor used.', max_length=140)),
                ('proof_of_transfer', models.FileField(blank=True, help_text='Screenshot / PDF of the bank transfer receipt.', null=True, upload_to='wallet_deposits/proofs/%Y/%m/')),
                ('notes', models.TextField(blank=True, help_text='Free-form note from the investor.')),
                ('status', models.CharField(choices=[('pending', 'Pending Review'), ('approved', 'Approved & Credited'), ('rejected', 'Rejected'), ('cancelled', 'Cancelled')], db_index=True, default='pending', max_length=20)),
                ('reviewed_at', models.DateTimeField(blank=True, null=True)),
                ('review_note', models.TextField(blank=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('platform_bank_account', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='deposit_requests', to='payments.platformbankaccount')),
                ('reviewed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='bank_deposit_reviews', to=settings.AUTH_USER_MODEL)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='bank_deposit_requests', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'payments_bank_deposit_request',
                'ordering': ['-created_at'],
                'indexes': [models.Index(fields=['user', 'status'], name='pay_bdr_user_status_idx'), models.Index(fields=['status', 'created_at'], name='pay_bdr_status_created_idx')],
            },
        ),
    ]
