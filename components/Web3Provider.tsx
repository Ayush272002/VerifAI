'use client';

import { WagmiProvider, createConfig } from 'wagmi';
import { http } from 'viem';
import { sepolia } from 'wagmi/chains';
import { metaMask } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

const INFURA_PROJECT_ID = process.env.NEXT_PUBLIC_INFURA_PROJECT_ID?.trim();
const RPC_URL = INFURA_PROJECT_ID
  ? `https://sepolia.infura.io/v3/${INFURA_PROJECT_ID}`
  : 'https://sepolia.drpc.org';

const config = createConfig({
  chains: [sepolia],
  connectors: [metaMask()],
  transports: {
    [sepolia.id]: http(RPC_URL),
  },
});

export default function Web3Provider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}