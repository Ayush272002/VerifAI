/**
 * @fileoverview Reusable search bar component used across the landing & search pages.
 * Handles query state, keyboard submission, and routing to /search.
 */

"use client";

import { Search } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

const SPRING = {
  type: "spring" as const,
  damping: 20,
  stiffness: 100,
};

interface SearchBarProps {
  /** Initial query value — pre-populates the input (e.g. from URL params). */
  initialQuery?: string;
  /** Max width class applied to the wrapper div. Defaults to max-w-2xl. */
  maxWidth?: string;
}

/**
 * A pill-shaped search bar that navigates to /search on submit.
 *
 * @param initialQuery - Pre-populated search string.
 * @param maxWidth     - Tailwind max-width class for the container.
 */
const SearchBar = ({ initialQuery = "", maxWidth = "max-w-2xl" }: SearchBarProps): React.JSX.Element => {
  const [query, setQuery] = useState(initialQuery);
  const router = useRouter();

  const handleSearch = () => {
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className={`relative ${maxWidth}`}>
      <div className="flex items-center pl-6 pr-2 py-2 rounded-full border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] transition-colors focus-within:border-black/20 dark:focus-within:border-white/20">
        <Search className="w-5 h-5 text-black/50 dark:text-white/50 mr-3 shrink-0" />
        <input
          type="text"
          placeholder="Search for services..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent text-black dark:text-white placeholder:text-black/50 dark:placeholder:text-white/50 outline-none text-sm font-medium"
        />
        <motion.button
          onClick={handleSearch}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={SPRING}
          className="bg-black dark:bg-white text-white dark:text-black text-sm font-medium ml-2 py-2 px-6 rounded-full hover:bg-black/90 dark:hover:bg-white/90 transition-colors"
        >
          Search
        </motion.button>
      </div>
    </div>
  );
};

export default SearchBar;
