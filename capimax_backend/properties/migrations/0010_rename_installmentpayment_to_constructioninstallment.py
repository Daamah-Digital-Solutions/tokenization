# Generated manually - rename InstallmentPayment to ConstructionInstallment

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('properties', '0009_enhance_property_document_data_room'),
    ]

    operations = [
        migrations.RenameModel(
            old_name='InstallmentPayment',
            new_name='ConstructionInstallment',
        ),
    ]
