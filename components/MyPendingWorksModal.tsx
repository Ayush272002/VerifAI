"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  MessageCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Users,
  ShoppingBag,
  Briefcase,
} from "lucide-react";
import { EthIcon } from "@/components/EthIcon";
import { useAccount } from "wagmi";
import {
  useGetActiveRequests,
  useGetClientRequests,
  useGetProviderRequests,
  useRequestMessages,
  useAcceptRequest,
  useRejectRequest,
  usePostMessage,
} from "@/lib/marketplace";
import { formatEther, createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import { toast } from "sonner";
import ABI from "../ABI.json";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { CompleteWorkModal } from "@/components/CompleteWorkModal";

// --- Verification Types ---
type RequirementCheck = {
  requirement: string;
  checked: boolean;
  evidence: string;
};

type VerificationResult = {
  modality: string;
  overall_status: string;
  completion_pct: number;
  confidence_pct: number;
  summary: string;
  requirement_checks: RequirementCheck[];
  totals: {
    completed: number;
    total: number;
  };
};

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

const CONTRACT_ADDRESS = process.env
  .NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(),
});

interface PendingWork {
  id: string;
  serviceTitle: string;
  otherParty: string;
  amount: number;
  status: "pending" | "in_progress" | "pending_review" | "completed";
  role: "client" | "provider";
  clientAddress: string;
  providerAddress: string;
  deadline: string;
  taskDetails: string;
  createdAt: string;
  completionProofCid?: string;
  messages: {
    sender: "me" | "them";
    text: string;
    timestamp: string;
  }[];
}

interface MyPendingWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SPRING = {
  type: "spring",
  damping: 20,
  stiffness: 100,
} as const;

