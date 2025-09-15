"""
Redis caching strategies and utilities for the Capimax Backend.

This module provides comprehensive caching functionality including
cache decorators, cache keys management, and cache invalidation strategies.
"""

import redis
import json
import hashlib
import pickle
from functools import wraps
from typing import Any, Optional, Union, Dict, List, Callable
from datetime import timedelta, datetime
from django.core.cache import cache
from django.conf import settings
from django.utils import timezone
from django.core.serializers.json import DjangoJSONEncoder
import logging

logger = logging.getLogger(__name__)


class CacheKeyGenerator:
    """
    Generate consistent cache keys for different types of data.
    """
    
    @staticmethod
    def user_key(user_id: Union[str, int]) -> str:
        """Generate cache key for user data."""
        return f"user:{user_id}"
    
    @staticmethod
    def property_key(property_id: Union[str, int]) -> str:
        """Generate cache key for property data."""
        return f"property:{property_id}"
    
    @staticmethod
    def investment_key(investment_id: Union[str, int]) -> str:
        """Generate cache key for investment data."""
        return f"investment:{investment_id}"
    
    @staticmethod
    def user_investments_key(user_id: Union[str, int]) -> str:
        """Generate cache key for user's investments list."""
        return f"user:{user_id}:investments"
    
    @staticmethod
    def property_analytics_key(property_id: Union[str, int]) -> str:
        """Generate cache key for property analytics."""
        return f"property:{property_id}:analytics"
    
    @staticmethod
    def user_portfolio_key(user_id: Union[str, int]) -> str:
        """Generate cache key for user's portfolio."""
        return f"user:{user_id}:portfolio"
    
    @staticmethod
    def property_list_key(filters: Dict[str, Any] = None, page: int = 1) -> str:
        """Generate cache key for property list with filters."""
        key = f"properties:list:page:{page}"
        if filters:
            # Create a consistent hash of filters
            filter_str = json.dumps(filters, sort_keys=True, cls=DjangoJSONEncoder)
            filter_hash = hashlib.md5(filter_str.encode()).hexdigest()
            key += f":filters:{filter_hash}"
        return key
    
    @staticmethod
    def api_response_key(endpoint: str, params: Dict[str, Any] = None, user_id: Union[str, int] = None) -> str:
        """Generate cache key for API responses."""
        key = f"api:{endpoint}"
        
        if user_id:
            key += f":user:{user_id}"
        
        if params:
            params_str = json.dumps(params, sort_keys=True, cls=DjangoJSONEncoder)
            params_hash = hashlib.md5(params_str.encode()).hexdigest()
            key += f":params:{params_hash}"
        
        return key
    
    @staticmethod
    def notification_key(user_id: Union[str, int]) -> str:
        """Generate cache key for user notifications."""
        return f"user:{user_id}:notifications"
    
    @staticmethod
    def search_results_key(query: str, filters: Dict[str, Any] = None) -> str:
        """Generate cache key for search results."""
        key = f"search:{hashlib.md5(query.encode()).hexdigest()}"
        
        if filters:
            filter_str = json.dumps(filters, sort_keys=True, cls=DjangoJSONEncoder)
            filter_hash = hashlib.md5(filter_str.encode()).hexdigest()
            key += f":filters:{filter_hash}"
        
        return key


