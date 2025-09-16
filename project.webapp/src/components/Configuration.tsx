import React, { useState } from 'react';
import { 
  Settings, 
  Bot, 
  HelpCircle, 
  Plus, 
  Minus, 
  Link, 
  BarChart3, 
  Users, 
  CreditCard, 
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  Zap,
  Database,
  Globe,
  ShoppingCart,
  FileText,
  Monitor
} from 'lucide-react';
import { apiService } from '../services/apiService';

interface SettingsProps {
  // Legacy props for backward compatibility
  questionProvider?: string;
  questionModel?: string;
  onQuestionProviderChange?: (provider: string) => void;
  onQuestionModelChange?: (model: string) => void;
  answerProvider?: string;
  answerModel?: string;
  onAnswerProviderChange?: (provider: string) => void;
  onAnswerModelChange?: (model: string) => void;
  questionCount?: number;
  onQuestionCountChange?: (count: number) => void;
}

export function Configuration(props: SettingsProps) {
  const [activeTab, setActiveTab] = useState<'integrations' | 'usage' | 'account'>('integrations');

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black mb-2">Settings</h1>
        <p className="text-gray-600">Manage your integrations, usage, and account preferences</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="flex space-x-8">
          {[
            { id: 'integrations', label: 'Integrations', icon: Link },
            { id: 'usage', label: 'Plan Usage & Limits', icon: BarChart3 },
            { id: 'account', label: 'Account Settings', icon: Users }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'integrations' && <IntegrationsTab />}
      {activeTab === 'usage' && <UsageTab />}
      {activeTab === 'account' && <AccountTab />}
    </div>
  );
}

