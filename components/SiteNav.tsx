/**
 * @fileoverview Shared site navigation bar used across all pages.
 * Handles wallet connection, theme toggling, and modal triggers.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
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
}: SiteNavProps): React.JSX.Element => {
  const pathname = usePathname();
  const isBrowsePage = pathname === '/browse' || pathname === '/search';

  return (
  <motion.nav
    className="fixed top-0 left-0 right-0 z-50 bg-white/60 dark:bg-[#0a0a0a]/60 backdrop-blur-2xl border-b border-black/5 dark:border-white/5 shadow-sm"
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
        <Link
          href="/browse"
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            isBrowsePage
              ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
              : 'text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          Browse
        </Link>

        {mounted && isConnected && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={SPRING}
            onClick={onPublishClick}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-black dark:bg-white text-white dark:text-black hover:bg-black/90 dark:hover:bg-white/90 transition-all"
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
};

export default SiteNav;
