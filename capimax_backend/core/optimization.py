"""
Database optimization utilities for the Capimax Backend.

This module provides utilities for database query optimization,
index management, and performance monitoring.
"""

from django.db import connection, transaction
from django.core.management.base import BaseCommand
from django.apps import apps
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)


class DatabaseOptimizer:
    """
    Utility class for database optimization operations.
    
    Provides methods for analyzing query performance, managing indexes,
    and optimizing database operations.
    """
    
    def __init__(self):
        self.connection = connection
    
    def analyze_slow_queries(self, min_duration=1.0) -> List[Dict[str, Any]]:
        """
        Analyze slow queries from the database log.
        
        Args:
            min_duration: Minimum query duration in seconds
            
        Returns:
            List of slow query information
        """
        # This would typically analyze database logs
        # For demonstration, we'll return a placeholder
        return []
    
    def get_missing_indexes(self) -> List[Dict[str, Any]]:
        """
        Identify potentially missing database indexes.
        
        Returns:
            List of suggested indexes
        """
        suggestions = []
        
        # Get all models and analyze their query patterns
        for app in apps.get_app_configs():
            for model in app.get_models():
                model_suggestions = self._analyze_model_indexes(model)
                suggestions.extend(model_suggestions)
        
        return suggestions
    
    def _analyze_model_indexes(self, model) -> List[Dict[str, Any]]:
        """
        Analyze a specific model for missing indexes.
        
        Args:
            model: Django model class
            
        Returns:
            List of index suggestions for the model
        """
        suggestions = []
        table_name = model._meta.db_table
        
        # Check for foreign key fields without indexes
        for field in model._meta.get_fields():
            if hasattr(field, 'remote_field') and field.remote_field:
                if not any(field.name in idx.fields for idx in model._meta.indexes):
                    suggestions.append({
                        'model': model.__name__,
                        'table': table_name,
                        'field': field.name,
                        'type': 'foreign_key',
                        'suggestion': f'Add index on {field.name} for foreign key lookups'
                    })
        
        # Check for commonly filtered fields
        common_filter_fields = ['status', 'is_active', 'created_at', 'updated_at']
        for field_name in common_filter_fields:
            if (hasattr(model, field_name) and 
                not any(field_name in idx.fields for idx in model._meta.indexes)):
                suggestions.append({
                    'model': model.__name__,
                    'table': table_name,
                    'field': field_name,
                    'type': 'filter_field',
                    'suggestion': f'Add index on {field_name} for filtering'
                })
        
        return suggestions
    
    def create_indexes_sql(self, suggestions: List[Dict[str, Any]]) -> List[str]:
        """
        Generate SQL statements to create suggested indexes.
        
        Args:
            suggestions: List of index suggestions
            
        Returns:
            List of SQL CREATE INDEX statements
        """
        sql_statements = []
        
        for suggestion in suggestions:
            table = suggestion['table']
            field = suggestion['field']
            index_name = f"idx_{table}_{field}"
            
            sql = f"CREATE INDEX {index_name} ON {table} ({field});"
            sql_statements.append(sql)
        
        return sql_statements
    
    def vacuum_analyze_database(self):
        """
        Perform database maintenance operations (PostgreSQL specific).
        """
        with connection.cursor() as cursor:
            try:
                if 'postgresql' in connection.vendor:
                    cursor.execute("VACUUM ANALYZE;")
                    logger.info("Database VACUUM ANALYZE completed")
                elif 'sqlite' in connection.vendor:
                    cursor.execute("VACUUM;")
                    logger.info("Database VACUUM completed")
            except Exception as e:
                logger.error(f"Database maintenance failed: {e}")


