/**
 * @fileoverview VerifAI Landing Page — Onchain Dispute Arbitration
 */

"use client";

import {
  ArrowRight,
  Search,
  ChevronRight,
  Lock,
  Database,
  Sparkles,
  Zap,
  Plus,
  Grid3x3,
} from "lucide-react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "motion/react";
import { useState, useRef, useEffect } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { useTheme } from "@/hooks/useTheme";

import WalletConnect from "@/components/WalletConnect";
import { Button } from "@/components/ui/button";
import { PublishServiceModal } from "@/components/PublishServiceModal";
import { MyServicesModal } from "@/components/MyServicesModal";
import { MyPendingWorksModal } from "@/components/MyPendingWorksModal";

const FADE_UP = {
  hidden: { opacity: 0, y: 40 },
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
    transition: { staggerChildren: 0.12 },
  },
};

const SPRING = {
  type: "spring",
  damping: 20,
  stiffness: 100,
};

const LandingPage = (): React.JSX.Element => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showMyServicesModal, setShowMyServicesModal] = useState(false);
  const [showMyPendingWorksModal, setShowMyPendingWorksModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { isConnected } = useAccount();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.3]);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      {/* Animated Mesh Gradient Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(6,182,212,0.08),transparent_25%),radial-gradient(circle_at_70%_60%,rgba(59,130,246,0.08),transparent_25%),radial-gradient(circle_at_50%_80%,rgba(168,85,247,0.05),transparent_25%)] dark:bg-[radial-gradient(circle_at_30%_20%,rgba(6,182,212,0.12),transparent_25%),radial-gradient(circle_at_70%_60%,rgba(59,130,246,0.12),transparent_25%),radial-gradient(circle_at_50%_80%,rgba(168,85,247,0.08),transparent_25%)] animate-[gradient_15s_ease_infinite]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000005_1px,transparent_1px),linear-gradient(to_bottom,#00000005_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:80px_80px]"></div>

        {/* Floating orbs */}
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -100, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-gradient-to-br from-cyan-400/10 to-blue-500/10 dark:from-cyan-400/20 dark:to-blue-500/20 blur-3xl"
        ></motion.div>
        <motion.div
          animate={{
            x: [0, -100, 0],
            y: [0, 100, 0],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-purple-400/10 to-pink-500/10 dark:from-purple-400/20 dark:to-pink-500/20 blur-3xl"
        ></motion.div>
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
            <div className="flex items-center gap-4">
              <Link href="/" className="group">
                <motion.span
                  whileHover={{ scale: 1.05 }}
                  transition={SPRING}
                  className="inline-block text-3xl font-bold tracking-tight text-black dark:text-white"
                >
                  Verif<span className="font-serif italic text-cyan-600 dark:text-cyan-400">AI</span>
                </motion.span>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <motion.div whileHover={{ scale: 1.05 }} transition={SPRING}>
                <Link href="/browse" className="text-sm font-medium text-black dark:text-white hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors flex items-center gap-2">
                  <Grid3x3 className="w-4 h-4" />
                  <span className="hidden md:inline">Browse All</span>
                </Link>
              </motion.div>
              {mounted && isConnected && (
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
              )}
              <WalletConnect
                onMyServicesClick={() => setShowMyServicesModal(true)}
                onMyPendingWorksClick={() => setShowMyPendingWorksModal(true)}
                theme={theme}
                onThemeToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              />
            </div>
          </div>
        </motion.nav>

        {/* Hero */}
        <section ref={heroRef} className="pt-48 pb-32 px-6 lg:px-12 max-w-[1800px] mx-auto">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={STAGGER}
            style={{ y: heroY, opacity: heroOpacity }}
            className="grid lg:grid-cols-2 gap-20 items-center"
          >
            {/* Left */}
            <div className="space-y-12">
              <motion.div variants={FADE_UP} className="space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-black/10 dark:border-white/10">
                  <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
                  <span className="text-sm font-mono text-black/70 dark:text-white/70">Live on Base</span>
                </div>
                <h1 className="text-7xl lg:text-8xl xl:text-9xl font-serif font-bold tracking-tight leading-[0.9] text-black dark:text-white">
                  Trustless
                  <br />
                  <span className="italic text-cyan-600 dark:text-cyan-400">arbitration</span>
                </h1>
                <p className="text-2xl text-black/60 dark:text-white/60 max-w-xl leading-relaxed">
                  Blockchain-secured dispute resolution powered by AI. Immutable evidence, transparent rulings, automatic execution.
                </p>
              </motion.div>

              <motion.div variants={FADE_UP} className="space-y-6">
                {/* Search bar */}
                <div className="relative max-w-2xl">
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
              </motion.div>
            </div>

            {/* Right - Blockchain Flow */}
            <motion.div
              variants={FADE_UP}
              className="relative h-[600px] flex items-center justify-center"
            >
              {/* Connected nodes showing dispute flow */}
              <div className="relative w-full max-w-md flex flex-col justify-center gap-6">
                {/* Node 1: Escrow */}
                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3, ...SPRING }}
                  className="relative ml-auto w-64"
                >
                  <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-3xl blur-xl opacity-40"></div>
                  <div className="relative bg-white/70 dark:bg-black/70 backdrop-blur-3xl rounded-[2rem] p-6 border border-white/20 dark:border-white/10 shadow-2xl">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center">
                        <Lock className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-black dark:text-white">Funds Locked</div>
                        <div className="text-xs text-black/60 dark:text-white/60">Secure escrow</div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Connection line */}
                <motion.div
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  className="w-0.5 h-8 bg-gradient-to-b from-cyan-400 to-purple-500 mx-auto origin-top"
                ></motion.div>

                {/* Node 2: Evidence */}
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7, ...SPRING }}
                  className="relative mr-auto w-64"
                >
                  <div className="absolute -inset-1 bg-gradient-to-r from-purple-400 to-pink-500 rounded-3xl blur-xl opacity-40"></div>
                  <div className="relative bg-white/70 dark:bg-black/70 backdrop-blur-3xl rounded-[2rem] p-6 border border-white/20 dark:border-white/10 shadow-2xl">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                        <Database className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-black dark:text-white">Evidence Frozen</div>
                        <div className="text-xs text-black/60 dark:text-white/60">Immutable IPFS</div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Connection line */}
                <motion.div
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: 0.9, duration: 0.5 }}
                  className="w-0.5 h-8 bg-gradient-to-b from-purple-400 to-emerald-500 mx-auto origin-top"
                ></motion.div>

                {/* Node 3: AI Ruling */}
                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.1, ...SPRING }}
                  className="relative ml-auto w-64"
                >
                  <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-3xl blur-xl opacity-40"></div>
                  <div className="relative bg-white/70 dark:bg-black/70 backdrop-blur-3xl rounded-[2rem] p-6 border border-white/20 dark:border-white/10 shadow-2xl">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-black dark:text-white">AI Ruling</div>
                        <div className="text-xs text-black/60 dark:text-white/60">Transparent verdict</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: "100%" }}
                          transition={{ delay: 1.3, duration: 1.5 }}
                          className="h-full bg-gradient-to-r from-emerald-400 to-teal-500"
                        ></motion.div>
                      </div>
                      <div className="text-xs font-mono text-black/60 dark:text-white/60">98%</div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* How It Works - Compact with Liquid Glass */}
        <section id="work" className="py-32 px-6 lg:px-12 max-w-[1400px] mx-auto border-t border-black/5 dark:border-white/5">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={STAGGER}
          >
            <motion.div variants={FADE_UP} className="mb-16 text-center">
              <h2 className="text-6xl lg:text-7xl font-serif font-bold text-black dark:text-white mb-6">
                How it works
              </h2>
              <p className="text-xl text-black/60 dark:text-white/60 max-w-2xl mx-auto">
                Three steps to trustless, instant arbitration
              </p>
            </motion.div>

            {/* Compact Steps Grid */}
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {/* Step 1 */}
              <motion.div
                variants={FADE_UP}
                whileHover={{ y: -4, scale: 1.02 }}
                transition={SPRING}
                className="relative group"
              >
                <div className="absolute -inset-1 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative bg-white/60 dark:bg-black/60 backdrop-blur-3xl rounded-[2rem] p-6 border border-white/20 dark:border-white/10 shadow-xl">
                  <div className="text-xs font-mono text-black/40 dark:text-white/40 mb-3">01</div>
                  <h3 className="text-2xl font-serif font-bold text-black dark:text-white mb-3">
                    Lock funds
                  </h3>
                  <p className="text-sm text-black/60 dark:text-white/60 leading-relaxed mb-4">
                    Both parties deposit funds into a smart contract. Money held securely until resolved.
                  </p>
                  <div className="aspect-square rounded-2xl bg-gradient-to-br from-cyan-50 to-blue-100 dark:from-cyan-950/30 dark:to-blue-950/30 border border-cyan-200/50 dark:border-cyan-800/30 flex items-center justify-center">
                    <motion.div
                      whileHover={{ rotate: 10, scale: 1.1 }}
                      transition={SPRING}
                      className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-xl"
                    >
                      <Lock className="w-8 h-8 text-white" />
                    </motion.div>
                  </div>
                </div>
              </motion.div>

              {/* Step 2 */}
              <motion.div
                variants={FADE_UP}
                whileHover={{ y: -4, scale: 1.02 }}
                transition={SPRING}
                className="relative group"
              >
                <div className="absolute -inset-1 bg-gradient-to-br from-purple-400/20 to-pink-500/20 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative bg-white/60 dark:bg-black/60 backdrop-blur-3xl rounded-[2rem] p-6 border border-white/20 dark:border-white/10 shadow-xl">
                  <div className="text-xs font-mono text-black/40 dark:text-white/40 mb-3">02</div>
                  <h3 className="text-2xl font-serif font-bold text-black dark:text-white mb-3">
                    Freeze evidence
                  </h3>
                  <p className="text-sm text-black/60 dark:text-white/60 leading-relaxed mb-4">
                    Submit proof to IPFS. Hash written to blockchain. Cryptographically immutable.
                  </p>
                  <div className="aspect-square rounded-2xl bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-950/30 dark:to-pink-950/30 border border-purple-200/50 dark:border-purple-800/30 flex items-center justify-center relative overflow-hidden">
                    <motion.div
                      whileHover={{ rotate: -10, scale: 1.1 }}
                      transition={SPRING}
                      className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center shadow-xl"
                    >
                      <Database className="w-8 h-8 text-white" />
                    </motion.div>
                  </div>
                </div>
              </motion.div>

              {/* Step 3 */}
              <motion.div
                variants={FADE_UP}
                whileHover={{ y: -4, scale: 1.02 }}
                transition={SPRING}
                className="relative group"
              >
                <div className="absolute -inset-1 bg-gradient-to-br from-emerald-400/20 to-teal-500/20 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative bg-white/60 dark:bg-black/60 backdrop-blur-3xl rounded-[2rem] p-6 border border-white/20 dark:border-white/10 shadow-xl">
                  <div className="text-xs font-mono text-black/40 dark:text-white/40 mb-3">03</div>
                  <h3 className="text-2xl font-serif font-bold text-black dark:text-white mb-3">
                    AI delivers
                  </h3>
                  <p className="text-sm text-black/60 dark:text-white/60 leading-relaxed mb-4">
                    Claude analyzes both sides. Issues binding decision. Smart contract executes automatically.
                  </p>
                  <div className="aspect-square rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200/50 dark:border-emerald-800/30 flex items-center justify-center relative">
                    <motion.div
                      whileHover={{ rotate: 10, scale: 1.1 }}
                      transition={SPRING}
                      className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-xl"
                    >
                      <Sparkles className="w-8 h-8 text-white" />
                    </motion.div>
                    {/* Floating particles */}
                    {[...Array(4)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{
                          scale: [0, 1, 0],
                          opacity: [0, 1, 0],
                          y: [0, -20],
                        }}
                        transition={{
                          delay: i * 0.3,
                          duration: 2,
                          repeat: Infinity,
                          repeatDelay: 0.5,
                        }}
                        className="absolute w-2 h-2 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500"
                        style={{
                          left: `${30 + i * 15}%`,
                          top: "20%",
                        }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="py-16 px-6 lg:px-12 max-w-[1800px] mx-auto mt-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative bg-white/50 dark:bg-black/50 backdrop-blur-2xl rounded-3xl p-12 border border-white/20 dark:border-white/10 shadow-xl"
          >
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-3">
                <div className="text-sm text-black/50 dark:text-white/50">
                  © 2026 Verif<span className="font-serif italic">AI</span>
                </div>
                <div className="w-px h-4 bg-black/10 dark:bg-white/10"></div>
                <div className="text-xs text-black/30 dark:text-white/30">
                  Built with love on Base
                </div>
              </div>
              <div className="flex items-center gap-6">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  transition={SPRING}
                  className="px-4 py-2 rounded-full bg-cyan-500/10 dark:bg-cyan-400/10 border border-cyan-500/20 dark:border-cyan-400/20 backdrop-blur-xl"
                >
                  <span className="text-xs font-semibold text-cyan-600 dark:text-cyan-400">Base Sepolia</span>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  transition={SPRING}
                  className="px-4 py-2 rounded-full bg-purple-500/10 dark:bg-purple-400/10 border border-purple-500/20 dark:border-purple-400/20 backdrop-blur-xl"
                >
                  <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">Claude AI</span>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  transition={SPRING}
                  className="px-4 py-2 rounded-full bg-emerald-500/10 dark:bg-emerald-400/10 border border-emerald-500/20 dark:border-emerald-400/20 backdrop-blur-xl"
                >
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">IPFS</span>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </footer>
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
};

export default LandingPage;
