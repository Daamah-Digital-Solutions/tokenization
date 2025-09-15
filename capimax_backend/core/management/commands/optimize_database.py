"""
Management command for database optimization operations.

This command provides various database optimization features including
index analysis, query optimization, and database maintenance.
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction
from django.apps import apps
from django.utils import timezone
from core.optimization import db_optimizer, index_manager
from core.caching import cache_manager
import sys
from datetime import datetime


class Command(BaseCommand):
    help = 'Optimize database performance through various maintenance operations'

    def add_arguments(self, parser):
        parser.add_argument(
            '--analyze-indexes',
            action='store_true',
            help='Analyze and suggest missing database indexes',
        )
        parser.add_argument(
            '--create-indexes',
            action='store_true',
            help='Create suggested database indexes',
        )
        parser.add_argument(
            '--vacuum',
            action='store_true',
            help='Run database VACUUM ANALYZE (PostgreSQL) or VACUUM (SQLite)',
        )
        parser.add_argument(
            '--list-indexes',
            action='store_true',
            help='List all existing database indexes',
        )
        parser.add_argument(
            '--table',
            type=str,
            help='Target specific table for operations',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without making changes',
        )
        parser.add_argument(
            '--clear-cache',
            action='store_true',
            help='Clear application cache',
        )
        parser.add_argument(
            '--warm-cache',
            action='store_true',
            help='Warm up application cache with popular data',
        )
        parser.add_argument(
            '--database-stats',
            action='store_true',
            help='Show database statistics and information',
        )

    def handle(self, *args, **options):
        """Handle the management command execution."""
        self.stdout.write(
            self.style.SUCCESS(f"Starting database optimization - {timezone.now()}")
        )
        
        try:
            if options['analyze_indexes']:
                self.analyze_indexes(options.get('table'))
            
            if options['create_indexes']:
                self.create_indexes(options.get('dry_run', False))
            
            if options['vacuum']:
                self.vacuum_database()
            
            if options['list_indexes']:
                self.list_indexes(options.get('table'))
            
            if options['clear_cache']:
                self.clear_cache()
            
            if options['warm_cache']:
                self.warm_cache()
            
            if options['database_stats']:
                self.show_database_stats()
            
            # If no specific options provided, show help
            if not any([
                options['analyze_indexes'], options['create_indexes'],
                options['vacuum'], options['list_indexes'],
                options['clear_cache'], options['warm_cache'],
                options['database_stats']
            ]):
                self.print_help()
                
        except Exception as e:
            raise CommandError(f'Database optimization failed: {e}')
        
        self.stdout.write(
            self.style.SUCCESS("Database optimization completed successfully")
        )

    def analyze_indexes(self, table_name=None):
        """Analyze and suggest missing database indexes."""
        self.stdout.write("Analyzing database indexes...")
        
        suggestions = db_optimizer.get_missing_indexes()
        
        if table_name:
            suggestions = [s for s in suggestions if s['table'] == table_name]
        
        if not suggestions:
            self.stdout.write(
                self.style.SUCCESS("No missing indexes found - database is well optimized!")
            )
            return
        
        self.stdout.write(f"Found {len(suggestions)} index suggestions:")
        self.stdout.write("-" * 80)
        
        for suggestion in suggestions:
            self.stdout.write(
                f"Model: {suggestion['model']:<20} "
                f"Table: {suggestion['table']:<25} "
                f"Field: {suggestion['field']:<15} "
                f"Type: {suggestion['type']}"
            )
            self.stdout.write(f"  Suggestion: {suggestion['suggestion']}")
            self.stdout.write("")
        
        self.stdout.write("-" * 80)
        self.stdout.write(
            self.style.WARNING(
                f"Run with --create-indexes to implement {len(suggestions)} suggested indexes"
            )
        )

    def create_indexes(self, dry_run=False):
        """Create suggested database indexes."""
        if dry_run:
            self.stdout.write("DRY RUN - No indexes will be created")
        
        self.stdout.write("Creating suggested database indexes...")
        
        suggestions = db_optimizer.get_missing_indexes()
        
        if not suggestions:
            self.stdout.write("No indexes to create")
            return
        
        sql_statements = db_optimizer.create_indexes_sql(suggestions)
        
        if dry_run:
            self.stdout.write("SQL statements that would be executed:")
            for sql in sql_statements:
                self.stdout.write(f"  {sql}")
            return
        
        created_count = 0
        failed_count = 0
        
        with transaction.atomic():
            with connection.cursor() as cursor:
                for i, sql in enumerate(sql_statements):
                    try:
                        cursor.execute(sql)
                        created_count += 1
                        self.stdout.write(f"✓ Created index {i + 1}/{len(sql_statements)}")
                    except Exception as e:
                        failed_count += 1
                        self.stdout.write(
                            self.style.ERROR(f"✗ Failed to create index {i + 1}: {e}")
                        )
        
        self.stdout.write(
            self.style.SUCCESS(
                f"Index creation completed: {created_count} created, {failed_count} failed"
            )
        )

    def vacuum_database(self):
        """Perform database maintenance operations."""
        self.stdout.write("Performing database maintenance...")
        
        try:
            db_optimizer.vacuum_analyze_database()
            self.stdout.write(
                self.style.SUCCESS("Database maintenance completed successfully")
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Database maintenance failed: {e}")
            )

    def list_indexes(self, table_name=None):
        """List all existing database indexes."""
        self.stdout.write("Listing database indexes...")
        
        indexes = index_manager.list_indexes(table_name)
        
        if not indexes:
            self.stdout.write("No indexes found")
            return
        
        self.stdout.write(f"Found {len(indexes)} indexes:")
        self.stdout.write("-" * 80)
        
        current_table = None
        for index in sorted(indexes, key=lambda x: x.get('table', '')):
            table = index.get('table', 'Unknown')
            
            if table != current_table:
                if current_table is not None:
                    self.stdout.write("")
                self.stdout.write(f"Table: {table}")
                current_table = table
            
            name = index.get('name', 'Unknown')
            unique_str = " (UNIQUE)" if index.get('unique') else ""
            
            self.stdout.write(f"  - {name}{unique_str}")
            
            if 'definition' in index:
                self.stdout.write(f"    {index['definition']}")

    def clear_cache(self):
        """Clear application cache."""
        self.stdout.write("Clearing application cache...")
        
        try:
            from core.caching import redis_utils
            
            if redis_utils.redis_client:
                success = redis_utils.clear_all_cache()
                if success:
                    self.stdout.write(
                        self.style.SUCCESS("Redis cache cleared successfully")
                    )
                else:
                    self.stdout.write(
                        self.style.ERROR("Failed to clear Redis cache")
                    )
            else:
                # Clear Django cache
                cache_manager.cache.clear()
                self.stdout.write(
                    self.style.SUCCESS("Django cache cleared successfully")
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Cache clearing failed: {e}")
            )

    def warm_cache(self):
        """Warm up application cache with popular data."""
        self.stdout.write("Warming up application cache...")
        
        try:
            from core.caching import cache_warmer
            
            # Warm popular properties
            cache_warmer.warm_popular_properties(limit=100)
            self.stdout.write("✓ Popular properties cached")
            
            # Get active user IDs for portfolio caching
            try:
                from django.contrib.auth import get_user_model
                User = get_user_model()
                
                active_users = User.objects.filter(
                    is_active=True,
                    last_login__isnull=False
                ).values_list('id', flat=True)[:500]  # Top 500 active users
                
                cache_warmer.warm_user_portfolios(list(active_users))
                self.stdout.write(f"✓ {len(active_users)} user portfolios cached")
                
            except Exception as e:
                self.stdout.write(
                    self.style.WARNING(f"User portfolio caching failed: {e}")
                )
            
            self.stdout.write(
                self.style.SUCCESS("Cache warming completed successfully")
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Cache warming failed: {e}")
            )

    def show_database_stats(self):
        """Show database statistics and information."""
        self.stdout.write("Database Statistics")
        self.stdout.write("=" * 50)
        
        try:
            from core.optimization import DatabaseConnectionManager
            
            # Connection information
            conn_info = DatabaseConnectionManager.get_connection_info()
            self.stdout.write(f"Database Engine: {conn_info['engine']}")
            self.stdout.write(f"Database Name: {conn_info['database_name']}")
            self.stdout.write(f"Host: {conn_info['host'] or 'localhost'}")
            self.stdout.write(f"Port: {conn_info['port'] or 'default'}")
            self.stdout.write("")
            
            # Database size
            size_info = DatabaseConnectionManager.get_database_size()
            self.stdout.write(f"Database Size: {size_info['size']}")
            self.stdout.write("")
            
            # Connection test
            connection_ok = DatabaseConnectionManager.test_connection()
            status = "✓ OK" if connection_ok else "✗ Failed"
            self.stdout.write(f"Connection Test: {status}")
            self.stdout.write("")
            
            # Model counts
            self.stdout.write("Model Statistics:")
            self.stdout.write("-" * 30)
            
            for app in apps.get_app_configs():
                if app.name.startswith('django.'):
                    continue
                
                app_models = []
                for model in app.get_models():
                    try:
                        count = model.objects.count()
                        app_models.append((model.__name__, count))
                    except Exception:
                        app_models.append((model.__name__, 'Error'))
                
                if app_models:
                    self.stdout.write(f"{app.label}:")
                    for model_name, count in app_models:
                        self.stdout.write(f"  {model_name:<20}: {count:>10}")
                    self.stdout.write("")
            
            # Cache statistics
            try:
                from core.caching import redis_utils
                cache_stats = redis_utils.get_cache_stats()
                
                if 'error' not in cache_stats:
                    self.stdout.write("Cache Statistics:")
                    self.stdout.write("-" * 20)
                    self.stdout.write(f"Memory Used: {cache_stats['memory_used']}")
                    self.stdout.write(f"Memory Peak: {cache_stats['memory_peak']}")
                    self.stdout.write(f"Keys Count: {cache_stats['keys_count']}")
                    self.stdout.write(f"Hit Rate: {cache_stats['hit_rate']:.2f}%")
                else:
                    self.stdout.write(f"Cache: {cache_stats['error']}")
                    
            except Exception as e:
                self.stdout.write(f"Cache statistics unavailable: {e}")
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Failed to retrieve database stats: {e}")
            )

    def print_help(self):
        """Print usage help."""
        self.stdout.write("Database Optimization Command")
        self.stdout.write("=" * 40)
        self.stdout.write("")
        self.stdout.write("Available options:")
        self.stdout.write("  --analyze-indexes    : Analyze and suggest missing indexes")
        self.stdout.write("  --create-indexes     : Create suggested indexes")
        self.stdout.write("  --vacuum             : Run database maintenance")
        self.stdout.write("  --list-indexes       : List existing indexes")
        self.stdout.write("  --clear-cache        : Clear application cache")
        self.stdout.write("  --warm-cache         : Warm up cache with popular data")
        self.stdout.write("  --database-stats     : Show database statistics")
        self.stdout.write("  --table TABLE_NAME   : Target specific table")
        self.stdout.write("  --dry-run            : Show what would be done")
        self.stdout.write("")
        self.stdout.write("Examples:")
        self.stdout.write("  python manage.py optimize_database --analyze-indexes")
        self.stdout.write("  python manage.py optimize_database --create-indexes --dry-run")
        self.stdout.write("  python manage.py optimize_database --vacuum --clear-cache")
        self.stdout.write("  python manage.py optimize_database --list-indexes --table properties_property")