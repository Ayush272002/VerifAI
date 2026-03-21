/**
 * @fileoverview Results grid that fetches on-chain services and ranks them
 * using semantic embeddings + fuzzy search, all client-side.
 */

"use client";

import { motion } from "motion/react";
import { GIG_CATEGORIES, getRandomPlaceholderImage } from "@/lib/gigCategories";
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

// Mock Data - Comprehensive service listings
const MOCK_RESULTS: ResultData[] = [
  {
    id: "1",
    title: "Full-Stack Web Development - React, Node.js, TypeScript",
    provider: {
      name: "Alex Thompson",
      avatar: "",
      level: "Top Rated",
      verified: true,
    },
    category: "Programming & Tech",
    price: {
      amount: 2500,
      type: "fixed",
    },
    rating: 4.9,
    reviewCount: 127,
    deliveryTime: "7 days",
    location: "San Francisco, CA",
    thumbnail: "bg-gradient-to-br from-blue-600 via-indigo-700 to-violet-800",
    icon: "",
    tags: ["React", "Node.js", "TypeScript", "Next.js"],
    featured: true,
    successRate: 98,
  },
  {
    id: "3",
    title: "SEO-Optimized Content Writing for Tech & SaaS",
    provider: {
      name: "Michael Rodriguez",
      avatar: "",
      level: "Expert",
      verified: true,
    },
    category: "Writing & Translation",
    price: {
      amount: 120,
      type: "hourly",
    },
    rating: 4.8,
    reviewCount: 156,
    deliveryTime: "2 days",
    location: "Austin, TX",
    thumbnail: "bg-gradient-to-br from-green-600 via-teal-700 to-cyan-800",
    icon: "",
    tags: ["SEO Writing", "Technical Content", "Blog Posts"],
  },
  {
    id: "4",
    title: "Smart Contract Development - Solidity & Web3",
    provider: {
      name: "Elena Volkov",
      avatar: "",
      level: "Top Rated",
      verified: true,
    },
    category: "Programming & Tech",
    price: {
      amount: 3200,
      type: "fixed",
    },
    rating: 4.9,
    reviewCount: 67,
    deliveryTime: "10 days",
    location: "London, UK",
    thumbnail: "bg-gradient-to-br from-amber-600 via-orange-700 to-red-800",
    icon: "",
    tags: ["Solidity", "Web3", "Smart Contracts", "Ethereum"],
    featured: true,
    successRate: 96,
  },
  {
    id: "5",
    title: "Mobile App UI/UX Design - iOS & Android",
    provider: {
      name: "David Park",
      avatar: "",
      level: "Intermediate",
      verified: true,
    },
    category: "Art & Design",
    price: {
      amount: 1200,
      type: "fixed",
    },
    rating: 4.7,
    reviewCount: 43,
    deliveryTime: "5 days",
    location: "Seoul, South Korea",
    thumbnail: "bg-gradient-to-br from-purple-300 via-blue-400 to-slate-600",
    icon: "",
    tags: ["UI/UX", "Mobile Design", "Figma", "Prototyping"],
  },
  {
    id: "6",
    title: "Digital Marketing Strategy & Campaign Management",
    provider: {
      name: "Jessica Williams",
      avatar: "",
      level: "Expert",
      verified: true,
    },
    category: "Marketing",
    price: {
      amount: 150,
      type: "hourly",
    },
    rating: 4.9,
    reviewCount: 201,
    deliveryTime: "Ongoing",
    location: "Los Angeles, CA",
    thumbnail: "bg-gradient-to-br from-red-500 via-orange-600 to-amber-700",
    icon: "",
    tags: ["Digital Marketing", "SEO", "Social Media", "Analytics"],
    successRate: 97,
  },
  {
    id: "7",
    title: "E-commerce Store Setup - Shopify & WooCommerce",
    provider: {
      name: "Raj Patel",
      avatar: "",
      level: "Intermediate",
      verified: false,
    },
    category: "Programming & Tech",
    price: {
      amount: 950,
      type: "fixed",
    },
    rating: 4.6,
    reviewCount: 38,
    deliveryTime: "4 days",
    location: "Mumbai, India",
    thumbnail: "bg-gradient-to-br from-teal-300 via-cyan-500 to-blue-700",
    icon: "",
    tags: ["Shopify", "WooCommerce", "E-commerce", "WordPress"],
  },
  {
    id: "8",
    title: "Professional Video Editing & Motion Graphics",
    provider: {
      name: "Lucas Martinez",
      avatar: "",
      level: "Expert",
      verified: true,
    },
    category: "Video & Animation",
    price: {
      amount: 180,
      type: "hourly",
    },
    rating: 4.8,
    reviewCount: 89,
    deliveryTime: "3 days",
    location: "Barcelona, Spain",
    thumbnail: "bg-gradient-to-br from-pink-400 via-rose-500 to-red-700",
    icon: "",
    tags: ["Video Editing", "After Effects", "Motion Graphics"],
  },
  {
    id: "9",
    title: "AI/ML Model Development - Python & TensorFlow",
    provider: {
      name: "Dr. Amelia Foster",
      avatar: "",
      level: "Top Rated",
      verified: true,
    },
    category: "Data Science & AI",
    price: {
      amount: 4500,
      type: "fixed",
    },
    rating: 5.0,
    reviewCount: 52,
    deliveryTime: "14 days",
    location: "Boston, MA",
    thumbnail: "bg-gradient-to-br from-slate-500 via-gray-700 to-zinc-900",
    icon: "",
    tags: ["Machine Learning", "Python", "TensorFlow", "AI"],
    featured: true,
    successRate: 100,
  },
  {
    id: "10",
    title: "Business Consulting - Strategy & Growth Planning",
    provider: {
      name: "Robert Chen",
      avatar: "",
      level: "Expert",
      verified: true,
    },
    category: "Business",
    price: {
      amount: 250,
      type: "hourly",
    },
    rating: 4.9,
    reviewCount: 118,
    deliveryTime: "Flexible",
    location: "Singapore",
    thumbnail: "bg-gradient-to-br from-yellow-600 via-amber-700 to-orange-800",
    icon: "",
    tags: ["Business Strategy", "Growth", "Consulting", "Planning"],
  },
  {
    id: "11",
    title: "WordPress Custom Theme Development",
    provider: {
      name: "Emma Wilson",
      avatar: "",
      level: "Intermediate",
      verified: true,
    },
    category: "Programming & Tech",
    price: {
      amount: 780,
      type: "fixed",
    },
    rating: 4.7,
    reviewCount: 65,
    deliveryTime: "6 days",
    location: "Toronto, Canada",
    thumbnail: "bg-gradient-to-br from-lime-600 via-green-700 to-emerald-900",
    icon: "",
    tags: ["WordPress", "PHP", "Custom Themes", "Responsive"],
  },
  {
    id: "12",
    title: "3D Product Modeling & Rendering - Blender",
    provider: {
      name: "Kenji Tanaka",
      avatar: "",
      level: "Expert",
      verified: true,
    },
    category: "Art & Design",
    price: {
      amount: 1400,
      type: "fixed",
    },
    rating: 4.9,
    reviewCount: 73,
    deliveryTime: "5 days",
    location: "Tokyo, Japan",
    thumbnail: "bg-gradient-to-br from-orange-400 via-red-500 to-rose-700",
    icon: "",
    tags: ["3D Modeling", "Blender", "Product Rendering", "Visualization"],
    successRate: 99,
  },
  {
    id: "13",
    title: "Social Media Content Creation & Management",
    provider: {
      name: "Olivia Anderson",
      avatar: "",
      level: "Intermediate",
      verified: true,
    },
    category: "Marketing",
    price: {
      amount: 85,
      type: "hourly",
    },
    rating: 4.6,
    reviewCount: 92,
    deliveryTime: "Ongoing",
    location: "Miami, FL",
    thumbnail: "bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-700",
    icon: "",
    tags: ["Social Media", "Content Creation", "Instagram", "TikTok"],
  },
  {
    id: "14",
    title: "Mobile App Development - React Native & Flutter",
    provider: {
      name: "Ahmed Hassan",
      avatar: "",
      level: "Expert",
      verified: true,
    },
    category: "Programming & Tech",
    price: {
      amount: 3800,
      type: "fixed",
    },
    rating: 4.8,
    reviewCount: 81,
    deliveryTime: "12 days",
    location: "Dubai, UAE",
    thumbnail: "bg-gradient-to-br from-teal-300 via-cyan-500 to-blue-700",
    icon: "",
    tags: ["React Native", "Flutter", "Mobile Apps", "Cross-platform"],
  },
  {
    id: "15",
    title: "Data Analysis & Visualization - Tableau & Power BI",
    provider: {
      name: "Sofia Kowalski",
      avatar: "",
      level: "Expert",
      verified: true,
    },
    category: "Data Science & AI",
    price: {
      amount: 140,
      type: "hourly",
    },
    rating: 4.9,
    reviewCount: 107,
    deliveryTime: "5 days",
    location: "Warsaw, Poland",
    thumbnail: "bg-gradient-to-br from-green-600 via-teal-700 to-cyan-800",
    icon: "",
    tags: ["Data Analysis", "Tableau", "Power BI", "SQL"],
    successRate: 98,
  },
];

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
    provider: { name: shortAddr, avatar: "", level: "Expert", verified: true },
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

