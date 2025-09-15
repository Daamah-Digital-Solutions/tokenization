"""
Performance benchmarking and load testing utilities for the Capimax Backend.

This module provides tools for performance testing, load testing,
and benchmarking various components of the application.
"""

import time
import statistics
import concurrent.futures
import threading
from typing import Dict, List, Any, Callable, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from contextlib import contextmanager
import json
import requests
from urllib.parse import urljoin
from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import connection, reset_queries
from django.conf import settings
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


@dataclass
class BenchmarkResult:
    """Data class for storing benchmark results."""
    name: str
    total_requests: int
    successful_requests: int
    failed_requests: int
    total_time: float
    average_time: float
    min_time: float
    max_time: float
    median_time: float
    percentile_95: float
    percentile_99: float
    requests_per_second: float
    errors: List[str] = field(default_factory=list)
    response_times: List[float] = field(default_factory=list)


@dataclass
class LoadTestConfig:
    """Configuration for load testing."""
    base_url: str
    endpoints: List[str]
    concurrent_users: int = 10
    requests_per_user: int = 100
    ramp_up_time: int = 10  # seconds
    test_duration: int = 300  # seconds
    headers: Dict[str, str] = field(default_factory=dict)
    authentication: Optional[Dict[str, str]] = None


class PerformanceBenchmark:
    """
    Performance benchmarking utility for measuring function/method performance.
    """
    
    def __init__(self):
        self.results = {}
        self.active_benchmarks = {}
    
    @contextmanager
    def measure(self, name: str):
        """
        Context manager for measuring execution time.
        
        Args:
            name: Name of the benchmark
        """
        start_time = time.perf_counter()
        start_queries = len(connection.queries) if settings.DEBUG else 0
        
        try:
            yield
        finally:
            end_time = time.perf_counter()
            end_queries = len(connection.queries) if settings.DEBUG else 0
            
            execution_time = end_time - start_time
            query_count = end_queries - start_queries
            
            if name not in self.results:
                self.results[name] = {
                    'times': [],
                    'query_counts': [],
                    'total_runs': 0
                }
            
            self.results[name]['times'].append(execution_time)
            self.results[name]['query_counts'].append(query_count)
            self.results[name]['total_runs'] += 1
    
    def benchmark_function(self, func: Callable, name: str = None, iterations: int = 100, *args, **kwargs) -> BenchmarkResult:
        """
        Benchmark a function by running it multiple times.
        
        Args:
            func: Function to benchmark
            name: Name for the benchmark
            iterations: Number of iterations to run
            *args, **kwargs: Arguments to pass to the function
            
        Returns:
            BenchmarkResult object
        """
        if name is None:
            name = func.__name__
        
        times = []
        errors = []
        successful_runs = 0
        
        logger.info(f"Starting benchmark '{name}' with {iterations} iterations")
        
        for i in range(iterations):
            try:
                start_time = time.perf_counter()
                result = func(*args, **kwargs)
                end_time = time.perf_counter()
                
                execution_time = end_time - start_time
                times.append(execution_time)
                successful_runs += 1
                
            except Exception as e:
                errors.append(f"Iteration {i + 1}: {str(e)}")
                logger.error(f"Benchmark '{name}' failed on iteration {i + 1}: {e}")
        
        if not times:
            raise ValueError(f"All benchmark iterations failed for '{name}'")
        
        # Calculate statistics
        total_time = sum(times)
        average_time = statistics.mean(times)
        min_time = min(times)
        max_time = max(times)
        median_time = statistics.median(times)
        percentile_95 = self._calculate_percentile(times, 95)
        percentile_99 = self._calculate_percentile(times, 99)
        requests_per_second = successful_runs / total_time if total_time > 0 else 0
        
        result = BenchmarkResult(
            name=name,
            total_requests=iterations,
            successful_requests=successful_runs,
            failed_requests=len(errors),
            total_time=total_time,
            average_time=average_time,
            min_time=min_time,
            max_time=max_time,
            median_time=median_time,
            percentile_95=percentile_95,
            percentile_99=percentile_99,
            requests_per_second=requests_per_second,
            errors=errors,
            response_times=times
        )
        
        logger.info(f"Benchmark '{name}' completed: {successful_runs}/{iterations} successful, "
                   f"avg: {average_time:.3f}s, rps: {requests_per_second:.1f}")
        
        return result
    
    def get_summary(self, name: str) -> Dict[str, Any]:
        """
        Get summary statistics for a benchmark.
        
        Args:
            name: Name of the benchmark
            
        Returns:
            Summary statistics
        """
        if name not in self.results:
            return {}
        
        data = self.results[name]
        times = data['times']
        query_counts = data['query_counts']
        
        if not times:
            return {}
        
        return {
            'name': name,
            'total_runs': data['total_runs'],
            'average_time': statistics.mean(times),
            'min_time': min(times),
            'max_time': max(times),
            'median_time': statistics.median(times),
            'std_dev': statistics.stdev(times) if len(times) > 1 else 0,
            'average_queries': statistics.mean(query_counts) if query_counts else 0,
            'max_queries': max(query_counts) if query_counts else 0,
        }
    
    def _calculate_percentile(self, values: List[float], percentile: float) -> float:
        """Calculate percentile value."""
        if not values:
            return 0.0
        
        sorted_values = sorted(values)
        k = (len(sorted_values) - 1) * (percentile / 100)
        f = int(k)
        c = k - f
        
        if f == len(sorted_values) - 1:
            return sorted_values[f]
        
        return sorted_values[f] * (1 - c) + sorted_values[f + 1] * c
    
    def clear_results(self):
        """Clear all benchmark results."""
        self.results.clear()


