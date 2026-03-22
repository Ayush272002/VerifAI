/**
 * @fileoverview VerifAI Search Results Page
 * Marketplace-style search with functional filtering
 */

"use client";

import { motion } from "motion/react";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAccount } from "wagmi";
import { useTheme } from "@/hooks/useTheme";
import { SlidersHorizontal } from "lucide-react";
import { FilterBar } from "@/components/search/FilterBar";
import { ResultsGrid } from "@/components/search/ResultsGrid";
import SearchBar from "@/components/SearchBar";
import SiteNav from "@/components/SiteNav";
import { PublishServiceModal } from "@/components/PublishServiceModal";
import { MyServicesModal } from "@/components/MyServicesModal";
import { MyPendingWorksModal } from "@/components/MyPendingWorksModal";

const SPRING = {
  type: "spring" as const,
  damping: 20,
  stiffness: 100,
};

function SearchPageContent() {
  const searchParams = useSearchParams();
  const { isConnected } = useAccount();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [searchQuery] = useState(searchParams.get('q') || "");
  const [showFilters, setShowFilters] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showMyServicesModal, setShowMyServicesModal] = useState(false);
  const [showMyPendingWorksModal, setShowMyPendingWorksModal] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main className="min-h-screen bg-white dark:bg-[#0a0a0a] relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(6,182,212,0.08),transparent_25%),radial-gradient(circle_at_70%_60%,rgba(59,130,246,0.08),transparent_25%),radial-gradient(circle_at_50%_80%,rgba(168,85,247,0.05),transparent_25%)] dark:bg-[radial-gradient(circle_at_30%_20%,rgba(6,182,212,0.12),transparent_25%),radial-gradient(circle_at_70%_60%,rgba(59,130,246,0.12),transparent_25%),radial-gradient(circle_at_50%_80%,rgba(168,85,247,0.08),transparent_25%)]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000005_1px,transparent_1px),linear-gradient(to_bottom,#00000005_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:80px_80px]"></div>
      </div>

      <div className="relative z-10">
        {/* Navigation */}
        <SiteNav
          isConnected={isConnected}
          mounted={mounted}
          theme={theme}
          onThemeToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          onPublishClick={() => setShowPublishModal(true)}
          onMyServicesClick={() => setShowMyServicesModal(true)}
          onMyPendingWorksClick={() => setShowMyPendingWorksModal(true)}
          showBrowseIcon
        />

        {/* Main Content */}
        <div className="pt-32 pb-16 px-6 lg:px-12 max-w-[1800px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 100 }}
            className="space-y-6"
          >
            {/* Search bar — initialQuery pre-populates from URL, component handles routing */}
            <SearchBar initialQuery={searchQuery} maxWidth="max-w-4xl" />

            {/* Results info & filter controls */}
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
                {/* Filters toggle */}
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

            {/* Filter bar — conditionally rendered on toggle */}
            {showFilters && <FilterBar />}

            <ResultsGrid searchQuery={searchQuery} />
          </motion.div>
        </div>
      </div>

      {/* Publish Service Modal */}
      <PublishServiceModal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
      />

      {/* My Services Modal */}
      <MyServicesModal
        isOpen={showMyServicesModal}
        onClose={() => setShowMyServicesModal(false)}
      />

      {/* My Pending Works Modal */}
      <MyPendingWorksModal
        isOpen={showMyPendingWorksModal}
        onClose={() => setShowMyPendingWorksModal(false)}
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
