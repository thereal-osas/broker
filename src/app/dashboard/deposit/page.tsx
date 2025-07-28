"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import {
  Copy,
  Clock,
  CheckCircle,
  XCircle,
  Wallet,
  QrCode,
} from "lucide-react";
import { useToast } from "../../../hooks/useToast";
import QRCode from "react-qr-code";

interface DepositRequest {
  id: string;
  amount: number;
  payment_method: string;
  payment_proof: string;
  status: string;
  admin_notes: string;
  created_at: string;
}

// Cryptocurrency wallet addresses from environment variables
const CRYPTO_WALLETS = {
  bitcoin:
    process.env.NEXT_PUBLIC_CRYPTO_WALLET_BITCOIN ||
    "12fRdYfNvvbAgoRM3bD8rByorieo5ZqD9P",
  ethereum:
    process.env.NEXT_PUBLIC_CRYPTO_WALLET_ETHEREUM ||
    "0xdaB7c9Cb68B0CafB4Bc330Ef2dD4628e7E8ED855",
  usdt:
    process.env.NEXT_PUBLIC_CRYPTO_WALLET_USDT ||
    "0xdaB7c9Cb68B0CafB4Bc330Ef2dD4628e7E8ED855",
};

export default function DepositPage() {
  const [amount, setAmount] = useState("");
  const [selectedCrypto, setSelectedCrypto] = useState("bitcoin");
  const [transactionHash, setTransactionHash] = useState("");
  const [paymentProof, setPaymentProof] = useState("");
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>([]);
  const [showForm, setShowForm] = useState(true);
  const toast = useToast();

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Address copied to clipboard!");
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      toast.success("Address copied to clipboard!");
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload image');
    }

    const data = await response.json();
    return data.url;
  };

  const cryptoOptions = [
    { value: "bitcoin", label: "Bitcoin (BTC)", icon: "₿" },
    { value: "ethereum", label: "Ethereum (ETH)", icon: "Ξ" },
    { value: "usdt", label: "Tether (USDT)", icon: "₮" },
  ];

  useEffect(() => {
    fetchDepositRequests();
  }, []);

  const fetchDepositRequests = async () => {
    try {
      const response = await fetch("/api/deposits");
      if (response.ok) {
        const data = await response.json();
        setDepositRequests(data);
      }
    } catch (error) {
      console.error("Error fetching deposit requests:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let proofImageUrl = "";

      // Upload image if provided
      if (proofImage) {
        proofImageUrl = await uploadImage(proofImage);
      }

      const response = await fetch("/api/deposits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          paymentMethod: `crypto_${selectedCrypto}`,
          transactionHash,
          paymentProof,
          paymentProofImage: proofImageUrl,
        }),
      });

      if (response.ok) {
        setAmount("");
        setPaymentProof("");
        setProofImage(null);
        setImagePreview("");
        setShowForm(false);
        fetchDepositRequests();
        toast.success("Deposit request submitted successfully!");
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to submit deposit request");
      }
    } catch (error) {
      console.error("Error submitting deposit:", error);
      toast.error("An error occurred while submitting the request");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case "approved":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "declined":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "declined":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Deposit Funds</h1>
        <p className="text-gray-600">
          Add funds to your account to start investing
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Deposit Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 bg-green-100 rounded-lg">
              <Wallet className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Cryptocurrency Deposit
              </h2>
              <p className="text-sm text-gray-600">
                Send crypto to our wallet address
              </p>
            </div>
          </div>

          {showForm ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deposit Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="10"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 form-input"
                  placeholder="Enter amount to deposit"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Minimum deposit: $10.00
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Cryptocurrency
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {cryptoOptions.map((crypto) => (
                    <button
                      key={crypto.value}
                      type="button"
                      onClick={() => setSelectedCrypto(crypto.value)}
                      className={`p-4 border-2 rounded-lg text-left transition-colors ${
                        selectedCrypto === crypto.value
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{crypto.icon}</span>
                        <div>
                          <p className="font-medium text-gray-900">
                            {crypto.label}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-3">
                  Send{" "}
                  {cryptoOptions.find((c) => c.value === selectedCrypto)?.label}{" "}
                  to:
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Wallet Address
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={
                          CRYPTO_WALLETS[
                            selectedCrypto as keyof typeof CRYPTO_WALLETS
                          ]
                        }
                        readOnly
                        className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-mono"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(
                            CRYPTO_WALLETS[
                              selectedCrypto as keyof typeof CRYPTO_WALLETS
                            ]
                          )
                        }
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <div className="bg-white p-4 rounded-lg border">
                      <QRCode
                        value={
                          CRYPTO_WALLETS[
                            selectedCrypto as keyof typeof CRYPTO_WALLETS
                          ]
                        }
                        size={150}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction Hash
                </label>
                <input
                  type="text"
                  value={transactionHash}
                  onChange={(e) => setTransactionHash(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter transaction hash after sending"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Proof (Optional)
                </label>
                <textarea
                  value={paymentProof}
                  onChange={(e) => setPaymentProof(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Additional notes or proof"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Payment Screenshot (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                {imagePreview && (
                  <div className="mt-2">
                    <Image
                      src={imagePreview}
                      alt="Payment proof preview"
                      width={300}
                      height={128}
                      className="max-w-xs h-32 object-cover rounded-lg"
                    />
                  </div>
                )}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <QrCode className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">Important Instructions:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Send the exact amount to the wallet address above</li>
                      <li>Copy the transaction hash after sending</li>
                      <li>Your deposit will be processed within 24 hours</li>
                      <li>Minimum deposit: $10</li>
                    </ul>
                  </div>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading || !amount || !transactionHash}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    Submitting...
                  </div>
                ) : (
                  `Submit Deposit Request - $${amount || "0.00"}`
                )}
              </motion.button>
            </form>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Request Submitted!
              </h3>
              <p className="text-gray-600 mb-4">
                Your deposit request has been submitted for review.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Submit Another Request
              </button>
            </div>
          )}
        </motion.div>

        {/* Deposit History */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Deposit History
          </h2>

          {depositRequests.length === 0 ? (
            <div className="text-center py-8">
              <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No deposit requests yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {depositRequests.map((request, index) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(request.status)}
                      <span className="font-semibold text-gray-900">
                        ${request.amount.toFixed(2)}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        request.status
                      )}`}
                    >
                      {request.status}
                    </span>
                  </div>

                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Method: {request.payment_method.replace("_", " ")}</p>
                    <p>
                      Date: {new Date(request.created_at).toLocaleDateString()}
                    </p>
                    {request.admin_notes && (
                      <p className="text-red-600">
                        Note: {request.admin_notes}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