class DatabaseBenchmark:
    """
    Specialized benchmarking for database operations.
    """
    
    def __init__(self):
        self.benchmark = PerformanceBenchmark()
    
    def benchmark_queries(self, name: str, query_func: Callable, iterations: int = 100) -> BenchmarkResult:
        """
        Benchmark database queries with detailed query analysis.
        
        Args:
            name: Name of the benchmark
            query_func: Function that executes database queries
            iterations: Number of iterations
            
        Returns:
            BenchmarkResult with query statistics
        """
        def measured_query():
            reset_queries()
            result = query_func()
            query_count = len(connection.queries)
            return result, query_count
        
        return self.benchmark.benchmark_function(measured_query, name, iterations)
    
    def benchmark_model_operations(self, model_class, operations: List[str], sample_size: int = 100):
        """
        Benchmark common model operations.
        
        Args:
            model_class: Django model class
            operations: List of operations to benchmark ('create', 'read', 'update', 'delete')
            sample_size: Number of objects to work with
        """
        results = {}
        
        # Create test data
        test_objects = []
        if 'create' in operations:
            def create_operation():
                return model_class.objects.create(**self._get_sample_data(model_class))
            
            results['create'] = self.benchmark.benchmark_function(
                create_operation, f'{model_class.__name__}_create', sample_size
            )
        
        # Prepare objects for other operations
        for _ in range(min(sample_size, 50)):  # Limit for performance
            try:
                obj = model_class.objects.create(**self._get_sample_data(model_class))
                test_objects.append(obj)
            except Exception as e:
                logger.warning(f"Failed to create test object for {model_class.__name__}: {e}")
                break
        
        if 'read' in operations and test_objects:
            def read_operation():
                return list(model_class.objects.all()[:10])
            
            results['read'] = self.benchmark.benchmark_function(
                read_operation, f'{model_class.__name__}_read', 100
            )
        
        if 'update' in operations and test_objects:
            def update_operation():
                obj = test_objects[0]
                obj.save()
                return obj
            
            results['update'] = self.benchmark.benchmark_function(
                update_operation, f'{model_class.__name__}_update', 50
            )
        
        # Cleanup
        for obj in test_objects:
            try:
                obj.delete()
            except Exception:
                pass
        
        return results
    
    def _get_sample_data(self, model_class) -> Dict[str, Any]:
        """Get sample data for model creation."""
        from core.test_factories import TestDataMixin
        
        # Use factory if available
        factory_name = f"{model_class.__name__}Factory"
        try:
            from core import test_factories
            factory_class = getattr(test_factories, factory_name)
            return factory_class.build().__dict__
        except (AttributeError, ImportError):
            # Fallback to minimal required fields
            return self._get_minimal_data(model_class)
    
    def _get_minimal_data(self, model_class) -> Dict[str, Any]:
        """Get minimal required data for model creation."""
        data = {}
        
        for field in model_class._meta.get_fields():
            if field.many_to_one or field.one_to_one:
                continue  # Skip relations for now
            
            if hasattr(field, 'default') and field.default is not None:
                continue  # Field has default
            
            if field.null or field.blank:
                continue  # Field is optional
            
            # Add required field with sample data
            if field.name == 'email':
                data[field.name] = 'test@example.com'
            elif field.name == 'name' or field.name == 'title':
                data[field.name] = 'Test Name'
            elif field.name == 'description':
                data[field.name] = 'Test description'
            elif isinstance(field, models.CharField):
                data[field.name] = 'test'
            elif isinstance(field, models.IntegerField):
                data[field.name] = 1
            elif isinstance(field, models.DecimalField):
                data[field.name] = 100.00
            elif isinstance(field, models.BooleanField):
                data[field.name] = True
        
        return data


