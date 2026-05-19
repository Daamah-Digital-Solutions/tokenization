"""
Create operator Groups for Django Admin.

These groups let non-superuser staff log into /admin/ with curated
permissions instead of being granted full superuser rights:

- "KYC Reviewer"         — review and approve/reject KYC, view-only on users
- "Property Moderator"   — review and approve property listings + edits
- "Marketplace Operator" — cancel listings, refund escrows, mark trades failed
- "Broker Reviewer"      — review broker applications + commissions
- "Finance"              — payments, refunds, withdrawals, dividend payouts

The migration is idempotent (uses ``Group.objects.get_or_create`` and
re-sets the permission list each run) so re-running it is safe and is the
canonical way to update the bundles when permissions change.

Add a user to a group via Django admin (Users → Permissions → Groups),
flag them ``is_staff=True``, and they will be able to log into the admin
restricted to that group's surface area.
"""

from django.db import migrations


# --------------------------------------------------------------------------- #
# Permission bundles per group
# --------------------------------------------------------------------------- #
#
# Format: list of (app_label, codename) tuples. The migration filters
# Permission rows by these and assigns the resulting set to the group.
# Missing codenames (e.g. an app that hasn't migrated yet) are skipped
# silently — the group is still created so the admin can populate it
# manually if needed.


# KYC reviewers approve/reject identity verification but should not modify
# user accounts or any other operational data. View on auth.User lets them
# correlate the verification with the user it belongs to.
KYC_REVIEWER_PERMS = [
    ("kyc", "view_kycprofile"),
    ("kyc", "change_kycprofile"),
    ("kyc", "view_kycdocument"),
    ("kyc", "change_kycdocument"),
    ("kyc", "view_kycnote"),
    ("kyc", "add_kycnote"),
    ("kyc", "change_kycnote"),
    ("kyc", "view_compliancecheck"),
    ("kyc", "change_compliancecheck"),
    ("kyc", "view_biometricverification"),
    ("kyc", "change_biometricverification"),
    ("kyc", "view_kycauditlog"),
    ("accounts", "view_user"),
]


# Property moderators manage the listing pipeline: approve/reject submissions,
# edit metadata, manage images/documents/valuations/reviews. They cannot
# touch payments, marketplace state, or KYC.
PROPERTY_MODERATOR_PERMS = [
    ("properties", "view_property"),
    ("properties", "change_property"),
    ("properties", "add_property"),
    ("properties", "view_propertyapproval"),
    ("properties", "change_propertyapproval"),
    ("properties", "add_propertyapproval"),
    ("properties", "view_propertyimage"),
    ("properties", "change_propertyimage"),
    ("properties", "add_propertyimage"),
    ("properties", "delete_propertyimage"),
    ("properties", "view_propertydocument"),
    ("properties", "change_propertydocument"),
    ("properties", "add_propertydocument"),
    ("properties", "delete_propertydocument"),
    ("properties", "view_propertyvaluation"),
    ("properties", "change_propertyvaluation"),
    ("properties", "add_propertyvaluation"),
    ("properties", "view_propertyupdate"),
    ("properties", "change_propertyupdate"),
    ("properties", "add_propertyupdate"),
    ("properties", "view_propertyreview"),
    ("properties", "change_propertyreview"),
    ("properties", "delete_propertyreview"),
    ("properties", "view_propertysubscription"),
    ("properties", "view_propertyanalytics"),
    ("properties", "view_propertymarketdata"),
    ("accounts", "view_user"),
]


# Marketplace operators handle order-book moderation: cancel suspicious
# listings, force-resolve escrows, mark stuck trades failed. They get
# change rights on the operational models but not delete (history matters).
MARKETPLACE_OPERATOR_PERMS = [
    ("marketplace", "view_marketlisting"),
    ("marketplace", "change_marketlisting"),
    ("marketplace", "view_tradeorder"),
    ("marketplace", "change_tradeorder"),
    ("marketplace", "view_tradetransaction"),
    ("marketplace", "change_tradetransaction"),
    ("marketplace", "view_escrowaccount"),
    ("marketplace", "change_escrowaccount"),
    ("marketplace", "view_marketanalytics"),
    ("marketplace", "view_tradingpair"),
    ("marketplace", "change_tradingpair"),
    ("accounts", "view_user"),
]


