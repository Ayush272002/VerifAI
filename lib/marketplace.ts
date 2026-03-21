import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import ABI from "../ABI.json";
import { parseEther } from "viem";

const CONTRACT_ADDRESS = process.env
  .NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

// 1. Get all known provider addresses (Global Search)
export function useAllProviders() {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: "getAllProviders",
  });
}

// 1.5 Get all actively listed services across the whole marketplace
export function useAllActiveServices() {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: "getAllActiveServices",
  });
}

// 2. Get all services for a specific provider
export function useProviderServices(
  providerAddress: `0x${string}` | undefined,
) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: "getServices",
    args: providerAddress ? [providerAddress] : undefined,
    query: {
      enabled: !!providerAddress,
    },
  });
}

// 3. Get details of a specific request
export function useRequestDetails(requestId: `0x${string}` | undefined) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: "requests",
    args: requestId ? [requestId] : undefined,
    query: {
      enabled: !!requestId,
    },
  });
}

// 4. Get messages for a specific request
export function useRequestMessages(requestId: `0x${string}` | undefined) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: "getMessages",
    args: requestId ? [requestId] : undefined,
    query: {
      enabled: !!requestId,
    },
  });
}

// Helper to bundle write + wait
function useMarketplaceWrite() {
  const {
    writeContractAsync,
    data: hash,
    isPending: isWriting,
    error: writeError,
  } = useWriteContract();

  const {
    isLoading: isWaiting,
    isSuccess,
    error: waitError,
    data: receipt,
  } = useWaitForTransactionReceipt({
    hash,
  });

  return {
    writeContractAsync,
    hash,
    isPending: isWriting || isWaiting, // true while signing OR waiting for block
    isSuccess,
    receipt,
    error: writeError || waitError,
  };
}

// A: List a new service
export function useAddService() {
  const mutation = useMarketplaceWrite();

  const addService = async (
    title: string,
    description: string,
    priceInEth: string,
  ) => {
    return mutation.writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: "addService",
      args: [title, description, parseEther(priceInEth)],
    });
  };

  return { ...mutation, addService };
}

// B: Request a service (Locks funds)
export function useRequestService() {
  const mutation = useMarketplaceWrite();

  const requestService = async (
    provider: `0x${string}`,
    serviceIndex: bigint,
    clientNote: string,
    priceInEth: string,
  ) => {
    return mutation.writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: "requestService",
      args: [provider, serviceIndex, clientNote],
      value: parseEther(priceInEth), // SEND ETH
    });
  };

  return { ...mutation, requestService };
}

// A: Accept a request
export function useAcceptRequest() {
  const mutation = useMarketplaceWrite();

  const acceptRequest = async (requestId: `0x${string}`) => {
    return mutation.writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: "acceptRequest",
      args: [requestId],
    });
  };

  return { ...mutation, acceptRequest };
}

// A: Reject a request (refunds B)
export function useRejectRequest() {
  const mutation = useMarketplaceWrite();

  const rejectRequest = async (requestId: `0x${string}`) => {
    return mutation.writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: "rejectRequest",
      args: [requestId],
    });
  };

  return { ...mutation, rejectRequest };
}

// A: Complete a request (Uploads proof CID)
export function useCompleteRequest() {
  const mutation = useMarketplaceWrite();

  const completeRequest = async (
    requestId: `0x${string}`,
    proofCid: string,
  ) => {
    return mutation.writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: "completeRequest",
      args: [requestId, proofCid],
    });
  };

  return { ...mutation, completeRequest };
}

// A or B: Post a message on-chain
export function usePostMessage() {
  const mutation = useMarketplaceWrite();

  const postMessage = async (requestId: `0x${string}`, text: string) => {
    return mutation.writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: "postMessage",
      args: [requestId, text],
    });
  };

  return { ...mutation, postMessage };
}

// Get all requests where a user is the client
export function useGetClientRequests(clientAddress: `0x${string}` | undefined) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: "getClientRequests",
    args: clientAddress ? [clientAddress] : undefined,
    query: {
      enabled: !!clientAddress,
    },
  });
}

// Get all requests where a user is the provider
export function useGetProviderRequests(
  providerAddress: `0x${string}` | undefined,
) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: "getProviderRequests",
    args: providerAddress ? [providerAddress] : undefined,
    query: {
      enabled: !!providerAddress,
    },
  });
}

// Get pending requests for a user (either as client or provider)
export function useGetPendingRequests(
  userAddress: `0x${string}` | undefined,
  asClient: boolean = true,
) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: "getPendingRequests",
    args: userAddress ? [userAddress, asClient] : undefined,
    query: {
      enabled: !!userAddress,
    },
  });
}
