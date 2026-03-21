"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, MessageCircle, CheckCircle2, XCircle, Clock, Send } from "lucide-react";
import { EthIcon } from "@/components/EthIcon";

interface PendingWork {
  id: string;
  serviceTitle: string;
  otherParty: string;
  amount: number;
  status: "pending" | "in_progress" | "completed";
  role: "client" | "provider";
  deadline: string;
  taskDetails: string;
  createdAt: string;
  messages: {
    sender: "me" | "them";
    text: string;
    timestamp: string;
  }[];
}

interface MyPendingWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SPRING = {
  type: "spring",
  damping: 20,
  stiffness: 100,
} as const;

// Mock data
const MOCK_WORKS: PendingWork[] = [
  {
    id: "1",
    serviceTitle: "Custom React Dashboard Development",
    otherParty: "0x742d...3a9c",
    amount: 0.5,
    status: "pending",
    role: "provider",
    deadline: "7 days",
    taskDetails: "Build a responsive admin dashboard with charts and data tables. Include dark mode support.",
    createdAt: "2 hours ago",
    messages: [
      { sender: "them", text: "Hey! Looking forward to working with you.", timestamp: "1 hour ago" },
    ],
  },
  {
    id: "2",
    serviceTitle: "UI/UX Design for Mobile App",
    otherParty: "0x8a3f...1b2e",
    amount: 0.3,
    status: "in_progress",
    role: "client",
    deadline: "5 days",
    taskDetails: "Design a modern mobile app interface for a fitness tracking application.",
    createdAt: "1 day ago",
    messages: [
      { sender: "me", text: "Can you send me the initial mockups?", timestamp: "5 hours ago" },
      { sender: "them", text: "Sure, I'll have them ready by tomorrow.", timestamp: "3 hours ago" },
    ],
  },
  {
    id: "3",
    serviceTitle: "Smart Contract Audit",
    otherParty: "0x5c7d...8f4a",
    amount: 1.2,
    status: "pending",
    role: "client",
    deadline: "14 days",
    taskDetails: "Comprehensive security audit of ERC-20 token contract with detailed report.",
    createdAt: "3 days ago",
    messages: [],
  },
];

