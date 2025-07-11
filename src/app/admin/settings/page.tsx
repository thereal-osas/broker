'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, 
  Save, 
  DollarSign,
  Mail,
  Phone,
  Globe,
  Shield
} from 'lucide-react';

interface SystemSetting {
  id: string;
  key: string;
  value: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export default function AdminSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session?.user || session.user.role !== 'admin') {
      router.push('/auth/signin');
      return;
    }

    fetchSettings();
  }, [session, status, router]);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        
        // Initialize form data
        const initialData: Record<string, string> = {};
        data.forEach((setting: SystemSetting) => {
          initialData[setting.key] = setting.value;
        });
        setFormData(initialData);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        fetchSettings();
        alert('Settings updated successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update settings');
      }
    } catch (error) {
      alert('An error occurred while updating settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getSettingIcon = (key: string) => {
    if (key.includes('email')) return <Mail className="w-5 h-5" />;
    if (key.includes('whatsapp') || key.includes('phone')) return <Phone className="w-5 h-5" />;
    if (key.includes('withdrawal') || key.includes('deposit') || key.includes('commission')) return <DollarSign className="w-5 h-5" />;
    if (key.includes('url') || key.includes('name')) return <Globe className="w-5 h-5" />;
    return <Shield className="w-5 h-5" />;
  };

  const settingCategories = [
    {
      title: 'Platform Settings',
      keys: ['platform_name', 'support_email', 'support_whatsapp']
    },
    {
      title: 'Financial Settings',
      keys: ['default_referral_commission', 'min_withdrawal_amount', 'max_withdrawal_amount']
    }
  ];

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
              <p className="text-gray-600">Configure platform settings and preferences</p>
            </div>
            <div className="flex items-center space-x-3">
              <Settings className="w-6 h-6 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {settingCategories.map((category, categoryIndex) => (
            <motion.div
              key={category.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: categoryIndex * 0.1 }}
              className="bg-white rounded-xl shadow-lg overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900">{category.title}</h2>
              </div>

              <div className="p-6 space-y-6">
                {category.keys.map((key) => {
                  const setting = settings.find(s => s.key === key);
                  if (!setting) return null;

                  return (
                    <div key={key} className="space-y-2">
                      <label className="flex items-center text-sm font-medium text-gray-700">
                        <div className="mr-3 p-2 bg-blue-100 rounded-lg text-blue-600">
                          {getSettingIcon(key)}
                        </div>
                        <div>
                          <div className="font-medium">
                            {setting.key.split('_').map(word => 
                              word.charAt(0).toUpperCase() + word.slice(1)
                            ).join(' ')}
                          </div>
                          <div className="text-xs text-gray-500">{setting.description}</div>
                        </div>
                      </label>
                      
                      <input
                        type={key.includes('amount') || key.includes('commission') ? 'number' : 'text'}
                        step={key.includes('amount') || key.includes('commission') ? '0.01' : undefined}
                        min={key.includes('amount') || key.includes('commission') ? '0' : undefined}
                        value={formData[key] || ''}
                        onChange={(e) => handleChange(key, e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 form-input"
                        placeholder={`Enter ${setting.key.replace(/_/g, ' ')}`}
                      />
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}

          {/* Additional Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-lg overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">Other Settings</h2>
            </div>

            <div className="p-6 space-y-6">
              {settings
                .filter(setting => !settingCategories.some(cat => cat.keys.includes(setting.key)))
                .map((setting) => (
                  <div key={setting.key} className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <div className="mr-3 p-2 bg-gray-100 rounded-lg text-gray-600">
                        {getSettingIcon(setting.key)}
                      </div>
                      <div>
                        <div className="font-medium">
                          {setting.key.split('_').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ')}
                        </div>
                        <div className="text-xs text-gray-500">{setting.description}</div>
                      </div>
                    </label>
                    
                    <input
                      type="text"
                      value={formData[setting.key] || ''}
                      onChange={(e) => handleChange(setting.key, e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 form-input"
                      placeholder={`Enter ${setting.key.replace(/_/g, ' ')}`}
                    />
                  </div>
                ))}
            </div>
          </motion.div>

          {/* Save Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex justify-end"
          >
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center"
            >
              <Save className="w-5 h-5 mr-2" />
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </motion.div>
        </form>
      </div>
    </div>
  );
}