class CacheManager:
    """
    Centralized cache management with advanced features.
    """
    
    DEFAULT_TIMEOUT = 60 * 15  # 15 minutes
    LONG_TIMEOUT = 60 * 60 * 24  # 24 hours
    SHORT_TIMEOUT = 60 * 5  # 5 minutes
    
    def __init__(self):
        self.cache = cache
        self.key_generator = CacheKeyGenerator()
    
    def get(self, key: str, default: Any = None) -> Any:
        """
        Get value from cache with error handling.
        
        Args:
            key: Cache key
            default: Default value if key not found
            
        Returns:
            Cached value or default
        """
        try:
            value = self.cache.get(key, default)
            if value is not None:
                logger.debug(f"Cache hit for key: {key}")
            else:
                logger.debug(f"Cache miss for key: {key}")
            return value
        except Exception as e:
            logger.error(f"Cache get error for key {key}: {e}")
            return default
    
    def set(self, key: str, value: Any, timeout: int = None) -> bool:
        """
        Set value in cache with error handling.
        
        Args:
            key: Cache key
            value: Value to cache
            timeout: Cache timeout in seconds
            
        Returns:
            True if successful, False otherwise
        """
        if timeout is None:
            timeout = self.DEFAULT_TIMEOUT
        
        try:
            self.cache.set(key, value, timeout)
            logger.debug(f"Cache set for key: {key}, timeout: {timeout}s")
            return True
        except Exception as e:
            logger.error(f"Cache set error for key {key}: {e}")
            return False
    
    def delete(self, key: str) -> bool:
        """
        Delete key from cache.
        
        Args:
            key: Cache key to delete
            
        Returns:
            True if successful, False otherwise
        """
        try:
            self.cache.delete(key)
            logger.debug(f"Cache delete for key: {key}")
            return True
        except Exception as e:
            logger.error(f"Cache delete error for key {key}: {e}")
            return False
    
    def delete_pattern(self, pattern: str) -> int:
        """
        Delete keys matching a pattern.
        
        Args:
            pattern: Pattern to match (supports wildcards)
            
        Returns:
            Number of keys deleted
        """
        try:
            if hasattr(self.cache, 'delete_pattern'):
                return self.cache.delete_pattern(pattern)
            else:
                # Fallback for cache backends that don't support pattern deletion
                logger.warning(f"Cache backend doesn't support pattern deletion: {pattern}")
                return 0
        except Exception as e:
            logger.error(f"Cache delete pattern error for pattern {pattern}: {e}")
            return 0
    
    def get_or_set(self, key: str, callable_func: Callable, timeout: int = None) -> Any:
        """
        Get value from cache, or set it using the callable if not found.
        
        Args:
            key: Cache key
            callable_func: Function to call if cache miss
            timeout: Cache timeout in seconds
            
        Returns:
            Cached or computed value
        """
        value = self.get(key)
        
        if value is None:
            value = callable_func()
            self.set(key, value, timeout)
        
        return value
    
    def invalidate_user_cache(self, user_id: Union[str, int]):
        """
        Invalidate all cache entries for a specific user.
        
        Args:
            user_id: User ID
        """
        patterns = [
            f"user:{user_id}*",
            f"api:*:user:{user_id}*"
        ]
        
        for pattern in patterns:
            deleted_count = self.delete_pattern(pattern)
            logger.info(f"Invalidated {deleted_count} cache entries for user {user_id} with pattern {pattern}")
    
    def invalidate_property_cache(self, property_id: Union[str, int]):
        """
        Invalidate all cache entries for a specific property.
        
        Args:
            property_id: Property ID
        """
        patterns = [
            f"property:{property_id}*",
            f"properties:list*",  # Invalidate property lists
            f"search:*"  # Invalidate search results
        ]
        
        for pattern in patterns:
            deleted_count = self.delete_pattern(pattern)
            logger.info(f"Invalidated {deleted_count} cache entries for property {property_id} with pattern {pattern}")


class CacheDecorators:
    """
    Decorators for caching function and method results.
    """
    
    def __init__(self, cache_manager: CacheManager):
        self.cache_manager = cache_manager
    
    def cache_result(self, timeout: int = None, key_prefix: str = None):
        """
        Decorator to cache function results.
        
        Args:
            timeout: Cache timeout in seconds
            key_prefix: Optional key prefix
        """
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                # Generate cache key based on function name and arguments
                key_parts = [key_prefix or f"func:{func.__name__}"]
                
                # Add args to key
                for arg in args:
                    if hasattr(arg, 'id'):
                        key_parts.append(str(arg.id))
                    else:
                        key_parts.append(str(hash(str(arg))))
                
                # Add kwargs to key
                if kwargs:
                    kwargs_str = json.dumps(kwargs, sort_keys=True, cls=DjangoJSONEncoder)
                    kwargs_hash = hashlib.md5(kwargs_str.encode()).hexdigest()
                    key_parts.append(f"kwargs:{kwargs_hash}")
                
                cache_key = ":".join(key_parts)
                
                # Try to get from cache
                result = self.cache_manager.get(cache_key)
                
                if result is None:
                    # Execute function and cache result
                    result = func(*args, **kwargs)
                    self.cache_manager.set(cache_key, result, timeout)
                
                return result
            
            return wrapper
        return decorator
    
    def cache_property_data(self, timeout: int = None):
        """
        Decorator specifically for caching property-related data.
        
        Args:
            timeout: Cache timeout in seconds
        """
        def decorator(func):
            @wraps(func)
            def wrapper(property_id, *args, **kwargs):
                cache_key = f"property:{property_id}:{func.__name__}"
                
                if kwargs:
                    kwargs_str = json.dumps(kwargs, sort_keys=True, cls=DjangoJSONEncoder)
                    kwargs_hash = hashlib.md5(kwargs_str.encode()).hexdigest()
                    cache_key += f":kwargs:{kwargs_hash}"
                
                return self.cache_manager.get_or_set(
                    cache_key,
                    lambda: func(property_id, *args, **kwargs),
                    timeout or CacheManager.DEFAULT_TIMEOUT
                )
            
            return wrapper
        return decorator
    
    def cache_user_data(self, timeout: int = None):
        """
        Decorator specifically for caching user-related data.
        
        Args:
            timeout: Cache timeout in seconds
        """
        def decorator(func):
            @wraps(func)
            def wrapper(user_id, *args, **kwargs):
                cache_key = f"user:{user_id}:{func.__name__}"
                
                if kwargs:
                    kwargs_str = json.dumps(kwargs, sort_keys=True, cls=DjangoJSONEncoder)
                    kwargs_hash = hashlib.md5(kwargs_str.encode()).hexdigest()
                    cache_key += f":kwargs:{kwargs_hash}"
                
                return self.cache_manager.get_or_set(
                    cache_key,
                    lambda: func(user_id, *args, **kwargs),
                    timeout or CacheManager.DEFAULT_TIMEOUT
                )
            
            return wrapper
        return decorator


