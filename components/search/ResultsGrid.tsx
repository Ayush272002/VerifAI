/**
 * @fileoverview Results Grid Component
 * Responsive grid layout with search functionality
 */

"use client";

import { motion } from "motion/react";
import { useMemo } from "react";
import { ResultCard, ResultData } from "./ResultCard";

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
    category: "Web Development",
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
    id: "2",
    title: "Modern Logo Design & Brand Identity Package",
    provider: {
      name: "Sarah Chen",
      avatar: "",
      level: "Expert",
      verified: true,
    },
    category: "Design & Creative",
    price: {
      amount: 850,
      type: "fixed",
    },
    rating: 5.0,
    reviewCount: 94,
    deliveryTime: "3 days",
    location: "New York, NY",
    thumbnail: "bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-700",
    icon: "",
    tags: ["Logo Design", "Branding", "Illustrator", "Figma"],
    successRate: 100,
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
    category: "Content Writing",
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
    category: "Blockchain Development",
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
    category: "Design & Creative",
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
    category: "Web Development",
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
    category: "Consulting",
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
    category: "Web Development",
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
    category: "Design & Creative",
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
    category: "Mobile Development",
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

interface ResultsGridProps {
  searchQuery?: string;
}

export function ResultsGrid({ searchQuery = "" }: ResultsGridProps) {
  // Filter results based on search query
  const filteredResults = useMemo(() => {
    if (!searchQuery) return MOCK_RESULTS;

    const query = searchQuery.toLowerCase().trim();
    return MOCK_RESULTS.filter(result => {
      // Search in title, category, tags, and provider name
      return (
        result.title.toLowerCase().includes(query) ||
        result.category.toLowerCase().includes(query) ||
        result.tags.some(tag => tag.toLowerCase().includes(query)) ||
        result.provider.name.toLowerCase().includes(query)
      );
    });
  }, [searchQuery]);

  const featuredResults = filteredResults.filter(r => r.featured);
  const regularResults = filteredResults.filter(r => !r.featured);

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

      {/* Load More */}
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
}
