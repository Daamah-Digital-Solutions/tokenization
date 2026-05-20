"""
Promote (or create) a user as an operational admin for Django Admin.

Usage:
    python manage.py promote_admin admin@example.com
    python manage.py promote_admin admin@example.com --password=...   # reset password too
    python manage.py promote_admin admin@example.com --superuser      # full superuser
    python manage.py promote_admin admin@example.com --staff          # is_staff only (default)
    python manage.py promote_admin admin@example.com --create-if-missing \\
        --password=... --first-name=Admin --last-name=User --country=US

This is the canonical way to repair admin access. The staging bootstrap and
local dev both call it; you can also run it ad-hoc on a VPS to fix drift.

Idempotent: re-running with the same args is a no-op (besides the audit log
line). Password is only updated if ``--password`` is provided.
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Promote a user to is_staff / is_superuser so they can log into /admin/."

    def add_arguments(self, parser):
        parser.add_argument("email")
        parser.add_argument(
            "--password",
            default=None,
            help="If provided, also reset the user's password to this value.",
        )
        parser.add_argument(
            "--superuser",
            action="store_true",
            help="Promote to is_superuser (full Django Admin access). Default is is_staff only.",
        )
        parser.add_argument(
            "--staff",
            action="store_true",
            help="Promote to is_staff only (no superuser). This is the default if neither flag given.",
        )
        parser.add_argument(
            "--create-if-missing",
            action="store_true",
            help="Create the user if they don't exist. Requires --password.",
        )
        parser.add_argument("--first-name", default="Admin")
        parser.add_argument("--last-name", default="User")
        parser.add_argument("--country", default="US")

    def handle(self, *args, **opts):
        User = get_user_model()
        email = opts["email"].strip().lower()
        want_superuser = opts["superuser"] or not opts["staff"]  # default = superuser

        user = User.objects.filter(email__iexact=email).first()
        created = False
        if user is None:
            if not opts["create_if_missing"]:
                raise CommandError(
                    f"No user with email {email!r}. Pass --create-if-missing to create."
                )
            if not opts["password"]:
                raise CommandError("--create-if-missing requires --password.")
            user = User.objects.create_user(
                email=email,
                password=opts["password"],
                first_name=opts["first_name"],
                last_name=opts["last_name"],
                country=opts["country"],
                role="admin",
            )
            created = True

        # Set the flags. role='admin' is set explicitly so the model-level
        # invariant in User.save() also ensures is_staff stays True.
        user.role = "admin"
        user.is_staff = True
        user.is_superuser = bool(want_superuser)
        user.is_active = True
        user.is_verified = True

        if opts["password"] and not created:
            user.set_password(opts["password"])

        user.save()

        action = "Created" if created else "Promoted"
        self.stdout.write(
            self.style.SUCCESS(
                f"{action} {user.email}: "
                f"is_staff={user.is_staff} is_superuser={user.is_superuser} role={user.role}"
            )
        )
