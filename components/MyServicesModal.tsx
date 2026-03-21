/**
 * @fileoverview My Services Modal Component
 * Manage published services, view status, remove offerings
 */

"use client";

import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { X, Trash2, Clock, CheckCircle2, AlertCircle, Package } from "lucide-react";
import { EthIcon } from "./EthIcon";

interface MyServicesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SPRING = {
  type: "spring",
  damping: 20,
  stiffness: 100,
} as const;

type ServiceStatus = "all" | "active" | "booked" | "unbooked";

interface Service {
  id: string;
  title: string;
  category: string;
  price: number;
  status: "active" | "booked" | "completed";
  bookedBy?: string;
  deliveryTime: string;
  createdAt: string;
  backgroundImage: string;
}

// Mock data - replace with actual data from blockchain/API
const MOCK_SERVICES: Service[] = [
  {
    id: "1",
    title: "Professional Web Development",
    category: "Web Development",
    price: 2.5,
    status: "booked",
    bookedBy: "0x1234...5678",
    deliveryTime: "7 days",
    createdAt: "2024-01-15",
    backgroundImage: "bg-gradient-to-br from-cyan-400 to-blue-500",
  },
  {
    id: "2",
    title: "Custom Logo Design",
    category: "Design & Creative",
    price: 0.8,
    status: "active",
    deliveryTime: "3 days",
    createdAt: "2024-01-20",
    backgroundImage: "bg-gradient-to-br from-purple-400 to-pink-500",
  },
  {
    id: "3",
    title: "Content Writing Service",
    category: "Content Writing",
    price: 0.5,
    status: "active",
    deliveryTime: "2 days",
    createdAt: "2024-01-22",
    backgroundImage: "bg-gradient-to-br from-emerald-400 to-teal-500",
  },
];

export function MyServicesModal({ isOpen, onClose }: MyServicesModalProps) {
  const [services, setServices] = useState<Service[]>(MOCK_SERVICES);
  const [filter, setFilter] = useState<ServiceStatus>("all");

  const filteredServices = services.filter((service) => {
    if (filter === "all") return true;
    if (filter === "active") return service.status === "active";
    if (filter === "booked") return service.status === "booked";
    if (filter === "unbooked") return service.status === "active";
    return true;
  });

  const handleRemoveService = (id: string) => {
    if (confirm("Are you sure you want to remove this service?")) {
      setServices(services.filter((s) => s.id !== id));
    }
  };

  const getStatusInfo = (status: Service["status"]) => {
    switch (status) {
      case "active":
        return {
          label: "Active",
          icon: CheckCircle2,
          color: "text-emerald-600 dark:text-emerald-400",
          bg: "bg-emerald-500/10",
          border: "border-emerald-500/20",
        };
      case "booked":
        return {
          label: "Booked",
          icon: Clock,
          color: "text-cyan-600 dark:text-cyan-400",
          bg: "bg-cyan-500/10",
          border: "border-cyan-500/20",
        };
      case "completed":
        return {
          label: "Completed",
          icon: Package,
          color: "text-purple-600 dark:text-purple-400",
          bg: "bg-purple-500/10",
          border: "border-purple-500/20",
        };
    }
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
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-2xl font-serif font-bold text-black dark:text-white mb-2">
                      My Services
                    </h2>
                    <p className="text-sm text-black/60 dark:text-white/60">
                      Manage your published offerings
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

                {/* Filter Tabs */}
                <div className="flex gap-2 mt-6">
                  {[
                    { id: "all", label: "All" },
                    { id: "active", label: "Active" },
                    { id: "booked", label: "Currently Booked" },
                    { id: "unbooked", label: "Available" },
                  ].map((tab) => (
                    <motion.button
                      key={tab.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      transition={SPRING}
                      onClick={() => setFilter(tab.id as ServiceStatus)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                        filter === tab.id
                          ? "glass-macos text-cyan-600 dark:text-cyan-400 ring-1 ring-cyan-500/20"
                          : "glass-macos text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white"
                      }`}
                    >
                      {tab.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                {filteredServices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-20">
                    <AlertCircle className="w-16 h-16 text-black/20 dark:text-white/20 mb-4" />
                    <p className="text-lg font-semibold text-black/60 dark:text-white/60">
                      No services found
                    </p>
                    <p className="text-sm text-black/40 dark:text-white/40 mt-2">
                      {filter === "all"
                        ? "You haven't published any services yet"
                        : `No ${filter} services`}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredServices.map((service) => {
                      const statusInfo = getStatusInfo(service.status);
                      const StatusIcon = statusInfo.icon;

                      return (
                        <motion.div
                          key={service.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className="glass-macos rounded-2xl overflow-hidden group hover:shadow-xl transition-shadow"
                        >
                          {/* Background Image */}
                          <div className={`relative h-32 ${service.backgroundImage}`}>
                            <div className="absolute inset-0 bg-black/10 dark:bg-black/30"></div>
                            <div className="absolute top-3 right-3 flex gap-2">
                              <div className={`px-3 py-1.5 rounded-full ${statusInfo.bg} backdrop-blur-xl border ${statusInfo.border} ${statusInfo.color} text-xs font-bold flex items-center gap-1.5`}>
                                <StatusIcon className="w-3 h-3" />
                                {statusInfo.label}
                              </div>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="p-5 space-y-4">
                            <div>
                              <h3 className="text-lg font-bold text-black dark:text-white mb-1 line-clamp-1">
                                {service.title}
                              </h3>
                              <p className="text-xs text-black/60 dark:text-white/60">
                                {service.category}
                              </p>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <EthIcon className="w-5 h-5" />
                                <span className="text-xl font-bold text-black dark:text-white">
                                  {service.price}
                                </span>
                                <span className="text-sm text-black/60 dark:text-white/60">
                                  ETH
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-black/60 dark:text-white/60">
                                <Clock className="w-3.5 h-3.5" />
                                {service.deliveryTime}
                              </div>
                            </div>

                            {service.bookedBy && (
                              <div className="pt-3 border-t border-black/5 dark:border-white/5">
                                <p className="text-xs text-black/60 dark:text-white/60 mb-1">
                                  Booked by
                                </p>
                                <p className="text-sm font-mono font-semibold text-cyan-600 dark:text-cyan-400">
                                  {service.bookedBy}
                                </p>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-2 pt-2">
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                transition={SPRING}
                                onClick={() => handleRemoveService(service.id)}
                                className="flex-1 px-4 py-2 rounded-xl glass-macos text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 font-semibold text-sm flex items-center justify-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                Remove
                              </motion.button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-black/5 dark:border-white/5 p-6 bg-white/50 dark:bg-black/50">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-black/60 dark:text-white/60">
                    {filteredServices.length} {filteredServices.length === 1 ? "service" : "services"}
                  </p>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onClose}
                    className="px-8 py-2.5 rounded-2xl btn-macos font-semibold text-sm"
                  >
                    Close
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
