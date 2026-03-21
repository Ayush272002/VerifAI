/**
 * @fileoverview VerifAI Search Results Page
 * Marketplace-style search with functional filtering
 */

"use client";

import { motion } from "motion/react";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, SlidersHorizontal, Plus } from "lucide-react";
import { FilterBar } from "@/components/search/FilterBar";
import { ResultsGrid } from "@/components/search/ResultsGrid";
import { ThemeToggle } from "@/components/theme-toggle";
import WalletConnect from "@/components/WalletConnect";
import { PublishServiceModal } from "@/components/PublishServiceModal";

const FADE_UP = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 100,
    }
  },
};

const STAGGER = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const SPRING = {
  type: "spring",
  damping: 20,
  stiffness: 100,
} as const;

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || "");
  const [showFilters, setShowFilters] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);

  // Update search query when URL changes
  useEffect(() => {
    const query = searchParams.get('q');
    if (query) {
      setSearchQuery(query);
    }
  }, [searchParams]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <main className="min-h-screen bg-white dark:bg-[#0a0a0a] relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(6,182,212,0.08),transparent_25%),radial-gradient(circle_at_70%_60%,rgba(59,130,246,0.08),transparent_25%),radial-gradient(circle_at_50%_80%,rgba(168,85,247,0.05),transparent_25%)] dark:bg-[radial-gradient(circle_at_30%_20%,rgba(6,182,212,0.12),transparent_25%),radial-gradient(circle_at_70%_60%,rgba(59,130,246,0.12),transparent_25%),radial-gradient(circle_at_50%_80%,rgba(168,85,247,0.08),transparent_25%)]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000005_1px,transparent_1px),linear-gradient(to_bottom,#00000005_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:80px_80px]"></div>
      </div>

      <div className="relative z-10">
        {/* Navigation */}
        <motion.nav
          className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-3xl border-b border-white/20 dark:border-white/10 shadow-lg shadow-black/5"
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="max-w-[1800px] mx-auto px-6 lg:px-12 h-24 flex items-center justify-between">
            <Link href="/" className="group">
              <motion.span
                whileHover={{ scale: 1.05 }}
                transition={SPRING}
                className="inline-block text-3xl font-bold tracking-tight text-black dark:text-white"
              >
                Verif<span className="font-serif italic text-cyan-600 dark:text-cyan-400">AI</span>
              </motion.span>
            </Link>
            <div className="flex items-center gap-4">
              <motion.div whileHover={{ scale: 1.05 }} transition={SPRING}>
                <Link href="/#work" className="text-sm font-medium text-black dark:text-white hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
                  How it works
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} transition={SPRING}>
                <Link href="/#cases" className="text-sm font-medium text-black dark:text-white hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
                  Cases
                </Link>
              </motion.div>
              <ThemeToggle />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={SPRING}
                onClick={() => setShowPublishModal(true)}
                className="btn-macos !py-2 !px-4 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden md:inline">Publish Service</span>
              </motion.button>
              <WalletConnect />
            </div>
          </div>
        </motion.nav>

        {/* Main Content */}
        <div className="pt-32 pb-16 px-6 lg:px-12 max-w-[1800px] mx-auto">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={STAGGER}
            className="space-y-8"
          >
            {/* Search Header */}
            <motion.div variants={FADE_UP} className="space-y-6">
              {/* Enhanced Search Bar */}
              <div className="relative max-w-4xl">
                <div className="glass-search flex items-center pl-6 pr-2 py-3 rounded-full">
                  <Search className="w-5 h-5 text-black/50 dark:text-white/50 mr-3 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Search for freelancers, services, or disputes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 bg-transparent text-black dark:text-white placeholder:text-black/50 dark:placeholder:text-white/50 outline-none text-sm font-medium"
                  />
                  <motion.button
                    onClick={handleSearch}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={SPRING}
                    className="btn-macos ml-2 !py-2 !px-5"
                  >
                    Search
                  </motion.button>
                </div>
              </div>

              {/* Results Info & Controls */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="space-y-1">
                  <h1 className="text-4xl lg:text-5xl font-serif font-bold text-black dark:text-white">
                    Search results
                  </h1>
                  <p className="text-base text-black/60 dark:text-white/60">
                    {searchQuery && (
                      <>Showing results for <span className="font-semibold text-black dark:text-white">&quot;{searchQuery}&quot;</span></>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {/* Filters Toggle */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={SPRING}
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-5 py-2.5 rounded-full transition-all ${
                      showFilters
                        ? "glass-macos text-cyan-600 dark:text-cyan-400 ring-1 ring-cyan-500/20"
                        : "glass-macos text-black/70 dark:text-white/70"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4" />
                      <span className="text-sm font-semibold">Filters</span>
                    </div>
                  </motion.button>
                </div>
              </div>
            </motion.div>

            {/* Filter Bar */}
            <motion.div
              variants={FADE_UP}
              initial="hidden"
              animate={showFilters ? "visible" : "hidden"}
              className="overflow-hidden"
            >
              {showFilters && <FilterBar />}
            </motion.div>

            {/* Results Grid */}
            <motion.div variants={FADE_UP}>
              <ResultsGrid searchQuery={searchQuery} />
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Publish Service Modal */}
      <PublishServiceModal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
      />
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchPageContent />
    </Suspense>
  );
}
