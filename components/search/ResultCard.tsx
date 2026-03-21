/**
 * @fileoverview Result Card Component
 * Service card with premium styling (grid layout only)
 */

"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  Star,
  MapPin,
  Clock,
  CheckCircle2,
  TrendingUp,
  Shield,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ServiceDetailsModal } from "./ServiceDetailsModal";
import { EthIcon } from "@/components/EthIcon";

const SPRING = {
  type: "spring",
  damping: 20,
  stiffness: 100,
} as const;

export interface ResultData {
  id: string;
  title: string;
  provider: {
    name: string;
    avatar: string;
    level: "Beginner" | "Intermediate" | "Expert" | "Top Rated";
    verified: boolean;
    address: string; // Added for contract integration
  };
  category: string;
  price: {
    amount: number;
    type: "fixed" | "hourly";
  };
  rating: number;
  reviewCount: number;
  deliveryTime: string;
  location: string;
  thumbnail: string;
  tags: string[];
  featured?: boolean;
  successRate?: number;
  icon?: string;
}

interface ResultCardProps {
  data: ResultData;
  index: number;
}

const LEVEL_ICONS = {
  Beginner: Shield,
  Intermediate: TrendingUp,
  Expert: Zap,
  "Top Rated": Star,
};

export function ResultCard({ data, index }: ResultCardProps) {
  const LevelIcon = LEVEL_ICONS[data.provider.level];
  const [showDetails, setShowDetails] = useState(false);

  return (
    <>
      <ServiceDetailsModal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        service={data}
      />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: index * 0.05,
          type: "spring",
          damping: 25,
          stiffness: 100,
        }}
        whileHover={{ y: -8, scale: 1.02 }}
        onClick={() => setShowDetails(true)}
        className="group relative cursor-pointer h-full"
      >
        {/* Featured Glow */}
        {data.featured && (
          <div className="absolute -inset-1 bg-gradient-to-br from-amber-400/30 to-orange-500/30 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        )}

        {/* Regular Glow */}
        {!data.featured && (
          <div className="absolute -inset-1 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        )}

        {/* Card */}
        <div className="relative h-full bg-white/70 dark:bg-black/70 backdrop-blur-3xl rounded-3xl border border-white/20 dark:border-white/10 shadow-xl group-hover:shadow-2xl transition-all duration-300 overflow-hidden flex flex-col">
          {/* Shine Effect */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/50 to-transparent dark:from-white/10 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

          {/* Thumbnail */}
          <div className="relative aspect-video overflow-hidden">
            {(data.thumbnail || "").startsWith("http") ? (
              <img
                src={data.thumbnail}
                alt={`${data.category} placeholder`}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div
                className={`absolute inset-0 ${data.thumbnail || "bg-slate-200"}`}
              ></div>
            )}

            {/* Overlay Layers */}
            <div className="absolute inset-0">
              {/* Animated gradient mesh */}
              <div className="absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none">
                <div
                  className="absolute top-0 left-0 w-32 h-32 bg-white/30 dark:bg-white/20 rounded-full blur-3xl animate-pulse"
                  style={{ animationDuration: "3s" }}
                ></div>
                <div
                  className="absolute bottom-0 right-0 w-40 h-40 bg-black/20 dark:bg-white/15 rounded-full blur-3xl animate-pulse"
                  style={{ animationDuration: "4s", animationDelay: "0.5s" }}
                ></div>
                <div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 bg-white/25 dark:bg-white/18 rounded-full blur-2xl animate-pulse"
                  style={{ animationDuration: "5s", animationDelay: "1s" }}
                ></div>
              </div>

              {/* Icon overlay content */}
              <div className="w-full h-full flex items-center justify-center relative">
                {data.icon && (
                  <div className="relative z-10 w-20 h-20 rounded-2xl bg-white/20 dark:bg-black/20 backdrop-blur-xl border border-white/30 dark:border-white/20 flex items-center justify-center shadow-xl overflow-hidden">
                    {data.icon.startsWith("data:") ||
                    data.icon.startsWith("http") ? (
                      <img
                        src={data.icon}
                        alt="Service icon"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-4xl">{data.icon}</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Featured Badge */}
            {data.featured && (
              <div className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg">
                <Star className="w-3 h-3 fill-current" />
                FEATURED
              </div>
            )}

            {/* Success Rate */}
            {data.successRate && (
              <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-emerald-500 text-white text-xs font-bold shadow-lg">
                {data.successRate}% Success
              </div>
            )}
          </div>

          {/* Content */}
          <div className="relative p-6 flex-1 flex flex-col">
            {/* Provider Info */}
            <div className="flex items-center gap-3 mb-4">
              <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                {data.provider.avatar ? (
                  <div
                    className="w-full h-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${data.provider.avatar})` }}
                  ></div>
                ) : (
                  data.provider.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm text-black dark:text-white truncate">
                    {data.provider.name}
                  </p>
                  {data.provider.verified && (
                    <CheckCircle2 className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                  )}
                </div>
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/50 dark:bg-black/50 border border-white/20 dark:border-white/10 backdrop-blur-xl">
                  <LevelIcon className="w-3 h-3 text-black/60 dark:text-white/60" />
                  <span className="text-xs font-semibold text-black/70 dark:text-white/70">
                    {data.provider.level}
                  </span>
                </div>
              </div>
            </div>

            {/* Title */}
            <h3 className="text-lg font-bold text-black dark:text-white mb-2 line-clamp-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-cyan-500 group-hover:to-blue-500 dark:group-hover:from-cyan-400 dark:group-hover:to-blue-400 transition-all duration-300">
              {data.title}
            </h3>

            {/* Category */}
            <p className="text-xs text-black/60 dark:text-white/60 mb-4">
              {data.category}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-4">
              {data.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 rounded-lg bg-black/5 dark:bg-white/5 text-xs font-medium text-black/70 dark:text-white/70"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Meta Info */}
            <div className="flex items-center gap-4 text-xs text-black/60 dark:text-white/60 mb-4 mt-auto">
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="font-bold text-black dark:text-white">
                  {data.rating.toFixed(1)}
                </span>
                <span>({data.reviewCount})</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{data.deliveryTime}</span>
              </div>
              {data.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="truncate">{data.location}</span>
                </div>
              )}
            </div>

            {/* Price & CTA */}
            <div className="flex items-center justify-between pt-4 border-t border-black/5 dark:border-white/5">
              <div>
                <p className="text-xs text-black/60 dark:text-white/60">
                  Starting at
                </p>
                <div className="flex items-center gap-2">
                  <EthIcon className="w-6 h-6" />
                  <p className="text-2xl font-bold text-black dark:text-white">
                    {data.price.amount.toLocaleString()}
                    {data.price.type === "hourly" && (
                      <span className="text-sm font-normal text-black/60 dark:text-white/60">
                        /hr
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={SPRING}
              >
                <button
                  onClick={() => setShowDetails(true)}
                  className="btn-macos !py-2 !px-4 !text-xs"
                >
                  View Details
                </button>
              </motion.div>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{data.deliveryTime}</span>
            </div>
            {data.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span className="truncate">{data.location}</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