class QueryOptimizer:
    """
    Utility class for optimizing Django ORM queries.
    
    Provides methods for query analysis and optimization suggestions.
    """
    
    @staticmethod
    def optimize_queryset(queryset):
        """
        Apply common optimizations to a queryset.
        
        Args:
            queryset: Django QuerySet object
            
        Returns:
            Optimized QuerySet
        """
        # Apply select_related for foreign keys
        model = queryset.model
        select_related_fields = []
        
        for field in model._meta.get_fields():
            if (hasattr(field, 'remote_field') and field.remote_field and
                field.many_to_one):
                select_related_fields.append(field.name)
        
        if select_related_fields:
            queryset = queryset.select_related(*select_related_fields)
        
        return queryset
    
    @staticmethod
    def get_query_analysis(queryset):
        """
        Analyze a queryset and provide optimization suggestions.
        
        Args:
            queryset: Django QuerySet object
            
        Returns:
            Dict containing query analysis
        """
        return {
            'model': queryset.model.__name__,
            'sql': str(queryset.query),
            'select_related': list(queryset.query.select_related),
            'prefetch_related': [
                prefetch.prefetch_to for prefetch in queryset._prefetch_related_lookups
            ],
            'filters': list(queryset.query.where.children) if queryset.query.where else [],
            'order_by': list(queryset.query.order_by) if queryset.query.order_by else []
        }


class PerformanceMonitor:
    """
    Monitor database performance and collect metrics.
    """
    
    def __init__(self):
        self.queries = []
        self.enabled = False
    
    def enable(self):
        """Enable performance monitoring."""
        self.enabled = True
        self.queries = []
    
    def disable(self):
        """Disable performance monitoring."""
        self.enabled = False
    
    def record_query(self, sql, duration):
        """
        Record a database query for analysis.
        
        Args:
            sql: SQL query string
            duration: Query execution time in seconds
        """
        if self.enabled:
            self.queries.append({
                'sql': sql,
                'duration': duration,
                'timestamp': timezone.now()
            })
    
    def get_slow_queries(self, min_duration=0.1):
        """
        Get queries that exceed the minimum duration.
        
        Args:
            min_duration: Minimum duration in seconds
            
        Returns:
            List of slow queries
        """
        return [
            query for query in self.queries 
            if query['duration'] >= min_duration
        ]
    
    def get_performance_summary(self):
        """
        Get a summary of performance metrics.
        
        Returns:
            Dict containing performance summary
        """
        if not self.queries:
            return {'total_queries': 0}
        
        durations = [q['duration'] for q in self.queries]
        
        return {
            'total_queries': len(self.queries),
            'total_duration': sum(durations),
            'average_duration': sum(durations) / len(durations),
            'max_duration': max(durations),
            'min_duration': min(durations),
            'slow_queries_count': len(self.get_slow_queries())
        }


# Performance monitoring context manager
class performance_monitor:
    """Context manager for monitoring query performance."""
    
    def __init__(self, monitor: PerformanceMonitor):
        self.monitor = monitor
    
    def __enter__(self):
        self.monitor.enable()
        return self.monitor
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.monitor.disable()


# Query optimization decorators
def optimize_queries(func):
    """
    Decorator to automatically optimize queries in a view or method.
    
    Applies select_related and prefetch_related optimizations.
    """
    def wrapper(*args, **kwargs):
        result = func(*args, **kwargs)
        
        # If result is a QuerySet, optimize it
        if hasattr(result, 'model'):
            result = QueryOptimizer.optimize_queryset(result)
        
        return result
    
    return wrapper


def monitor_queries(func):
    """
    Decorator to monitor query performance in a function.
    """
    def wrapper(*args, **kwargs):
        monitor = PerformanceMonitor()
        
        with performance_monitor(monitor):
            result = func(*args, **kwargs)
        
        # Log performance summary
        summary = monitor.get_performance_summary()
        if summary['total_queries'] > 0:
            logger.info(f"Function {func.__name__} executed {summary['total_queries']} queries "
                       f"in {summary['total_duration']:.3f}s")
        
        return result
    
    return wrapper


