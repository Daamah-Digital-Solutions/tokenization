import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PropertyService } from '../services/property/PropertyService';
import { InvestmentService } from '../services/investment/InvestmentService';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export const IntegrationTestPage: React.FC = () => {
  const { state: authState, login } = useAuth();
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);

  const addTestResult = (testName: string, result: any) => {
    setTestResults(prev => ({
      ...prev,
      [testName]: result
    }));
  };

  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    setIsLoading(true);
    try {
      const result = await testFn();
      addTestResult(testName, { success: true, data: result });
    } catch (error: any) {
      addTestResult(testName, { success: false, error: error.message || 'Unknown error' });
    }
    setIsLoading(false);
  };

  const testAuthentication = async () => {
    if (!authState.isAuthenticated) {
      await login('admin@capimax.com', 'admin123!');
    }
    return { message: 'Authentication successful', user: authState.user };
  };

  const testPropertyData = async () => {
    const properties = await PropertyService.getProperties();
    return {
      count: properties.properties.length,
      firstProperty: properties.properties[0],
      pagination: properties.pagination
    };
  };

  const testInvestmentCreation = async () => {
    // First get properties
    const properties = await PropertyService.getProperties();
    if (properties.properties.length === 0) {
      throw new Error('No properties available for investment');
    }

    const property = properties.properties[0];
    
    // Create investment
    const investment = await InvestmentService.createInvestment({
      property_id: property.id,
      token_amount: 5,
      investment_amount: 5 * property.token_price,
      payment_method: {
        type: 'credit_card' as any,
        currency: 'USD'
      }
    });

    return investment;
  };

  const testPortfolioData = async () => {
    const portfolio = await InvestmentService.getPortfolioSummary();
    return portfolio;
  };

  const runAllTests = async () => {
    const tests = [
      { name: 'Authentication', fn: testAuthentication },
      { name: 'Property Data', fn: testPropertyData },
      { name: 'Investment Creation', fn: testInvestmentCreation },
      { name: 'Portfolio Data', fn: testPortfolioData }
    ];

    for (const test of tests) {
      await runTest(test.name, test.fn);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait between tests
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Integration Test Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            This page tests the frontend-backend integration for all major features.
          </p>
        </div>

        {/* Auth Status */}
        <Card className="mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
            <div className="flex items-center space-x-4">
              <div className={`w-3 h-3 rounded-full ${
                authState.isAuthenticated ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className={authState.isAuthenticated ? 'text-green-600' : 'text-red-600'}>
                {authState.isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
              </span>
              {authState.user && (
                <span className="text-gray-600">
                  as {authState.user.first_name} {authState.user.last_name} ({authState.user.role})
                </span>
              )}
            </div>
          </div>
        </Card>

        {/* Test Controls */}
        <Card className="mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
            <div className="flex space-x-4">
              <Button
                onClick={() => runTest('Authentication', testAuthentication)}
                variant="secondary"
                disabled={isLoading}
              >
                Test Auth
              </Button>
              <Button
                onClick={() => runTest('Property Data', testPropertyData)}
                variant="secondary"
                disabled={isLoading}
              >
                Test Properties
              </Button>
              <Button
                onClick={() => runTest('Investment Creation', testInvestmentCreation)}
                variant="secondary"
                disabled={isLoading}
              >
                Test Investment
              </Button>
              <Button
                onClick={() => runTest('Portfolio Data', testPortfolioData)}
                variant="secondary"
                disabled={isLoading}
              >
                Test Portfolio
              </Button>
              <Button
                onClick={runAllTests}
                variant="primary"
                disabled={isLoading}
                className="ml-auto"
              >
                {isLoading ? 'Running Tests...' : 'Run All Tests'}
              </Button>
            </div>
          </div>
        </Card>

        {/* Test Results */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(testResults).map(([testName, result]) => (
            <Card key={testName}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">{testName}</h3>
                  <div className={`w-3 h-3 rounded-full ${
                    result.success ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                </div>
                
                {result.success ? (
                  <div className="space-y-2">
                    <p className="text-green-600 text-sm font-medium">✅ Success</p>
                    <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-auto max-h-60">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-red-600 text-sm font-medium">❌ Failed</p>
                    <p className="text-red-600 text-sm">{result.error}</p>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* Backend Health */}
        <Card className="mt-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Backend Status</h2>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <p>Backend URL: http://localhost:8000/api</p>
              <p>Frontend URL: http://localhost:5179</p>
              <p>Health Check: <a href="http://localhost:8000/health" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">http://localhost:8000/health</a></p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};