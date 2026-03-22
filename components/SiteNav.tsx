/**
 * @fileoverview Shared site navigation bar used across all pages.
 * Handles wallet connection, theme toggling, and modal triggers.
 */

"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Grid3x3 } from "lucide-react";
import WalletConnect from "@/components/WalletConnect";

const SPRING = {
  type: "spring" as const,
  damping: 20,
  stiffness: 100,
};

interface SiteNavProps {
  /** Whether the wallet is connected — controls visibility of the Publish button. */
  isConnected: boolean;
  /** Whether the component has mounted — prevents SSR hydration mismatches. */
  mounted: boolean;
  theme: string;
  onThemeToggle: () => void;
  onPublishClick: () => void;
  onMyServicesClick: () => void;
  onMyPendingWorksClick: () => void;
  /** Show the Browse All link with icon (used on search page). */
  showBrowseIcon?: boolean;
}

/**
 * Fixed top navigation bar with logo, browse link, publish button, and wallet connect.
 */
const SiteNav = ({
  isConnected,
  mounted,
  theme,
  onThemeToggle,
  onPublishClick,
  onMyServicesClick,
  onMyPendingWorksClick,
  showBrowseIcon = false,
}: SiteNavProps): React.JSX.Element => (
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

      <div className="flex items-center gap-6">
        <motion.div whileHover={{ scale: 1.05 }} transition={SPRING}>
          <Link
            href="/browse"
            className="text-sm font-medium text-black/80 dark:text-white/80 hover:text-black dark:hover:text-white transition-colors flex items-center gap-2"
          >
            {showBrowseIcon && <Grid3x3 className="w-4 h-4" />}
            <span className={showBrowseIcon ? "hidden md:inline" : undefined}>Browse</span>
          </Link>
        </motion.div>

        {mounted && isConnected && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={SPRING}
            onClick={onPublishClick}
            className="rounded-lg px-4 py-1.5 text-sm font-medium border border-black/10 dark:border-white/10 text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-all"
          >
            Publish
          </motion.button>
        )}

        <WalletConnect
          onMyServicesClick={onMyServicesClick}
          onMyPendingWorksClick={onMyPendingWorksClick}
          theme={theme}
          onThemeToggle={onThemeToggle}
        />
      </div>
    </div>
  </motion.nav>
);

export default SiteNav;
