"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import type { ResultData } from "./search/ResultCard";
import { EthIcon } from "@/components/EthIcon";
import { useRequestService } from "@/lib/marketplace";
import { useAccount } from "wagmi";
import { toast } from "sonner";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(),
});

interface BookServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: ResultData | null;
  onSuccess?: () => void;
}

const SPRING = {
  type: "spring",
  damping: 20,
  stiffness: 100,
} as const;

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
  
export function BookServiceModal({
  isOpen,
  onClose,
  service,
  onSuccess,
}: BookServiceModalProps) {
  const [taskDetails, setTaskDetails] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { address } = useAccount();
  const { requestService, isPending } = useRequestService();

  const isFormValid = taskDetails.trim() !== "" && address && service;

  /**
   * Validate that the prompt matches the gig information
   */
  const validatePromptWithGig = async (prompt: string): Promise<boolean> => {
    if (!service) return false;

    try {
      const description = service.description || `A ${service.category} service by ${service.provider.name}. Skills: ${service.tags.join(", ")}`;

      const response = await fetch(`${BACKEND_BASE_URL}/agent/compare-prompt-with-gig`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: service.title,
          description: description,
          tags: service.tags,
          category: service.category,
          prompt: prompt,
        }),
      });

      if (!response.ok) {
        console.error("Validation API error:", response.status);
        // If API fails, allow booking to proceed
        return true;
      }

      const result = await response.json();

      if (!result.matches) {
        toast.error(
          `Service mismatch: ${result.explanation || "The requirements don't match this service."}`
        );
        return false;
      }

      return true;
    } catch (err) {
      console.error("Error validating prompt:", err);
      // If validation fails, allow booking to proceed
      return true;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskDetails.trim() || !service || !address) return;

    // Validate provider address
    if (!service.provider.address || service.provider.address === "undefined") {
      toast.error(
        "Provider address not available. Service may not be properly loaded.",
      );
      return;
    }

    setIsProcessing(true);

    try {
      // First, validate that the prompt matches the gig
      const isValid = await validatePromptWithGig(taskDetails);
      if (!isValid) {
        setIsProcessing(false);
        return;
      }

      // Parse service index from id (format: "onchain-providerAddress-serviceIndex")
      const parts = service.id.split("-");
      const serviceIndex = BigInt(parts[parts.length - 1] || "0");

      // Call requestService with provider address, service index, and client note
      // ⚠️ CRITICAL: Must send exact service listing price, not user input
      console.log("Booking service with:", {
        provider: service.provider.address,
        serviceIndex: serviceIndex.toString(),
        servicePrice: service.price.amount,
        clientNote: taskDetails,
      });

      const txHash = await requestService(
        service.provider.address as `0x${string}`,
        serviceIndex,
        taskDetails,
        service.price.amount.toString(), // Send exact listing price
      );

      console.log("Transaction hash:", txHash);

      console.log("Service request created (Pending status):", {
        serviceId: service.id,
        provider: service.provider.name,
        amount: service.price.amount,
        taskDetails,
        escrowLocked: true,
        status: "Pending",
        timestamp: new Date().toISOString(),
      });

      toast.info("Transaction submitted, waiting for confirmation...");
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

      setIsProcessing(false);

      if (receipt.status === "success") {
        toast.success(
          "Service request created! Funds locked in escrow. Status: Pending",
        );
        onClose();
        if (onSuccess) onSuccess();
        setTaskDetails("");
      } else {
        toast.error("Transaction failed on chain.");
      }
    } catch (err: any) {
      setIsProcessing(false);

      if (
        err?.message?.includes("User rejected the request") ||
        err?.code === 4001
      ) {
        toast.info("Transaction cancelled by user.");
      } else {
        console.error("Failed to request service:", err);
        toast.error(
          "Failed to create service request: " + (err?.message || err),
        );
      }
    }
  };

  if (!service) return null;

  const sampleRequirements = [
    "Project scope and deliverables",
    "Timeline and milestones",
    "Specific requirements or constraints",
    "Expected output format",
    "Any reference materials or examples",
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm z-[102]"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[103] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={SPRING}
              className="glass-macos rounded-3xl w-full max-w-2xl max-h-[90vh] pointer-events-auto shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="relative p-6 border-b border-black/5 dark:border-white/5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-2xl font-serif font-bold text-black dark:text-white mb-2">
                      Book Service
                    </h2>
                    <p className="text-sm text-black/60 dark:text-white/60">
                      {service.title}
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
              </div>

              {/* Content */}
              <form
                onSubmit={handleSubmit}
                className="flex-1 overflow-y-auto custom-scrollbar"
              >
                <div className="p-6 space-y-6">
                  {/* Service Summary */}
                  <div className="glass-macos rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-black dark:text-white">
                        Service Cost
                      </span>
                      <div className="flex items-center gap-2">
                        <EthIcon className="w-5 h-5" />
                        <span className="text-xl font-bold text-black dark:text-white">
                          {service.price.amount.toLocaleString()}
                        </span>
                        <span className="text-sm text-black/60 dark:text-white/60">
                          ETH
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-black/60 dark:text-white/60">
                      Provider: {service.provider.name} • {service.deliveryTime}
                    </div>
                  </div>

                  {/* Task Details */}
                  <div>
                    <label className="block text-sm font-semibold text-black dark:text-white mb-2">
                      Project Requirements *
                    </label>
                    <div className="glass-macos rounded-xl p-3 mb-3">
                      <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 mb-2">
                        💡 Please provide detailed requirements:
                      </p>
                      <ul className="space-y-1">
                        {sampleRequirements.map((req, idx) => (
                          <li
                            key={idx}
                            className="text-xs text-black/60 dark:text-white/60 flex items-start gap-2"
                          >
                            <span className="text-cyan-500">•</span>
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <textarea
                      required
                      rows={10}
                      value={taskDetails}
                      onChange={(e) => setTaskDetails(e.target.value)}
                      placeholder={`Example:

PROJECT: Essay on Climate Change Impact

SCOPE:
- 2000-word academic essay
- Focus on economic impacts of climate change
- Include at least 8 peer-reviewed sources
- APA citation format

DELIVERABLES:
- Final essay in .docx format
- Bibliography/references page
- Plagiarism report

TIMELINE:
- Draft for review: 5 days
- Final version: 7 days

ADDITIONAL NOTES:
- Target audience: University level (undergraduate)
- Prefer recent sources (last 5 years)`}
                      className="w-full glass-search px-4 py-3 rounded-xl text-black dark:text-white placeholder:text-black/40 dark:placeholder:text-white/40 outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all resize-none font-mono text-sm"
                    />
                    <p className="text-xs text-black/50 dark:text-white/50 mt-2">
                      Be specific and structured. This helps the provider
                      deliver exactly what you need and enables quality
                      evaluation.
                    </p>
                  </div>

                  {/* Important Note */}
                  <div className="glass-macos rounded-xl p-4 border border-amber-500/20">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-black dark:text-white mb-1">
                          Payment locked in escrow - Status: Pending
                        </p>
                        <p className="text-xs text-black/60 dark:text-white/60">
                          Your {service.price.amount} ETH will be securely
                          locked on-chain. Once sent:
                          <br />
                          • Status will be "Pending" - awaiting provider
                          response
                          <br />
                          • You can check messages directly from pending
                          requests
                          <br />
                          • Provider can accept or reject your request
                          <br />• Funds released only after dispute resolution
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-black/5 dark:border-white/5 p-6 flex justify-end gap-3 bg-white/50 dark:bg-black/50">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onClose}
                    disabled={isProcessing}
                    className="px-6 py-2.5 rounded-2xl glass-macos text-black/70 dark:text-white/70 font-semibold text-sm disabled:opacity-50"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="submit"
                    disabled={!isFormValid || isProcessing || isPending}
                    whileHover={
                      isFormValid && !isProcessing && !isPending
                        ? { scale: 1.02 }
                        : {}
                    }
                    whileTap={
                      isFormValid && !isProcessing && !isPending
                        ? { scale: 0.98 }
                        : {}
                    }
                    className={`px-8 py-2.5 rounded-2xl font-semibold text-sm flex items-center gap-2 transition-all ${
                      isFormValid && !isProcessing && !isPending
                        ? "btn-macos"
                        : "bg-gray-400/50 dark:bg-gray-600/50 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {isProcessing || isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {isPending ? "Confirming TX..." : "Processing..."}
                      </>
                    ) : (
                      <>
                        <EthIcon className="w-4 h-4" />
                        Request & Lock {service.price.amount} ETH in Escrow
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>

        </>
      )}
    </AnimatePresence>
  );
}
