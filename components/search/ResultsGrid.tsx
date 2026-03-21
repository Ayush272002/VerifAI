/**
 * @fileoverview Results Grid Component
 * Responsive grid layout with search functionality
 */

"use client";

import { motion } from "motion/react";
import { useMemo } from "react";
import { ResultCard, ResultData } from "./ResultCard";
import { useAllActiveServices } from "@/lib/marketplace";
import { formatEther } from "viem";
import { Loader2 } from "lucide-react";

const STAGGER = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const SPRING = {
  type: "spring",
  damping: 20,
  stiffness: 100,
} as const;

// Mock data removed in favor of live on-chain results

interface ResultsGridProps {
  searchQuery?: string;
}

export function ResultsGrid({ searchQuery = "" }: ResultsGridProps) {
  const { data: onChainServices, isLoading } = useAllActiveServices();

  // Filter results based on search query
  const filteredResults = useMemo(() => {
    let all: ResultData[] = [];

    // Add on-chain data if available
    if (onChainServices && Array.isArray(onChainServices)) {
      const liveServices: ResultData[] = onChainServices.map((svc: any) => {
        const fullDesc = svc.description || "";
        const categoryMatch = fullDesc.match(/Category:\s*(.+)/);
        const deliveryMatch = fullDesc.match(/Delivery Time:\s*(.+)/);
        const tagsMatch = fullDesc.match(/Tags:\s*(.+)/);
        
        const category = categoryMatch ? categoryMatch[1].trim() : "Blockchain Service";
        const deliveryTime = deliveryMatch ? deliveryMatch[1].trim() : "Flexible";
        const tags = tagsMatch ? tagsMatch[1].split(',').map((t: string) => t.trim()) : ["Web3", "Blockchain"];
        
        return {
          id: `onchain-${svc.provider}-${svc.serviceIndex}`,
          title: svc.title,
          provider: {
            name: `${svc.provider.substring(0,6)}...${svc.provider.substring(svc.provider.length-4)}`,
            avatar: "",
            level: "Expert",
            verified: true,
          },
          category,
          price: {
            amount: Number(formatEther(svc.priceWei)),
            type: "fixed",
          },
          rating: 5.0,
          reviewCount: 0,
          deliveryTime,
          location: "On-Chain",
          thumbnail: "bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700",
          icon: "",
          tags,
          featured: true, // Live services featured at the top!
          successRate: 100,
        };
      });
      
      all = [...liveServices, ...all];
    }

    if (!searchQuery) return all;

    const query = searchQuery.toLowerCase().trim();
    return all.filter(result => {
      // Search in title, category, tags, and provider name
      return (
        result.title.toLowerCase().includes(query) ||
        result.category.toLowerCase().includes(query) ||
        result.tags.some(tag => tag.toLowerCase().includes(query)) ||
        result.provider.name.toLowerCase().includes(query)
      );
    });
  }, [searchQuery, onChainServices]);

  const featuredResults = filteredResults.filter(r => r.featured);
  const regularResults = filteredResults.filter(r => !r.featured);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-cyan-500" />
        <p className="text-black/60 dark:text-white/60 font-medium">Syncing live blockchain services...</p>
      </div>
    );
  }

  if (filteredResults.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4 opacity-20">🔍</div>
        <h3 className="text-2xl font-serif font-bold text-black dark:text-white mb-2">
          No results found
        </h3>
        <p className="text-black/60 dark:text-white/60">
          Try adjusting your search terms or filters
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Featured Section */}
      {featuredResults.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-serif font-bold text-black dark:text-white">
              Featured Services
            </h2>
            <div className="flex-1 h-px bg-gradient-to-r from-amber-500/30 to-transparent"></div>
          </div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={STAGGER}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {featuredResults.map((result, index) => (
              <ResultCard
                key={result.id}
                data={result}
                index={index}
              />
            ))}
          </motion.div>
        </div>
      )}

      {/* All Results Section */}
      {regularResults.length > 0 && (
        <div className={featuredResults.length > 0 ? "pt-8" : ""}>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-serif font-bold text-black dark:text-white">
              All Results
            </h2>
            <div className="flex-1 h-px bg-gradient-to-r from-cyan-500/30 to-transparent"></div>
          </div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={STAGGER}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {regularResults.map((result, index) => (
              <ResultCard
                key={result.id}
                data={result}
                index={index}
              />
            ))}
          </motion.div>
        </div>
      )}
    </div>
  );
}
