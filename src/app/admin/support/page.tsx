"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  User,
  Shield,
  Bot,
  Filter,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";

interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  created_at: string;
  updated_at: string;
  user_name: string;
  user_email: string;
  assigned_admin_name?: string;
  message_count: number;
  last_message_at: string;
}

interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  message_type: string;
  is_internal: boolean;
  sender_name: string;
  sender_role: string;
  created_at: string;
}

export default function AdminSupportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const toast = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const fetchTickets = useCallback(async () => {
    try {
      let url = "/api/support/tickets?limit=50";
      if (statusFilter !== "all") {
        url += `&status=${statusFilter}`;
      }
      
      const response = await fetch(url);
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
  }, [statusFilter, toast]);

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user) {
      router.push("/auth/signin");
      return;
    }

    if (session.user.role !== "admin") {
      router.push("/dashboard");
      return;
    }

    fetchTickets();
  }, [session, status, router, fetchTickets]);

  const fetchMessages = async (ticketId: string) => {
    try {
      const response = await fetch(`/api/support/messages?ticketId=${ticketId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to fetch messages");
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;

    try {
      const response = await fetch("/api/support/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticketId: selectedTicket.id,
          message: newMessage,
          isInternal,
        }),
      });

      if (response.ok) {
        setNewMessage("");
        setIsInternal(false);
        fetchMessages(selectedTicket.id);
        fetchTickets(); // Refresh ticket list
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
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

  const filteredTickets = tickets.filter(ticket => {
    if (priorityFilter !== "all" && ticket.priority !== priorityFilter) {
      return false;
    }
    return true;
  });

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
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Support Management</h1>
        <p className="text-gray-600">Manage customer support tickets and conversations</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex space-x-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              fetchTickets();
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Priority</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tickets List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-lg">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Support Tickets ({filteredTickets.length})
              </h2>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {filteredTickets.length === 0 ? (
                <div className="p-6 text-center">
                  <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No tickets found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    No support tickets match the current filters.
                  </p>
                </div>
              ) : (
                filteredTickets.map((ticket) => (
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
                        <p className="text-xs text-gray-500 mt-1">
                          From: {ticket.user_name} ({ticket.user_email})
                        </p>
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
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(ticket.created_at).toLocaleDateString()}
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
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {selectedTicket.user_name} ({selectedTicket.user_email})
                      </span>
                    </div>
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
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender_role === "admin" || message.message_type === "bot"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.sender_role === "admin"
                          ? message.is_internal
                            ? "bg-red-100 text-red-900 border border-red-200"
                            : "bg-blue-100 text-blue-900"
                          : message.message_type === "bot"
                          ? "bg-purple-100 text-purple-900"
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
                        {message.is_internal && (
                          <span className="text-xs bg-red-200 text-red-800 px-1 rounded">
                            Internal
                          </span>
                        )}
                      </div>
                      <p className="text-sm">{message.message}</p>
                      <p className="text-xs opacity-75 mt-1">
                        {new Date(message.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex items-center space-x-2 mb-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-600">Internal note (not visible to user)</span>
                  </label>
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                    placeholder={isInternal ? "Internal note..." : "Reply to user..."}
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
                  Choose a ticket from the list to start managing the support conversation.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