class CacheInvalidationManager:
    """
    Manage cache invalidation strategies.
    """
    
    def __init__(self, cache_manager: CacheManager):
        self.cache_manager = cache_manager
        self.invalidation_rules = {}
    
    def register_invalidation_rule(self, trigger_event: str, cache_patterns: List[str]):
        """
        Register cache invalidation rule for specific events.
        
        Args:
            trigger_event: Event that triggers invalidation
            cache_patterns: List of cache key patterns to invalidate
        """
        if trigger_event not in self.invalidation_rules:
            self.invalidation_rules[trigger_event] = []
        
        self.invalidation_rules[trigger_event].extend(cache_patterns)
    
    def trigger_invalidation(self, event: str, context: Dict[str, Any] = None):
        """
        Trigger cache invalidation for a specific event.
        
        Args:
            event: Event name
            context: Event context data
        """
        if event in self.invalidation_rules:
            patterns = self.invalidation_rules[event]
            
            for pattern in patterns:
                # Replace placeholders with context values
                if context:
                    for key, value in context.items():
                        pattern = pattern.replace(f"{{{key}}}", str(value))
                
                deleted_count = self.cache_manager.delete_pattern(pattern)
                logger.info(f"Invalidated {deleted_count} cache entries for event {event} with pattern {pattern}")


class SessionBasedCache:
    """
    Session-based caching for user-specific data.
    """
    
    def __init__(self, cache_manager: CacheManager):
        self.cache_manager = cache_manager
    
    def get_session_key(self, session_id: str, key: str) -> str:
        """
        Generate session-specific cache key.
        
        Args:
            session_id: Session ID
            key: Base key
            
        Returns:
            Session-specific cache key
        """
        return f"session:{session_id}:{key}"
    
    def set_session_data(self, session_id: str, key: str, value: Any, timeout: int = None):
        """
        Set session-specific data in cache.
        
        Args:
            session_id: Session ID
            key: Data key
            value: Data value
            timeout: Cache timeout
        """
        cache_key = self.get_session_key(session_id, key)
        self.cache_manager.set(cache_key, value, timeout or 60 * 30)  # 30 minutes default
    
    def get_session_data(self, session_id: str, key: str, default: Any = None):
        """
        Get session-specific data from cache.
        
        Args:
            session_id: Session ID
            key: Data key
            default: Default value
            
        Returns:
            Session data or default
        """
        cache_key = self.get_session_key(session_id, key)
        return self.cache_manager.get(cache_key, default)
    
    def clear_session_cache(self, session_id: str):
        """
        Clear all cache entries for a session.
        
        Args:
            session_id: Session ID
        """
        pattern = f"session:{session_id}:*"
        deleted_count = self.cache_manager.delete_pattern(pattern)
        logger.info(f"Cleared {deleted_count} cache entries for session {session_id}")


# Global cache instances
cache_manager = CacheManager()
cache_decorators = CacheDecorators(cache_manager)
cache_invalidation_manager = CacheInvalidationManager(cache_manager)
session_cache = SessionBasedCache(cache_manager)

# Convenience decorators
cache_result = cache_decorators.cache_result
cache_property_data = cache_decorators.cache_property_data
cache_user_data = cache_decorators.cache_user_data


