'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import WalletConnect from '@/components/WalletConnect';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { address, isConnected } = useAccount();
  const [authState, setAuthState] = useState<{
    isLoading: boolean;
    isAuthenticated: boolean;
    error?: string;
  }>({
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    setAuthState({
      isLoading: false,
      isAuthenticated: isConnected && !!address,
      error: !isConnected ? 'Please connect your MetaMask wallet' : undefined,
    });
  }, [isConnected, address]);

  if (authState.isLoading) {
    return (
      <div
        className="min-h-screen bg-brand-50 flex items-center justify-center"
        role="status"
        aria-label="Checking authentication"
        aria-live="polite"
      >
        <div className="text-center p-8">
          <h2 className="text-xl font-semibold text-slate-700 mb-4">
            Loading...
          </h2>
        </div>
      </div>
    );
  }

  if (!authState.isAuthenticated) {
    return (
      <div
        className="min-h-screen bg-brand-50 flex items-center justify-center"
        role="main"
        aria-labelledby="auth-required-title"
      >
        <div className="text-center p-8">
          <h2
            id="auth-required-title"
            className="text-xl sm:text-2xl md:text-3xl font-semibold text-slate-700 mb-6"
          >
            Wallet Not Connected
          </h2>
          <p
            className="mb-8 text-base sm:text-lg text-muted-foreground"
            role="alert"
            aria-live="assertive"
          >
            {authState.error ||
              'Please connect your MetaMask wallet to access this page.'}
          </p>
          <WalletConnect />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}