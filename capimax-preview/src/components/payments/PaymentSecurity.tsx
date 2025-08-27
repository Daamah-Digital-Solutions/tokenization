import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertTriangle, 
  CheckCircle, 
  X,
  Smartphone,
  Key,
  Settings,
  Globe,
  Clock,
  UserCheck,
  CreditCard,
  Ban
} from 'lucide-react';
import { usePayment } from '../../contexts/PaymentContext';
import { formatCurrency } from '../../utils/currencyConverter';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../design-system/forms/Input';
import { Select } from '../design-system/forms/Select';

interface PaymentSecurityProps {
  className?: string;
}

interface SecurityRule {
  id: string;
  title: string;
  description: string;
  type: 'limit' | 'verification' | 'restriction' | 'monitoring';
  enabled: boolean;
  value?: number | string;
  severity: 'low' | 'medium' | 'high';
}

interface SecurityAlert {
  id: string;
  type: 'fraud' | 'limit' | 'verification' | 'suspicious';
  title: string;
  description: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high';
  resolved?: boolean;
}

interface TwoFactorSetup {
  isEnabled: boolean;
  method: 'sms' | 'email' | 'authenticator';
  phone?: string;
  email?: string;
  backupCodes: string[];
}

export function PaymentSecurity({ className }: PaymentSecurityProps) {
  const { state, dispatch } = usePayment();
  const [activeTab, setActiveTab] = useState<'overview' | 'rules' | '2fa' | 'alerts' | 'compliance'>('overview');
  const [twoFactorSetup, setTwoFactorSetup] = useState<TwoFactorSetup>({
    isEnabled: false,
    method: 'sms',
    backupCodes: []
  });
  
  const [securityRules, setSecurityRules] = useState<SecurityRule[]>([
    {
      id: 'daily_limit',
      title: 'Daily Transaction Limit',
      description: 'Maximum amount that can be spent per day',
      type: 'limit',
      enabled: true,
      value: 10000,
      severity: 'medium'
    },
    {
      id: 'single_tx_limit',
      title: 'Single Transaction Limit',
      description: 'Maximum amount for a single transaction',
      type: 'limit',
      enabled: true,
      value: 5000,
      severity: 'medium'
    },
    {
      id: 'require_2fa',
      title: 'Two-Factor Authentication',
      description: 'Require 2FA for all transactions above threshold',
      type: 'verification',
      enabled: true,
      value: 1000,
      severity: 'high'
    },
    {
      id: 'geo_restriction',
      title: 'Geographic Restrictions',
      description: 'Block transactions from restricted countries',
      type: 'restriction',
      enabled: false,
      value: 'US,CA,UK',
      severity: 'high'
    },
    {
      id: 'velocity_check',
      title: 'Velocity Monitoring',
      description: 'Monitor for unusual transaction patterns',
      type: 'monitoring',
      enabled: true,
      severity: 'medium'
    },
    {
      id: 'device_verification',
      title: 'Device Verification',
      description: 'Verify new devices before allowing transactions',
      type: 'verification',
      enabled: true,
      severity: 'high'
    }
  ]);

  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([
    {
      id: 'alert_1',
      type: 'suspicious',
      title: 'Unusual Login Location',
      description: 'Login detected from new location: San Francisco, CA',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      severity: 'medium',
      resolved: false
    },
    {
      id: 'alert_2',
      type: 'limit',
      title: 'Daily Limit Approached',
      description: 'You have used 85% of your daily transaction limit',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      severity: 'low',
      resolved: false
    }
  ]);

  const [showSetup2FA, setShowSetup2FA] = useState(false);
  const [setup2FAStep, setSetup2FAStep] = useState<'method' | 'verify' | 'backup'>('method');
  const [verificationCode, setVerificationCode] = useState('');

  // Security score calculation
  const securityScore = React.useMemo(() => {
    const enabledHighSeverity = securityRules.filter(rule => rule.enabled && rule.severity === 'high').length;
    const enabledMediumSeverity = securityRules.filter(rule => rule.enabled && rule.severity === 'medium').length;
    const totalRules = securityRules.length;
    
    const score = Math.round(
      (enabledHighSeverity * 20 + enabledMediumSeverity * 10) + 
      (twoFactorSetup.isEnabled ? 20 : 0) + 
      (state.isSecurityVerified ? 10 : 0)
    );
    
    return Math.min(score, 100);
  }, [securityRules, twoFactorSetup.isEnabled, state.isSecurityVerified]);

  const toggleSecurityRule = (ruleId: string) => {
    setSecurityRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
    ));
  };

  const updateSecurityRuleValue = (ruleId: string, value: number | string) => {
    setSecurityRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, value } : rule
    ));
  };

  const resolveAlert = (alertId: string) => {
    setSecurityAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, resolved: true } : alert
    ));
  };

  const setup2FA = () => {
    setTwoFactorSetup(prev => ({ 
      ...prev, 
      isEnabled: true,
      backupCodes: Array.from({ length: 8 }, () => 
        Math.random().toString(36).substring(2, 8).toUpperCase()
      )
    }));
    
    dispatch({ 
      type: 'SET_SECURITY_STATUS', 
      payload: { requires2FA: true, isVerified: true } 
    });
    
    setShowSetup2FA(false);
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Security Score */}
      <Card className="p-6 bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-emerald-900">Security Score</h3>
            <p className="text-sm text-emerald-700">Your account security rating</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-emerald-900">{securityScore}</div>
            <div className="text-sm text-emerald-700">out of 100</div>
          </div>
        </div>
        
        <div className="w-full bg-emerald-200 rounded-full h-3">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${securityScore}%` }}
            transition={{ duration: 0.8 }}
            className={`h-3 rounded-full ${
              securityScore >= 80 ? 'bg-emerald-500' :
              securityScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
          />
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card 
          className={`p-4 cursor-pointer transition-all hover:shadow-md ${
            twoFactorSetup.isEnabled ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
          }`}
          onClick={() => !twoFactorSetup.isEnabled && setShowSetup2FA(true)}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              twoFactorSetup.isEnabled ? 'bg-emerald-100' : 'bg-red-100'
            }`}>
              <Shield className={`h-5 w-5 ${
                twoFactorSetup.isEnabled ? 'text-emerald-600' : 'text-red-600'
              }`} />
            </div>
            <div>
              <div className="font-medium text-gray-900">Two-Factor Auth</div>
              <div className={`text-sm ${
                twoFactorSetup.isEnabled ? 'text-emerald-600' : 'text-red-600'
              }`}>
                {twoFactorSetup.isEnabled ? 'Enabled' : 'Disabled'}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">Payment Limits</div>
              <div className="text-sm text-gray-600">
                {formatCurrency(
                  securityRules.find(r => r.id === 'daily_limit')?.value as number || 0, 
                  'USD'
                )} daily
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">Active Alerts</div>
              <div className="text-sm text-gray-600">
                {securityAlerts.filter(a => !a.resolved).length} unresolved
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Security Activity</h3>
        <div className="space-y-3">
          {securityAlerts.slice(0, 3).map((alert) => (
            <div key={alert.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  alert.severity === 'high' ? 'bg-red-100' :
                  alert.severity === 'medium' ? 'bg-yellow-100' : 'bg-blue-100'
                }`}>
                  <AlertTriangle className={`h-4 w-4 ${
                    alert.severity === 'high' ? 'text-red-600' :
                    alert.severity === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                  }`} />
                </div>
                <div>
                  <div className="font-medium text-gray-900">{alert.title}</div>
                  <div className="text-sm text-gray-600">{alert.description}</div>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {alert.timestamp.toRelativeTimeString?.() || alert.timestamp.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  const renderSecurityRules = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Security Rules</h3>
        <p className="text-gray-600">Configure security policies for your account</p>
      </div>

      <div className="space-y-4">
        {securityRules.map((rule) => (
          <Card key={rule.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="font-semibold text-gray-900">{rule.title}</h4>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    rule.severity === 'high' ? 'bg-red-100 text-red-800' :
                    rule.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {rule.severity}
                  </span>
                </div>
                <p className="text-gray-600 mb-4">{rule.description}</p>
                
                {rule.type === 'limit' && typeof rule.value === 'number' && (
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      value={rule.value.toString()}
                      onChange={(e) => updateSecurityRuleValue(rule.id, parseFloat(e.target.value) || 0)}
                      disabled={!rule.enabled}
                      className="w-32"
                    />
                    <span className="text-sm text-gray-600">USD</span>
                  </div>
                )}
                
                {rule.type === 'restriction' && typeof rule.value === 'string' && (
                  <Input
                    value={rule.value}
                    onChange={(e) => updateSecurityRuleValue(rule.id, e.target.value)}
                    disabled={!rule.enabled}
                    placeholder="US,CA,UK"
                    className="w-48"
                  />
                )}
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleSecurityRule(rule.id)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    rule.enabled ? 'bg-emerald-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      rule.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  const render2FASetup = () => (
    <AnimatePresence>
      {showSetup2FA && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowSetup2FA(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Setup 2FA</h3>
                <button
                  onClick={() => setShowSetup2FA(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {setup2FAStep === 'method' && (
                <div className="space-y-4">
                  <p className="text-gray-600">Choose your preferred 2FA method:</p>
                  
                  <div className="space-y-3">
                    {[
                      { value: 'sms', label: 'SMS', icon: Smartphone, description: 'Receive codes via text message' },
                      { value: 'email', label: 'Email', icon: Globe, description: 'Receive codes via email' },
                      { value: 'authenticator', label: 'Authenticator App', icon: Key, description: 'Use Google Authenticator or similar' }
                    ].map((method) => (
                      <button
                        key={method.value}
                        onClick={() => setTwoFactorSetup(prev => ({ ...prev, method: method.value as any }))}
                        className={`w-full p-4 border rounded-lg text-left transition-all ${
                          twoFactorSetup.method === method.value
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <method.icon className={`h-5 w-5 ${
                            twoFactorSetup.method === method.value ? 'text-emerald-600' : 'text-gray-400'
                          }`} />
                          <div>
                            <div className="font-medium text-gray-900">{method.label}</div>
                            <div className="text-sm text-gray-600">{method.description}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <Button
                    onClick={() => setSetup2FAStep('verify')}
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                  >
                    Continue
                  </Button>
                </div>
              )}

              {setup2FAStep === 'verify' && (
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Enter the verification code sent to your {twoFactorSetup.method}:
                  </p>
                  
                  <Input
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    className="text-center text-lg font-mono"
                  />

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setSetup2FAStep('method')}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={() => setSetup2FAStep('backup')}
                      disabled={verificationCode.length !== 6}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    >
                      Verify
                    </Button>
                  </div>
                </div>
              )}

              {setup2FAStep === 'backup' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Backup Codes</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Save these codes in a secure place. You can use them to access your account if you lose your device.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 p-4 bg-gray-50 rounded-lg font-mono text-sm">
                    {Array.from({ length: 8 }, (_, i) => (
                      <div key={i} className="text-center py-1">
                        {Math.random().toString(36).substring(2, 8).toUpperCase()}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setSetup2FAStep('verify')}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={setup2FA}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    >
                      Complete Setup
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const renderAlerts = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Security Alerts</h3>
        <p className="text-gray-600">Monitor and manage security notifications</p>
      </div>

      <div className="space-y-4">
        {securityAlerts.map((alert) => (
          <Card key={alert.id} className={`p-4 ${alert.resolved ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  alert.severity === 'high' ? 'bg-red-100' :
                  alert.severity === 'medium' ? 'bg-yellow-100' : 'bg-blue-100'
                }`}>
                  <AlertTriangle className={`h-4 w-4 ${
                    alert.severity === 'high' ? 'text-red-600' :
                    alert.severity === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900">{alert.title}</h4>
                    {alert.resolved && (
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                    )}
                  </div>
                  <p className="text-gray-600 mb-2">{alert.description}</p>
                  <div className="text-xs text-gray-500">
                    {alert.timestamp.toLocaleString()}
                  </div>
                </div>
              </div>
              
              {!alert.resolved && (
                <Button
                  size="sm"
                  onClick={() => resolveAlert(alert.id)}
                  variant="outline"
                >
                  Resolve
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderCompliance = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Compliance & Verification</h3>
        <p className="text-gray-600">Account verification and regulatory compliance status</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <UserCheck className="h-6 w-6 text-emerald-600" />
            <h4 className="font-semibold text-gray-900">Identity Verification</h4>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Email Verified</span>
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Phone Verified</span>
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">ID Document</span>
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Address Proof</span>
              <Clock className="h-4 w-4 text-yellow-500" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Ban className="h-6 w-6 text-blue-600" />
            <h4 className="font-semibold text-gray-900">AML/KYC Status</h4>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Risk Assessment</span>
              <span className="text-sm font-medium text-emerald-600">Low Risk</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Transaction Limit</span>
              <span className="text-sm font-medium text-gray-900">$50,000/day</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Last Review</span>
              <span className="text-sm text-gray-600">30 days ago</span>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">Regulatory Compliance</h4>
            <p className="text-sm text-blue-800 mb-4">
              Your account complies with applicable financial regulations including AML, KYC, and data protection laws.
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <span>GDPR Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <span>PCI DSS Certified</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <span>SOC 2 Type II</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <span>ISO 27001</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  const tabs = [
    { key: 'overview', label: 'Overview', icon: Shield },
    { key: 'rules', label: 'Security Rules', icon: Settings },
    { key: '2fa', label: 'Two-Factor Auth', icon: Lock },
    { key: 'alerts', label: 'Security Alerts', icon: AlertTriangle },
    { key: 'compliance', label: 'Compliance', icon: UserCheck }
  ];

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payment Security</h2>
          <p className="text-gray-600">Manage your account security and compliance settings</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex mb-6 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'rules' && renderSecurityRules()}
        {activeTab === 'alerts' && renderAlerts()}
        {activeTab === 'compliance' && renderCompliance()}
        {activeTab === '2fa' && (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Two-Factor Authentication</h3>
                  <p className="text-gray-600">Add an extra layer of security to your account</p>
                </div>
                <Button
                  onClick={() => setShowSetup2FA(true)}
                  disabled={twoFactorSetup.isEnabled}
                  className={twoFactorSetup.isEnabled ? 'bg-emerald-600' : 'bg-blue-600 hover:bg-blue-700'}
                >
                  {twoFactorSetup.isEnabled ? 'Enabled' : 'Setup 2FA'}
                </Button>
              </div>
              
              {twoFactorSetup.isEnabled && (
                <div className="mt-4 p-4 bg-emerald-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                    <span className="font-medium text-emerald-900">2FA is active</span>
                  </div>
                  <p className="text-sm text-emerald-700">
                    Using {twoFactorSetup.method} as primary method
                  </p>
                </div>
              )}
            </Card>
          </div>
        )}
      </motion.div>

      {render2FASetup()}
    </div>
  );
}

export default PaymentSecurity;