const RESULTS_WITH_IMAGES = (services: ResultData[]) =>
  services.map((service) => ({
    ...service,
    thumbnail: getRandomPlaceholderImage(service.category),
  }));

export const ResultsGrid = ({ searchQuery = "" }: ResultsGridProps) => {
  const { data: onChainServices, isLoading } = useAllActiveServices();

  const [filteredResults, setFilteredResults] = useState<ResultData[]>([]);
  const [semanticReady, setSemanticReady] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [isSearching, setIsSearching] = useState(false);
  const isFirstMount = useRef(true);

  const allServices = useMemo<ResultData[]>(() => {
    if (!onChainServices || !Array.isArray(onChainServices)) return [];
    return (onChainServices as OnChainService[]).map(mapOnChainService);
  }, [onChainServices]);

  const servicesWithImages = useMemo(() => {
    return RESULTS_WITH_IMAGES(allServices);
  }, [allServices]);

  const indexRef = useRef<SearchIndex | null>(null);

  useEffect(() => {
    if (servicesWithImages.length === 0) return;

    const index = createSearchIndex(servicesWithImages);
    indexRef.current = index;
    setSemanticReady(false);

    index.ready.then(() => setSemanticReady(true));
  }, [servicesWithImages]);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    setIsSearching(true);

    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 400);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    if (!debouncedQuery) {
      setFilteredResults(servicesWithImages);
      setIsSearching(false);
      return;
    }

    const query = debouncedQuery.toLowerCase().trim();

    if (semanticReady && indexRef.current) {
      const results = indexRef.current.search(query);
      setFilteredResults(results);
    } else {
      // Fallback to simple filtering
      const results = servicesWithImages.filter((result) => {
        return (
          result.title.toLowerCase().includes(query) ||
          result.category.toLowerCase().includes(query) ||
          result.tags.some((tag) =>
            tag.toLowerCase().includes(query)
          ) ||
          result.provider.name.toLowerCase().includes(query)
        );
      });

      setFilteredResults(results);
    }

    setIsSearching(false);
  }, [debouncedQuery, semanticReady, servicesWithImages]);

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
