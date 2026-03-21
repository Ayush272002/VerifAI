'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi';
import { formatUnits } from 'viem';
import { motion } from 'framer-motion';
import {
  Wallet,
  LogOut,
  ChevronDown,
  ExternalLink,
  Copy,
  Check,
  Package,
  Sun,
  Moon,
  Briefcase,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { EthIcon } from '@/components/EthIcon';

interface WalletConnectProps {
  onMyServicesClick?: () => void;
  onMyPendingWorksClick?: () => void;
  theme?: string;
  onThemeToggle?: () => void;
}

export default function WalletConnect({ onMyServicesClick, onMyPendingWorksClick, theme, onThemeToggle }: WalletConnectProps) {
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const [copied, setCopied] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: balance } = useBalance({
    address,
    chainId: 11155111,
  });

  const balanceRes = useBalance({
    address,
    chainId: 11155111,
  });

  // useEffect(() => {
  //   console.log(JSON.stringify(balanceRes));
  // }, [balanceRes]);

  // useEffect(() => {
  //   if (address) {
  //     console.log('Address:', address);
  //     console.log('Balance:', balance);
  //   }
  // }, [address, balance]);

  // @ts-ignore
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openExplorer = () => {
    if (address) {
      // explorer URL for Sepolia
      window.open(`https://sepolia.etherscan.io/address/${address}`, '_blank');
    }
  };

  // @ts-ignore
  const handleConnectClick = (connector) => {
    connect({ connector });
    setIsWalletModalOpen(false);
  };

  // @ts-ignore
  const getWalletIcon = (name) => {
    switch (name.toLowerCase()) {
      case 'metamask':
        return (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M21.3622 2L13.0252 8.3219L14.4534 4.9252L21.3622 2Z"
              fill="#E17726"
              stroke="#E17726"
              strokeWidth="0.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2.63782 2L10.9044 8.3899L9.54662 4.9252L2.63782 2Z"
              fill="#E27625"
              stroke="#E27625"
              strokeWidth="0.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M18.4386 16.9132L16.2679 20.4378L20.8179 21.7977L22.1252 17.0078L18.4386 16.9132Z"
              fill="#E27625"
              stroke="#E27625"
              strokeWidth="0.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M1.88477 17.0078L3.18242 21.7977L7.73242 20.4378L5.56174 16.9132L1.88477 17.0078Z"
              fill="#E27625"
              stroke="#E27625"
              strokeWidth="0.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M7.46445 11.1065L6.25195 13.1931L10.7493 13.4164L10.5767 8.49609L7.46445 11.1065Z"
              fill="#E27625"
              stroke="#E27625"
              strokeWidth="0.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M16.5355 11.1064L13.3707 8.42773L13.2507 13.4163L17.748 13.193L16.5355 11.1064Z"
              fill="#E27625"
              stroke="#E27625"
              strokeWidth="0.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M7.73242 20.4378L10.4571 19.0023L8.09992 17.0418L7.73242 20.4378Z"
              fill="#E27625"
              stroke="#E27625"
              strokeWidth="0.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M13.543 19.0023L16.2677 20.4378L15.9002 17.0418L13.543 19.0023Z"
              fill="#E27625"
              stroke="#E27625"
              strokeWidth="0.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      case 'coinbase wallet':
        return (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="12" cy="12" r="10" fill="#0052FF" />
            <path
              d="M12 6C8.7 6 6 8.7 6 12C6 15.3 8.7 18 12 18C15.3 18 18 15.3 18 12C18 8.7 15.3 6 12 6ZM14.8 14.8H9.2V9.2H14.8V14.8Z"
              fill="white"
            />
          </svg>
        );
      case 'walletconnect':
        return (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6.342 9.792C9.3 6.834 14.1 6.834 17.058 9.792L17.418 10.152C17.598 10.332 17.598 10.62 17.418 10.8L16.278 11.94C16.188 12.03 16.044 12.03 15.954 11.94L15.474 11.46C13.446 9.432 9.954 9.432 7.926 11.46L7.41 11.976C7.32 12.066 7.176 12.066 7.086 11.976L5.946 10.836C5.766 10.656 5.766 10.368 5.946 10.188L6.342 9.792ZM19.086 11.82L20.094 12.828C20.274 13.008 20.274 13.296 20.094 13.476L15.474 18.096C15.294 18.276 15.006 18.276 14.826 18.096L11.574 14.844C11.529 14.799 11.457 14.799 11.412 14.844L8.16 18.096C7.98 18.276 7.692 18.276 7.512 18.096L2.892 13.476C2.712 13.296 2.712 13.008 2.892 12.828L3.9 11.82C4.08 11.64 4.368 11.64 4.548 11.82L7.8 15.072C7.845 15.117 7.917 15.117 7.962 15.072L11.214 11.82C11.394 11.64 11.682 11.64 11.862 11.82L15.114 15.072C15.159 15.117 15.231 15.117 15.276 15.072L18.528 11.82C18.708 11.64 18.996 11.64 19.176 11.82H19.086Z"
              fill="#3B99FC"
            />
          </svg>
        );
      default:
        return <Wallet className="h-5 w-5" />;
    }
  };

  if (!mounted) {
    return (
      <div className="glass-macos glass-macos-hover font-medium rounded-full px-4 py-2.5 transition-all w-[200px] h-[42px]" />
    );
  }

  return (
    <div>
      {isConnected && address ? (
        <DropdownMenu>
          <DropdownMenuTrigger className="glass-macos glass-macos-hover font-medium rounded-full px-4 py-2.5 transition-all border-0 outline-none" suppressHydrationWarning>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></div>
              <span className="text-black dark:text-white font-semibold text-sm">
                {formatAddress(address)}
              </span>
              <ChevronDown className="h-4 w-4 text-black dark:text-white" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 glass-macos rounded-2xl shadow-2xl border-0 backdrop-blur-3xl">
            <div className="px-2 py-1.5 text-xs text-cyan-600 dark:text-cyan-400 font-bold">
              Connected Wallet
            </div>
            <DropdownMenuSeparator className="bg-black/10 dark:bg-white/10" />
            <div className="px-2 py-2">
              <p className="text-sm font-semibold text-black dark:text-white mb-1">Balance</p>
              <div className="flex items-center gap-2">
                <EthIcon className="w-5 h-5" />
                <p className="text-lg font-mono font-bold text-cyan-600 dark:text-cyan-400">
                  {balance
                    ? Number.parseFloat(formatUnits(balance.value, balance.decimals)).toFixed(4)
                    : '0.0000'}{' '}
                  {balance?.symbol}
                </p>
              </div>
            </div>
            <DropdownMenuSeparator className="bg-black/10 dark:bg-white/10" />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuItem
                    className="cursor-pointer flex items-center text-black dark:text-white focus:text-black dark:focus:text-white hover:text-black dark:hover:text-white focus:bg-black/5 dark:focus:bg-white/5 hover:bg-black/5 dark:hover:bg-white/5 font-medium"
                    onClick={copyAddress}
                  >
                    {copied ? (
                      <Check className="mr-2 h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                    ) : (
                      <Copy className="mr-2 h-4 w-4" />
                    )}
                    {copied ? 'Copied!' : 'Copy Address'}
                  </DropdownMenuItem>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{address}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DropdownMenuItem
              className="cursor-pointer flex items-center text-black dark:text-white focus:text-black dark:focus:text-white hover:text-black dark:hover:text-white focus:bg-black/5 dark:focus:bg-white/5 hover:bg-black/5 dark:hover:bg-white/5 font-medium"
              onClick={openExplorer}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View on Explorer
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-black/10 dark:bg-white/10" />
            <DropdownMenuItem
              className="cursor-pointer flex items-center text-black dark:text-white focus:text-black dark:focus:text-white hover:text-black dark:hover:text-white focus:bg-black/5 dark:focus:bg-white/5 hover:bg-black/5 dark:hover:bg-white/5 font-medium"
              onClick={onMyServicesClick}
            >
              <Package className="mr-2 h-4 w-4" />
              My Services
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer flex items-center text-black dark:text-white focus:text-black dark:focus:text-white hover:text-black dark:hover:text-white focus:bg-black/5 dark:focus:bg-white/5 hover:bg-black/5 dark:hover:bg-white/5 font-medium"
              onClick={onMyPendingWorksClick}
            >
              <Briefcase className="mr-2 h-4 w-4" />
              My Pending Works
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-black/10 dark:bg-white/10" />
            {onThemeToggle && (
              <>
                <DropdownMenuItem
                  className="cursor-pointer flex items-center justify-between text-black dark:text-white focus:text-black dark:focus:text-white hover:text-black dark:hover:text-white focus:bg-black/5 dark:focus:bg-white/5 hover:bg-black/5 dark:hover:bg-white/5 font-medium"
                  onSelect={(e) => {
                    e.preventDefault();
                    onThemeToggle();
                  }}
                >
                  <div className="flex items-center">
                    {theme === 'dark' ? (
                      <Moon className="mr-4 h-4 w-4" />
                    ) : (
                      <Sun className="mr-4 h-4 w-4" />
                    )}
                    <span>Theme</span>
                  </div>
                  <button
                    className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none"
                    style={{
                      background: 'rgba(6, 182, 212, 0.2)',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <span
                      className="inline-block h-4 w-4 transform rounded-full transition-transform"
                      style={{
                        background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                        transform: theme === 'dark' ? 'translateX(18px)' : 'translateX(2px)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      }}
                    />
                  </button>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem
              className="cursor-pointer flex items-center text-rose-600 dark:text-rose-400 focus:text-rose-700 dark:focus:text-rose-300 hover:text-rose-700 dark:hover:text-rose-300 focus:bg-rose-500/10 hover:bg-rose-500/10 font-medium"
              onClick={() => disconnect()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Disconnect
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <button
              onClick={() => setIsWalletModalOpen(true)}
              className="relative group flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-all overflow-hidden"
              style={{
                background: 'rgba(249, 115, 22, 0.15)',
                backdropFilter: 'blur(40px)',
                WebkitBackdropFilter: 'blur(40px)',
                border: '1px solid rgba(249, 115, 22, 0.3)',
                color: '#f97316',
                boxShadow: '0 4px 20px rgba(249, 115, 22, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
              }}
            >
              {/* Animated gradient background on hover */}
              <div className="absolute inset-0 bg-linear-to-r from-orange-400/20 to-amber-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

              {/* Pulse animation */}
              <div className="absolute inset-0 rounded-full bg-orange-400/30 animate-pulse opacity-50"></div>

              <Wallet className="h-4 w-4 relative z-10" />
              <span className="relative z-10">Connect Wallet</span>
            </button>
          </motion.div>

          <Dialog open={isWalletModalOpen} onOpenChange={setIsWalletModalOpen}>
            <DialogContent className="glass-macos sm:max-w-md shadow-2xl rounded-3xl border-0">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-center text-black dark:text-white">
                  Connect Wallet
                </DialogTitle>
                <DialogDescription className="text-black/60 dark:text-white/60 text-center">
                  Choose your preferred wallet to connect to Sepolia Testnet
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 gap-4 py-4">
                {connectors.map((connector) => (
                  <button
                    key={connector.uid}
                    className="glass-macos glass-macos-hover flex items-center justify-start gap-3 p-4 text-left rounded-xl w-full"
                    onClick={() => handleConnectClick(connector)}
                  >
                    <div className="shrink-0">
                      {getWalletIcon(connector.name)}
                    </div>
                    <div>
                      <div className="font-medium text-black dark:text-white">
                        {connector.name}
                      </div>
                      <div className="text-xs text-black/60 dark:text-white/60">
                        Connect using {connector.name}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="text-xs text-black/60 dark:text-white/60 text-center px-4">
                By connecting your wallet, you agree to our{' '}
                <span className="underline cursor-pointer hover:text-black dark:hover:text-white">
                  Terms of Service
                </span>{' '}
                and{' '}
                <span className="underline cursor-pointer hover:text-black dark:hover:text-white">
                  Privacy Policy
                </span>
                .
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}