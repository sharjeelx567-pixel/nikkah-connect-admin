"use client";

import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../../services/api";
import { 
  Search, 
  Filter, 
  MessageSquare, 
  User, 
  Clock, 
  CheckCircle,
  XCircle,
  Send,
  Paperclip,
  Check,
  CheckCheck
} from "lucide-react";

// Types
interface Ticket {
  id: string;
  userId: string;
  userDisplayName: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  updatedAt: { _seconds: number; _nanoseconds: number };
  unreadCountAdmin: number;
}

interface Message {
  id: string;
  senderType: "user" | "admin";
  content: string;
  type: string;
  timestamp: { _seconds: number; _nanoseconds: number };
  isRead: boolean;
  delivered: boolean;
}

// Using global API client from services/api.ts

export default function SupportPage() {
  const queryClient = useQueryClient();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [replyText, setReplyText] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch Tickets
  const { data: ticketsData, isLoading: isLoadingTickets } = useQuery({
    queryKey: ["supportTickets"],
    queryFn: async () => {
      const res = await api.get(`/support/tickets?limit=200`);
      return res.data.data.tickets as Ticket[];
    },
    refetchInterval: 5000, // Poll every 5s for new tickets
  });

  const filteredTickets = React.useMemo(() => {
    if (!ticketsData) return [];
    return ticketsData.filter(ticket => {
      const matchesStatus = filterStatus ? ticket.status.toLowerCase() === filterStatus.toLowerCase() : true;
      const matchesSearch = searchTerm 
        ? ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) || 
          ticket.userDisplayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ticket.id.toLowerCase().includes(searchTerm.replace('#', '').toLowerCase())
        : true;
      return matchesStatus && matchesSearch;
    });
  }, [ticketsData, filterStatus, searchTerm]);

  // Fetch Active Ticket Details (Messages)
  const { data: activeTicketData, isLoading: isLoadingChat } = useQuery({
    queryKey: ["supportTicket", selectedTicketId],
    queryFn: async () => {
      if (!selectedTicketId) return null;
      const res = await api.get(`/support/tickets/${selectedTicketId}`);
      return res.data.data as { ticket: Ticket; messages: Message[] };
    },
    enabled: !!selectedTicketId,
    refetchInterval: 3000, // Fast poll during active chat
  });

  // Send Reply Mutation
  const replyMutation = useMutation({
    mutationFn: async (content: string) => {
      await api.post(`/support/tickets/${selectedTicketId}/reply`, { content, type: "text" });
    },
    onSuccess: () => {
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ["supportTicket", selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ["supportTickets"] });
    },
  });

  // Change Status Mutation
  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      await api.put(`/support/tickets/${selectedTicketId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supportTicket", selectedTicketId] });
      queryClient.invalidateQueries({ queryKey: ["supportTickets"] });
    }
  });

  useEffect(() => {
    // Auto-scroll chat
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeTicketData?.messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (replyText.trim() && selectedTicketId) {
      replyMutation.mutate(replyText.trim());
    }
  };

  const getStatusColor = (status: string) => {
    switch(status.toLowerCase()) {
      case 'open': return 'bg-red-100 text-red-700 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'waiting for user': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'resolved':
      case 'closed': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const formatTime = (ts: { _seconds: number }) => {
    if (!ts) return "";
    const date = new Date(ts._seconds * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-50 overflow-hidden">
      
      {/* Left Sidebar - Ticket List */}
      <div className="w-1/3 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <MessageSquare className="w-5 h-5 mr-2 text-indigo-600" />
            Support Helpdesk
          </h1>
          
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search tickets..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>
            <select 
              className="border border-gray-300 rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All</option>
              <option value="Open">Open</option>
              <option value="Pending">Pending</option>
              <option value="Waiting for User">Waiting</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoadingTickets ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Inbox zero! No tickets found.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filteredTickets.map(ticket => (
                <li 
                  key={ticket.id}
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 border-l-4 ${selectedTicketId === ticket.id ? 'border-indigo-600 bg-indigo-50/50' : 'border-transparent'} ${ticket.unreadCountAdmin > 0 ? 'bg-indigo-50/30' : ''}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h3 className={`text-sm truncate pr-2 ${ticket.unreadCountAdmin > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}`}>
                      {ticket.subject}
                    </h3>
                    {ticket.unreadCountAdmin > 0 && (
                      <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {ticket.unreadCountAdmin}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
                    <div className="flex flex-col gap-1">
                      <span className="flex items-center">
                        <User className="w-3 h-3 mr-1" />
                        {ticket.userDisplayName}
                      </span>
                      <span className="text-gray-400 font-mono">
                        #{ticket.id.slice(0, 8)}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full border ${getStatusColor(ticket.status)}`}>
                      {ticket.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Right Content - Active Chat */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {!selectedTicketId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">Select a ticket to view conversation</p>
          </div>
        ) : isLoadingChat ? (
          <div className="flex-1 flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : activeTicketData ? (
          <>
            {/* Chat Header */}
            <div className="bg-white px-6 py-4 border-b border-gray-200 flex justify-between items-center shadow-sm z-10">
              <div>
                <h2 className="text-lg font-bold text-gray-800">{activeTicketData.ticket.subject}</h2>
                <p className="text-sm text-gray-500 mt-1 flex items-center gap-3">
                  <span className="flex items-center"><User className="w-3 h-3 mr-1"/> {activeTicketData.ticket.userDisplayName}</span>
                  <span className="flex items-center font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">#{activeTicketData.ticket.id.slice(0, 8)}</span>
                  <span className="flex items-center"><Filter className="w-3 h-3 mr-1"/> {activeTicketData.ticket.category}</span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <select 
                  className={`text-sm font-medium border rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 ${getStatusColor(activeTicketData.ticket.status)}`}
                  value={activeTicketData.ticket.status}
                  onChange={(e) => statusMutation.mutate(e.target.value)}
                  disabled={statusMutation.isPending}
                >
                  <option value="Open">Open</option>
                  <option value="Pending">Pending</option>
                  <option value="Waiting for User">Waiting for User</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
                {activeTicketData.ticket.status !== 'Resolved' && (
                  <button 
                    onClick={() => statusMutation.mutate('Resolved')}
                    className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Resolve
                  </button>
                )}
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {activeTicketData.messages.map((msg) => {
                const isAdmin = msg.senderType === 'admin';
                return (
                  <div key={msg.id} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center mb-1 space-x-2">
                      <span className="text-xs font-medium text-gray-500">
                        {isAdmin ? 'Support Team' : activeTicketData.ticket.userDisplayName}
                      </span>
                    </div>
                    <div 
                      className={`max-w-2xl px-5 py-3 rounded-2xl ${
                        isAdmin 
                          ? 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-200' 
                          : 'bg-white text-gray-800 rounded-tl-none border border-gray-100 shadow-sm'
                      }`}
                    >
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                    </div>
                    <div className="flex items-center mt-1 space-x-1 text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span className="text-[10px]">{formatTime(msg.timestamp)}</span>
                      {isAdmin && (
                        msg.isRead 
                          ? <CheckCheck className="w-3 h-3 ml-1 text-blue-500" /> 
                          : (msg.delivered ? <CheckCheck className="w-3 h-3 ml-1" /> : <Check className="w-3 h-3 ml-1" />)
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className="bg-white p-4 border-t border-gray-200">
              <form onSubmit={handleSend} className="flex items-end gap-2 max-w-4xl mx-auto">
                <button type="button" className="p-2 text-gray-400 hover:text-indigo-600 transition-colors rounded-full hover:bg-gray-100 mb-1">
                  <Paperclip className="w-5 h-5" />
                </button>
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-shadow">
                  <textarea 
                    rows={2}
                    placeholder="Type your reply to the user..."
                    className="w-full bg-transparent p-3 outline-none resize-none text-sm"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(e);
                      }
                    }}
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={!replyText.trim() || replyMutation.isPending}
                  className="p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-1 flex items-center justify-center shadow-md shadow-indigo-200"
                >
                  {replyMutation.isPending ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <Send className="w-5 h-5 ml-1" />
                  )}
                </button>
              </form>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