// Integrations Tab Component
function IntegrationsTab() {
  const [integrations, setIntegrations] = useState({
    cms: { wordpress: false, webflow: false },
    analytics: { ga4: false, searchConsole: false },
    ecommerce: { shopify: false, bigcommerce: false, woocommerce: false, magento: false }
  });

  const integrationCards = [
    {
      category: 'CMS Platforms',
      description: 'Connect with your content management systems',
      integrations: [
        { id: 'wordpress', name: 'WordPress', icon: FileText, status: integrations.cms.wordpress },
        { id: 'webflow', name: 'Webflow', icon: Globe, status: integrations.cms.webflow }
      ]
    },
    {
      category: 'Analytics & Monitoring',
      description: 'Track performance and user behavior',
      integrations: [
        { id: 'ga4', name: 'Google Analytics 4', icon: BarChart3, status: integrations.analytics.ga4 },
        { id: 'searchConsole', name: 'Google Search Console', icon: Monitor, status: integrations.analytics.searchConsole }
      ]
    },
    {
      category: 'E-commerce Platforms',
      description: 'Integrate with your online stores',
      integrations: [
        { id: 'shopify', name: 'Shopify', icon: ShoppingCart, status: integrations.ecommerce.shopify },
        { id: 'bigcommerce', name: 'BigCommerce', icon: ShoppingCart, status: integrations.ecommerce.bigcommerce },
        { id: 'woocommerce', name: 'WooCommerce', icon: ShoppingCart, status: integrations.ecommerce.woocommerce },
        { id: 'magento', name: 'Magento', icon: ShoppingCart, status: integrations.ecommerce.magento }
      ]
    }
  ];

  const toggleIntegration = (category: string, integration: string) => {
    setIntegrations(prev => {
      const categoryKey = category as keyof typeof prev;
      const integrationKey = integration as keyof typeof prev[typeof categoryKey];
      
      return {
        ...prev,
        [categoryKey]: {
          ...prev[categoryKey],
          [integrationKey]: !prev[categoryKey][integrationKey]
        }
      };
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-black mb-2">Integrations</h2>
        <p className="text-gray-600">Connect with CMS platforms, analytics tools, and e-commerce systems to enhance your content optimization workflow.</p>
      </div>

      {integrationCards.map((card, index) => (
        <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-black mb-1">{card.category}</h3>
            <p className="text-gray-600">{card.description}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {card.integrations.map((integration) => (
              <div
                key={integration.id}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  integration.status
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
                onClick={() => toggleIntegration(
                  card.category === 'CMS Platforms' ? 'cms' :
                  card.category === 'Analytics & Monitoring' ? 'analytics' : 'ecommerce',
                  integration.id
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <integration.icon className={`w-6 h-6 ${integration.status ? 'text-green-600' : 'text-gray-400'}`} />
                  {integration.status ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <h4 className="font-medium text-black mb-1">{integration.name}</h4>
                <p className="text-sm text-gray-600">
                  {integration.status ? 'Connected' : 'Not connected'}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Store Integration Panel */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-black" />
          <h3 className="text-lg font-bold text-black">Store Integration (Read-only)</h3>
        </div>
        <StoreIntegrationPanel />
      </div>
    </div>
  );
}

// Usage Tab Component
function UsageTab() {
  const [usageData] = useState({
    analyses: { used: 45, limit: 100, type: 'Content Analyses' },
    generations: { used: 23, limit: 50, type: 'AI Generations' },
    monitoring: { used: 12, limit: 25, type: 'Monitoring Jobs' }
  });

  const getUsagePercentage = (used: number, limit: number) => Math.round((used / limit) * 100);
  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 bg-red-50';
    if (percentage >= 75) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-black mb-2">Plan Usage & Limits</h2>
        <p className="text-gray-600">Track your current usage against your plan limits and monitor quota consumption.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Object.entries(usageData).map(([key, data]) => {
          const percentage = getUsagePercentage(data.used, data.limit);
          const colorClass = getUsageColor(percentage);
          
          return (
            <div key={key} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-black">{data.type}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
                  {percentage}% used
                </span>
              </div>
              
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>{data.used} used</span>
                  <span>{data.limit} limit</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      percentage >= 90 ? 'bg-red-500' : percentage >= 75 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="text-sm text-gray-600">
                {data.limit - data.used} remaining
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 mb-1">Usage Tips</h4>
            <p className="text-blue-800 text-sm">
              Monitor your usage regularly to avoid hitting limits. Consider upgrading your plan if you're consistently approaching your limits.
            </p>
            </div>
              </div>
            </div>
          </div>
  );
}

// Account Tab Component
function AccountTab() {
  const [accountSettings, setAccountSettings] = useState({
    workspace: 'My Workspace',
    timezone: 'UTC-8 (Pacific Time)',
    notifications: {
      email: true,
      push: false,
      weekly: true
    }
  });

  const [userRoles] = useState([
    { name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'Active' },
    { name: 'Jane Smith', email: 'jane@example.com', role: 'Editor', status: 'Active' },
    { name: 'Mike Johnson', email: 'mike@example.com', role: 'Viewer', status: 'Pending' }
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-black mb-2">Account Settings</h2>
        <p className="text-gray-600">Manage users, roles, billing, and workspace preferences.</p>
      </div>

      {/* Workspace Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-black mb-4">Workspace Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Workspace Name</label>
            <input
              type="text"
              value={accountSettings.workspace}
              onChange={(e) => setAccountSettings(prev => ({ ...prev, workspace: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            </div>
            <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
            <select
              value={accountSettings.timezone}
              onChange={(e) => setAccountSettings(prev => ({ ...prev, timezone: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="UTC-8 (Pacific Time)">UTC-8 (Pacific Time)</option>
              <option value="UTC-5 (Eastern Time)">UTC-5 (Eastern Time)</option>
              <option value="UTC+0 (GMT)">UTC+0 (GMT)</option>
              <option value="UTC+1 (CET)">UTC+1 (CET)</option>
              </select>
            </div>
          </div>
        </div>

      {/* User Management */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-black">User Management</h3>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Invite User
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Email</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Role</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {userRoles.map((user, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-3 px-4 text-black">{user.name}</td>
                  <td className="py-3 px-4 text-gray-600">{user.email}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.role === 'Admin' ? 'bg-purple-100 text-purple-800' :
                      user.role === 'Editor' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <button className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-black mb-4">Notification Preferences</h3>
        <div className="space-y-4">
          {Object.entries(accountSettings.notifications).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-black capitalize">{key} Notifications</h4>
                <p className="text-sm text-gray-600">
                  {key === 'email' && 'Receive notifications via email'}
                  {key === 'push' && 'Receive push notifications in browser'}
                  {key === 'weekly' && 'Receive weekly summary reports'}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => setAccountSettings(prev => ({
                    ...prev,
                    notifications: { ...prev.notifications, [key]: e.target.checked }
                  }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Billing Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-black mb-4">Billing & Subscription</h3>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-black">Pro Plan</h4>
            <p className="text-sm text-gray-600">$29/month • Next billing: Jan 15, 2024</p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Update Payment
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Manage Subscription
            </button>
            </div>
              </div>
            </div>
          </div>
  );
}

// Store Integration Panel (existing component)
export function StoreIntegrationPanel() {
  const [platform, setPlatform] = useState<'shopify' | 'woocommerce' | 'magento' | ''>('');
  const [shopify, setShopify] = useState({ shop: '', accessToken: '' });
  const [woo, setWoo] = useState({ baseUrl: '', consumerKey: '', consumerSecret: '' });
  const [magento, setMagento] = useState({ baseUrl: '', token: '' });
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const creds = platform === 'shopify' ? shopify : platform === 'woocommerce' ? woo : platform === 'magento' ? magento : null;

  const test = async () => {
    if (!platform || !creds) return;
    setLoading(true); setResult(null);
    try {
      const res: any = await apiService.storeTest({ platform, credentials: creds });
      setResult(res?.success ? `Connected ✓ (sample: ${res?.result?.sample ?? 0})` : `Failed ✗ ${res?.result?.error || ''}`);
    } catch (e: any) {
      setResult(`Failed ✗ ${e.message}`);
    } finally { setLoading(false); }
  };
  const save = async () => {
    if (!platform || !creds) return;
    setLoading(true); setResult(null);
    try {
      const res: any = await apiService.storeConnect({ platform, credentials: creds });
      setResult(res?.success ? 'Saved ✓' : `Failed ✗ ${res?.error || ''}`);
    } catch (e: any) {
      setResult(`Failed ✗ ${e.message}`);
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
            <div>
        <label className="block text-sm font-bold text-black mb-2">Platform</label>
        <select value={platform} onChange={e => setPlatform(e.target.value as any)} className="w-full bg-white border border-black/20 rounded-lg px-3 py-2 text-black">
          <option value="">Select platform</option>
          <option value="shopify">Shopify</option>
          <option value="woocommerce">WooCommerce</option>
          <option value="magento">Magento</option>
              </select>
            </div>

      {platform === 'shopify' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
            <label className="block text-sm font-bold text-black mb-2">Shop Domain (myshop.myshopify.com or https://...)</label>
            <input value={shopify.shop} onChange={e => setShopify({ ...shopify, shop: e.target.value })} className="w-full bg-white border border-black/20 rounded-lg px-3 py-2 text-black" />
            </div>
          <div>
            <label className="block text-sm font-bold text-black mb-2">Admin API Access Token</label>
            <input value={shopify.accessToken} onChange={e => setShopify({ ...shopify, accessToken: e.target.value })} className="w-full bg-white border border-black/20 rounded-lg px-3 py-2 text-black" />
          </div>
        </div>
      )}

      {platform === 'woocommerce' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold text-black mb-2">Site URL (https://example.com)</label>
            <input value={woo.baseUrl} onChange={e => setWoo({ ...woo, baseUrl: e.target.value })} className="w-full bg-white border border-black/20 rounded-lg px-3 py-2 text-black" />
            </div>
          <div>
            <label className="block text-sm font-bold text-black mb-2">Consumer Key</label>
            <input value={woo.consumerKey} onChange={e => setWoo({ ...woo, consumerKey: e.target.value })} className="w-full bg-white border border-black/20 rounded-lg px-3 py-2 text-black" />
              </div>
          <div>
            <label className="block text-sm font-bold text-black mb-2">Consumer Secret</label>
            <input value={woo.consumerSecret} onChange={e => setWoo({ ...woo, consumerSecret: e.target.value })} className="w-full bg-white border border-black/20 rounded-lg px-3 py-2 text-black" />
            </div>
          </div>
      )}

      {platform === 'magento' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
            <label className="block text-sm font-bold text-black mb-2">Base URL (https://example.com)</label>
            <input value={magento.baseUrl} onChange={e => setMagento({ ...magento, baseUrl: e.target.value })} className="w-full bg-white border border-black/20 rounded-lg px-3 py-2 text-black" />
                </div>
          <div>
            <label className="block text-sm font-bold text-black mb-2">Integration Token (Bearer)</label>
            <input value={magento.token} onChange={e => setMagento({ ...magento, token: e.target.value })} className="w-full bg-white border border-black/20 rounded-lg px-3 py-2 text-black" />
            </div>
          </div>
      )}

      <div className="flex gap-3">
        <button onClick={test} disabled={!platform || !creds || loading} className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50">{loading ? 'Testing...' : 'Test Connection'}</button>
        <button onClick={save} disabled={!platform || !creds || loading} className="px-4 py-2 rounded-lg bg-gray-800 text-white disabled:opacity-50">Save</button>
        </div>
      {result && <div className="text-sm text-black mt-2">{result}</div>}
    </div>
  );
}
