/**
 * @fileoverview Results grid that fetches on-chain services and ranks them
 * using semantic embeddings + fuzzy search, all client-side.
 */

"use client";

import { motion } from "motion/react";
import { useMemo, useEffect, useRef, useState, useCallback } from "react";
import { formatEther } from "viem";
import { Loader2, Sparkles } from "lucide-react";
import { ResultCard, type ResultData } from "./ResultCard";
import { useAllActiveServices } from "@/lib/marketplace";
import { createSearchIndex, type SearchIndex } from "@/lib/search";
import { Skeleton } from "@/components/ui/skeleton";

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const STAGGER = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const SPRING = { type: "spring", damping: 20, stiffness: 100 } as const;

// ---------------------------------------------------------------------------
// On-chain data helpers
// ---------------------------------------------------------------------------

const CATEGORY_RE = /Category:\s*(.+)/;
const DELIVERY_RE = /Delivery Time:\s*(.+)/;
const TAGS_RE = /Tags:\s*(.+)/;

interface OnChainService {
  provider: string;
  serviceIndex: number;
  title: string;
  description: string;
  priceWei: bigint;
}

/**
 * Maps a raw on-chain service to the UI ResultData shape.
 *
 * @param svc - Raw contract service object.
 * @returns UI-ready ResultData.
 */
const mapOnChainService = (svc: OnChainService): ResultData => {
  const desc = svc.description ?? "";
  const category = CATEGORY_RE.exec(desc)?.[1]?.trim() ?? "Blockchain Service";
  const deliveryTime = DELIVERY_RE.exec(desc)?.[1]?.trim() ?? "Flexible";
  const rawTags = TAGS_RE.exec(desc)?.[1]?.trim() ?? "";
  const tags = rawTags
    ? rawTags.split(",").map((t) => t.trim())
    : ["Web3", "Blockchain"];
  const shortAddr = `${svc.provider.substring(0, 6)}...${svc.provider.slice(-4)}`;

  return {
    id: `onchain-${svc.provider}-${svc.serviceIndex}`,
    title: svc.title,
    provider: {
      name: shortAddr,
      avatar: "",
      level: "Expert",
      verified: true,
      address: svc.provider,
    },
    category,
    price: { amount: Number(formatEther(svc.priceWei)), type: "fixed" },
    rating: 5.0,
    reviewCount: 0,
    deliveryTime,
    location: "On-Chain",
    thumbnail: "bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700",
    icon: "",
    tags,
    featured: true,
    successRate: 100,
  };
};

// ---------------------------------------------------------------------------
// Skeleton UI
// ---------------------------------------------------------------------------

