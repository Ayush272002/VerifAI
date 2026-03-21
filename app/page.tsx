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
      type: "spring" as const,
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
  type: "spring" as const,
  damping: 20,
  stiffness: 100,
};

const LandingPage = (): React.JSX.Element => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showMyServicesModal, setShowMyServicesModal] = useState(false);
  const [showMyPendingWorksModal, setShowMyPendingWorksModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [progress, setProgress] = useState(0);
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

    const timeout1 = setTimeout(() => {
      let val = 0;
      const int = setInterval(() => {
        val += 5;
        if(val >= 98) {
          setProgress(98);
          clearInterval(int);
        } else {
          setProgress(val);
        }
      }, 40);
    }, 1300);

    const timeout2 = setTimeout(() => setProgress(99), 3100);
    const timeout3 = setTimeout(() => setProgress(100), 3500);

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
    };
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
            <div className="flex items-center gap-6">
              <motion.div whileHover={{ scale: 1.05 }} transition={SPRING}>
                <Link href="/browse" className="text-sm font-medium text-black/80 dark:text-white/80 hover:text-black dark:hover:text-white transition-colors">
                  Browse
                </Link>
              </motion.div>
              {mounted && isConnected && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={SPRING}
                  onClick={() => setShowPublishModal(true)}
                  className="rounded-lg px-4 py-1.5 text-sm font-medium border border-black/10 dark:border-white/10 text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                >
                  Publish
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
                <div className="relative max-w-2xl">
                  <div className="flex items-center pl-6 pr-2 py-2 rounded-full border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] transition-colors focus-within:border-black/20 dark:focus-within:border-white/20">
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
                      className="bg-black dark:bg-white text-white dark:text-black text-sm font-medium ml-2 py-2 px-6 rounded-full hover:bg-black/90 dark:hover:bg-white/90 transition-colors"
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
              className="relative h-[780px] flex items-center justify-center"
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
                    <div className="flex items-center gap-3">
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
                    <div className="flex items-center gap-3">
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
                          animate={{ width: ["0%", "98%", "98%", "99%", "100%"] }}
                          transition={{ delay: 1.3, duration: 2.2, times: [0, 0.4, 0.8, 0.9, 1], ease: "easeInOut" }}
                          className="h-full bg-gradient-to-r from-emerald-400 to-teal-500"
                        ></motion.div>
                      </div>
                      <div className="text-xs font-mono text-black/60 dark:text-white/60">{progress}%</div>
                    </div>
                  </div>
                </motion.div>

                {/* Connection line */}
                <motion.div
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: 3.6, duration: 0.5 }}
                  className="w-0.5 h-8 bg-gradient-to-b from-teal-500 to-amber-500 mx-auto origin-top"
                ></motion.div>

                {/* Node 4: Payout */}
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 3.9, ...SPRING }}
                  className="relative mr-auto w-64"
                >
                  <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 to-orange-500 rounded-3xl blur-xl opacity-40"></div>
                  <div className="relative bg-white/70 dark:bg-black/70 backdrop-blur-3xl rounded-[2rem] p-6 border border-white/20 dark:border-white/10 shadow-2xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-black dark:text-white">Payout Released</div>
                        <div className="text-xs text-black/60 dark:text-white/60">Smart contract executed</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* How It Works - Flowchart */}
        <section id="work" className="py-32 px-6 lg:px-12 max-w-[1400px] mx-auto border-t border-black/5 dark:border-white/5 relative overflow-hidden">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={STAGGER}
          >
            <motion.div variants={FADE_UP} className="mb-20 text-center relative z-10">
              <h2 className="text-5xl lg:text-7xl font-serif font-bold text-black dark:text-white mb-6">
                How it works
              </h2>
              <p className="text-xl text-black/60 dark:text-white/60 max-w-2xl mx-auto">
                A transparent, branched workflow from initial escrow to smart contract settlement.
              </p>
            </motion.div>

            {/* True Flowchart Container */}
            <div className="relative w-full overflow-hidden pb-12 pt-16 flex justify-center pointer-events-none">
              <div className="w-[1200px] shrink-0 scale-[0.35] sm:scale-[0.55] md:scale-75 lg:scale-100 origin-center flex items-center justify-center gap-0 relative px-12 pointer-events-auto">
                
                {/* Visual grid behind flowchart */}
                <div className="absolute inset-x-0 inset-y-[-100px] bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-size-[40px_40px] pointer-events-none z-0 rounded-3xl" mask-image="linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)"></div>

                {/* --- Category 1: Escrow --- */}
                <div className="flex flex-col justify-center relative z-10 w-44">
                  <div className="absolute -top-10 left-0 text-[10px] font-mono text-black/40 dark:text-white/40 uppercase tracking-widest font-semibold mb-2">1. Escrow</div>
                  <motion.div 
                    variants={FADE_UP}
                    className="w-full bg-white/10 dark:bg-black/10 backdrop-blur-2xl border border-black/10 dark:border-white/10 rounded-lg p-5 flex flex-col items-center justify-center gap-3 shadow-sm hover:border-black/30 dark:hover:border-white/30 transition-colors relative z-20"
                  >
                    <Lock className="w-6 h-6 text-black/60 dark:text-white/60" />
                    <span className="text-[13px] font-medium text-black dark:text-white leading-tight text-center">Deposit Funds</span>
                  </motion.div>
                </div>

                {/* Connector 1 to 2 */}
                <div className="w-12 h-[1px] bg-black/10 dark:bg-white/10 relative z-0"></div>

                {/* --- Category 2: Submit Work --- */}
                <div className="flex flex-col justify-center relative z-10 w-44">
                  <div className="absolute -top-10 left-0 text-[10px] font-mono text-black/40 dark:text-white/40 uppercase tracking-widest font-semibold mb-2">2. Upload</div>
                  <motion.div 
                    variants={FADE_UP}
                    className="w-full bg-white/10 dark:bg-black/10 backdrop-blur-2xl border border-black/10 dark:border-white/10 rounded-lg p-5 flex flex-col items-center justify-center gap-3 shadow-sm hover:border-black/30 dark:hover:border-white/30 transition-colors relative z-20"
                  >
                    <Database className="w-6 h-6 text-black/60 dark:text-white/60" />
                    <span className="text-[13px] font-medium text-black dark:text-white leading-tight text-center">Deliver Work</span>
                  </motion.div>
                </div>

                {/* Connector 2 to 3 */}
                <div className="w-12 h-[1px] bg-black/10 dark:bg-white/10 relative z-0"></div>

                {/* --- Category 3: Orchestrator AI --- */}
                <div className="flex flex-col justify-center relative z-10 w-44">
                  <div className="absolute -top-10 left-0 text-[10px] font-mono text-black/40 dark:text-white/40 uppercase tracking-widest font-semibold mb-2">3. Orchestrate</div>
                  <motion.div 
                    variants={FADE_UP}
                    className="w-full bg-white/10 dark:bg-black/10 backdrop-blur-2xl border border-black/10 dark:border-white/10 rounded-lg p-5 flex flex-col items-center justify-center gap-3 shadow-sm hover:border-black/30 dark:hover:border-white/30 transition-colors relative z-20"
                  >
                    <Sparkles className="w-6 h-6 text-black/60 dark:text-white/60" />
                    <span className="text-[13px] font-medium text-black dark:text-white leading-tight text-center">Master Agent</span>
                  </motion.div>
                </div>

                {/* Fork Connector */}
                <div className="relative z-0 w-12 h-[260px]">
                  {/* Central input segment */}
                  <div className="absolute left-0 top-1/2 w-4 h-[1px] bg-black/10 dark:bg-white/10 -translate-y-1/2"></div>
                  {/* Vertical spine */}
                  <div className="absolute left-4 top-[24px] bottom-[24px] w-[1px] bg-black/10 dark:bg-white/10"></div>
                  {/* Top branch */}
                  <div className="absolute left-4 top-[24px] w-8 h-[1px] bg-black/10 dark:bg-white/10"></div>
                  {/* Middle branch */}
                  <div className="absolute left-4 top-1/2 w-8 h-[1px] bg-black/10 dark:bg-white/10 -translate-y-1/2"></div>
                  {/* Bottom branch */}
                  <div className="absolute left-4 bottom-[24px] w-8 h-[1px] bg-black/10 dark:bg-white/10"></div>
                </div>

                {/* --- Sub-Agents Column --- */}
                <div className="flex flex-col justify-between h-[260px] relative z-10">
                  <div className="absolute -top-10 left-0 text-[10px] font-mono text-black/40 dark:text-white/40 uppercase tracking-widest font-semibold mb-2">Evaluate</div>
                  
                  {/* Agent 1 */}
                  <motion.div variants={FADE_UP} className="w-44 bg-white/10 dark:bg-black/10 backdrop-blur-2xl border border-black/10 dark:border-white/10 rounded-lg py-5 px-3 flex flex-col items-center justify-center gap-2 shadow-sm hover:border-black/30 dark:hover:border-white/30 transition-colors relative z-20">
                    <Zap className="w-5 h-5 text-black/60 dark:text-white/60" />
                    <span className="text-[13px] font-medium text-black dark:text-white leading-tight text-center">Review Agent</span>
                  </motion.div>

                  {/* Agent 2 */}
                  <motion.div variants={FADE_UP} className="w-44 bg-white/10 dark:bg-black/10 backdrop-blur-2xl border border-black/10 dark:border-white/10 rounded-lg py-5 px-3 flex flex-col items-center justify-center gap-2 shadow-sm hover:border-black/30 dark:hover:border-white/30 transition-colors relative z-20">
                    <Zap className="w-5 h-5 text-black/60 dark:text-white/60" />
                    <span className="text-[13px] font-medium text-black dark:text-white leading-tight text-center">Review Agent</span>
                  </motion.div>

                  {/* Agent 3 */}
                  <motion.div variants={FADE_UP} className="w-44 bg-white/10 dark:bg-black/10 backdrop-blur-2xl border border-black/10 dark:border-white/10 rounded-lg py-5 px-3 flex flex-col items-center justify-center gap-2 shadow-sm hover:border-black/30 dark:hover:border-white/30 transition-colors relative z-20">
                    <Zap className="w-5 h-5 text-black/60 dark:text-white/60" />
                    <span className="text-[13px] font-medium text-black dark:text-white leading-tight text-center">Review Agent</span>
                  </motion.div>
                </div>

                {/* Merge Connector */}
                <div className="relative z-0 w-12 h-[260px]">
                  {/* Vertical merger */}
                  <div className="absolute right-4 top-[24px] bottom-[24px] w-[1px] bg-black/10 dark:bg-white/10"></div>
                  {/* Input branch Top */}
                  <div className="absolute right-4 top-[24px] w-8 h-[1px] bg-black/10 dark:bg-white/10"></div>
                  {/* Input branch Middle */}
                  <div className="absolute right-4 top-1/2 w-8 h-[1px] bg-black/10 dark:bg-white/10 -translate-y-1/2"></div>
                  {/* Input branch Bottom */}
                  <div className="absolute right-4 bottom-[24px] w-8 h-[1px] bg-black/10 dark:bg-white/10"></div>
                  {/* Central output segment */}
                  <div className="absolute right-0 top-1/2 w-4 h-[1px] bg-black/10 dark:bg-white/10 -translate-y-1/2"></div>
                </div>

                {/* --- Category 4: Auto-Settlement --- */}
                <div className="flex flex-col justify-center relative z-10 w-44">
                  <div className="absolute -top-10 left-0 text-[10px] font-mono text-black/40 dark:text-white/40 uppercase tracking-widest font-semibold mb-2">4. Settle</div>
                  <motion.div 
                    variants={FADE_UP}
                    className="w-full bg-white/10 dark:bg-black/10 backdrop-blur-2xl border border-black/10 dark:border-white/10 rounded-lg p-5 flex flex-col items-center justify-center gap-3 shadow-sm hover:border-black/30 dark:hover:border-white/30 transition-colors relative z-20"
                  >
                    <ArrowRight className="w-6 h-6 text-black/60 dark:text-white/60" />
                    <span className="text-[13px] font-medium text-black dark:text-white leading-tight text-center">Payment Sent</span>
                  </motion.div>
                </div>

              </div>
            </div>
          </motion.div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-6 lg:px-12 max-w-[1200px] mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", damping: 20, stiffness: 100 }}
            className="border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] rounded-3xl p-8 lg:p-12 text-center"
          >
            <div className="max-w-xl mx-auto space-y-6">
              <h2 className="text-3xl lg:text-4xl font-serif font-bold text-black dark:text-white">
                Ready to find verified services?
              </h2>
              <p className="text-base text-black/60 dark:text-white/60">
                Join the network of verified professionals and clients building trustless agreements today.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                <Button 
                  className="w-full sm:w-auto rounded-full px-8 text-base bg-black dark:bg-white text-white dark:text-black hover:bg-black/90 dark:hover:bg-white/90 transition-all"
                  onClick={() => router.push('/browse')}
                >
                  Browse Services
                </Button>
                {mounted && isConnected && (
                  <Button 
                    variant="outline"
                    className="w-full sm:w-auto rounded-full px-8 text-base border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                    onClick={() => setShowPublishModal(true)}
                  >
                    Publish Service
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-6 lg:px-12 max-w-[1400px] mx-auto mt-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row items-center justify-between gap-4 border-t border-black/10 dark:border-white/10 pt-8"
          >
            <div className="text-sm font-medium text-black/80 dark:text-white/80">
              © 2026 Verif<span className="font-serif italic font-bold">AI</span>
            </div>
            <div className="text-sm text-black/50 dark:text-white/50">
              Trustless Arbitration
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