# Broker reviewers approve new broker applications and audit commissions.
BROKER_REVIEWER_PERMS = [
    ("broker", "view_brokerapplication"),
    ("broker", "change_brokerapplication"),
    ("broker", "view_brokerprofile"),
    ("broker", "change_brokerprofile"),
    ("broker", "view_brokercommission"),
    ("broker", "change_brokercommission"),
    ("broker", "view_brokerreferral"),
    ("broker", "view_brokerperformancemetrics"),
    ("broker", "view_marketingmaterial"),
    ("broker", "add_marketingmaterial"),
    ("broker", "change_marketingmaterial"),
    ("accounts", "view_user"),
]


# Finance handles money flow: payments, refunds, wallet ops, dividend
# payouts, investment withdrawals. No delete on settled records.
FINANCE_PERMS = [
    ("payments", "view_payment"),
    ("payments", "change_payment"),
    ("payments", "view_refund"),
    ("payments", "add_refund"),
    ("payments", "change_refund"),
    ("payments", "view_banktransfer"),
    ("payments", "change_banktransfer"),
    ("payments", "view_cryptopayment"),
    ("payments", "change_cryptopayment"),
    ("payments", "view_walletbalance"),
    ("payments", "view_walletdeposit"),
    ("payments", "change_walletdeposit"),
    ("payments", "view_walletwithdrawal"),
    ("payments", "change_walletwithdrawal"),
    ("payments", "view_wallettransaction"),
    ("payments", "view_userpaymentmethod"),
    ("payments", "view_recurringpayment"),
    ("payments", "view_currencyexchangerate"),
    ("payments", "change_currencyexchangerate"),
    ("payments", "view_nowpaymentstransaction"),
    ("payments", "view_novasukukpayment"),
    ("payments", "view_pronovapayment"),
    ("payments", "view_qrcodepayment"),
    ("investments", "view_investment"),
    ("investments", "view_investmentwithdrawal"),
    ("investments", "change_investmentwithdrawal"),
    ("investments", "view_dividendpayment"),
    ("investments", "add_dividendpayment"),
    ("investments", "change_dividendpayment"),
    ("investments", "view_installmentpayment"),
    ("investments", "change_installmentpayment"),
    ("accounts", "view_user"),
]


GROUPS = [
    ("KYC Reviewer", KYC_REVIEWER_PERMS),
    ("Property Moderator", PROPERTY_MODERATOR_PERMS),
    ("Marketplace Operator", MARKETPLACE_OPERATOR_PERMS),
    ("Broker Reviewer", BROKER_REVIEWER_PERMS),
    ("Finance", FINANCE_PERMS),
]


def create_operator_groups(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Permission = apps.get_model("auth", "Permission")

    for name, perm_specs in GROUPS:
        group, _ = Group.objects.get_or_create(name=name)

        # Resolve permission rows; silently skip any codename whose app
        # hasn't been migrated yet (defensive — keeps the migration usable
        # if app order changes in the future).
        perms = []
        for app_label, codename in perm_specs:
            perm = Permission.objects.filter(
                content_type__app_label=app_label,
                codename=codename,
            ).first()
            if perm is not None:
                perms.append(perm)

        # Replace the permission set so re-running the migration is
        # idempotent and acts as the canonical source of truth.
        group.permissions.set(perms)


def remove_operator_groups(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Group.objects.filter(name__in=[name for name, _ in GROUPS]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0006_add_google_oauth_fields"),
        ("auth", "0012_alter_user_first_name_max_length"),
        # Ensure all operator apps have run their initial migration so the
        # permissions referenced above exist when this migration runs.
        ("kyc", "0001_initial"),
        ("properties", "0001_initial"),
        ("marketplace", "0001_initial"),
        ("broker", "0001_initial"),
        ("payments", "0001_initial"),
        ("investments", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(create_operator_groups, remove_operator_groups),
    ]
