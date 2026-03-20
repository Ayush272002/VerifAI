/**
 * @fileoverview VerifAI Landing Page — Onchain Freelance Marketplace
 */

"use client";

import {
  ArrowRight,
  Scale,
  Lock,
  Zap,
  Shield,
  Search,
  FileText,
  Users,
  Briefcase,
  Palette,
  Video,
  Code,
  Sparkles,
  Clock,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

/** Service categories for the marketplace */
const SERVICE_CATEGORIES = [
  { label: "Design & Creative", icon: Palette, color: "bg-purple-100 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400" },
  { label: "Development", icon: Code, color: "bg-blue-100 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400" },
  { label: "Video & Animation", icon: Video, color: "bg-pink-100 text-pink-600 dark:bg-pink-950/30 dark:text-pink-400" },
  { label: "Writing & Content", icon: FileText, color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400" },
  { label: "Business", icon: Briefcase, color: "bg-orange-100 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400" },
  { label: "Consulting", icon: Users, color: "bg-cyan-100 text-cyan-600 dark:bg-cyan-950/30 dark:text-cyan-400" },
] as const;

/** How it works steps */
const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Browse & Hire",
    description:
      "Search for services, review portfolios, and hire talented freelancers with crypto payments.",
    icon: Search,
  },
  {
    step: "02",
    title: "Protected Work",
    description:
      "Funds held in escrow. If disputes arise, evidence is locked on-chain automatically.",
    icon: Shield,
  },
  {
    step: "03",
    title: "Instant Resolution",
    description:
      "AI analyzes evidence and resolves disputes in under 60 seconds. Fair, transparent, final.",
    icon: Zap,
  },
] as const;

/** Stats to display */
const STATS = [
  { value: "10k+", label: "Active Freelancers", icon: Users },
  { value: "<60s", label: "Dispute Resolution", icon: Zap },
  { value: "100%", label: "Funds Protected", icon: Shield },
  { value: "$2M+", label: "Paid Out", icon: TrendingUp },
] as const;

/** Popular services */
const POPULAR_SERVICES = [
  { title: "Logo Design", price: "From $25", category: "Design" },
  { title: "Website Development", price: "From $100", category: "Development" },
  { title: "Content Writing", price: "From $15", category: "Writing" },
  { title: "Video Editing", price: "From $50", category: "Video" },
] as const;

