"""
Add SPV (Special Purpose Vehicle) fields to Property model.
Each property needs its own SPV with dedicated bank account for financial isolation.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('properties', '0010_rename_installmentpayment_to_constructioninstallment'),
    ]

    operations = [
        migrations.AddField(
            model_name='property',
            name='spv_company_name',
            field=models.CharField(
                blank=True,
                help_text='SPV company name for this property',
                max_length=255,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='property',
            name='spv_registration_number',
            field=models.CharField(
                blank=True,
                help_text='SPV registration/license number',
                max_length=100,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='property',
            name='spv_bank_account_number',
            field=models.CharField(
                blank=True,
                help_text='SPV dedicated bank account number',
                max_length=100,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='property',
            name='spv_bank_name',
            field=models.CharField(
                blank=True,
                help_text='SPV bank name',
                max_length=255,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='property',
            name='spv_establishment_date',
            field=models.DateField(
                blank=True,
                help_text='Date the SPV was legally established',
                null=True,
            ),
        ),
    ]