# Cache warming utilities
class CacheWarmer:
    """
    Utilities for warming up cache with frequently accessed data.
    """
    
    def __init__(self, cache_manager: CacheManager):
        self.cache_manager = cache_manager
    
    def warm_popular_properties(self, limit: int = 50):
        """
        Warm cache with popular properties data.
        
        Args:
            limit: Number of properties to cache
        """
        try:
            from properties.models import Property
            
            # Get most viewed properties
            popular_properties = Property.objects.filter(
                status='active'
            ).order_by('-views_count')[:limit]
            
            for property_obj in popular_properties:
                # Cache property data
                cache_key = cache_manager.key_generator.property_key(property_obj.id)
                self.cache_manager.set(cache_key, property_obj, CacheManager.LONG_TIMEOUT)
                
                # Cache property analytics if exists
                if hasattr(property_obj, 'analytics'):
                    analytics_key = cache_manager.key_generator.property_analytics_key(property_obj.id)
                    self.cache_manager.set(analytics_key, property_obj.analytics, CacheManager.DEFAULT_TIMEOUT)
            
            logger.info(f"Warmed cache for {len(popular_properties)} popular properties")
            
        except Exception as e:
            logger.error(f"Failed to warm popular properties cache: {e}")
    
    def warm_user_portfolios(self, user_ids: List[Union[str, int]]):
        """
        Warm cache with user portfolio data.
        
        Args:
            user_ids: List of user IDs
        """
        try:
            from investments.models import Investment
            from django.contrib.auth import get_user_model
            
            User = get_user_model()
            
            for user_id in user_ids:
                try:
                    # Get user investments
                    investments = Investment.objects.filter(
                        user_id=user_id,
                        status='completed'
                    ).select_related('property_investment')
                    
                    # Cache user investments
                    investments_key = cache_manager.key_generator.user_investments_key(user_id)
                    self.cache_manager.set(investments_key, list(investments), CacheManager.DEFAULT_TIMEOUT)
                    
                    logger.debug(f"Warmed cache for user {user_id} investments")
                    
                except Exception as e:
                    logger.error(f"Failed to warm cache for user {user_id}: {e}")
                    
        except Exception as e:
            logger.error(f"Failed to warm user portfolios cache: {e}")


# Global cache warmer instance
cache_warmer = CacheWarmer(cache_manager)


# Redis-specific utilities (if using Redis)
class RedisUtilities:
    """
    Redis-specific caching utilities.
    """
    
    def __init__(self):
        self.redis_client = None
        self._init_redis_client()
    
    def _init_redis_client(self):
        """Initialize Redis client if available."""
        try:
            redis_url = getattr(settings, 'REDIS_URL', 'redis://localhost:6379/0')
            self.redis_client = redis.from_url(redis_url)
            # Test connection
            self.redis_client.ping()
            logger.info("Redis client initialized successfully")
        except Exception as e:
            logger.warning(f"Redis not available: {e}")
            self.redis_client = None
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """
        Get Redis cache statistics.
        
        Returns:
            Dict containing cache statistics
        """
        if not self.redis_client:
            return {'error': 'Redis not available'}
        
        try:
            info = self.redis_client.info()
            return {
                'memory_used': info.get('used_memory_human', 'Unknown'),
                'memory_peak': info.get('used_memory_peak_human', 'Unknown'),
                'keys_count': self.redis_client.dbsize(),
                'hits': info.get('keyspace_hits', 0),
                'misses': info.get('keyspace_misses', 0),
                'hit_rate': info.get('keyspace_hits', 0) / max(info.get('keyspace_hits', 0) + info.get('keyspace_misses', 0), 1) * 100
            }
        except Exception as e:
            logger.error(f"Failed to get Redis stats: {e}")
            return {'error': str(e)}
    
    def clear_all_cache(self) -> bool:
        """
        Clear all cache entries (use with caution).
        
        Returns:
            True if successful, False otherwise
        """
        if not self.redis_client:
            return False
        
        try:
            self.redis_client.flushdb()
            logger.warning("All cache entries cleared")
            return True
        except Exception as e:
            logger.error(f"Failed to clear cache: {e}")
            return False


# Global Redis utilities instance
redis_utils = RedisUtilities()


# Setup default invalidation rules
def setup_default_invalidation_rules():
    """
    Setup default cache invalidation rules for common events.
    """
    # User-related invalidations
    cache_invalidation_manager.register_invalidation_rule(
        'user_updated',
        ['user:{user_id}*', 'api:*:user:{user_id}*']
    )
    
    # Property-related invalidations
    cache_invalidation_manager.register_invalidation_rule(
        'property_updated',
        ['property:{property_id}*', 'properties:list*', 'search:*']
    )
    
    # Investment-related invalidations
    cache_invalidation_manager.register_invalidation_rule(
        'investment_created',
        ['user:{user_id}:investments', 'user:{user_id}:portfolio', 'property:{property_id}:analytics']
    )
    
    # General data invalidations
    cache_invalidation_manager.register_invalidation_rule(
        'property_list_updated',
        ['properties:list*', 'search:*']
    )


# Initialize default rules
setup_default_invalidation_rules()