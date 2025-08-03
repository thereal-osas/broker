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
  key: string;
  value: string;
  type: string;
  description: string;
  editable: boolean;
}

interface SettingsByCategory {
  [category: string]: SystemSetting[];
}

export default function AdminSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [settingsByCategory, setSettingsByCategory] = useState<SettingsByCategory>({});
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
        setSettingsByCategory(data);

        // Initialize form data
        const initialData: Record<string, string> = {};
        Object.values(data).flat().forEach((setting: any) => {
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
      // Convert formData to settings array format
      const settings = Object.entries(formData).map(([key, value]) => ({
        key,
        value
      }));

      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings }),
      });

      if (response.ok) {
        fetchSettings();
        alert('Settings updated successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update settings');
      }
    } catch {
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

  // Get all settings as flat array for easier access
  const allSettings = Object.values(settingsByCategory).flat();

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
          {Object.entries(settingsByCategory).map(([categoryName, categorySettings], categoryIndex) => (
            <motion.div
              key={categoryName}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: categoryIndex * 0.1 }}
              className="bg-white rounded-xl shadow-lg overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900">
                  {categoryName.charAt(0).toUpperCase() + categoryName.slice(1)} Settings
                </h2>
              </div>

              <div className="p-6 space-y-6">
                {categorySettings.map((setting) => (
                  <div key={setting.key} className="space-y-2">
                    <label className="flex items-center text-sm font-medium text-gray-700">
                      <div className="mr-3 p-2 bg-blue-100 rounded-lg text-blue-600">
                        {getSettingIcon(setting.key)}
                      </div>
                      <div>
                        <div className="font-medium">
                          {setting.key.split('_').map((word: string) =>
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ')}
                        </div>
                        <div className="text-xs text-gray-500">{setting.description}</div>
                      </div>
                    </label>

                    <input
                      type={setting.type === 'number' ? 'number' : 'text'}
                      step={setting.type === 'number' ? '0.01' : undefined}
                      min={setting.type === 'number' ? '0' : undefined}
                      max={setting.key === 'max_withdrawal_percentage' ? '100' : undefined}
                      value={formData[setting.key] || ''}
                      onChange={(e) => handleChange(setting.key, e.target.value)}
                      disabled={!setting.editable}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 form-input disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder={`Enter ${setting.key.replace(/_/g, ' ')}`}
                    />
                    {setting.key === 'max_withdrawal_percentage' && (
                      <p className="text-xs text-gray-500">
                        Set the maximum percentage of balance users can withdraw per transaction (0-100%)
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}

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