# Database connection utilities
class DatabaseConnectionManager:
    """
    Manage database connections and connection pooling.
    """
    
    @staticmethod
    def get_connection_info():
        """
        Get information about the current database connection.
        
        Returns:
            Dict containing connection information
        """
        return {
            'vendor': connection.vendor,
            'database_name': connection.settings_dict.get('NAME'),
            'host': connection.settings_dict.get('HOST'),
            'port': connection.settings_dict.get('PORT'),
            'engine': connection.settings_dict.get('ENGINE'),
        }
    
    @staticmethod
    def test_connection():
        """
        Test the database connection.
        
        Returns:
            Boolean indicating connection success
        """
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                return True
        except Exception as e:
            logger.error(f"Database connection test failed: {e}")
            return False
    
    @staticmethod
    def get_database_size():
        """
        Get the size of the database.
        
        Returns:
            Dict containing database size information
        """
        try:
            with connection.cursor() as cursor:
                if 'postgresql' in connection.vendor:
                    cursor.execute("""
                        SELECT pg_size_pretty(pg_database_size(current_database())) as size;
                    """)
                    result = cursor.fetchone()
                    return {'size': result[0] if result else 'Unknown'}
                elif 'sqlite' in connection.vendor:
                    import os
                    db_path = connection.settings_dict.get('NAME')
                    if os.path.exists(db_path):
                        size = os.path.getsize(db_path)
                        return {'size': f"{size / 1024 / 1024:.2f} MB"}
                
                return {'size': 'Unknown'}
        except Exception as e:
            logger.error(f"Failed to get database size: {e}")
            return {'size': 'Error'}


# Index management utilities
class IndexManager:
    """
    Manage database indexes programmatically.
    """
    
    @staticmethod
    def list_indexes(table_name=None):
        """
        List all indexes in the database or for a specific table.
        
        Args:
            table_name: Optional table name to filter indexes
            
        Returns:
            List of index information
        """
        indexes = []
        
        try:
            with connection.cursor() as cursor:
                if 'postgresql' in connection.vendor:
                    sql = """
                        SELECT 
                            indexname,
                            tablename,
                            indexdef
                        FROM pg_indexes
                    """
                    if table_name:
                        sql += " WHERE tablename = %s"
                        cursor.execute(sql, [table_name])
                    else:
                        cursor.execute(sql)
                    
                    for row in cursor.fetchall():
                        indexes.append({
                            'name': row[0],
                            'table': row[1],
                            'definition': row[2]
                        })
                
                elif 'sqlite' in connection.vendor:
                    if table_name:
                        cursor.execute("PRAGMA index_list(?)", [table_name])
                        for row in cursor.fetchall():
                            indexes.append({
                                'name': row[1],
                                'table': table_name,
                                'unique': bool(row[2])
                            })
                    else:
                        # Get all tables first
                        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
                        tables = [row[0] for row in cursor.fetchall()]
                        
                        for table in tables:
                            cursor.execute("PRAGMA index_list(?)", [table])
                            for row in cursor.fetchall():
                                indexes.append({
                                    'name': row[1],
                                    'table': table,
                                    'unique': bool(row[2])
                                })
        
        except Exception as e:
            logger.error(f"Failed to list indexes: {e}")
        
        return indexes
    
    @staticmethod
    def create_index(table_name, column_names, index_name=None, unique=False):
        """
        Create a database index.
        
        Args:
            table_name: Name of the table
            column_names: List of column names or single column name
            index_name: Optional custom index name
            unique: Whether to create a unique index
        """
        if isinstance(column_names, str):
            column_names = [column_names]
        
        if not index_name:
            columns_str = "_".join(column_names)
            index_name = f"idx_{table_name}_{columns_str}"
        
        columns_str = ", ".join(column_names)
        unique_str = "UNIQUE " if unique else ""
        
        sql = f"CREATE {unique_str}INDEX {index_name} ON {table_name} ({columns_str})"
        
        try:
            with connection.cursor() as cursor:
                cursor.execute(sql)
                logger.info(f"Created index {index_name} on {table_name}")
        except Exception as e:
            logger.error(f"Failed to create index {index_name}: {e}")
    
    @staticmethod
    def drop_index(index_name, table_name=None):
        """
        Drop a database index.
        
        Args:
            index_name: Name of the index to drop
            table_name: Table name (required for some databases)
        """
        try:
            with connection.cursor() as cursor:
                if 'postgresql' in connection.vendor:
                    cursor.execute(f"DROP INDEX IF EXISTS {index_name}")
                elif 'sqlite' in connection.vendor:
                    cursor.execute(f"DROP INDEX IF EXISTS {index_name}")
                
                logger.info(f"Dropped index {index_name}")
        except Exception as e:
            logger.error(f"Failed to drop index {index_name}: {e}")


# Global instances
db_optimizer = DatabaseOptimizer()
query_optimizer = QueryOptimizer()
performance_monitor_instance = PerformanceMonitor()
index_manager = IndexManager()