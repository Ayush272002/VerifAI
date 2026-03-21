/**
 * @fileoverview Filter Bar Component
 * Compact filter controls with dropdowns for search refinement
 */

"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { ChevronDown, X, DollarSign, Clock, Star, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const SPRING = {
  type: "spring",
  damping: 20,
  stiffness: 100,
};

interface FilterOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

const CATEGORIES: FilterOption[] = [
  { id: "all", label: "All Services" },
  { id: "web", label: "Web Development" },
  { id: "design", label: "Design & Creative" },
  { id: "writing", label: "Content Writing" },
  { id: "marketing", label: "Marketing" },
  { id: "consulting", label: "Consulting" },
];

const PRICE_RANGES: FilterOption[] = [
  { id: "any", label: "Any Price", icon: <DollarSign className="w-4 h-4" /> },
  { id: "budget", label: "Budget ($0-$500)", icon: <DollarSign className="w-4 h-4" /> },
  { id: "standard", label: "Standard ($500-$2000)", icon: <DollarSign className="w-4 h-4" /> },
  { id: "premium", label: "Premium ($2000+)", icon: <DollarSign className="w-4 h-4" /> },
];

const DELIVERY_TIMES: FilterOption[] = [
  { id: "any", label: "Any Time", icon: <Clock className="w-4 h-4" /> },
  { id: "express", label: "Express (24h)", icon: <Clock className="w-4 h-4" /> },
  { id: "fast", label: "Fast (3 days)", icon: <Clock className="w-4 h-4" /> },
  { id: "standard", label: "Standard (7 days)", icon: <Clock className="w-4 h-4" /> },
];

const RATING_FILTERS: FilterOption[] = [
  { id: "any", label: "Any Rating", icon: <Star className="w-4 h-4" /> },
  { id: "5", label: "5 Stars", icon: <Star className="w-4 h-4" /> },
  { id: "4", label: "4+ Stars", icon: <Star className="w-4 h-4" /> },
  { id: "3", label: "3+ Stars", icon: <Star className="w-4 h-4" /> },
];

export function FilterBar() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPrice, setSelectedPrice] = useState("any");
  const [selectedDelivery, setSelectedDelivery] = useState("any");
  const [selectedRating, setSelectedRating] = useState("any");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const hasActiveFilters = selectedCategory !== "all" || selectedPrice !== "any" ||
    selectedDelivery !== "any" || selectedRating !== "any";

  const clearAllFilters = () => {
    setSelectedCategory("all");
    setSelectedPrice("any");
    setSelectedDelivery("any");
    setSelectedRating("any");
    setActiveFilters([]);
  };

  return (
    <div className="space-y-4">
      {/* Main Filters */}
      <div className="relative">
        <div className="glass-macos rounded-3xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative">
            {/* Category Filter */}
            <FilterDropdown
              label="Category"
              options={CATEGORIES}
              selected={selectedCategory}
              onSelect={setSelectedCategory}
            />

            {/* Price Range Filter */}
            <FilterDropdown
              label="Price Range"
              options={PRICE_RANGES}
              selected={selectedPrice}
              onSelect={setSelectedPrice}
              showIcon
            />

            {/* Delivery Time Filter */}
            <FilterDropdown
              label="Delivery Time"
              options={DELIVERY_TIMES}
              selected={selectedDelivery}
              onSelect={setSelectedDelivery}
              showIcon
            />

            {/* Rating Filter */}
            <FilterDropdown
              label="Rating"
              options={RATING_FILTERS}
              selected={selectedRating}
              onSelect={setSelectedRating}
              showIcon
            />
          </div>

          {/* Clear All Button */}
          {hasActiveFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-black/5 dark:border-white/5"
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white"
              >
                <X className="w-4 h-4 mr-2" />
                Clear all filters
              </Button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Active Filter Tags */}
      {activeFilters.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-2"
        >
          {activeFilters.map((filter) => (
            <motion.div
              key={filter}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={SPRING}
              className="px-3 py-1.5 rounded-full bg-cyan-500/10 backdrop-blur-xl border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-sm font-semibold flex items-center gap-2"
            >
              <span>{filter}</span>
              <button
                onClick={() => setActiveFilters(activeFilters.filter(f => f !== filter))}
                className="hover:bg-cyan-500/20 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

// Dropdown Filter Component
interface FilterDropdownProps {
  label: string;
  options: FilterOption[];
  selected: string;
  onSelect: (value: string) => void;
  showIcon?: boolean;
}

function FilterDropdown({ label, options, selected, onSelect, showIcon }: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => opt.id === selected);

  return (
    <div className="relative">
      <label className="block text-xs font-medium text-black/60 dark:text-white/60 mb-2">
        {label}
      </label>
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        transition={SPRING}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full glass-macos glass-macos-hover px-4 py-2.5 rounded-xl text-left flex items-center justify-between text-sm font-medium text-black dark:text-white"
      >
        <div className="flex items-center gap-2">
          {showIcon && selectedOption?.icon}
          <span>{selectedOption?.label}</span>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform text-black/60 dark:text-white/60 ${isOpen ? "rotate-180" : ""}`} />
      </motion.button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed z-40 glass-macos rounded-xl overflow-hidden max-h-[280px] overflow-y-auto custom-scrollbar"
            style={{
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.08)',
              top: `${(document.activeElement as HTMLElement)?.getBoundingClientRect().bottom + 8}px`,
              left: `${(document.activeElement as HTMLElement)?.getBoundingClientRect().left}px`,
              width: `${(document.activeElement as HTMLElement)?.getBoundingClientRect().width}px`,
            }}
          >
            {options.map((option) => (
              <motion.button
                key={option.id}
                whileHover={{ backgroundColor: "rgba(0,0,0,0.03)" }}
                onClick={() => {
                  onSelect(option.id);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2.5 text-left flex items-center gap-2 text-sm transition-colors ${selected === option.id
                  ? "text-cyan-600 dark:text-cyan-400 font-semibold bg-cyan-500/5"
                  : "text-black/70 dark:text-white/70"
                  }`}
              >
                {showIcon && option.icon}
                <span className="flex-1">{option.label}</span>
                {selected === option.id && (
                  <Check className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                )}
              </motion.button>
            ))}
          </motion.div>
        </>
      )}
    </div>
  );
}
