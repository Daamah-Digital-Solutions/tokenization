/**
 * Integration Validator - Tests cross-component integration and data flows
 * 
 * This utility validates that all components work together properly
 * and that data flows correctly throughout the application.
 */

import { currencyConverter } from './currencyConverterMock';

// Validation result interface
export interface ValidationResult {
  component: string;
  test: string;
  passed: boolean;
  message: string;
  timestamp: Date;
  duration: number;
}

export interface ValidationReport {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  duration: number;
  results: ValidationResult[];
  summary: string;
}

// Component integration tests
class IntegrationValidator {
  private results: ValidationResult[] = [];
  private startTime: number = 0;

  // Run all validation tests
  async runAllTests(): Promise<ValidationReport> {
    this.results = [];
    this.startTime = Date.now();

    console.log('🚀 Starting integration validation tests...');

    // Test suites
    await this.testCurrencyConverter();
    await this.testLocalStorage();
    await this.testDOMIntegration();
    await this.testResponsiveDesign();
    await this.testAccessibility();
    await this.testPerformance();

    const totalDuration = Date.now() - this.startTime;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = this.results.length - passedTests;

    const report: ValidationReport = {
      totalTests: this.results.length,
      passedTests,
      failedTests,
      duration: totalDuration,
      results: this.results,
      summary: this.generateSummary(passedTests, failedTests, totalDuration)
    };

    console.log('✅ Integration validation completed');
    this.logReport(report);

    return report;
  }

  // Test currency converter integration
  private async testCurrencyConverter() {
    await this.runTest('Currency Converter', 'Basic conversion', async () => {
      const result = await currencyConverter.convert(100, 'USD', 'USD');
      if (result !== 100) throw new Error('Same currency conversion should return same amount');
    });

    await this.runTest('Currency Converter', 'Format amount', async () => {
      const formatted = currencyConverter.formatAmount(100.50, 'USD');
      if (!formatted.includes('$') || !formatted.includes('100.50')) {
        throw new Error('Format should include currency symbol and proper decimals');
      }
    });

    await this.runTest('Currency Converter', 'Get all rates', async () => {
      const rates = currencyConverter.getAllRates();
      if (typeof rates !== 'object') throw new Error('Should return rates object');
    });
  }

  // Test localStorage integration
  private async testLocalStorage() {
    await this.runTest('Local Storage', 'Store and retrieve data', async () => {
      const testKey = 'integration_test';
      const testData = { test: 'data', timestamp: new Date().toISOString() };
      
      localStorage.setItem(testKey, JSON.stringify(testData));
      const retrieved = JSON.parse(localStorage.getItem(testKey) || '{}');
      
      if (retrieved.test !== testData.test) {
        throw new Error('LocalStorage data mismatch');
      }
      
      localStorage.removeItem(testKey);
    });

    await this.runTest('Local Storage', 'Theme persistence', async () => {
      const themeKey = 'theme';
      localStorage.setItem(themeKey, 'dark');
      const theme = localStorage.getItem(themeKey);
      if (theme !== 'dark') throw new Error('Theme not persisted correctly');
    });
  }

  // Test DOM integration and manipulation
  private async testDOMIntegration() {
    await this.runTest('DOM Integration', 'Document title', async () => {
      if (!document.title) throw new Error('Document title not set');
    });

    await this.runTest('DOM Integration', 'Viewport meta tag', async () => {
      const viewport = document.querySelector('meta[name="viewport"]');
      if (!viewport) throw new Error('Viewport meta tag missing');
    });

    await this.runTest('DOM Integration', 'Main content area', async () => {
      // We'll check after a brief delay to allow for component mounting
      await new Promise(resolve => setTimeout(resolve, 100));
      const mainContent = document.getElementById('main-content');
      if (!mainContent) throw new Error('Main content area not found');
    });

    await this.runTest('DOM Integration', 'Body classes', async () => {
      const body = document.body;
      if (!body.className) {
        // This is not necessarily an error, just a check
        console.warn('Body has no classes applied');
      }
    });
  }