class APILoadTester:
    """
    Load testing utility for API endpoints.
    """
    
    def __init__(self, base_url: str = None):
        self.base_url = base_url or 'http://localhost:8000'
        self.session = requests.Session()
        self.results = []
    
    def load_test_endpoint(self, endpoint: str, method: str = 'GET', 
                          concurrent_users: int = 10, requests_per_user: int = 100,
                          payload: Dict = None, headers: Dict = None) -> BenchmarkResult:
        """
        Perform load testing on a specific endpoint.
        
        Args:
            endpoint: API endpoint path
            method: HTTP method
            concurrent_users: Number of concurrent users
            requests_per_user: Requests per user
            payload: Request payload for POST/PUT requests
            headers: Request headers
            
        Returns:
            BenchmarkResult object
        """
        url = urljoin(self.base_url, endpoint)
        headers = headers or {}
        
        logger.info(f"Starting load test: {method} {url} with {concurrent_users} users, "
                   f"{requests_per_user} requests each")
        
        def user_session(user_id: int) -> List[Tuple[float, bool, str]]:
            """Simulate a user session."""
            results = []
            session = requests.Session()
            
            for _ in range(requests_per_user):
                try:
                    start_time = time.perf_counter()
                    
                    if method.upper() == 'GET':
                        response = session.get(url, headers=headers, timeout=30)
                    elif method.upper() == 'POST':
                        response = session.post(url, json=payload, headers=headers, timeout=30)
                    elif method.upper() == 'PUT':
                        response = session.put(url, json=payload, headers=headers, timeout=30)
                    else:
                        response = session.request(method, url, headers=headers, timeout=30)
                    
                    end_time = time.perf_counter()
                    
                    success = response.status_code < 400
                    error_msg = '' if success else f'HTTP {response.status_code}'
                    
                    results.append((end_time - start_time, success, error_msg))
                    
                except requests.exceptions.RequestException as e:
                    end_time = time.perf_counter()
                    results.append((end_time - start_time, False, str(e)))
                except Exception as e:
                    results.append((0.0, False, str(e)))
            
            return results
        
        # Execute concurrent load test
        all_results = []
        errors = []
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=concurrent_users) as executor:
            future_to_user = {
                executor.submit(user_session, user_id): user_id 
                for user_id in range(concurrent_users)
            }
            
            for future in concurrent.futures.as_completed(future_to_user):
                user_id = future_to_user[future]
                try:
                    user_results = future.result()
                    all_results.extend(user_results)
                except Exception as e:
                    errors.append(f'User {user_id} session failed: {str(e)}')
        
        # Process results
        times = [result[0] for result in all_results]
        successful_requests = sum(1 for result in all_results if result[1])
        failed_requests = len(all_results) - successful_requests
        
        for result in all_results:
            if not result[1] and result[2]:
                errors.append(result[2])
        
        if not times:
            raise ValueError("No valid response times recorded")
        
        total_time = max(times) * concurrent_users  # Approximate total time
        average_time = statistics.mean(times)
        min_time = min(times)
        max_time = max(times)
        median_time = statistics.median(times)
        percentile_95 = self._calculate_percentile(times, 95)
        percentile_99 = self._calculate_percentile(times, 99)
        requests_per_second = len(all_results) / total_time if total_time > 0 else 0
        
        result = BenchmarkResult(
            name=f'{method} {endpoint}',
            total_requests=len(all_results),
            successful_requests=successful_requests,
            failed_requests=failed_requests,
            total_time=total_time,
            average_time=average_time,
            min_time=min_time,
            max_time=max_time,
            median_time=median_time,
            percentile_95=percentile_95,
            percentile_99=percentile_99,
            requests_per_second=requests_per_second,
            errors=errors[:10],  # Limit error list
            response_times=times[:100]  # Limit response times list
        )
        
        logger.info(f"Load test completed: {successful_requests}/{len(all_results)} successful, "
                   f"avg: {average_time:.3f}s, rps: {requests_per_second:.1f}")
        
        return result
    
    def _calculate_percentile(self, values: List[float], percentile: float) -> float:
        """Calculate percentile value."""
        if not values:
            return 0.0
        
        sorted_values = sorted(values)
        k = (len(sorted_values) - 1) * (percentile / 100)
        f = int(k)
        c = k - f
        
        if f == len(sorted_values) - 1:
            return sorted_values[f]
        
        return sorted_values[f] * (1 - c) + sorted_values[f + 1] * c


