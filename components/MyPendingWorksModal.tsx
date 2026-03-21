"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  MessageCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
} from "lucide-react";
import { EthIcon } from "@/components/EthIcon";
import { useAccount } from "wagmi";
import {
  useGetActiveRequests,
  useRequestDetails,
  useRequestMessages,
  useAcceptRequest,
  useRejectRequest,
  usePostMessage,
  useGetServiceByIndex,
  useCompleteRequest,
} from "@/lib/marketplace";
import { formatEther, createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import { toast } from "sonner";
import ABI from "../ABI.json";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, ImageIcon, Loader2, Upload } from "lucide-react";
import { CompleteWorkModal } from "@/components/CompleteWorkModal";

// --- Verification Types & Helpers ---
type RequirementCheck = {
  requirement: string;
  checked: boolean;
  evidence: string;
};

type FileAnalysis = {
  file_name: string;
  media_type: string;
  summary: string;
  key_elements: string[];
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

type StageInfo = {
  stage: string;
  message: string;
};

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

const inferContentType = (fileName: string): string => {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const mimeMap: Record<string, string> = {
    py: "text/x-python",
    js: "text/javascript",
    ts: "text/typescript",
    tsx: "text/typescript",
    jsx: "text/javascript",
    json: "application/json",
    md: "text/markdown",
    txt: "text/plain",
    csv: "text/csv",
    html: "text/html",
    css: "text/css",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
  return mimeMap[ext] ?? "application/octet-stream";
};

const isBinaryType = (contentType: string): boolean =>
  contentType.startsWith("image/") ||
  contentType === "application/pdf" ||
  contentType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const fileToBase64 = async (file: File): Promise<string> => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const CHUNK = 8192;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
};

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
  const [activeTab, setActiveTab] = useState<"all" | "client" | "provider">(
    "provider",
  );
  const [selectedWork, setSelectedWork] = useState<PendingWork | null>(null);
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
  const { acceptRequest, isPending: isAccepting } = useAcceptRequest();
  const { rejectRequest, isPending: isRejecting } = useRejectRequest();
  const { postMessage, isPending: isSendingMessage } = usePostMessage();
  const { completeRequest } = useCompleteRequest();

  // Verification & Upload State
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [verificationResult, setVerificationResult] =
    useState<VerificationResult | null>(null);
  const [analyses, setAnalyses] = useState<FileAnalysis[]>([]);
  const [streamingOutput, setStreamingOutput] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStage, setCurrentStage] = useState<StageInfo | null>(null);
  const streamScrollRef = useRef<HTMLDivElement>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isConfirmingAccept, setIsConfirmingAccept] = useState(false);
  const [isConfirmingReject, setIsConfirmingReject] = useState(false);
  const [showCompleteWorkModal, setShowCompleteWorkModal] = useState(false);

  // Auto-scroll streaming output to bottom
  useEffect(() => {
    if (streamScrollRef.current) {
      streamScrollRef.current.scrollTop = streamScrollRef.current.scrollHeight;
    }
  }, [streamingOutput]);

  const handleFilesChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    const selected = Array.from(event.target.files ?? []);
    setUploadedFiles((prev) => [...prev, ...selected]);
    event.target.value = "";
  };

  const removeFile = (index: number): void => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

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

        console.log(
          "Total pending works fetched:",
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
  }, [address, providerPendingIds, clientPendingIds, isOpen]);

  const filteredWorks = works.filter((work) => {
    if (activeTab === "all") return true;
    return work.role === activeTab;
  });

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

  const consumeStream = async (response: Response): Promise<void> => {
    if (!response.body) {
      throw new Error("Response body is empty");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const processLines = (lines: string[]): void => {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.startsWith("event:")) continue;

        const eventType = line.replace("event:", "").trim();
        const dataLine = lines[i + 1];

        if (!dataLine?.startsWith("data:")) continue;

        const data = dataLine.replace("data:", "").trim();

        try {
          if (eventType === "token") {
            const tokenData = JSON.parse(data) as { token?: string };
            setStreamingOutput((prev) => prev + (tokenData.token ?? ""));
          } else if (eventType === "stage") {
            const stageData = JSON.parse(data) as StageInfo;
            setCurrentStage(stageData);
            setStreamingOutput(
              (prev) => prev + `\n--- ${stageData.message} ---\n`,
            );
          } else if (eventType === "analysis") {
            const analysisData = JSON.parse(data) as FileAnalysis;
            setAnalyses((prev) => [...prev, analysisData]);
          } else if (eventType === "report") {
            const reportData = JSON.parse(data) as VerificationResult;
            setVerificationResult(reportData);
            setIsStreaming(false);
            setCurrentStage(null);

            // Trigger Oracle ruling completion
            submitRulingToOracle(reportData);
          }
        } catch {
          // skip malformed
        }
      }
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        processLines(lines);
      }

      if (buffer) {
        processLines(buffer.split("\n"));
      }
    } finally {
      reader.releaseLock();
    }
  };

  const submitRulingToOracle = async (report: VerificationResult) => {
    if (!selectedWork) return;

    try {
      setIsCompleting(true);
      const isSuccess =
        report.overall_status.toLowerCase() === "success" ||
        report.completion_pct >= 60;

      const winnerAddress = isSuccess
        ? selectedWork.providerAddress
        : selectedWork.clientAddress;

      toast.info(
        `Submitting Oracle Ruling... ${isSuccess ? "Paying Provider" : "Refunding Client"}`,
        { id: "oracle-ruling" },
      );

      const res = await fetch(
        `${BACKEND_BASE_URL}/marketplace/oracle/submit-ruling`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            request_id: selectedWork.id,
            ruling_text: JSON.stringify(report),
            winner: winnerAddress,
          }),
        },
      );

      if (!res.ok) {
        throw new Error("Oracle API rejected the task.");
      }

      const oracleData = await res.json();
      if (!oracleData.success) {
        if (
          oracleData.error &&
          oracleData.error.includes("Not pending oracle review")
        ) {
          toast.success("Already evaluated and resolved on-chain!", {
            id: "oracle-ruling",
          });
        } else {
          throw new Error(oracleData.error);
        }
      } else {
        toast.success("Transaction Resolved On-Chain!", {
          id: "oracle-ruling",
        });
      }

      const newStatus = "completed";
      setSelectedWork({ ...selectedWork, status: newStatus as any });
      setWorks((prev) =>
        prev.map((w) =>
          w.id === selectedWork.id ? { ...w, status: newStatus as any } : w,
        ),
      );
    } catch (err: any) {
      console.error(err);
      toast.error("Oracle Failed: " + (err.message || "Unknown error"));
    } finally {
      setIsCompleting(false);
    }
  };

  const handleLockEvidence = async () => {
    if (!selectedWork || uploadedFiles.length === 0) return;
    setIsVerifying(true);
    try {
      toast.info("Uploading evidence securely to decentralised storage...");
      const formData = new FormData();
      formData.append("file", uploadedFiles[0]);
      formData.append("upload_analysis", "false");

      const res = await fetch(`${BACKEND_BASE_URL}/ipfs/upload-file`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Decentralised storage cluster unavailable");
      const uploadData = await res.json();
      const ipfsHash = uploadData.file_pin?.IpfsHash || uploadData.IpfsHash;

      toast.info("Locking Evidence on-chain...");
      const txHash = await completeRequest(
        selectedWork.id as `0x${string}`,
        ipfsHash,
      );

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
      });

      if (receipt.status !== "success") {
        throw new Error("Lock-in transaction reverted");
      }

      toast.success("Evidence permanently locked in!");
      setSelectedWork({ ...selectedWork, status: "pending_review" as any });
      setWorks((prev) =>
        prev.map((w) =>
          w.id === selectedWork.id
            ? { ...w, status: "pending_review" as any }
            : w,
        ),
      );
    } catch (e: any) {
      console.error(e);
      toast.error(e.shortMessage || e.message || "Failed to lock evidence");
    } finally {
      setIsVerifying(false);
    }
  };

  // Autonomously trigger AI Evaluation
  useEffect(() => {
    if (
      selectedWork?.status === "pending_review" &&
      !isStreaming &&
      !verificationResult &&
      !isVerifying
    ) {
      handleVerifySubmit();
    }
  }, [selectedWork?.status, isStreaming, verificationResult, isVerifying]);

  const handleVerifySubmit = async (): Promise<void> => {
    if (!selectedWork) return;

    try {
      setIsVerifying(true);
      setIsStreaming(true);
      setErrorMessage("");
      setVerificationResult(null);
      setAnalyses([]);
      setStreamingOutput("");
      setCurrentStage(null);

      // Split taskDetails by newline to form reasonable requirements list
      const reqList = selectedWork.taskDetails
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((item) => ({ requirement: item }));

      let filePayloads = [];
      if (uploadedFiles.length === 0) {
        // On a page reload, the local files are gone but the transaction is active.
        // Download directly from the locked IPFS CID!
        try {
          const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${selectedWork.completionProofCid}`;
          const response = await fetch(ipfsUrl);
          const blob = await response.blob();

          let fileData: string;
          if (!blob.type.includes("text/")) {
            fileData = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
          } else {
            fileData = await blob.text();
          }

          filePayloads = [
            {
              file_name: `evidence_recovered_${selectedWork.completionProofCid}`,
              content: fileData,
              content_type: blob.type || "application/octet-stream",
            },
          ];
        } catch (e) {
          console.error("IPFS Fetch Failed:", e);
          filePayloads = [
            {
              file_name: `evidence_recovered_${selectedWork.id}.txt`,
              content:
                "The provider locked the evidence securely on IPFS but the retrieval failed due to CORS or gateway delay.",
              content_type: "text/plain",
            },
          ];
        }
      } else {
        filePayloads = await Promise.all(
          uploadedFiles.map(async (file) => {
            const contentType = file.type || inferContentType(file.name);
            const content = isBinaryType(contentType)
              ? await fileToBase64(file)
              : await file.text();

            return {
              file_name: file.name,
              content,
              content_type: contentType,
            };
          }),
        );
      }

      const body = {
        requirements_list: reqList,
        seller_profile: "Provider", // Can be dynamic if we fetch provider data
        what_they_offer: selectedWork.serviceTitle,
        seller_description: "Provider selling the service",
        files: filePayloads,
      };

      const response = await fetch(`${BACKEND_BASE_URL}/agent/verify/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`Verification failed: ${detail}`);
      }

      await consumeStream(response);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Request failed",
      );
      setIsStreaming(false);
      setIsVerifying(false); // only disable verifying initially, it stays disabled if successful.
    }
  };

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
                {/* Works List */}
                <div className="w-2/5 border-r border-black/5 dark:border-white/5 overflow-y-auto custom-scrollbar">
                  {loading ? (
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

                {/* Work Details */}
                <div className="flex-1 flex flex-col">
                  {loading ? (
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

                      {/* Verification & Proof Upload Section */}
                      {selectedWork.role === "provider" &&
                        (selectedWork.status === "in_progress" ||
                          selectedWork.status === "pending_review" ||
                          selectedWork.status === "completed") && (
                          <div className="p-6 border-b border-black/5 dark:border-white/5 bg-white/30 dark:bg-black/30">
                            {/* Quick Access Button to Complete Work Modal */}
                            {selectedWork.status === "in_progress" && (
                              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 rounded-xl border border-blue-200 dark:border-blue-800">
                                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3">
                                  ✨ New Verification Experience
                                </p>
                                <p className="text-xs text-blue-800 dark:text-blue-200 mb-4">
                                  Try our advanced MoA (Mixture-of-Agents)
                                  verification system. Upload files and let our
                                  AI evaluate your work against requirements
                                  automatically.
                                </p>
                                <motion.button
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => setShowCompleteWorkModal(true)}
                                  className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold text-sm rounded-lg transition-all"
                                >
                                  🚀 Submit Work with Advanced Verification
                                </motion.button>
                              </div>
                            )}

                            {selectedWork.status === "in_progress" ? (
                              <>
                                <h4 className="text-sm font-semibold text-black dark:text-white mb-2">
                                  Lock In Verification Proofs
                                </h4>
                                <p className="text-xs text-black/60 dark:text-white/60 mb-4">
                                  Upload evidence, lock it permanently into the
                                  contract, and allow the Oracle agents to
                                  review.
                                </p>

                                {/* Multi-file upload */}
                                <div className="space-y-2 mb-4">
                                  <input
                                    type="file"
                                    multiple
                                    onChange={handleFilesChange}
                                    disabled={isVerifying || isCompleting}
                                    className="w-full rounded-md border border-input glass-macos px-3 py-2 text-sm text-black dark:text-white"
                                  />
                                  {uploadedFiles.length > 0 && (
                                    <div className="space-y-1 mt-2">
                                      {uploadedFiles.map((file, index) => (
                                        <div
                                          key={`${file.name}-${index}`}
                                          className="flex items-center justify-between gap-2 rounded-md border border-black/5 dark:border-white/10 px-2 py-1 text-xs"
                                        >
                                          <div className="flex items-center gap-1.5 truncate text-black dark:text-white">
                                            {(
                                              file.type ||
                                              inferContentType(file.name)
                                            ).startsWith("image/") ? (
                                              <ImageIcon className="w-3.5 h-3.5 text-black/60 dark:text-white/60 flex-shrink-0" />
                                            ) : (
                                              <FileText className="w-3.5 h-3.5 text-black/60 dark:text-white/60 flex-shrink-0" />
                                            )}
                                            <span className="truncate">
                                              {file.name}
                                            </span>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => removeFile(index)}
                                            disabled={
                                              isVerifying || isCompleting
                                            }
                                            className="text-black/50 dark:text-white/50 hover:text-red-500 transition-colors disabled:opacity-50"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <motion.button
                                  whileHover={{ scale: isVerifying ? 1 : 1.02 }}
                                  whileTap={{ scale: isVerifying ? 1 : 0.98 }}
                                  onClick={handleLockEvidence}
                                  disabled={
                                    isVerifying || uploadedFiles.length === 0
                                  }
                                  className={`w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 ${
                                    isVerifying || uploadedFiles.length === 0
                                      ? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed"
                                      : "bg-blue-600 hover:bg-blue-500 text-white"
                                  }`}
                                >
                                  {isVerifying ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Upload className="w-4 h-4" />
                                  )}
                                  Lock Evidence On-Chain
                                </motion.button>
                              </>
                            ) : (
                              <>
                                <h4 className="text-sm font-semibold text-purple-600 dark:text-purple-400 mb-2 flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4" />
                                  Evidence Locked
                                </h4>
                                <p className="text-xs text-black/60 dark:text-white/60 mb-4">
                                  Your evidence has safely been committed.
                                  Proceed with autonomous agent evaluation to
                                  resolve the transaction.
                                </p>

                                {errorMessage && (
                                  <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-500 mb-4">
                                    {errorMessage}
                                  </div>
                                )}

                                {!isStreaming && !verificationResult ? (
                                  <div className="flex flex-col items-center justify-center py-8 glass-macos rounded-xl border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 gap-4">
                                    <Loader2 className="w-8 h-8 animate-spin" />
                                    <p className="text-sm font-semibold text-black dark:text-white">
                                      Agents Analyzing Evidence...
                                    </p>
                                    <p className="text-xs text-black/60 dark:text-white/60 text-center px-4">
                                      The Oracle network is processing the
                                      payload autonomously. Please wait.
                                    </p>
                                  </div>
                                ) : (
                                  <div className="space-y-4">
                                    {/* Streaming Text Output */}
                                    <div
                                      className="glass-macos rounded-xl p-3 max-h-48 overflow-y-auto custom-scrollbar font-mono text-[10px] leading-relaxed relative text-black dark:text-white bg-black/5 dark:bg-black/40"
                                      ref={streamScrollRef}
                                    >
                                      {currentStage && (
                                        <div className="mb-2 flex items-center gap-1.5 opacity-70 border-b border-black/10 dark:border-white/10 pb-1 w-full font-sans text-xs">
                                          <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" />
                                          <span className="font-semibold text-cyan-600 dark:text-cyan-400">
                                            ORACLE {">"}
                                          </span>{" "}
                                          {currentStage.message}
                                        </div>
                                      )}
                                      <div className="whitespace-pre-wrap">
                                        {streamingOutput}
                                      </div>
                                      {isStreaming && (
                                        <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-70">
                                          <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" />
                                          <span className="text-cyan-600 dark:text-cyan-400 font-semibold font-sans">
                                            Evaluating...
                                          </span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Live Analyses */}
                                    {analyses.length > 0 &&
                                      !verificationResult && (
                                        <div className="space-y-2">
                                          {analyses.map((a, idx) => (
                                            <div
                                              key={`${a.file_name}-${idx}`}
                                              className="glass-macos rounded-lg p-2 text-xs"
                                            >
                                              <div className="flex justify-between font-bold text-black dark:text-white">
                                                <span>{a.file_name}</span>
                                                <span className="opacity-60">
                                                  {a.media_type}
                                                </span>
                                              </div>
                                              <p className="opacity-80 mt-1">
                                                {a.summary}
                                              </p>
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                    {/* Final Verification Result */}
                                    {verificationResult && (
                                      <div className="space-y-3">
                                        <div className="grid grid-cols-3 gap-2 text-center">
                                          <div className="glass-macos rounded-lg p-2">
                                            <p className="text-[10px] opacity-60">
                                              Status
                                            </p>
                                            <p className="font-semibold capitalize text-sm">
                                              {
                                                verificationResult.overall_status
                                              }
                                            </p>
                                          </div>
                                          <div className="glass-macos rounded-lg p-2">
                                            <p className="text-[10px] opacity-60">
                                              Completion
                                            </p>
                                            <p className="font-semibold text-sm">
                                              {
                                                verificationResult.completion_pct
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
                                                verificationResult.confidence_pct
                                              }
                                              %
                                            </p>
                                          </div>
                                        </div>

                                        <div className="glass-macos rounded-lg p-3 text-xs opacity-80 border border-black/10 dark:border-white/10">
                                          {verificationResult.summary}
                                        </div>

                                        <div className="space-y-1 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                                          {verificationResult.requirement_checks.map(
                                            (req, idx) => (
                                              <div
                                                key={`${req.requirement}-${req.checked}-${idx}`}
                                                className="glass-macos rounded-md p-2 flex justify-between items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
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
                                                      ? "bg-emerald-500/20 text-emerald-600 block"
                                                      : "bg-red-500/20 text-red-600 block"
                                                  }`}
                                                >
                                                  {req.checked
                                                    ? "Pass"
                                                    : "Fail"}
                                                </span>
                                              </div>
                                            ),
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {isCompleting && (
                                      <div className="flex flex-col items-center justify-center gap-2 p-4 text-cyan-600 dark:text-cyan-400 glass-macos rounded-xl border border-cyan-500/20">
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                        <span className="text-sm font-semibold tracking-wide">
                                          Executing Oracle Smart Contract
                                          Ruling...
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </>
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