export function MyPendingWorksModal({
  isOpen,
  onClose,
}: MyPendingWorksModalProps) {
  const [activeTab, setActiveTab] = useState<
    "all" | "client" | "provider" | "completed" | "history"
  >("provider");
  const [selectedWork, setSelectedWork] = useState<PendingWork | null>(null);
  const [selectedHistoryGroup, setSelectedHistoryGroup] = useState<
    string | null
  >(null);
  const [messageInput, setMessageInput] = useState("");
  const [mounted, setMounted] = useState(false);
  const [works, setWorks] = useState<PendingWork[]>([]);
  const [loading, setLoading] = useState(false);

  const { address } = useAccount();
  const { data: providerPendingIds } = useGetActiveRequests(
    address as `0x${string}`,
    false,
  );
  const { data: clientPendingIds } = useGetActiveRequests(
    address as `0x${string}`,
    true,
  );
  // All requests (including resolved) for the Completed tab
  const { data: allClientIds } = useGetClientRequests(address as `0x${string}`);
  const { data: allProviderIds } = useGetProviderRequests(
    address as `0x${string}`,
  );
  const { acceptRequest, isPending: isAccepting } = useAcceptRequest();
  const { rejectRequest, isPending: isRejecting } = useRejectRequest();
  const { postMessage, isPending: isSendingMessage } = usePostMessage();
  const [isCompleting, setIsCompleting] = useState(false);
  const [isConfirmingAccept, setIsConfirmingAccept] = useState(false);
  const [isConfirmingReject, setIsConfirmingReject] = useState(false);
  const [showCompleteWorkModal, setShowCompleteWorkModal] = useState(false);
  const [completedVerification, setCompletedVerification] = useState<{
    result: VerificationResult;
    proofCid: string;
    txHash?: string;
  } | null>(null);

  // Fetch messages for the selected work
  const { data: messagesData } = useRequestMessages(
    selectedWork?.id as `0x${string}` | undefined,
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // Debug: Log pending request IDs
  useEffect(() => {
    console.log("Provider pending IDs:", providerPendingIds);
    console.log("Client pending IDs:", clientPendingIds);
    console.log("Current address:", address);
  }, [providerPendingIds, clientPendingIds, address]);

  // Transform fetched messages to UI format
  useEffect(() => {
    if (!selectedWork || !messagesData) return;

    const formattedMessages = (messagesData as any[]).map((msg: any) => ({
      sender:
        msg.sender.toLowerCase() === address?.toLowerCase()
          ? ("me" as const)
          : ("them" as const),
      text: msg.text,
      timestamp: new Date(parseInt(msg.timestamp) * 1000).toLocaleTimeString(),
    }));

    setSelectedWork((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        messages: formattedMessages,
      };
    });
  }, [messagesData, selectedWork?.id, address]);

  // Fetch pending requests data
  useEffect(() => {
    const fetchPendingWorks = async () => {
      if (!address) {
        console.log("No address, skipping fetch");
        return;
      }

      console.log("Fetching pending works for address:", address);
      console.log("Provider pending IDs:", providerPendingIds);
      console.log("Client pending IDs:", clientPendingIds);

      setLoading(true);
      try {
        const allWorks: PendingWork[] = [];

        // Fetch provider pending requests
        if (
          providerPendingIds &&
          Array.isArray(providerPendingIds) &&
          providerPendingIds.length > 0
        ) {
          console.log(
            "Fetching",
            providerPendingIds.length,
            "provider requests",
          );
          for (const requestId of providerPendingIds as string[]) {
            try {
              console.log("Fetching provider request data for:", requestId);

              // Fetch actual request details from contract
              const requestDataArray = (await publicClient.readContract({
                address: CONTRACT_ADDRESS,
                abi: ABI,
                functionName: "requests",
                args: [requestId],
              })) as any[];

              console.log("Provider request data received:", requestDataArray);

              // Handle both array and object formats for `requests`
              if (requestDataArray) {
                const client =
                  (requestDataArray as any).client ?? requestDataArray[0] ?? "";
                const provider =
                  (requestDataArray as any).provider ??
                  requestDataArray[1] ??
                  "";
                const serviceIndex =
                  (requestDataArray as any).serviceIndex ??
                  requestDataArray[2] ??
                  BigInt(0);
                const escrowAmount =
                  (requestDataArray as any).escrowAmount ??
                  requestDataArray[4] ??
                  BigInt(0);
                const clientNote =
                  (requestDataArray as any).clientNote ??
                  requestDataArray[3] ??
                  "";
                const contractStatus =
                  (requestDataArray as any).status ?? requestDataArray[5] ?? 0;
                const completionProofCid =
                  (requestDataArray as any).completionProofCid ??
                  requestDataArray[6] ??
                  "";

                // Fetch the service title using provider and serviceIndex
                let serviceTitle = "Service Request";
                try {
                  const serviceData = (await publicClient.readContract({
                    address: CONTRACT_ADDRESS,
                    abi: ABI,
                    functionName: "providerServices",
                    args: [provider as `0x${string}`, serviceIndex],
                  })) as any;

                  // Handle both array and object formats
                  if (serviceData?.title) {
                    serviceTitle = serviceData.title;
                  } else if (Array.isArray(serviceData)) {
                    serviceTitle = serviceData[0] || "Service Request";
                  }
                } catch (e) {
                  console.warn("Failed to fetch service title:", e);
                }

                // Map contract status to UI status: 0=Pending, 1=Accepted, 3=PendingReview, 4=Resolved
                let uiStatus:
                  | "pending"
                  | "in_progress"
                  | "pending_review"
                  | "completed" = "pending";
                if (contractStatus === 1) {
                  uiStatus = "in_progress";
                } else if (contractStatus === 3) {
                  uiStatus = "pending_review";
                } else if (contractStatus === 4) {
                  uiStatus = "completed";
                } else if (contractStatus === 2) {
                  return; // Skip rejected requests
                }

                const escrowAmountEth = formatEther(escrowAmount);
                const clientAddr = client || "Unknown";

                allWorks.push({
                  id: requestId,
                  clientAddress: client,
                  providerAddress: provider,
                  serviceTitle: serviceTitle || "Service Request",
                  otherParty:
                    clientAddr.substring(0, 6) +
                    "..." +
                    clientAddr.substring(clientAddr.length - 4),
                  amount: parseFloat(escrowAmountEth),
                  status: uiStatus,
                  role: "provider",
                  deadline: "7 days",
                  taskDetails: clientNote || "Service request",
                  createdAt: "Recently",
                  completionProofCid,
                  messages: [],
                });
              } else {
                console.warn(
                  "Invalid request data for provider request:",
                  requestId,
                  "received:",
                  requestDataArray,
                );
              }
            } catch (e) {
              console.error("Error fetching provider request:", requestId, e);
            }
          }
        }

        // Fetch client pending requests
        if (
          clientPendingIds &&
          Array.isArray(clientPendingIds) &&
          clientPendingIds.length > 0
        ) {
          console.log("Fetching", clientPendingIds.length, "client requests");
          for (const requestId of clientPendingIds as string[]) {
            try {
              console.log("Fetching client request data for:", requestId);

              // Fetch actual request details from contract
              const requestDataArray = (await publicClient.readContract({
                address: CONTRACT_ADDRESS,
                abi: ABI,
                functionName: "requests",
                args: [requestId],
              })) as any[];

              console.log("Client request data received:", requestDataArray);

              // Handle both array and object formats for `requests`
              if (requestDataArray) {
                const client =
                  (requestDataArray as any).client ?? requestDataArray[0] ?? "";
                const provider =
                  (requestDataArray as any).provider ??
                  requestDataArray[1] ??
                  "";
                const serviceIndex =
                  (requestDataArray as any).serviceIndex ??
                  requestDataArray[2] ??
                  BigInt(0);
                const escrowAmount =
                  (requestDataArray as any).escrowAmount ??
                  requestDataArray[4] ??
                  BigInt(0);
                const clientNote =
                  (requestDataArray as any).clientNote ??
                  requestDataArray[3] ??
                  "";
                const contractStatus =
                  (requestDataArray as any).status ?? requestDataArray[5] ?? 0;
                const completionProofCid =
                  (requestDataArray as any).completionProofCid ??
                  requestDataArray[6] ??
                  "";

                // Fetch the service title using provider and serviceIndex
                let serviceTitle = "My Service Request";
                try {
                  const serviceData = (await publicClient.readContract({
                    address: CONTRACT_ADDRESS,
                    abi: ABI,
                    functionName: "providerServices",
                    args: [provider as `0x${string}`, serviceIndex],
                  })) as any;

                  // Handle both array and object formats
                  if (serviceData?.title) {
                    serviceTitle = serviceData.title;
                  } else if (Array.isArray(serviceData)) {
                    serviceTitle = serviceData[0] || "My Service Request";
                  }
                } catch (e) {
                  console.warn("Failed to fetch service title:", e);
                }

                // Map contract status to UI status: 0=Pending, 1=Accepted, 3=PendingReview, 4=Resolved
                let uiStatus:
                  | "pending"
                  | "in_progress"
                  | "pending_review"
                  | "completed" = "pending";
                if (contractStatus === 1) {
                  uiStatus = "in_progress";
                } else if (contractStatus === 3) {
                  uiStatus = "pending_review";
                } else if (contractStatus === 4) {
                  uiStatus = "completed";
                } else if (contractStatus === 2) {
                  return; // Skip rejected requests
                }

                const escrowAmountEth = formatEther(escrowAmount);
                const providerAddr = provider || "Unknown";

                allWorks.push({
                  id: requestId,
                  clientAddress: client,
                  providerAddress: provider,
                  serviceTitle: serviceTitle || "My Service Request",
                  otherParty:
                    providerAddr.substring(0, 6) +
                    "..." +
                    providerAddr.substring(providerAddr.length - 4),
                  amount: parseFloat(escrowAmountEth),
                  status: uiStatus,
                  role: "client",
                  deadline: "7 days",
                  taskDetails: clientNote || "Service request",
                  createdAt: "Recently",
                  completionProofCid,
                  messages: [],
                });
              } else {
                console.warn(
                  "Invalid request data for client request:",
                  requestId,
                  "received:",
                  requestDataArray,
                );
              }
            } catch (e) {
              console.error("Error fetching client request:", requestId, e);
            }
          }
        }

        // Fetch resolved requests (in allXxxIds but not in active xxxPendingIds)
        const activeProviderSet = new Set(
          (providerPendingIds as string[] | undefined)?.map((id) =>
            id.toString().toLowerCase(),
          ) ?? [],
        );
        const activeClientSet = new Set(
          (clientPendingIds as string[] | undefined)?.map((id) =>
            id.toString().toLowerCase(),
          ) ?? [],
        );

        const resolvedProviderIds = (
          (allProviderIds as string[] | undefined) ?? []
        ).filter((id) => !activeProviderSet.has(id.toString().toLowerCase()));
        const resolvedClientIds = (
          (allClientIds as string[] | undefined) ?? []
        ).filter((id) => !activeClientSet.has(id.toString().toLowerCase()));

        // Fetch resolved provider requests
        for (const requestId of resolvedProviderIds) {
          try {
            const requestDataArray = (await publicClient.readContract({
              address: CONTRACT_ADDRESS,
              abi: ABI,
              functionName: "requests",
              args: [requestId],
            })) as any[];

            if (requestDataArray) {
              const client =
                (requestDataArray as any).client ?? requestDataArray[0] ?? "";
              const provider =
                (requestDataArray as any).provider ?? requestDataArray[1] ?? "";
              const serviceIndex =
                (requestDataArray as any).serviceIndex ??
                requestDataArray[2] ??
                BigInt(0);
              const escrowAmount =
                (requestDataArray as any).escrowAmount ??
                requestDataArray[4] ??
                BigInt(0);
              const clientNote =
                (requestDataArray as any).clientNote ??
                requestDataArray[3] ??
                "";
              const contractStatus =
                (requestDataArray as any).status ?? requestDataArray[5] ?? 0;
              const completionProofCid =
                (requestDataArray as any).completionProofCid ??
                requestDataArray[6] ??
                "";

              // Only include resolved (status 4)
              if (contractStatus !== 4) continue;

              let serviceTitle = "Service Request";
              try {
                const serviceData = (await publicClient.readContract({
                  address: CONTRACT_ADDRESS,
                  abi: ABI,
                  functionName: "providerServices",
                  args: [provider as `0x${string}`, serviceIndex],
                })) as any;
                if (serviceData?.title) serviceTitle = serviceData.title;
                else if (Array.isArray(serviceData))
                  serviceTitle = serviceData[0] || "Service Request";
              } catch (e) {
                console.warn("Failed to fetch service title:", e);
              }

              const escrowAmountEth = formatEther(escrowAmount);
              const clientAddr = client || "Unknown";

              allWorks.push({
                id: requestId,
                clientAddress: client,
                providerAddress: provider,
                serviceTitle: serviceTitle || "Service Request",
                otherParty:
                  clientAddr.substring(0, 6) +
                  "..." +
                  clientAddr.substring(clientAddr.length - 4),
                amount: parseFloat(escrowAmountEth),
                status: "completed",
                role: "provider",
                deadline: "Completed",
                taskDetails: clientNote || "Service request",
                createdAt: "Previously",
                completionProofCid,
                messages: [],
              });
            }
          } catch (e) {
            console.error(
              "Error fetching resolved provider request:",
              requestId,
              e,
            );
          }
        }

        // Fetch resolved client requests
        for (const requestId of resolvedClientIds) {
          try {
            const requestDataArray = (await publicClient.readContract({
              address: CONTRACT_ADDRESS,
              abi: ABI,
              functionName: "requests",
              args: [requestId],
            })) as any[];

            if (requestDataArray) {
              const client =
                (requestDataArray as any).client ?? requestDataArray[0] ?? "";
              const provider =
                (requestDataArray as any).provider ?? requestDataArray[1] ?? "";
              const serviceIndex =
                (requestDataArray as any).serviceIndex ??
                requestDataArray[2] ??
                BigInt(0);
              const escrowAmount =
                (requestDataArray as any).escrowAmount ??
                requestDataArray[4] ??
                BigInt(0);
              const clientNote =
                (requestDataArray as any).clientNote ??
                requestDataArray[3] ??
                "";
              const contractStatus =
                (requestDataArray as any).status ?? requestDataArray[5] ?? 0;
              const completionProofCid =
                (requestDataArray as any).completionProofCid ??
                requestDataArray[6] ??
                "";

              if (contractStatus !== 4) continue;

              let serviceTitle = "My Service Request";
              try {
                const serviceData = (await publicClient.readContract({
                  address: CONTRACT_ADDRESS,
                  abi: ABI,
                  functionName: "providerServices",
                  args: [provider as `0x${string}`, serviceIndex],
                })) as any;
                if (serviceData?.title) serviceTitle = serviceData.title;
                else if (Array.isArray(serviceData))
                  serviceTitle = serviceData[0] || "My Service Request";
              } catch (e) {
                console.warn("Failed to fetch service title:", e);
              }

              const escrowAmountEth = formatEther(escrowAmount);
              const providerAddr = provider || "Unknown";

              // Check if already added as provider (avoid duplicates)
              if (allWorks.some((w) => w.id === requestId)) continue;

              allWorks.push({
                id: requestId,
                clientAddress: client,
                providerAddress: provider,
                serviceTitle: serviceTitle || "My Service Request",
                otherParty:
                  providerAddr.substring(0, 6) +
                  "..." +
                  providerAddr.substring(providerAddr.length - 4),
                amount: parseFloat(escrowAmountEth),
                status: "completed",
                role: "client",
                deadline: "Completed",
                taskDetails: clientNote || "Service request",
                createdAt: "Previously",
                completionProofCid,
                messages: [],
              });
            }
          } catch (e) {
            console.error(
              "Error fetching resolved client request:",
              requestId,
              e,
            );
          }
        }

        console.log(
          "Total works fetched:",
          allWorks.length,
          "Works:",
          allWorks,
        );
        setWorks(allWorks);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchPendingWorks();
    }
  }, [
    address,
    providerPendingIds,
    clientPendingIds,
    allProviderIds,
    allClientIds,
    isOpen,
  ]);

  const filteredWorks = works.filter((work) => {
    if (activeTab === "all") return work.status !== "completed";
    if (activeTab === "completed") return work.status === "completed";
    if (activeTab === "history") return false; // history tab uses its own view
    return work.role === activeTab && work.status !== "completed";
  });

  // Aggregate completed works into history groups by counterparty
  const historyGroups = (() => {
    const completedWorks = works.filter((w) => w.status === "completed");

    // Group by role + counterparty address
    const groupMap = new Map<
      string,
      {
        address: string;
        displayAddress: string;
        role: "client" | "provider";
        totalAmount: number;
        transactionCount: number;
        services: string[];
        works: PendingWork[];
      }
    >();

    for (const w of completedWorks) {
      const counterparty =
        w.role === "client" ? w.providerAddress : w.clientAddress;
      const key = `${w.role}-${counterparty.toLowerCase()}`;

      if (!groupMap.has(key)) {
        const addr = counterparty || "Unknown";
        groupMap.set(key, {
          address: counterparty,
          displayAddress:
            addr.substring(0, 6) + "..." + addr.substring(addr.length - 4),
          role: w.role,
          totalAmount: 0,
          transactionCount: 0,
          services: [],
          works: [],
        });
      }

      const group = groupMap.get(key)!;
      group.totalAmount += w.amount;
      group.transactionCount += 1;
      if (!group.services.includes(w.serviceTitle)) {
        group.services.push(w.serviceTitle);
      }
      group.works.push(w);
    }

    return Array.from(groupMap.values());
  })();

  const clientHistory = historyGroups.filter((g) => g.role === "client");
  const providerHistory = historyGroups.filter((g) => g.role === "provider");
  const selectedGroup = historyGroups.find(
    (g) => `${g.role}-${g.address.toLowerCase()}` === selectedHistoryGroup,
  );

  const handleAccept = async (workId: string) => {
    try {
      const hash = await acceptRequest(workId as `0x${string}`);
      if (hash) {
        setIsConfirmingAccept(true);
        toast.info("Transaction submitted, waiting for confirmation...");
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status === "success") {
          toast.success("Request accepted!");
          if (selectedWork?.id === workId) {
            setSelectedWork({ ...selectedWork, status: "in_progress" });
          }
          setWorks((prev) =>
            prev.map((w) =>
              w.id === workId ? { ...w, status: "in_progress" } : w,
            ),
          );
        } else {
          toast.error("Transaction failed");
        }
      }
    } catch (err: any) {
      if (
        err?.message?.includes("User rejected the request") ||
        err?.code === 4001
      ) {
        toast.error("Transaction cancelled by user.");
      } else {
        console.error("Error accepting request:", err);
        toast.error("Failed to accept request");
      }
    } finally {
      setIsConfirmingAccept(false);
    }
  };

  const handleReject = async (workId: string) => {
    try {
      const hash = await rejectRequest(workId as `0x${string}`);
      if (hash) {
        setIsConfirmingReject(true);
        toast.info("Transaction submitted, waiting for confirmation...");
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status === "success") {
          toast.success("Request rejected and refunded");
          if (selectedWork?.id === workId) {
            setSelectedWork(null);
          }
          setWorks((prev) => prev.filter((w) => w.id !== workId));
        } else {
          toast.error("Transaction failed");
        }
      }
    } catch (err: any) {
      if (
        err?.message?.includes("User rejected the request") ||
        err?.code === 4001
      ) {
        toast.error("Transaction cancelled by user.");
      } else {
        console.error("Error rejecting request:", err);
        toast.error("Failed to reject request");
      }
    } finally {
      setIsConfirmingReject(false);
    }
  };

  const handleSendMessage = async (workId: string) => {
    if (!messageInput.trim() || !selectedWork) return;
    try {
      const hash = await postMessage(workId as `0x${string}`, messageInput);
      if (hash) {
        toast.info("Sending message...");
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status === "success") {
          toast.success("Message sent!");
          const newMessage = {
            sender: "me" as const,
            text: messageInput,
            timestamp: new Date().toLocaleTimeString(),
          };
          setMessageInput("");
          if (selectedWork?.id === workId) {
            setSelectedWork({
              ...selectedWork,
              messages: [...selectedWork.messages, newMessage],
            });
          }
          setWorks((prev) =>
            prev.map((w) =>
              w.id === workId
                ? { ...w, messages: [...w.messages, newMessage] }
                : w,
            ),
          );
        } else {
          toast.error("Transaction failed");
        }
      }
    } catch (err) {
      console.error("Error sending message:", err);
      toast.error("Failed to send message");
    }
  };

  const handleWorkComplete = async (
    report: VerificationResult,
    proofCid: string,
  ) => {
    if (!selectedWork) return;

    try {
      setIsCompleting(true);

      // Backend now owns complete+settle entirely via LangGraph workflow.
      setCompletedVerification({ result: report, proofCid });
      setSelectedWork({
        ...selectedWork,
        status: "completed" as any,
        completionProofCid: proofCid,
      });
      setWorks((prev) =>
        prev.map((w) =>
          w.id === selectedWork.id
            ? { ...w, status: "completed" as any, completionProofCid: proofCid }
            : w,
        ),
      );
      toast.success(
        "Verification complete. Settlement handled by backend oracle.",
      );
    } catch (err: any) {
      console.error("Complete flow error:", err);
      toast.error(
        "Failed to update completion state: " +
          (err.shortMessage || err.message || "Unknown error"),
      );
    } finally {
      setIsCompleting(false);
    }
  };

  // Recovery polling: when selecting a work item that's in_progress,
  // check if the backend has cached verification results (e.g. after page refresh)
  const [isRecovering, setIsRecovering] = useState(false);

  useEffect(() => {
    if (
      !selectedWork ||
      selectedWork.status !== "in_progress" ||
      selectedWork.role !== "provider"
    )
      return;
    if (completedVerification) return; // Already have results

    let cancelled = false;
    const checkCachedVerification = async () => {
      try {
        setIsRecovering(true);
        const res = await fetch(
          `${BACKEND_BASE_URL}/agent/verification-status/${selectedWork.id}`,
        );
        if (!res.ok) return;
        const data = await res.json();

        if (cancelled) return;

        if (data.status === "completed" && data.report && data.proof_cid) {
          setCompletedVerification({
            result: data.report,
            proofCid: data.proof_cid,
          });
          // Auto-trigger the complete flow
          toast.info(
            "Recovered verification results, triggering on-chain completion...",
          );
          handleWorkComplete(data.report, data.proof_cid);
        } else if (data.status === "in_progress") {
          toast.info("Verification still in progress on backend...");
          // Poll again after a delay
          const timer = setTimeout(() => {
            if (!cancelled) checkCachedVerification();
          }, 5000);
          return () => clearTimeout(timer);
        }
      } catch (e) {
        console.error("Failed to check verification status:", e);
      } finally {
        if (!cancelled) setIsRecovering(false);
      }
    };

    checkCachedVerification();
    return () => {
      cancelled = true;
    };
  }, [selectedWork?.id, selectedWork?.status, selectedWork?.role]);

  // Note: The old Lock Evidence and handleVerifySubmit flows have been removed.
  // Verification now happens through CompleteWorkModal and settlement is backend-owned.

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div key="modal-container">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-[100]"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={SPRING}
              className="glass-macos rounded-3xl w-full max-w-5xl max-h-[90vh] pointer-events-auto shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="relative p-6 border-b border-black/5 dark:border-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-serif font-bold text-black dark:text-white">
                      My Pending Works
                    </h2>
                    <p className="text-sm text-black/60 dark:text-white/60">
                      Manage your active projects and bookings
                    </p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    transition={SPRING}
                    onClick={onClose}
                    className="w-10 h-10 rounded-full glass-macos glass-macos-hover flex items-center justify-center text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mt-6">
                  {[
                    { id: "all", label: "All Projects" },
                    { id: "client", label: "As Client" },
                    { id: "provider", label: "As Provider" },
                    { id: "completed", label: "Completed" },
                    { id: "history", label: "History" },
                  ].map((tab) => (
                    <motion.button
                      key={tab.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveTab(tab.id as typeof activeTab)}
                      className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                        activeTab === tab.id
                          ? "glass-macos ring-2 ring-cyan-500/50 text-cyan-600 dark:text-cyan-400"
                          : "glass-macos text-black/60 dark:text-white/60"
                      }`}
                    >
                      {tab.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-hidden flex">
                {/* Works List / History List */}
                <div className="w-2/5 border-r border-black/5 dark:border-white/5 overflow-y-auto custom-scrollbar">
                  {activeTab === "history" ? (
                    /* --- History Left Panel --- */
                    <div className="p-4 space-y-4">
                      {loading ? (
                        <div className="space-y-3">
                          {[1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className="w-full glass-macos rounded-2xl p-4"
                            >
                              <Skeleton className="h-4 w-3/4 mb-2" />
                              <Skeleton className="h-3 w-1/2 mb-4" />
                              <Skeleton className="h-4 w-1/4" />
                            </div>
                          ))}
                        </div>
                      ) : historyGroups.length === 0 ? (
                        <div className="p-8 text-center">
                          <div className="text-6xl mb-4 opacity-20">📜</div>
                          <p className="text-black/60 dark:text-white/60 text-sm">
                            No completed activity yet
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Services Purchased (as Client) */}
                          {clientHistory.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-3 px-1">
                                <ShoppingBag className="w-3.5 h-3.5 text-cyan-500" />
                                <h4 className="text-xs font-bold uppercase tracking-wider text-black/50 dark:text-white/50">
                                  Services Purchased
                                </h4>
                              </div>
                              <div className="space-y-2">
                                {clientHistory.map((group) => {
                                  const key = `${group.role}-${group.address.toLowerCase()}`;
                                  return (
                                    <motion.button
                                      key={key}
                                      whileHover={{ scale: 1.01 }}
                                      whileTap={{ scale: 0.99 }}
                                      onClick={() => {
                                        setSelectedHistoryGroup(key);
                                        setSelectedWork(null);
                                      }}
                                      className={`w-full glass-macos rounded-2xl p-4 text-left transition-all ${
                                        selectedHistoryGroup === key
                                          ? "ring-2 ring-cyan-500/50"
                                          : ""
                                      }`}
                                    >
                                      <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                          <p className="text-xs text-black/50 dark:text-white/50 mb-1">
                                            Provider
                                          </p>
                                          <h3 className="font-bold text-black dark:text-white text-sm font-mono">
                                            {group.displayAddress}
                                          </h3>
                                        </div>
                                        <div className="px-2 py-1 rounded-lg text-xs font-bold bg-cyan-500/15 text-cyan-700 dark:text-cyan-400">
                                          {group.transactionCount} order
                                          {group.transactionCount !== 1
                                            ? "s"
                                            : ""}
                                        </div>
                                      </div>
                                      <div className="flex flex-wrap gap-1 mb-3">
                                        {group.services.slice(0, 3).map((s) => (
                                          <span
                                            key={s}
                                            className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/5 dark:bg-white/10 text-black/70 dark:text-white/70 truncate max-w-[140px]"
                                          >
                                            {s}
                                          </span>
                                        ))}
                                        {group.services.length > 3 && (
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/5 dark:bg-white/10 text-black/50 dark:text-white/50">
                                            +{group.services.length - 3} more
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1.5 pt-2 border-t border-black/5 dark:border-white/5">
                                        <EthIcon className="w-3.5 h-3.5" />
                                        <span className="text-sm font-bold text-black dark:text-white">
                                          {group.totalAmount.toFixed(4)}
                                        </span>
                                        <span className="text-[10px] text-black/50 dark:text-white/50 ml-1">
                                          total spent
                                        </span>
                                      </div>
                                    </motion.button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Clients Served (as Provider) */}
                          {providerHistory.length > 0 && (
                            <div>
                              <div className="flex items-center gap-2 mb-3 px-1">
                                <Briefcase className="w-3.5 h-3.5 text-purple-500" />
                                <h4 className="text-xs font-bold uppercase tracking-wider text-black/50 dark:text-white/50">
                                  Clients Served
                                </h4>
                              </div>
                              <div className="space-y-2">
                                {providerHistory.map((group) => {
                                  const key = `${group.role}-${group.address.toLowerCase()}`;
                                  return (
                                    <motion.button
                                      key={key}
                                      whileHover={{ scale: 1.01 }}
                                      whileTap={{ scale: 0.99 }}
                                      onClick={() => {
                                        setSelectedHistoryGroup(key);
                                        setSelectedWork(null);
                                      }}
                                      className={`w-full glass-macos rounded-2xl p-4 text-left transition-all ${
                                        selectedHistoryGroup === key
                                          ? "ring-2 ring-purple-500/50"
                                          : ""
                                      }`}
                                    >
                                      <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                          <p className="text-xs text-black/50 dark:text-white/50 mb-1">
                                            Client
                                          </p>
                                          <h3 className="font-bold text-black dark:text-white text-sm font-mono">
                                            {group.displayAddress}
                                          </h3>
                                        </div>
                                        <div className="px-2 py-1 rounded-lg text-xs font-bold bg-purple-500/15 text-purple-700 dark:text-purple-400">
                                          {group.transactionCount} gig
                                          {group.transactionCount !== 1
                                            ? "s"
                                            : ""}
                                        </div>
                                      </div>
                                      <div className="flex flex-wrap gap-1 mb-3">
                                        {group.services.slice(0, 3).map((s) => (
                                          <span
                                            key={s}
                                            className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/5 dark:bg-white/10 text-black/70 dark:text-white/70 truncate max-w-[140px]"
                                          >
                                            {s}
                                          </span>
                                        ))}
                                        {group.services.length > 3 && (
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/5 dark:bg-white/10 text-black/50 dark:text-white/50">
                                            +{group.services.length - 3} more
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1.5 pt-2 border-t border-black/5 dark:border-white/5">
                                        <EthIcon className="w-3.5 h-3.5" />
                                        <span className="text-sm font-bold text-black dark:text-white">
                                          {group.totalAmount.toFixed(4)}
                                        </span>
                                        <span className="text-[10px] text-black/50 dark:text-white/50 ml-1">
                                          total earned
                                        </span>
                                      </div>
                                    </motion.button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ) : loading ? (
                    <div className="p-4 space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="w-full glass-macos rounded-2xl p-4"
                        >
                          <Skeleton className="h-4 w-3/4 mb-2" />
                          <Skeleton className="h-3 w-1/2 mb-4" />
                          <div className="flex items-center justify-between pt-3 border-t border-black/5 dark:border-white/5">
                            <Skeleton className="h-4 w-1/4" />
                            <Skeleton className="h-3 w-1/5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : filteredWorks.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="text-6xl mb-4 opacity-20">📋</div>
                      <p className="text-black/60 dark:text-white/60 text-sm">
                        No pending works yet
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 space-y-3">
                      {filteredWorks.map((work) => (
                        <motion.button
                          key={work.id}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => setSelectedWork(work)}
                          className={`w-full glass-macos rounded-2xl p-4 text-left transition-all ${
                            selectedWork?.id === work.id
                              ? "ring-2 ring-cyan-500/50"
                              : ""
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h3 className="font-bold text-black dark:text-white text-sm mb-1">
                                {work.serviceTitle}
                              </h3>
                              <p className="text-xs text-black/60 dark:text-white/60">
                                {work.role === "client" ? "Provider" : "Client"}
                                : {work.otherParty}
                              </p>
                            </div>
                            <div
                              className={`px-2 py-1 rounded-lg text-xs font-bold ${
                                work.status === "pending"
                                  ? "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                                  : work.status === "in_progress"
                                    ? "bg-cyan-500/20 text-cyan-700 dark:text-cyan-400"
                                    : work.status === "pending_review"
                                      ? "bg-purple-500/20 text-purple-700 dark:text-purple-400"
                                      : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                              }`}
                            >
                              {work.status === "completed"
                                ? "resolved"
                                : work.status.replace("_", " ")}
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/5 dark:border-white/5">
                            <div className="flex items-center gap-1.5">
                              <EthIcon className="w-4 h-4" />
                              <span className="text-sm font-bold text-black dark:text-white">
                                {work.amount}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-black/60 dark:text-white/60">
                              <Clock className="w-3 h-3" />
                              {work.deadline}
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Work Details / History Details */}
                <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
                  {activeTab === "history" ? (
                    /* --- History Right Panel --- */
                    selectedGroup ? (
                      <div className="p-6 space-y-5">
                        {/* Header */}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {selectedGroup.role === "client" ? (
                              <ShoppingBag className="w-5 h-5 text-cyan-500" />
                            ) : (
                              <Briefcase className="w-5 h-5 text-purple-500" />
                            )}
                            <h3 className="text-lg font-serif font-bold text-black dark:text-white">
                              {selectedGroup.role === "client"
                                ? "Purchase History"
                                : "Client Engagement"}
                            </h3>
                          </div>
                          <p className="text-sm text-black/60 dark:text-white/60">
                            {selectedGroup.role === "client"
                              ? "Provider"
                              : "Client"}
                            :{" "}
                            <span className="font-mono font-semibold text-black dark:text-white">
                              {selectedGroup.displayAddress}
                            </span>
                          </p>
                        </div>

                        {/* Summary Stats */}
                        <div className="grid grid-cols-3 gap-3">
                          <div className="glass-macos rounded-xl p-3 text-center">
                            <p className="text-[10px] uppercase tracking-wider text-black/50 dark:text-white/50 mb-1">
                              Transactions
                            </p>
                            <p className="text-xl font-bold text-black dark:text-white">
                              {selectedGroup.transactionCount}
                            </p>
                          </div>
                          <div className="glass-macos rounded-xl p-3 text-center">
                            <p className="text-[10px] uppercase tracking-wider text-black/50 dark:text-white/50 mb-1">
                              {selectedGroup.role === "client"
                                ? "Total Spent"
                                : "Total Earned"}
                            </p>
                            <div className="flex items-center justify-center gap-1">
                              <EthIcon className="w-4 h-4" />
                              <p className="text-xl font-bold text-black dark:text-white">
                                {selectedGroup.totalAmount.toFixed(4)}
                              </p>
                            </div>
                          </div>
                          <div className="glass-macos rounded-xl p-3 text-center">
                            <p className="text-[10px] uppercase tracking-wider text-black/50 dark:text-white/50 mb-1">
                              Services
                            </p>
                            <p className="text-xl font-bold text-black dark:text-white">
                              {selectedGroup.services.length}
                            </p>
                          </div>
                        </div>

                        {/* Service Tags */}
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-black/50 dark:text-white/50 mb-2">
                            {selectedGroup.role === "client"
                              ? "Services Purchased"
                              : "Services Delivered"}
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedGroup.services.map((s) => (
                              <span
                                key={s}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                                  selectedGroup.role === "client"
                                    ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20"
                                    : "bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20"
                                }`}
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Individual Transactions */}
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-black/50 dark:text-white/50 mb-3">
                            Transaction History
                          </h4>
                          <div className="space-y-2">
                            {selectedGroup.works.map((w, idx) => (
                              <div
                                key={w.id}
                                className="glass-macos rounded-xl p-4"
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <h5 className="font-semibold text-sm text-black dark:text-white">
                                      {w.serviceTitle}
                                    </h5>
                                    <p className="text-xs text-black/50 dark:text-white/50 mt-0.5">
                                      Request #{w.id.substring(0, 10)}...
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <EthIcon className="w-3.5 h-3.5" />
                                    <span className="text-sm font-bold text-black dark:text-white">
                                      {w.amount}
                                    </span>
                                  </div>
                                </div>
                                {w.taskDetails && (
                                  <p className="text-xs text-black/60 dark:text-white/60 mt-2 line-clamp-2">
                                    {w.taskDetails}
                                  </p>
                                )}
                                <div className="flex items-center justify-between mt-3 pt-2 border-t border-black/5 dark:border-white/5">
                                  <div className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                                    Resolved
                                  </div>
                                  {w.completionProofCid && (
                                    <span className="text-[10px] font-mono text-black/40 dark:text-white/40 truncate max-w-[160px]">
                                      CID: {w.completionProofCid}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center p-8">
                        <div className="text-center">
                          <Users className="w-12 h-12 mx-auto mb-4 text-black/10 dark:text-white/10" />
                          <p className="text-black/60 dark:text-white/60 text-sm">
                            Select a counterparty to view transaction history
                          </p>
                        </div>
                      </div>
                    )
                  ) : loading ? (
                    <div className="p-6 h-full flex flex-col">
                      <div className="border-b border-black/5 dark:border-white/5 pb-6">
                        <Skeleton className="h-8 w-1/2 mb-4" />
                        <Skeleton className="h-4 w-1/3 mb-4" />
                        <div className="mt-4 glass-macos rounded-xl p-4">
                          <Skeleton className="h-4 w-1/4 mb-2" />
                          <Skeleton className="h-3 w-full mb-1" />
                          <Skeleton className="h-3 w-5/6 mb-1" />
                          <Skeleton className="h-3 w-4/6" />
                        </div>
                      </div>
                      <div className="flex-1 flex flex-col gap-4 pt-6">
                        <Skeleton className="h-10 w-2/3 self-end rounded-2xl" />
                        <Skeleton className="h-10 w-2/3 self-start rounded-2xl" />
                      </div>
                    </div>
                  ) : selectedWork ? (
                    <>
                      {/* Details Header */}
                      <div className="p-6 border-b border-black/5 dark:border-white/5">
                        <h3 className="text-xl font-serif font-bold text-black dark:text-white mb-2">
                          {selectedWork.serviceTitle}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-black/60 dark:text-white/60">
                          <span>Created {selectedWork.createdAt}</span>
                          <span>•</span>
                          <span>Due in {selectedWork.deadline}</span>
                        </div>

                        {/* Task Details */}
                        <div className="mt-4 glass-macos rounded-xl p-4">
                          <h4 className="text-xs font-semibold text-black/70 dark:text-white/70 mb-2">
                            PROJECT REQUIREMENTS
                          </h4>
                          <p className="text-sm text-black dark:text-white whitespace-pre-wrap">
                            {selectedWork.taskDetails}
                          </p>
                        </div>

                        {/* Action Buttons */}
                        {selectedWork.role === "provider" &&
                          selectedWork.status === "pending" && (
                            <div className="flex gap-3 mt-4">
                              <motion.button
                                whileHover={{
                                  scale:
                                    isAccepting ||
                                    isConfirmingAccept ||
                                    isRejecting ||
                                    isConfirmingReject
                                      ? 1
                                      : 1.02,
                                }}
                                whileTap={{
                                  scale:
                                    isAccepting ||
                                    isConfirmingAccept ||
                                    isRejecting ||
                                    isConfirmingReject
                                      ? 1
                                      : 0.98,
                                }}
                                onClick={() => handleAccept(selectedWork.id)}
                                disabled={
                                  isAccepting ||
                                  isConfirmingAccept ||
                                  isRejecting ||
                                  isConfirmingReject
                                }
                                className={`flex-1 px-4 py-2.5 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 ${
                                  isAccepting ||
                                  isConfirmingAccept ||
                                  isRejecting ||
                                  isConfirmingReject
                                    ? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed"
                                    : "bg-gradient-to-r from-emerald-500 to-teal-500"
                                }`}
                              >
                                {isAccepting || isConfirmingAccept ? (
                                  <>
                                    <Clock className="w-4 h-4 animate-spin" />
                                    {isConfirmingAccept
                                      ? "Confirming on-chain..."
                                      : "Accepting..."}
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    Accept Project
                                  </>
                                )}
                              </motion.button>
                              <motion.button
                                whileHover={{
                                  scale:
                                    isAccepting ||
                                    isConfirmingAccept ||
                                    isRejecting ||
                                    isConfirmingReject
                                      ? 1
                                      : 1.02,
                                }}
                                whileTap={{
                                  scale:
                                    isAccepting ||
                                    isConfirmingAccept ||
                                    isRejecting ||
                                    isConfirmingReject
                                      ? 1
                                      : 0.98,
                                }}
                                onClick={() => handleReject(selectedWork.id)}
                                disabled={
                                  isAccepting ||
                                  isConfirmingAccept ||
                                  isRejecting ||
                                  isConfirmingReject
                                }
                                className={`flex-1 px-4 py-2.5 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 ${
                                  isAccepting ||
                                  isConfirmingAccept ||
                                  isRejecting ||
                                  isConfirmingReject
                                    ? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed"
                                    : "bg-gradient-to-r from-rose-500 to-red-500"
                                }`}
                              >
                                {isRejecting || isConfirmingReject ? (
                                  <>
                                    <Clock className="w-4 h-4 animate-spin" />
                                    {isConfirmingReject
                                      ? "Confirming on-chain..."
                                      : "Declining..."}
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="w-4 h-4" />
                                    Decline
                                  </>
                                )}
                              </motion.button>
                            </div>
                          )}
                      </div>

                      {/* Verification & Submit Section */}
                      {selectedWork.role === "provider" &&
                        (selectedWork.status === "in_progress" ||
                          selectedWork.status === "pending_review" ||
                          selectedWork.status === "completed") && (
                          <div className="p-6 border-b border-black/5 dark:border-white/5 bg-white/30 dark:bg-black/30">
                            {/* Submit Work Button */}
                            {selectedWork.status === "in_progress" &&
                              !isRecovering && (
                                <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 rounded-xl border border-blue-200 dark:border-blue-800">
                                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3">
                                    Submit Your Work
                                  </p>
                                  <p className="text-xs text-blue-800 dark:text-blue-200 mb-4">
                                    Upload your deliverables for AI-powered MoA
                                    (Mixture-of-Agents) verification. Evidence
                                    will be locked on-chain and funds released
                                    automatically.
                                  </p>
                                  <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() =>
                                      setShowCompleteWorkModal(true)
                                    }
                                    className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold text-sm rounded-lg transition-all"
                                  >
                                    Submit Work with Advanced Verification
                                  </motion.button>
                                </div>
                              )}

                            {/* Recovery indicator */}
                            {isRecovering && (
                              <div className="flex flex-col items-center justify-center gap-2 p-4 text-cyan-600 dark:text-cyan-400 glass-macos rounded-xl border border-cyan-500/20">
                                <Loader2 className="w-6 h-6 animate-spin" />
                                <span className="text-sm font-semibold tracking-wide">
                                  Recovering verification results...
                                </span>
                              </div>
                            )}

                            {/* Completing on-chain indicator */}
                            {isCompleting && (
                              <div className="flex flex-col items-center justify-center gap-2 p-4 text-cyan-600 dark:text-cyan-400 glass-macos rounded-xl border border-cyan-500/20">
                                <Loader2 className="w-6 h-6 animate-spin" />
                                <span className="text-sm font-semibold tracking-wide">
                                  Locking evidence &amp; submitting oracle
                                  ruling...
                                </span>
                              </div>
                            )}

                            {/* Verification Result Summary (shown after CompleteWorkModal completes) */}
                            {completedVerification &&
                              completedVerification.result &&
                              selectedWork.id && (
                                <div className="space-y-3 mt-4">
                                  <h4 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Verification Complete
                                  </h4>

                                  <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="glass-macos rounded-lg p-2">
                                      <p className="text-[10px] opacity-60">
                                        Status
                                      </p>
                                      <p className="font-semibold capitalize text-sm">
                                        {
                                          completedVerification.result
                                            .overall_status
                                        }
                                      </p>
                                    </div>
                                    <div className="glass-macos rounded-lg p-2">
                                      <p className="text-[10px] opacity-60">
                                        Completion
                                      </p>
                                      <p className="font-semibold text-sm">
                                        {
                                          completedVerification.result
                                            .completion_pct
                                        }
                                        %
                                      </p>
                                    </div>
                                    <div className="glass-macos rounded-lg p-2">
                                      <p className="text-[10px] opacity-60">
                                        Confidence
                                      </p>
                                      <p className="font-semibold text-sm">
                                        {
                                          completedVerification.result
                                            .confidence_pct
                                        }
                                        %
                                      </p>
                                    </div>
                                  </div>

                                  <div className="glass-macos rounded-lg p-3 text-xs opacity-80 border border-black/10 dark:border-white/10">
                                    {completedVerification.result.summary}
                                  </div>

                                  {completedVerification.result
                                    .requirement_checks?.length > 0 && (
                                    <div className="space-y-1 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                                      {completedVerification.result.requirement_checks.map(
                                        (req, idx) => (
                                          <div
                                            key={`${req.requirement}-${req.checked}-${idx}`}
                                            className="glass-macos rounded-md p-2 flex justify-between items-center gap-2"
                                          >
                                            <span
                                              className="text-xs truncate font-medium"
                                              title={req.requirement}
                                            >
                                              {req.requirement}
                                            </span>
                                            <span
                                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                req.checked
                                                  ? "bg-emerald-500/20 text-emerald-600"
                                                  : "bg-red-500/20 text-red-600"
                                              }`}
                                            >
                                              {req.checked ? "Pass" : "Fail"}
                                            </span>
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  )}

                                  {completedVerification.txHash && (
                                    <div className="glass-macos rounded-lg p-2 text-xs font-mono text-black/60 dark:text-white/60 break-all">
                                      Tx: {completedVerification.txHash}
                                    </div>
                                  )}

                                  {completedVerification.proofCid && (
                                    <div className="glass-macos rounded-lg p-2 text-xs font-mono text-black/60 dark:text-white/60 break-all">
                                      Proof CID:{" "}
                                      {completedVerification.proofCid}
                                    </div>
                                  )}
                                </div>
                              )}

                            {/* Status for resolved works */}
                            {selectedWork.status === "completed" &&
                              !completedVerification && (
                                <div className="mt-2">
                                  <h4 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Resolved
                                  </h4>
                                  <p className="text-xs text-black/60 dark:text-white/60 mt-1">
                                    This request has been resolved and funds
                                    have been settled.
                                  </p>
                                  {selectedWork.completionProofCid && (
                                    <div className="glass-macos rounded-lg p-2 text-xs font-mono text-black/60 dark:text-white/60 break-all mt-2">
                                      Proof CID:{" "}
                                      {selectedWork.completionProofCid}
                                    </div>
                                  )}
                                </div>
                              )}

                            {/* Status for pending review */}
                            {selectedWork.status === "pending_review" &&
                              !completedVerification &&
                              !isCompleting && (
                                <div className="mt-2">
                                  <h4 className="text-sm font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    Pending Oracle Review
                                  </h4>
                                  <p className="text-xs text-black/60 dark:text-white/60 mt-1">
                                    Evidence has been locked on-chain. Awaiting
                                    oracle ruling.
                                  </p>
                                </div>
                              )}
                          </div>
                        )}

                      {/* Chat / Messages Section */}
                      {selectedWork.status !== "pending" && (
                        <>
                          {/* Chat */}
                          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4 border-t border-black/5 dark:border-white/5">
                            <div className="flex items-center gap-2 mb-4">
                              <MessageCircle className="w-4 h-4 text-black/60 dark:text-white/60" />
                              <h4 className="text-sm font-semibold text-black dark:text-white">
                                Messages
                              </h4>
                            </div>
                            {selectedWork.messages.length === 0 ? (
                              <p className="text-sm text-black/40 dark:text-white/40 text-center py-8">
                                No messages yet. Start a conversation!
                              </p>
                            ) : (
                              selectedWork.messages.map((msg, idx) => (
                                <div
                                  key={`${msg.timestamp}-${msg.sender}-${idx}`}
                                  className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}
                                >
                                  <div
                                    className={`max-w-[85%] px-4 py-3 rounded-2xl ${
                                      msg.text.includes(
                                        "[ORACLE VERIFICATION RULING]",
                                      )
                                        ? "bg-purple-500/10 border border-purple-500/30 text-purple-900 dark:text-purple-100 font-mono text-xs w-full"
                                        : msg.sender === "me"
                                          ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
                                          : "glass-macos text-black dark:text-white"
                                    }`}
                                  >
                                    {msg.text.includes(
                                      "[ORACLE VERIFICATION RULING]",
                                    ) && (
                                      <div className="flex items-center gap-2 mb-2 font-sans font-bold text-purple-600 dark:text-purple-400 border-b border-purple-500/20 pb-2">
                                        <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                                        Autonomous Agent Verification Log
                                        (Stored on-chain)
                                      </div>
                                    )}
                                    <p className="whitespace-pre-wrap">
                                      {msg.text
                                        .replace(
                                          "[ORACLE VERIFICATION RULING]\\n",
                                          "",
                                        )
                                        .replace(
                                          "[ORACLE VERIFICATION RULING]\n",
                                          "",
                                        )}
                                    </p>
                                    <p
                                      className={`text-[10px] mt-2 font-sans ${
                                        msg.sender === "me"
                                          ? "text-white/70"
                                          : "text-black/50 dark:text-white/50"
                                      }`}
                                    >
                                      {msg.timestamp}
                                    </p>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Message Input */}
                          <div className="border-t border-black/5 dark:border-white/5 p-4">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={messageInput}
                                onChange={(e) =>
                                  setMessageInput(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !isSendingMessage) {
                                    handleSendMessage(selectedWork.id);
                                  }
                                }}
                                disabled={isSendingMessage}
                                placeholder={
                                  isSendingMessage
                                    ? "Sending..."
                                    : "Type a message..."
                                }
                                className="flex-1 glass-search px-4 py-2.5 rounded-xl text-black dark:text-white placeholder:text-black/50 dark:placeholder:text-white/50 outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all disabled:opacity-50"
                              />
                              <motion.button
                                whileHover={{
                                  scale:
                                    !messageInput.trim() || isSendingMessage
                                      ? 1
                                      : 1.05,
                                }}
                                whileTap={{
                                  scale:
                                    !messageInput.trim() || isSendingMessage
                                      ? 1
                                      : 0.95,
                                }}
                                onClick={() =>
                                  handleSendMessage(selectedWork.id)
                                }
                                disabled={
                                  !messageInput.trim() || isSendingMessage
                                }
                                className={`px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all ${
                                  messageInput.trim() && !isSendingMessage
                                    ? "btn-macos"
                                    : "bg-gray-400/50 dark:bg-gray-600/50 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                                }`}
                              >
                                {isSendingMessage ? (
                                  <Clock className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Send className="w-4 h-4" />
                                )}
                              </motion.button>
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center p-8">
                      <div className="text-center">
                        <div className="text-6xl mb-4 opacity-20">💼</div>
                        <p className="text-black/60 dark:text-white/60 text-sm">
                          Select a project to view details
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
      {/* Complete Work Modal */}
      {selectedWork && (
        <CompleteWorkModal
          isOpen={showCompleteWorkModal}
          onClose={() => setShowCompleteWorkModal(false)}
          onComplete={handleWorkComplete}
          requestId={selectedWork.id}
          requirements={selectedWork.taskDetails
            .split("\n")
            .filter((line: string) => line.trim().length > 0)}
          buyerAddress={selectedWork.clientAddress}
        />
      )}
    </AnimatePresence>
  );
}