class CacheBenchmark:
    """
    Benchmark caching operations and strategies.
    """
    
    def __init__(self):
        self.benchmark = PerformanceBenchmark()
    
    def benchmark_cache_operations(self, iterations: int = 1000) -> Dict[str, BenchmarkResult]:
        """
        Benchmark basic cache operations.
        
        Args:
            iterations: Number of iterations for each operation
            
        Returns:
            Dictionary of benchmark results
        """
        results = {}
        
        # Cache SET operations
        def cache_set():
            cache.set(f'test_key_{threading.current_thread().ident}', 'test_value', 300)
        
        results['cache_set'] = self.benchmark.benchmark_function(
            cache_set, 'cache_set', iterations
        )
        
        # Cache GET operations
        cache.set('benchmark_key', 'benchmark_value', 300)
        
        def cache_get():
            return cache.get('benchmark_key')
        
        results['cache_get'] = self.benchmark.benchmark_function(
            cache_get, 'cache_get', iterations
        )
        
        # Cache DELETE operations
        def cache_delete():
            cache.set('temp_key', 'temp_value', 300)
            cache.delete('temp_key')
        
        results['cache_delete'] = self.benchmark.benchmark_function(
            cache_delete, 'cache_delete', iterations // 2  # Fewer iterations
        )
        
        return results
    
    def benchmark_cache_strategies(self, data_generator: Callable, cache_strategies: List[str]) -> Dict[str, BenchmarkResult]:
        """
        Benchmark different caching strategies.
        
        Args:
            data_generator: Function that generates data to cache
            cache_strategies: List of strategy names to test
            
        Returns:
            Dictionary of benchmark results
        """
        results = {}
        
        for strategy in cache_strategies:
            if strategy == 'no_cache':
                def no_cache_operation():
                    return data_generator()
                
                results['no_cache'] = self.benchmark.benchmark_function(
                    no_cache_operation, 'no_cache', 100
                )
            
            elif strategy == 'simple_cache':
                def simple_cache_operation():
                    cached = cache.get('simple_cache_key')
                    if cached is None:
                        cached = data_generator()
                        cache.set('simple_cache_key', cached, 300)
                    return cached
                
                results['simple_cache'] = self.benchmark.benchmark_function(
                    simple_cache_operation, 'simple_cache', 100
                )
            
            elif strategy == 'cache_with_timeout':
                def timeout_cache_operation():
                    cached = cache.get('timeout_cache_key')
                    if cached is None:
                        cached = data_generator()
                        cache.set('timeout_cache_key', cached, 60)  # Shorter timeout
                    return cached
                
                results['cache_with_timeout'] = self.benchmark.benchmark_function(
                    timeout_cache_operation, 'cache_with_timeout', 100
                )
        
        return results