export function MyPendingWorksModal({ isOpen, onClose }: MyPendingWorksModalProps) {
  const [activeTab, setActiveTab] = useState<"all" | "client" | "provider">("all");
  const [selectedWork, setSelectedWork] = useState<PendingWork | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [mounted, setMounted] = useState(false);

  const filteredWorks = MOCK_WORKS.filter(work => {
    if (activeTab === "all") return true;
    return work.role === activeTab;
  });

  const handleAccept = (workId: string) => {
    console.log("Accepting work:", workId);
    // Blockchain integration will go here
  };

  const handleReject = (workId: string) => {
    console.log("Rejecting work:", workId);
    // Blockchain integration will go here
  };

  const handleSendMessage = (workId: string) => {
    if (!messageInput.trim()) return;
    console.log("Sending message to work:", workId, messageInput);
    setMessageInput("");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-[100]"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={SPRING}
              className="glass-macos rounded-3xl w-full max-w-5xl max-h-[90vh] pointer-events-auto shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="relative p-6 border-b border-black/5 dark:border-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-serif font-bold text-black dark:text-white">
                      My Pending Works
                    </h2>
                    <p className="text-sm text-black/60 dark:text-white/60">
                      Manage your active projects and bookings
                    </p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    transition={SPRING}
                    onClick={onClose}
                    className="w-10 h-10 rounded-full glass-macos glass-macos-hover flex items-center justify-center text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mt-6">
                  {[
                    { id: "all", label: "All Projects" },
                    { id: "client", label: "As Client" },
                    { id: "provider", label: "As Provider" },
                  ].map((tab) => (
                    <motion.button
                      key={tab.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveTab(tab.id as typeof activeTab)}
                      className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                        activeTab === tab.id
                          ? "glass-macos ring-2 ring-cyan-500/50 text-cyan-600 dark:text-cyan-400"
                          : "glass-macos text-black/60 dark:text-white/60"
                      }`}
                    >
                      {tab.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-hidden flex">
                {/* Works List */}
                <div className="w-2/5 border-r border-black/5 dark:border-white/5 overflow-y-auto custom-scrollbar">
                  {filteredWorks.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="text-6xl mb-4 opacity-20">📋</div>
                      <p className="text-black/60 dark:text-white/60 text-sm">
                        No pending works yet
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 space-y-3">
                      {filteredWorks.map((work) => (
                        <motion.button
                          key={work.id}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => setSelectedWork(work)}
                          className={`w-full glass-macos rounded-2xl p-4 text-left transition-all ${
                            selectedWork?.id === work.id
                              ? "ring-2 ring-cyan-500/50"
                              : ""
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h3 className="font-bold text-black dark:text-white text-sm mb-1">
                                {work.serviceTitle}
                              </h3>
                              <p className="text-xs text-black/60 dark:text-white/60">
                                {work.role === "client" ? "Provider" : "Client"}: {work.otherParty}
                              </p>
                            </div>
                            <div className={`px-2 py-1 rounded-lg text-xs font-bold ${
                              work.status === "pending"
                                ? "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                                : work.status === "in_progress"
                                ? "bg-cyan-500/20 text-cyan-700 dark:text-cyan-400"
                                : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                            }`}>
                              {work.status.replace("_", " ")}
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/5 dark:border-white/5">
                            <div className="flex items-center gap-1.5">
                              <EthIcon className="w-4 h-4" />
                              <span className="text-sm font-bold text-black dark:text-white">
                                {work.amount}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-black/60 dark:text-white/60">
                              <Clock className="w-3 h-3" />
                              {work.deadline}
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Work Details */}
                <div className="flex-1 flex flex-col">
                  {selectedWork ? (
                    <>
                      {/* Details Header */}
                      <div className="p-6 border-b border-black/5 dark:border-white/5">
                        <h3 className="text-xl font-serif font-bold text-black dark:text-white mb-2">
                          {selectedWork.serviceTitle}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-black/60 dark:text-white/60">
                          <span>Created {selectedWork.createdAt}</span>
                          <span>•</span>
                          <span>Due in {selectedWork.deadline}</span>
                        </div>

                        {/* Task Details */}
                        <div className="mt-4 glass-macos rounded-xl p-4">
                          <h4 className="text-xs font-semibold text-black/70 dark:text-white/70 mb-2">
                            PROJECT REQUIREMENTS
                          </h4>
                          <p className="text-sm text-black dark:text-white whitespace-pre-wrap">
                            {selectedWork.taskDetails}
                          </p>
                        </div>

                        {/* Action Buttons */}
                        {selectedWork.role === "provider" && selectedWork.status === "pending" && (
                          <div className="flex gap-3 mt-4">
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleAccept(selectedWork.id)}
                              className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold text-sm flex items-center justify-center gap-2"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              Accept Project
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleReject(selectedWork.id)}
                              className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-500 text-white font-semibold text-sm flex items-center justify-center gap-2"
                            >
                              <XCircle className="w-4 h-4" />
                              Decline
                            </motion.button>
                          </div>
                        )}
                      </div>

                      {/* Chat */}
                      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                          <MessageCircle className="w-4 h-4 text-black/60 dark:text-white/60" />
                          <h4 className="text-sm font-semibold text-black dark:text-white">
                            Messages
                          </h4>
                        </div>
                        {selectedWork.messages.length === 0 ? (
                          <p className="text-sm text-black/40 dark:text-white/40 text-center py-8">
                            No messages yet. Start a conversation!
                          </p>
                        ) : (
                          selectedWork.messages.map((msg, idx) => (
                            <div
                              key={idx}
                              className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${
                                  msg.sender === "me"
                                    ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
                                    : "glass-macos text-black dark:text-white"
                                }`}
                              >
                                <p className="text-sm">{msg.text}</p>
                                <p
                                  className={`text-xs mt-1 ${
                                    msg.sender === "me"
                                      ? "text-white/70"
                                      : "text-black/50 dark:text-white/50"
                                  }`}
                                >
                                  {msg.timestamp}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Message Input */}
                      <div className="border-t border-black/5 dark:border-white/5 p-4">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleSendMessage(selectedWork.id);
                              }
                            }}
                            placeholder="Type a message..."
                            className="flex-1 glass-search px-4 py-2.5 rounded-xl text-black dark:text-white placeholder:text-black/50 dark:placeholder:text-white/50 outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                          />
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleSendMessage(selectedWork.id)}
                            disabled={!messageInput.trim()}
                            className={`px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all ${
                              messageInput.trim()
                                ? "btn-macos"
                                : "bg-gray-400/50 dark:bg-gray-600/50 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                            }`}
                          >
                            <Send className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center p-8">
                      <div className="text-center">
                        <div className="text-6xl mb-4 opacity-20">💼</div>
                        <p className="text-black/60 dark:text-white/60 text-sm">
                          Select a project to view details
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