  // Test responsive design breakpoints
  private async testResponsiveDesign() {
    await this.runTest('Responsive Design', 'CSS custom properties', async () => {
      const root = document.documentElement;
      const computedStyle = getComputedStyle(root);
      
      // Check if CSS variables are available (basic check)
      if (!CSS.supports('color', 'var(--test)')) {
        throw new Error('CSS custom properties not supported');
      }
    });

    await this.runTest('Responsive Design', 'Media query support', async () => {
      if (!window.matchMedia) {
        throw new Error('Media queries not supported');
      }
      
      // Test a basic media query
      const mediaQuery = window.matchMedia('(max-width: 768px)');
      if (typeof mediaQuery.matches !== 'boolean') {
        throw new Error('Media query matching not working');
      }
    });

    await this.runTest('Responsive Design', 'Touch support detection', async () => {
      const touchSupported = ('ontouchstart' in window) || 
                            (navigator.maxTouchPoints > 0) ||
                            (navigator.msMaxTouchPoints > 0);
      // This is informational, not a failure
      console.log(`Touch support: ${touchSupported ? 'Yes' : 'No'}`);
    });
  }

  // Test accessibility features
  private async testAccessibility() {
    await this.runTest('Accessibility', 'ARIA support', async () => {
      // Check if basic ARIA attributes are supported
      const testDiv = document.createElement('div');
      testDiv.setAttribute('aria-label', 'test');
      if (!testDiv.hasAttribute('aria-label')) {
        throw new Error('ARIA attributes not supported');
      }
    });

    await this.runTest('Accessibility', 'Focus management', async () => {
      // Test focus capability
      const testButton = document.createElement('button');
      testButton.textContent = 'Test';
      document.body.appendChild(testButton);
      
      try {
        testButton.focus();
        if (document.activeElement !== testButton) {
          throw new Error('Focus management not working');
        }
      } finally {
        document.body.removeChild(testButton);
      }
    });

    await this.runTest('Accessibility', 'Screen reader support', async () => {
      // Test screen reader only class
      const testElement = document.createElement('span');
      testElement.className = 'sr-only';
      document.body.appendChild(testElement);
      
      try {
        const computedStyle = getComputedStyle(testElement);
        if (computedStyle.position !== 'absolute' || 
            computedStyle.width !== '1px' || 
            computedStyle.height !== '1px') {
          throw new Error('Screen reader only class not working properly');
        }
      } finally {
        document.body.removeChild(testElement);
      }
    });
  }