class MemoryBenchmark:
    """
    Memory usage benchmarking utilities.
    """
    
    @staticmethod
    def measure_memory_usage(func: Callable, *args, **kwargs) -> Tuple[Any, Dict[str, float]]:
        """
        Measure memory usage of a function.
        
        Args:
            func: Function to measure
            *args, **kwargs: Function arguments
            
        Returns:
            Tuple of (function_result, memory_stats)
        """
        try:
            import psutil
            import os
            
            process = psutil.Process(os.getpid())
            
            # Measure before execution
            memory_before = process.memory_info()
            
            # Execute function
            result = func(*args, **kwargs)
            
            # Measure after execution
            memory_after = process.memory_info()
            
            memory_stats = {
                'rss_before': memory_before.rss / 1024 / 1024,  # MB
                'rss_after': memory_after.rss / 1024 / 1024,   # MB
                'rss_diff': (memory_after.rss - memory_before.rss) / 1024 / 1024,  # MB
                'vms_before': memory_before.vms / 1024 / 1024,  # MB
                'vms_after': memory_after.vms / 1024 / 1024,   # MB
                'vms_diff': (memory_after.vms - memory_before.vms) / 1024 / 1024,  # MB
            }
            
            return result, memory_stats
            
        except ImportError:
            logger.warning("psutil not available for memory measurement")
            return func(*args, **kwargs), {}


class BenchmarkReporter:
    """
    Generate reports from benchmark results.
    """
    
    @staticmethod
    def generate_text_report(results: Dict[str, BenchmarkResult]) -> str:
        """
        Generate a text report from benchmark results.
        
        Args:
            results: Dictionary of benchmark results
            
        Returns:
            Text report
        """
        lines = []
        lines.append("Performance Benchmark Report")
        lines.append("=" * 50)
        lines.append(f"Generated: {datetime.now().isoformat()}")
        lines.append("")
        
        for name, result in results.items():
            lines.append(f"Benchmark: {result.name}")
            lines.append("-" * 30)
            lines.append(f"Total Requests: {result.total_requests}")
            lines.append(f"Successful: {result.successful_requests} ({result.successful_requests/result.total_requests*100:.1f}%)")
            lines.append(f"Failed: {result.failed_requests}")
            lines.append(f"Average Time: {result.average_time:.3f}s")
            lines.append(f"Min Time: {result.min_time:.3f}s")
            lines.append(f"Max Time: {result.max_time:.3f}s")
            lines.append(f"Median Time: {result.median_time:.3f}s")
            lines.append(f"95th Percentile: {result.percentile_95:.3f}s")
            lines.append(f"99th Percentile: {result.percentile_99:.3f}s")
            lines.append(f"Requests/Second: {result.requests_per_second:.1f}")
            
            if result.errors:
                lines.append(f"Sample Errors ({len(result.errors)} total):")
                for error in result.errors[:5]:  # Show first 5 errors
                    lines.append(f"  - {error}")
            
            lines.append("")
        
        return "\n".join(lines)
    
    @staticmethod
    def generate_json_report(results: Dict[str, BenchmarkResult]) -> str:
        """
        Generate a JSON report from benchmark results.
        
        Args:
            results: Dictionary of benchmark results
            
        Returns:
            JSON report
        """
        report_data = {
            'generated_at': datetime.now().isoformat(),
            'results': {}
        }
        
        for name, result in results.items():
            report_data['results'][name] = {
                'name': result.name,
                'total_requests': result.total_requests,
                'successful_requests': result.successful_requests,
                'failed_requests': result.failed_requests,
                'total_time': result.total_time,
                'average_time': result.average_time,
                'min_time': result.min_time,
                'max_time': result.max_time,
                'median_time': result.median_time,
                'percentile_95': result.percentile_95,
                'percentile_99': result.percentile_99,
                'requests_per_second': result.requests_per_second,
                'error_count': len(result.errors),
                'sample_errors': result.errors[:10],  # First 10 errors
            }
        
        return json.dumps(report_data, indent=2)
    
    @staticmethod
    def save_report(content: str, filename: str):
        """Save report to file."""
        with open(filename, 'w') as f:
            f.write(content)
        
        logger.info(f"Benchmark report saved to {filename}")


# Global instances
performance_benchmark = PerformanceBenchmark()
database_benchmark = DatabaseBenchmark()
api_load_tester = APILoadTester()
cache_benchmark = CacheBenchmark()
benchmark_reporter = BenchmarkReporter()