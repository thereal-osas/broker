"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  MessageSquare,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  Bot,
  User,
  Shield,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message_at: string;
  assigned_admin_name?: string;
}

interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  message_type: string;
  sender_name: string;
  sender_role: string;
  created_at: string;
}

export default function SupportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const toast = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [newTicketForm, setNewTicketForm] = useState({
    subject: "",
    description: "",
    category: "general",
    priority: "medium",
  });

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session?.user) {
      router.push("/auth/signin");
      return;
    }

    if (session.user.role === "admin") {
      router.push("/admin/support");
      return;
    }

    fetchTickets();
  }, [session, status, router]);

  const fetchTickets = async () => {
    try {
      const response = await fetch("/api/support/tickets");
      if (response.ok) {
        const data = await response.json();
        setTickets(data);
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast.error("Failed to fetch support tickets");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (ticketId: string) => {
    try {
      const response = await fetch(`/api/support/messages?ticketId=${ticketId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      } else {
        console.error("Failed to fetch messages:", response.status, response.statusText);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to fetch messages");
    }
  };

  const createTicket = async () => {
    if (!newTicketForm.subject || !newTicketForm.description) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const response = await fetch("/api/support/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newTicketForm),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success("Support ticket created successfully");
        setShowNewTicket(false);
        setNewTicketForm({
          subject: "",
          description: "",
          category: "general",
          priority: "medium",
        });
        fetchTickets();
        
        if (result.hasAutoResponse) {
          toast.info("You received an automated response!");
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to create ticket");
      }
    } catch (error) {
      console.error("Error creating ticket:", error);
      toast.error("An error occurred while creating the ticket");
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket || !session?.user) return;

    const messageText = newMessage.trim();
    setNewMessage("");

    try {
      const response = await fetch("/api/support/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticketId: selectedTicket.id,
          message: messageText,
        }),
      });

      if (response.ok) {
        const result = await response.json();

        // Add the new message directly to the state using the server response
        if (result.data) {
          setMessages(prev => [...prev, result.data]);
        } else {
          // Fallback: refresh all messages if data is not in expected format
          setTimeout(() => fetchMessages(selectedTicket.id), 500);
        }

        fetchTickets(); // Refresh ticket list to update message count
      } else {
        const errorData = await response.json();
        console.error("Failed to send message:", errorData);
        setNewMessage(messageText); // Restore message text
        toast.error(errorData.error || "Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setNewMessage(messageText); // Restore message text
      toast.error("An error occurred while sending the message");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
      case "in_progress":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "resolved":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "closed":
        return <CheckCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <MessageSquare className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Support Center</h1>
        <p className="text-gray-600">Get help with your account and investments</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tickets List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-lg">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">My Tickets</h2>
              <button
                onClick={() => setShowNewTicket(true)}
                className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-1" />
                New
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {tickets.length === 0 ? (
                <div className="p-6 text-center">
                  <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No tickets yet</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Create your first support ticket to get help.
                  </p>
                </div>
              ) : (
                tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => {
                      setSelectedTicket(ticket);
                      fetchMessages(ticket.id);
                    }}
                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedTicket?.id === ticket.id ? "bg-blue-50 border-blue-200" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(ticket.status)}
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {ticket.subject}
                          </h3>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {ticket.description}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(
                              ticket.priority
                            )}`}
                          >
                            {ticket.priority}
                          </span>
                          <span className="text-xs text-gray-500">
                            {ticket.message_count} messages
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-2">
          {selectedTicket ? (
            <div className="bg-white rounded-xl shadow-lg h-96 flex flex-col">
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {selectedTicket.subject}
                    </h3>
                    <div className="flex items-center space-x-2 mt-1">
                      {getStatusIcon(selectedTicket.status)}
                      <span className="text-sm text-gray-500 capitalize">
                        {selectedTicket.status.replace("_", " ")}
                      </span>
                      <span className="text-sm text-gray-400">•</span>
                      <span className="text-sm text-gray-500 capitalize">
                        {selectedTicket.category}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(
                      selectedTicket.priority
                    )}`}
                  >
                    {selectedTicket.priority} priority
                  </span>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender_role === "admin" || message.message_type === "bot"
                        ? "justify-start"
                        : "justify-end"
                    }`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.sender_role === "admin"
                          ? "bg-blue-100 text-blue-900"
                          : message.message_type === "bot"
                          ? "bg-purple-100 text-purple-900"
                          : message.sender_id === session?.user?.id
                          ? "bg-green-500 text-white"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        {message.message_type === "bot" ? (
                          <Bot className="w-4 h-4" />
                        ) : message.sender_role === "admin" ? (
                          <Shield className="w-4 h-4" />
                        ) : (
                          <User className="w-4 h-4" />
                        )}
                        <span className="text-xs font-medium">
                          {message.message_type === "bot"
                            ? "Support Bot"
                            : message.sender_name}
                        </span>
                      </div>
                      <p className="text-sm">{message.message}</p>
                      <p className="text-xs opacity-75 mt-1">
                        {new Date(message.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  ))
                )}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Type your message..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg h-96 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  Select a ticket to view conversation
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Choose a ticket from the list to start chatting with support.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {showNewTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Create New Support Ticket
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  value={newTicketForm.subject}
                  onChange={(e) =>
                    setNewTicketForm(prev => ({ ...prev, subject: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief description of your issue"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={newTicketForm.category}
                  onChange={(e) =>
                    setNewTicketForm(prev => ({ ...prev, category: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="general">General</option>
                  <option value="account">Account</option>
                  <option value="investment">Investment</option>
                  <option value="withdrawal">Withdrawal</option>
                  <option value="technical">Technical</option>
                  <option value="billing">Billing</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={newTicketForm.priority}
                  onChange={(e) =>
                    setNewTicketForm(prev => ({ ...prev, priority: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  value={newTicketForm.description}
                  onChange={(e) =>
                    setNewTicketForm(prev => ({ ...prev, description: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Please describe your issue in detail..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowNewTicket(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createTicket}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