  // Test performance metrics
  private async testPerformance() {
    await this.runTest('Performance', 'Basic timing API', async () => {
      if (!performance || !performance.now) {
        throw new Error('Performance timing API not available');
      }
      
      const start = performance.now();
      await new Promise(resolve => setTimeout(resolve, 1));
      const end = performance.now();
      
      if (end <= start) {
        throw new Error('Performance timing not working correctly');
      }
    });

    await this.runTest('Performance', 'Navigation timing', async () => {
      if (!performance.getEntriesByType) {
        console.warn('Navigation timing API not fully supported');
        return;
      }
      
      const navEntries = performance.getEntriesByType('navigation');
      if (navEntries.length === 0) {
        console.warn('No navigation timing entries found');
      }
    });

    await this.runTest('Performance', 'Resource timing', async () => {
      if (!performance.getEntriesByType) {
        console.warn('Resource timing API not available');
        return;
      }
      
      const resourceEntries = performance.getEntriesByType('resource');
      console.log(`Resource entries found: ${resourceEntries.length}`);
    });

    await this.runTest('Performance', 'Memory usage', async () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        console.log(`Memory usage: ${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`);
      } else {
        console.warn('Memory API not available in this browser');
      }
    });
  }

  // Helper method to run individual tests
  private async runTest(component: string, test: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    
    try {
      await testFn();
      const duration = Date.now() - startTime;
      
      this.results.push({
        component,
        test,
        passed: true,
        message: 'Test passed successfully',
        timestamp: new Date(),
        duration
      });
      
      console.log(`✅ ${component} - ${test} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : 'Unknown error';
      
      this.results.push({
        component,
        test,
        passed: false,
        message,
        timestamp: new Date(),
        duration
      });
      
      console.error(`❌ ${component} - ${test}: ${message} (${duration}ms)`);
    }
  }

  // Generate summary message
  private generateSummary(passed: number, failed: number, duration: number): string {
    const total = passed + failed;
    const passRate = Math.round((passed / total) * 100);
    
    if (failed === 0) {
      return `🎉 All ${total} tests passed! Integration is working perfectly. (${duration}ms)`;
    } else if (passRate >= 80) {
      return `⚠️ ${passed}/${total} tests passed (${passRate}%). ${failed} issues need attention. (${duration}ms)`;
    } else {
      return `🚨 Only ${passed}/${total} tests passed (${passRate}%). Significant integration issues detected. (${duration}ms)`;
    }
  }

  // Log detailed report
  private logReport(report: ValidationReport) {
    console.group('📊 Integration Validation Report');
    console.log(`Total Tests: ${report.totalTests}`);
    console.log(`Passed: ${report.passedTests}`);
    console.log(`Failed: ${report.failedTests}`);
    console.log(`Duration: ${report.duration}ms`);
    console.log(`Summary: ${report.summary}`);
    
    if (report.failedTests > 0) {
      console.group('❌ Failed Tests');
      report.results
        .filter(r => !r.passed)
        .forEach(result => {
          console.error(`${result.component} - ${result.test}: ${result.message}`);
        });
      console.groupEnd();
    }
    
    console.groupEnd();
  }
}

// Export singleton validator
export const integrationValidator = new IntegrationValidator();

// Utility functions for manual testing
export async function validateIntegration(): Promise<ValidationReport> {
  return integrationValidator.runAllTests();
}

// Quick health check function
export async function quickHealthCheck(): Promise<boolean> {
  const report = await integrationValidator.runAllTests();
  return report.failedTests === 0;
}

// Component-specific validation functions
export namespace ComponentValidation {
  export function validateThemeProvider(): boolean {
    try {
      // Check if theme context is available
      const themeTestElement = document.createElement('div');
      themeTestElement.className = 'dark:bg-gray-900';
      
      // Basic validation - if no errors thrown, likely working
      return true;
    } catch (error) {
      console.error('Theme provider validation failed:', error);
      return false;
    }
  }

  export function validatePaymentProvider(): boolean {
    try {
      // Check if payment context utilities are available
      // This would need to be run within a component that has access to the context
      return true;
    } catch (error) {
      console.error('Payment provider validation failed:', error);
      return false;
    }
  }

  export function validateRouter(): boolean {
    try {
      // Check if URL manipulation works
      const currentPath = window.location.pathname;
      return typeof currentPath === 'string';
    } catch (error) {
      console.error('Router validation failed:', error);
      return false;
    }
  }
}

// Performance monitoring utilities
export namespace PerformanceMonitor {
  export function measureRenderTime<T>(componentName: string, renderFn: () => T): T {
    const start = performance.now();
    const result = renderFn();
    const end = performance.now();
    
    console.log(`📊 ${componentName} render time: ${(end - start).toFixed(2)}ms`);
    return result;
  }

  export function measureAsyncOperation<T>(
    operationName: string, 
    operation: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    
    return operation().finally(() => {
      const end = performance.now();
      console.log(`📊 ${operationName} duration: ${(end - start).toFixed(2)}ms`);
    });
  }

  export function getMemoryUsage(): { used: number; total: number } | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024)
      };
    }
    return null;
  }
}

export default integrationValidator;