function ResultSkeleton() {
  return (
    <div className="relative h-full bg-white/70 dark:bg-black/70 backdrop-blur-3xl rounded-3xl border border-white/20 dark:border-white/10 shadow-xl overflow-hidden flex flex-col">
      {/* Thumbnail */}
      <Skeleton className="w-full aspect-video rounded-none" />

      {/* Content */}
      <div className="p-6 flex-1 flex flex-col space-y-4">
        {/* Provider */}
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>

        {/* Title */}
        <Skeleton className="h-6 w-3/4" />

        {/* Category */}
        <Skeleton className="h-4 w-1/3 mb-4" />

        {/* Tags */}
        <div className="flex gap-2 mb-4">
          <Skeleton className="h-6 w-16 rounded-lg" />
          <Skeleton className="h-6 w-16 rounded-lg" />
          <Skeleton className="h-6 w-16 rounded-lg" />
        </div>

        <div className="flex-1" />

        {/* Meta Info */}
        <div className="flex gap-4 mb-4">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>

        {/* Price & CTA */}
        <div className="flex items-center justify-between pt-4 border-t border-black/5 dark:border-white/5">
          <div className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ResultsGridProps {
  searchQuery?: string;
}

export const ResultsGrid = ({ searchQuery = "" }: ResultsGridProps) => {
  const { data: onChainServices, isLoading } = useAllActiveServices();

  const [filteredResults, setFilteredResults] = useState<ResultData[]>([]);
  const [semanticReady, setSemanticReady] = useState(false);

  // Debounce state
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [isSearching, setIsSearching] = useState(false);
  const isFirstMount = useRef(true);

  // Map raw on-chain data once per fetch
  const allServices = useMemo<ResultData[]>(() => {
    if (!onChainServices || !Array.isArray(onChainServices)) return [];
    return (onChainServices as OnChainService[]).map(mapOnChainService);
  }, [onChainServices]);

  // Hold the index in a ref — rebuilt only when services change
  const indexRef = useRef<SearchIndex | null>(null);

  useEffect(() => {
    if (allServices.length === 0) return;

    const index = createSearchIndex(allServices);
    indexRef.current = index;
    setSemanticReady(false);

    // Mark ready once background embedding finishes
    index.ready.then(() => setSemanticReady(true));
  }, [allServices]);

  // Handle debouncing inside the component
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    setIsSearching(true);
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 400); // Wait 400ms before triggering the search query update

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Re-run search whenever debounced query or semantic readiness changes
  const runSearch = useCallback(async () => {
    if (!indexRef.current) {
      setFilteredResults(allServices);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const results = await indexRef.current.search(debouncedQuery);
    // If semantic isn't ready and nothing fuzzy-matched (e.g. "diet" vs "cooking"
    // — zero lexical overlap), show everything rather than an empty page
    setFilteredResults(
      results.length > 0 ? results.map(({ result }) => result) : allServices,
    );
    setIsSearching(false);
  }, [debouncedQuery, allServices]);

  useEffect(() => {
    runSearch();
  }, [runSearch, semanticReady]);

  const featuredResults = filteredResults.filter((r) => r.featured);
  const regularResults = filteredResults.filter((r) => !r.featured);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-cyan-500" />
        <p className="text-black/60 dark:text-white/60 font-medium">
          Syncing live blockchain services...
        </p>
      </div>
    );
  }

  // Display Skeletons while typing / calculating vectors
  if (isSearching) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-2xl font-serif font-bold text-black dark:text-white">
            Searching...
          </h2>
          <div className="flex-1 h-px bg-gradient-to-r from-cyan-500/30 to-transparent" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <ResultSkeleton key={i} />
          ))}
        </div>
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
      {/* Subtle indicator while the embedding model is warming up */}
      {!semanticReady && debouncedQuery && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-xs text-black/40 dark:text-white/40"
        >
          <Sparkles className="w-3.5 h-3.5 animate-pulse text-cyan-500" />
          <span>
            Loading semantic search model — showing fuzzy results for now...
          </span>
        </motion.div>
      )}

      {featuredResults.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-serif font-bold text-black dark:text-white">
              Featured Services
            </h2>
            <div className="flex-1 h-px bg-gradient-to-r from-amber-500/30 to-transparent" />
          </div>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={STAGGER}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {featuredResults.map((result, index) => (
              <ResultCard key={result.id} data={result} index={index} />
            ))}
          </motion.div>
        </div>
      )}

      {regularResults.length > 0 && (
        <div className={featuredResults.length > 0 ? "pt-8" : ""}>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-serif font-bold text-black dark:text-white">
              All Results
            </h2>
            <div className="flex-1 h-px bg-gradient-to-r from-cyan-500/30 to-transparent" />
          </div>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={STAGGER}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {regularResults.map((result, index) => (
              <ResultCard key={result.id} data={result} index={index} />
            ))}
          </motion.div>
        </div>
      )}

      {/* TODO: implement pagination or infinite scroll once service count grows */}
      <div className="flex justify-center pt-12">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={SPRING}
          className="btn-macos !px-8 !py-3"
        >
          Load More Results
        </motion.button>
      </div>
    </div>
  );
};
