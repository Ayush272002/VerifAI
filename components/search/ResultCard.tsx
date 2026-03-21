/**
 * @fileoverview Result Card Component
 * Service card with premium styling (grid layout only)
 */

"use client";

import { motion } from "motion/react";
import { Star, MapPin, Clock, CheckCircle2, TrendingUp, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

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
}

interface ResultCardProps {
  data: ResultData;
  index: number;
}

const LEVEL_ICONS = {
  "Beginner": Shield,
  "Intermediate": TrendingUp,
  "Expert": Zap,
  "Top Rated": Star,
};

export function ResultCard({ data, index }: ResultCardProps) {
  const LevelIcon = LEVEL_ICONS[data.provider.level];

  return (
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
        <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-950/30 dark:to-blue-950/30">
          {data.thumbnail ? (
            <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${data.thumbnail})` }}></div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400/20 to-blue-500/20 dark:from-cyan-400/30 dark:to-blue-500/30 backdrop-blur-xl border border-white/20 dark:border-white/10"></div>
            </div>
          )}

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
                <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${data.provider.avatar})` }}></div>
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
                <span className="text-xs font-semibold text-black/70 dark:text-white/70">{data.provider.level}</span>
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
              <span className="font-bold text-black dark:text-white">{data.rating.toFixed(1)}</span>
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
              <p className="text-xs text-black/60 dark:text-white/60">Starting at</p>
              <p className="text-2xl font-bold text-black dark:text-white">
                ${data.price.amount.toLocaleString()}
                {data.price.type === "hourly" && <span className="text-sm font-normal text-black/60 dark:text-white/60">/hr</span>}
              </p>
            </div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={SPRING}>
              <button className="btn-macos !py-2 !px-4 !text-xs">
                View Details
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