/** Animation variants */
const FADE_UP = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const STAGGER_CONTAINER = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const LandingPage = (): React.JSX.Element => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-purple-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950/20">
      {/* Navigation */}
      <motion.nav
        className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <span className="font-serif text-xl tracking-tight">VerifAI</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="#browse">Browse</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="#disputes">My Disputes</Link>
            </Button>
            <ThemeToggle />
            <Button size="sm" className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white" asChild>
              <Link href="#get-started">Sign In</Link>
            </Button>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <motion.div
          className="text-center space-y-8 max-w-4xl mx-auto"
          initial="hidden"
          animate="visible"
          variants={STAGGER_CONTAINER}
        >
          {/* Badge */}
          <motion.div variants={FADE_UP} className="flex justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/40 dark:to-blue-900/40 border border-purple-200 dark:border-purple-800/50 text-sm font-medium">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-gray-900 dark:text-gray-100">Hire talent. Work protected. Disputes resolved instantly.</span>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={FADE_UP}
            className="text-4xl sm:text-5xl lg:text-6xl font-serif tracking-tight leading-[1.15] text-gray-900 dark:text-white"
          >
            Find the perfect freelancer
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400">
              with built-in protection
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={FADE_UP}
            className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto"
          >
            Browse thousands of services. Pay with crypto. Every transaction
            protected by onchain dispute resolution.
          </motion.p>

          {/* Search Bar */}
          <motion.div variants={FADE_UP} className="pt-4">
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search for any service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-14 pl-12 pr-32 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-base focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all shadow-sm"
              />
              <Button
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
              >
                Search
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">Popular:</span>
              {POPULAR_SERVICES.map((service) => (
                <button
                  key={service.title}
                  className="text-sm px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                >
                  {service.title}
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Stats Bar */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={STAGGER_CONTAINER}
        className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
      >
        <motion.div
          variants={FADE_UP}
          className="grid grid-cols-2 lg:grid-cols-4 gap-6 p-8 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg"
        >
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center space-y-2">
              <div className="flex items-center justify-center">
                <stat.icon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-serif text-gray-900 dark:text-white">{stat.value}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </motion.section>

      {/* Categories Section */}
      <section id="browse" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={STAGGER_CONTAINER}
          className="space-y-8"
        >
          <motion.div variants={FADE_UP} className="text-center space-y-3">
            <h2 className="text-3xl sm:text-4xl font-serif tracking-tight text-gray-900 dark:text-white">
              Browse by category
            </h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Thousands of talented freelancers ready to bring your projects to life
            </p>
          </motion.div>

          <motion.div
            variants={STAGGER_CONTAINER}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4"
          >
            {SERVICE_CATEGORIES.map((category) => (
              <motion.div key={category.label} variants={FADE_UP}>
                <button className="w-full p-6 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-purple-400 dark:hover:border-purple-600 hover:shadow-lg transition-all group">
                  <div className={`w-12 h-12 mx-auto mb-3 rounded-lg ${category.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <category.icon className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{category.label}</p>
                </button>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* How It Works Section */}
      <section
        id="how-it-works"
        className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
      >
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={STAGGER_CONTAINER}
          className="space-y-12 p-12 rounded-3xl bg-gradient-to-br from-purple-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-purple-950/30 dark:to-gray-900 border border-purple-100 dark:border-purple-900/30"
        >
          <motion.div variants={FADE_UP} className="text-center space-y-3">
            <h2 className="text-3xl sm:text-4xl font-serif tracking-tight text-gray-900 dark:text-white">
              Work with confidence
            </h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Every transaction is protected. If something goes wrong, AI resolves it instantly.
            </p>
          </motion.div>

          <motion.div
            variants={STAGGER_CONTAINER}
            className="grid md:grid-cols-3 gap-8"
          >
            {HOW_IT_WORKS.map((item, index) => (
              <motion.div
                key={item.step}
                variants={FADE_UP}
                className="relative"
              >
                <div className="p-8 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-4 h-full shadow-sm">
                  {/* Icon */}
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg">
                    <item.icon className="w-7 h-7 text-white" />
                  </div>

                  <h3 className="text-xl font-serif text-gray-900 dark:text-white">{item.title}</h3>

                  {/* Description */}
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Connector Arrow */}
                {index < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden md:flex absolute top-1/2 -right-4 items-center justify-center">
                    <ArrowRight className="w-6 h-6 text-purple-400" />
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Recent Disputes / Activity Section */}
      <section id="disputes" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={STAGGER_CONTAINER}
          className="space-y-8"
        >
          <motion.div variants={FADE_UP} className="flex items-center justify-between">
            <div className="space-y-2">
              <h2 className="text-3xl sm:text-4xl font-serif tracking-tight text-gray-900 dark:text-white">
                Recent activity
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Disputes resolved in real-time on-chain
              </p>
            </div>
            <Button variant="outline" className="border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800" asChild>
              <Link href="/disputes">View All</Link>
            </Button>
          </motion.div>

          <motion.div variants={STAGGER_CONTAINER} className="grid md:grid-cols-3 gap-4">
            {[
              { id: "#1247", type: "Website Development", status: "Resolved", time: "2 min ago", winner: "Client" },
              { id: "#1246", type: "Logo Design", status: "Resolved", time: "15 min ago", winner: "Freelancer" },
              { id: "#1245", type: "Content Writing", status: "Resolved", time: "1 hour ago", winner: "Client" },
            ].map((dispute) => (
              <motion.div key={dispute.id} variants={FADE_UP}>
                <div className="p-6 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-purple-400 dark:hover:border-purple-600 hover:shadow-md transition-all space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-mono text-gray-500 dark:text-gray-400">{dispute.id}</p>
                      <h4 className="font-medium mt-1 text-gray-900 dark:text-white">{dispute.type}</h4>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="w-3 h-3" />
                      {dispute.status}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Winner: {dispute.winner}</span>
                    <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                      <Clock className="w-3.5 h-3.5" />
                      {dispute.time}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Why Choose VerifAI Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={STAGGER_CONTAINER}
          className="space-y-12"
        >
          <motion.div variants={FADE_UP} className="text-center space-y-3">
            <h2 className="text-3xl sm:text-4xl font-serif tracking-tight text-gray-900 dark:text-white">
              Fair protection for everyone
            </h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Traditional dispute resolution is slow and expensive. We built something better.
            </p>
          </motion.div>

          <motion.div variants={FADE_UP} className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Benefits */}
            <div className="p-8 rounded-2xl bg-gradient-to-br from-emerald-50 to-cyan-50 dark:from-emerald-900/20 dark:to-cyan-900/20 border border-emerald-200 dark:border-emerald-800/50 space-y-4 shadow-sm">
              <h3 className="text-2xl font-serif flex items-center gap-2 text-gray-900 dark:text-white">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                VerifAI Protection
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-emerald-600 dark:text-emerald-400 mt-0.5">✓</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Disputes resolved in under 60 seconds</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-600 dark:text-emerald-400 mt-0.5">✓</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Evidence locked on-chain before AI review</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-600 dark:text-emerald-400 mt-0.5">✓</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Transparent reasoning, visible to both parties</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-600 dark:text-emerald-400 mt-0.5">✓</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Automatic payout via smart contract</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-600 dark:text-emerald-400 mt-0.5">✓</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">No legal fees, just network costs</span>
                </li>
              </ul>
            </div>

            {/* Traditional Way */}
            <div className="p-8 rounded-2xl bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-4 shadow-sm">
              <h3 className="text-2xl font-serif text-gray-600 dark:text-gray-400">
                Traditional Process
              </h3>
              <ul className="space-y-3 text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 opacity-50">×</span>
                  <span className="text-sm">3–18 months to resolve</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 opacity-50">×</span>
                  <span className="text-sm">$5k–$50k in legal fees</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 opacity-50">×</span>
                  <span className="text-sm">Evidence can be altered</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 opacity-50">×</span>
                  <span className="text-sm">Opaque decision-making</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 opacity-50">×</span>
                  <span className="text-sm">Manual enforcement</span>
                </li>
              </ul>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Final CTA Section */}
      <section
        id="get-started"
        className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
      >
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={STAGGER_CONTAINER}
          className="max-w-4xl mx-auto"
        >
          <motion.div
            variants={FADE_UP}
            className="p-12 rounded-3xl bg-gradient-to-br from-purple-500 to-blue-500 text-white text-center space-y-6"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif tracking-tight leading-[1.15]">
              Ready to hire with confidence?
            </h2>

            <p className="text-lg text-purple-100 max-w-2xl mx-auto">
              Join thousands of clients and freelancers working together on the most protected marketplace.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Button size="lg" variant="secondary" className="gap-2 px-8 h-12 bg-white hover:bg-gray-100 text-purple-600" asChild>
                <Link href="/browse">
                  Browse Services
                  <Search className="w-4 h-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="gap-2 px-8 h-12 border-white/30 hover:bg-white/10 text-white" asChild>
                <Link href="/sell">
                  Start Selling
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </motion.div>

          <motion.p
            variants={FADE_UP}
            className="text-center text-sm text-muted-foreground font-mono pt-8"
          >
            Built on Base • Powered by Claude AI • Secured by IPFS
          </motion.p>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-serif text-sm mb-3 text-gray-900 dark:text-white">Marketplace</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><Link href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Browse Services</Link></li>
                <li><Link href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Become a Seller</Link></li>
                <li><Link href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">How It Works</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-serif text-sm mb-3 text-gray-900 dark:text-white">Disputes</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><Link href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Recent Cases</Link></li>
                <li><Link href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">File a Dispute</Link></li>
                <li><Link href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Resolution Process</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-serif text-sm mb-3 text-gray-900 dark:text-white">Resources</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><Link href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Documentation</Link></li>
                <li><Link href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">API</Link></li>
                <li><Link href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Smart Contracts</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-serif text-sm mb-3 text-gray-900 dark:text-white">Company</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><Link href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">About</Link></li>
                <li><Link href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">GitHub</Link></li>
                <li><Link href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Base Sepolia</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <Scale className="w-4 h-4 text-white" />
              </div>
              <span className="font-serif">VerifAI</span>
              <span>© 2026</span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              AI London 2026 • Built at Encode Hub
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default LandingPage;
