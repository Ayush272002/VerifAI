/**
 * @fileoverview Service Details Modal Component
 * Shows detailed information about a service
 */

"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, MapPin, Clock, CheckCircle2 } from "lucide-react";
import type { ResultData } from "./ResultCard";
import { EthIcon } from "@/components/EthIcon";
import { BookServiceModal } from "@/components/BookServiceModal";
import { generateServiceOverlay } from "@/lib/generateServiceImage";

interface ServiceDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: ResultData | null;
}

const SPRING = {
  type: "spring",
  damping: 20,
  stiffness: 100,
} as const;

export function ServiceDetailsModal({ isOpen, onClose, service }: ServiceDetailsModalProps) {
  const [showBookModal, setShowBookModal] = useState(false);

  if (!service) return null;

  // Generate deterministic gradient for provider avatar
  const getGradientFromText = (text: string): string => {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const gradients = [
      "from-cyan-400 to-blue-500",
      "from-purple-400 to-pink-500",
      "from-emerald-400 to-teal-500",
      "from-orange-400 to-red-500",
      "from-indigo-400 to-purple-500",
      "from-rose-400 to-pink-500",
      "from-amber-400 to-orange-500",
      "from-lime-400 to-green-500",
      "from-sky-400 to-cyan-500",
      "from-fuchsia-400 to-purple-500",
    ];
    
    return gradients[Math.abs(hash) % gradients.length];
  };

  const avatarGradient = getGradientFromText(service.provider.address || service.provider.name);
  const overlay = useMemo(
    () => generateServiceOverlay(service.title, service.category),
    [service.title, service.category],
  );

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
              className="glass-macos rounded-3xl w-full max-w-3xl max-h-[90vh] pointer-events-auto shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="relative p-6 border-b border-black/5 dark:border-white/5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-2xl font-serif font-bold text-black dark:text-white mb-2">
                      {service.title}
                    </h2>
                    <p className="text-sm text-black/60 dark:text-white/60">
                      {service.category}
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
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                {/* Service Image */}
                {service.thumbnail && (
                  <div className="aspect-video rounded-2xl overflow-hidden relative">
                    {/* Base: Unsplash photo */}
                    {service.thumbnail.startsWith("http") ? (
                      <img
                        src={service.thumbnail}
                        alt={service.title}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className={`absolute inset-0 ${service.thumbnail || "bg-slate-200"}`}></div>
                    )}

                    {/* Generated gradient + pattern overlay */}
                    {overlay && (
                      <img
                        src={overlay}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay pointer-events-none"
                      />
                    )}
                  </div>
                )}

                {/* Provider Info */}
                <div className="glass-macos rounded-2xl p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`relative w-16 h-16 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-white font-bold text-xl overflow-hidden`}>
                      {service.provider.avatar ? (
                        <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${service.provider.avatar})` }}></div>
                      ) : (
                        service.provider.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-lg text-black dark:text-white">
                          {service.provider.name}
                        </p>
                        {service.provider.verified && (
                          <CheckCircle2 className="w-5 h-5 text-cyan-500 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-black/5 dark:border-white/5">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-black/60 dark:text-white/60" />
                      <span className="text-sm text-black dark:text-white">{service.deliveryTime}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-black/60 dark:text-white/60" />
                      <span className="text-sm text-black dark:text-white">{service.location}</span>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <h3 className="text-sm font-semibold text-black dark:text-white mb-3">Skills & Expertise</h3>
                  <div className="flex flex-wrap gap-2">
                    {service.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1.5 rounded-lg glass-macos text-sm font-medium text-black dark:text-white"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Pricing */}
                <div className="glass-macos rounded-2xl p-6">
                  <h3 className="text-sm font-semibold text-black dark:text-white mb-3">Pricing</h3>
                  <div className="flex items-center gap-3">
                    <EthIcon className="w-10 h-10" />
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-black dark:text-white">
                        {service.price.amount.toLocaleString()}
                      </span>
                      {service.price.type === "hourly" && (
                        <span className="text-lg text-black/60 dark:text-white/60">/hour</span>
                      )}
                      {service.price.type === "fixed" && (
                        <span className="text-lg text-black/60 dark:text-white/60">ETH fixed</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-black/5 dark:border-white/5 p-6 flex justify-end gap-3 bg-white/50 dark:bg-black/50">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-2xl glass-macos text-black/70 dark:text-white/70 font-semibold text-sm"
                >
                  Close
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowBookModal(true)}
                  className="px-8 py-2.5 rounded-2xl btn-macos font-semibold text-sm"
                >
                  Book Service
                </motion.button>
              </div>
            </motion.div>
          </div>

          {/* Book Service Modal */}
          <BookServiceModal
            isOpen={showBookModal}
            onClose={() => setShowBookModal(false)}
            onSuccess={() => {
              setShowBookModal(false);
              onClose();
            }}
            service={service}
          />
        </>
      )}
    </AnimatePresence>
  );
}
