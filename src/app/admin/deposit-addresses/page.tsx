'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Save,
  X,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react';

interface DepositAddress {
  id: string;
  payment_method: string;
  label: string;
  address: string;
  network: string | null;
  qr_code_url: string | null;
  is_active: boolean;
  display_order: number;
  min_deposit: number;
  max_deposit: number | null;
  instructions: string | null;
  created_at: string;
  updated_at: string;
}

interface FormData {
  payment_method: string;
  label: string;
  address: string;
  network: string;
  qr_code_url: string;
  is_active: boolean;
  display_order: number;
  min_deposit: number;
  max_deposit: string;
  instructions: string;
}

export default function DepositAddressesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [addresses, setAddresses] = useState<DepositAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    payment_method: 'bitcoin',
    label: '',
    address: '',
    network: '',
    qr_code_url: '',
    is_active: true,
    display_order: 0,
    min_deposit: 10,
    max_deposit: '',
    instructions: '',
  });

  useEffect(() => {
    if (status === 'loading') return;

    if (!session?.user || session.user.role !== 'admin') {
      router.push('/auth/signin');
      return;
    }

    fetchAddresses();
  }, [session, status, router]);

  const fetchAddresses = async () => {
    try {
      const response = await fetch('/api/admin/deposit-addresses');
      if (response.ok) {
        const data = await response.json();
        setAddresses(data.addresses);
      }
    } catch (error) {
      console.error('Error fetching deposit addresses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload = {
        ...formData,
        max_deposit: formData.max_deposit ? parseFloat(formData.max_deposit) : null,
      };

      const url = editingId
        ? `/api/admin/deposit-addresses/${editingId}`
        : '/api/admin/deposit-addresses';

      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        fetchAddresses();
        resetForm();
        alert(
          editingId
            ? 'Deposit address updated successfully!'
            : 'Deposit address created successfully!'
        );
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save deposit address');
      }
    } catch (error) {
      console.error('Error saving deposit address:', error);
      alert('An error occurred while saving');
    }
  };

  const handleEdit = (address: DepositAddress) => {
    setEditingId(address.id);
    setFormData({
      payment_method: address.payment_method,
      label: address.label,
      address: address.address,
      network: address.network || '',
      qr_code_url: address.qr_code_url || '',
      is_active: address.is_active,
      display_order: address.display_order,
      min_deposit: address.min_deposit,
      max_deposit: address.max_deposit?.toString() || '',
      instructions: address.instructions || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this deposit address?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/deposit-addresses/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchAddresses();
        alert('Deposit address deleted successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete deposit address');
      }
    } catch (error) {
      console.error('Error deleting deposit address:', error);
      alert('An error occurred while deleting');
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/deposit-addresses/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      if (response.ok) {
        fetchAddresses();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to toggle status');
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('An error occurred');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const resetForm = () => {
    setFormData({
      payment_method: 'bitcoin',
      label: '',
      address: '',
      network: '',
      qr_code_url: '',
      is_active: true,
      display_order: 0,
      min_deposit: 10,
      max_deposit: '',
      instructions: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const paymentMethods = [
    { value: 'bitcoin', label: 'Bitcoin (BTC)' },
    { value: 'ethereum', label: 'Ethereum (ETH)' },
    { value: 'usdt', label: 'Tether (USDT)' },
    { value: 'litecoin', label: 'Litecoin (LTC)' },
    { value: 'bnb', label: 'Binance Coin (BNB)' },
    { value: 'cardano', label: 'Cardano (ADA)' },
    { value: 'solana', label: 'Solana (SOL)' },
    { value: 'dogecoin', label: 'Dogecoin (DOGE)' },
    { value: 'polygon', label: 'Polygon (MATIC)' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'paypal', label: 'PayPal' },
    { value: 'other', label: 'Other' },
  ];

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Deposit Address Management
            </h1>
            <p className="text-gray-600 mt-1">
              Configure payment methods and deposit addresses for users
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {showForm ? (
              <>
                <X className="w-5 h-5" />
                <span>Cancel</span>
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                <span>Add New Address</span>
              </>
            )}
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-lg p-6 mb-6"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {editingId ? 'Edit Deposit Address' : 'Add New Deposit Address'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method *
                  </label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) =>
                      setFormData({ ...formData, payment_method: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {paymentMethods.map((method) => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Label *
                  </label>
                  <input
                    type="text"
                    value={formData.label}
                    onChange={(e) =>
                      setFormData({ ...formData, label: e.target.value })
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Bitcoin Wallet"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address *
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="Enter wallet address or account details"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Network
                  </label>
                  <input
                    type="text"
                    value={formData.network}
                    onChange={(e) =>
                      setFormData({ ...formData, network: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., BTC, ETH, ERC20, TRC20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        display_order: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Deposit ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.min_deposit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        min_deposit: parseFloat(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Deposit ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.max_deposit}
                    onChange={(e) =>
                      setFormData({ ...formData, max_deposit: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Leave empty for no limit"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  QR Code URL (Optional)
                </label>
                <input
                  type="url"
                  value={formData.qr_code_url}
                  onChange={(e) =>
                    setFormData({ ...formData, qr_code_url: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/qr-code.png"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instructions for Users
                </label>
                <textarea
                  value={formData.instructions}
                  onChange={(e) =>
                    setFormData({ ...formData, instructions: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter any special instructions for users..."
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label
                  htmlFor="is_active"
                  className="ml-2 text-sm font-medium text-gray-700"
                >
                  Active (visible to users)
                </label>
              </div>

              <div className="flex items-center space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingId ? 'Update' : 'Create'}</span>
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Address List */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Configured Deposit Addresses ({addresses.length})
            </h2>
          </div>

          {addresses.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No deposit addresses configured yet</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Add your first deposit address
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {addresses.map((address, index) => (
                <motion.div
                  key={address.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {address.label}
                        </h3>
                        {address.network && (
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                            {address.network}
                          </span>
                        )}
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            address.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {address.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 mb-2">
                        <code className="text-sm bg-gray-100 px-3 py-1 rounded font-mono">
                          {address.address}
                        </code>
                        <button
                          onClick={() => copyToClipboard(address.address, address.id)}
                          className="p-1 text-gray-600 hover:text-blue-600 transition-colors"
                          title="Copy address"
                        >
                          {copiedId === address.id ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>Min: ${address.min_deposit.toFixed(2)}</span>
                        {address.max_deposit && (
                          <span>Max: ${address.max_deposit.toFixed(2)}</span>
                        )}
                        <span>Order: {address.display_order}</span>
                      </div>

                      {address.instructions && (
                        <div className="mt-2 flex items-start space-x-2 text-sm text-gray-600">
                          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <p>{address.instructions}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleToggleActive(address.id, address.is_active)}
                        className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                        title={address.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {address.is_active ? (
                          <Eye className="w-5 h-5" />
                        ) : (
                          <EyeOff className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleEdit(address)}
                        className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(address.id)}
                        className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

