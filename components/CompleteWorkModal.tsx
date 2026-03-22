"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Upload,
  FileText,
  ImageIcon,
  Loader2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

interface VerificationResult {
  modality: string;
  overall_status: string;
  completion_pct: number;
  confidence_pct: number;
  summary: string;
  requirement_checks: {
    requirement: string;
    checked: boolean;
    evidence: string;
  }[];
  totals: {
    completed: number;
    total: number;
  };
}

interface AgentResultData {
  agent_name: string;
  requirement_checks: {
    requirement?: string;
    checked?: boolean;
    evidence?: string;
  }[];
}

interface CompleteWorkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (result: VerificationResult, proofCid: string) => void;
  requestId: string;
  requirements: string[];
  buyerAddress: string;
}

const SPRING = {
  type: "spring",
  damping: 20,
  stiffness: 100,
} as const;

export function CompleteWorkModal({
  isOpen,
  onClose,
  onComplete,
  requestId,
  requirements,
  buyerAddress,
}: CompleteWorkModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [filesLocked, setFilesLocked] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [agentResults, setAgentResults] = useState<AgentResultData[]>([]);
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [blockchainStatus, setBlockchainStatus] = useState<string>("");
  const [proofCid, setProofCid] = useState<string>("");
  const [autoCompleteTriggered, setAutoCompleteTriggered] = useState(false);
  const [settlementCompleted, setSettlementCompleted] = useState(false);
  const [settlementTimeout, setSettlementTimeout] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState("");

  // Refs to hold latest values for the auto-complete effect
  const resultRef = useRef<VerificationResult | null>(null);
  const proofCidRef = useRef<string>("");
  const settlementTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep refs in sync
  useEffect(() => {
    resultRef.current = result;
  }, [result]);
  useEffect(() => {
    proofCidRef.current = proofCid;
  }, [proofCid]);

  // Auto-scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Auto-trigger onComplete only after backend confirms settlement completed.
  useEffect(() => {
    if (
      settlementCompleted &&
      proofCid &&
      result &&
      !autoCompleteTriggered &&
      onComplete
    ) {
      setAutoCompleteTriggered(true);
      // Clear any pending timeout
      if (settlementTimeoutRef.current) {
        clearTimeout(settlementTimeoutRef.current);
        settlementTimeoutRef.current = null;
      }
      
      // Show success toast
      toast.success("Settlement Complete!", {
        description: `Funds have been released. Transaction confirmed on-chain.`,
        duration: 5000,
      });
      
      // Small delay so the user can see the final state
      const timer = setTimeout(() => {
        onComplete(result, proofCid);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [
    settlementCompleted,
    proofCid,
    result,
    autoCompleteTriggered,
    onComplete,
  ]);

  // Fallback: If settlement_initiated received but no completion after 30s, show warning
  useEffect(() => {
    if (blockchainStatus.includes("automatically releasing funds") && !settlementCompleted) {
      // Start a timeout
      settlementTimeoutRef.current = setTimeout(() => {
        setSettlementTimeout(true);
        setLogs((prev) => [
          ...prev,
          "⚠️ Settlement taking longer than expected. Check blockchain explorer or refresh page.",
        ]);
        toast.warning("Settlement Delayed", {
          description: "The transaction is taking longer than expected. It may still complete.",
          duration: 8000,
        });
      }, 30000); // 30 seconds

      return () => {
        if (settlementTimeoutRef.current) {
          clearTimeout(settlementTimeoutRef.current);
          settlementTimeoutRef.current = null;
        }
      };
    }
  }, [blockchainStatus, settlementCompleted]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (filesLocked) return;
    const selectedFiles = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    if (filesLocked) return;
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const isImage = (file: File) =>
    file.type.startsWith("image/") ||
    /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name);

  const toggleAgent = (agentName: string) => {
    setExpandedAgents((prev) => {
      const next = new Set(prev);
      if (next.has(agentName)) next.delete(agentName);
      else next.add(agentName);
      return next;
    });
  };

  const handleSubmit = useCallback(async () => {
    if (files.length === 0) return;

    setFilesLocked(true);
    setIsVerifying(true);
    setLogs(["Starting verification process..."]);
    setResult(null);
    setAgentResults([]);
    setBlockchainStatus("");
    setProofCid("");
    setAutoCompleteTriggered(false);
    setSettlementCompleted(false);
    setSettlementTimeout(false);
    setProgress(0);
    setCurrentStage("Initializing...");
    
    // Clear any pending settlement timeout
    if (settlementTimeoutRef.current) {
      clearTimeout(settlementTimeoutRef.current);
      settlementTimeoutRef.current = null;
    }

    toast.info("Verification Started", {
      description: `Analyzing ${files.length} file(s) against ${requirements.length} requirement(s)`,
    });

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });
      formData.append("requirements", JSON.stringify(requirements));
      formData.append("requestId", requestId);
      formData.append("buyerAddress", buyerAddress);

      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

      const response = await fetch(
        `${backendUrl}/agent/work/complete-and-verify/stream`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        if (response.status === 409) {
          const errorData = await response.json().catch(() => null);
          throw new Error(
            errorData?.detail ||
              "Verification already in progress or completed for this request",
          );
        }
        throw new Error(`Server error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Response body not readable");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines[lines.length - 1];

        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i];

          if (line.startsWith("event: ")) {
            const eventType = line.substring(7);

            if (eventType === "stage") {
              i++;
              if (i < lines.length - 1) {
                const dataLine = lines[i];
                if (dataLine.startsWith("data: ")) {
                  try {
                    const data = JSON.parse(dataLine.substring(6));
                    const stageMsg = `${data.stage}: ${data.message}`;
                    setLogs((prev) => [...prev, stageMsg]);
                    setCurrentStage(data.message);
                    
                    // Update progress based on stage
                    if (data.stage === "init") setProgress(5);
                    else if (data.stage === "content_analysis_complete") setProgress(25);
                    else if (data.stage === "orchestration_complete") setProgress(40);
                    else if (data.stage === "sub_agent_evaluating") setProgress(60);
                    else if (data.stage === "aggregation_complete") setProgress(80);
                  } catch (e) {
                    console.error("Failed to parse stage event:", e);
                  }
                }
              }
            } else if (eventType === "analysis") {
              i++;
              if (i < lines.length - 1) {
                const dataLine = lines[i];
                if (dataLine.startsWith("data: ")) {
                  try {
                    const data = JSON.parse(dataLine.substring(6));
                    setLogs((prev) => [
                      ...prev,
                      `Analysed ${data.file_name}: ${data.summary}`,
                    ]);
                  } catch (e) {
                    console.error("Failed to parse analysis event:", e);
                  }
                }
              }
            } else if (eventType === "agent_assignment") {
              i++;
              if (i < lines.length - 1) {
                const dataLine = lines[i];
                if (dataLine.startsWith("data: ")) {
                  try {
                    const data = JSON.parse(dataLine.substring(6));
                    setLogs((prev) => [
                      ...prev,
                      `Agent #${data.agent_id} assigned to ${data.criteria_count} requirements`,
                    ]);
                  } catch (e) {
                    console.error("Failed to parse agent assignment:", e);
                  }
                }
              }
            } else if (eventType === "agent_result") {
              i++;
              if (i < lines.length - 1) {
                const dataLine = lines[i];
                if (dataLine.startsWith("data: ")) {
                  try {
                    const data = JSON.parse(
                      dataLine.substring(6),
                    ) as AgentResultData;
                    setAgentResults((prev) => [...prev, data]);
                    const passCount = data.requirement_checks.filter(
                      (c) => c.checked,
                    ).length;
                    const totalCount = data.requirement_checks.length;
                    setLogs((prev) => [
                      ...prev,
                      `Agent "${data.agent_name}" completed: ${passCount}/${totalCount} checks passed`,
                    ]);
                  } catch (e) {
                    console.error("Failed to parse agent_result event:", e);
                  }
                }
              }
            } else if (eventType === "report") {
              i++;
              if (i < lines.length - 1) {
                const dataLine = lines[i];
                if (dataLine.startsWith("data: ")) {
                  try {
                    const report = JSON.parse(dataLine.substring(6));
                    setResult(report);
                    setProgress(85);
                    setCurrentStage("Verification complete");
                    setLogs((prev) => [
                      ...prev,
                      `Verification Complete`,
                      `   Status: ${report.overall_status}`,
                      `   Confidence: ${report.confidence_pct}%`,
                      `   Requirements: ${report.totals?.completed}/${report.totals?.total} passed`,
                    ]);
                    
                    const isPassing = report.overall_status?.toLowerCase() === "pass" || report.completion_pct >= 60;
                    toast.success("Verification Complete", {
                      description: `${report.overall_status} - ${report.totals?.completed}/${report.totals?.total} requirements met (${report.completion_pct}%)`,
                    });
                  } catch (e) {
                    console.error("Failed to parse report:", e);
                  }
                }
              }
            } else if (eventType === "blockchain_stored") {
              i++;
              if (i < lines.length - 1) {
                const dataLine = lines[i];
                if (dataLine.startsWith("data: ")) {
                  try {
                    const data = JSON.parse(dataLine.substring(6));
                    setBlockchainStatus(data.message);
                    setProgress(90);
                    setCurrentStage("Stored on blockchain");
                    setLogs((prev) => [...prev, `Blockchain: ${data.tx_hash}`]);
                  } catch (e) {
                    console.error("Failed to parse blockchain event:", e);
                  }
                }
              }
            } else if (eventType === "proof_cid") {
              i++;
              if (i < lines.length - 1) {
                const dataLine = lines[i];
                if (dataLine.startsWith("data: ")) {
                  try {
                    const data = JSON.parse(dataLine.substring(6));
                    setProofCid(data.proof_cid);
                    setProgress(92);
                    setCurrentStage("Proof uploaded to IPFS");
                    setLogs((prev) => [
                      ...prev,
                      `Proof CID: ${data.proof_cid}`,
                    ]);
                  } catch (e) {
                    console.error("Failed to parse proof_cid event:", e);
                  }
                }
              }
            } else if (eventType === "settlement_ready") {
              i++;
              if (i < lines.length - 1) {
                const dataLine = lines[i];
                if (dataLine.startsWith("data: ")) {
                  try {
                    const data = JSON.parse(dataLine.substring(6));
                    setProgress(94);
                    setCurrentStage("Settlement ready");
                    setLogs((prev) => [
                      ...prev,
                      `Settlement ready: ${data.winner_is_provider ? "Provider wins" : "Client refund"} (${data.completion_pct}%)`,
                    ]);
                  } catch (e) {
                    console.error("Failed to parse settlement_ready event:", e);
                  }
                }
              }
            } else if (eventType === "settlement_initiated") {
              i++;
              if (i < lines.length - 1) {
                const dataLine = lines[i];
                if (dataLine.startsWith("data: ")) {
                  try {
                    const data = JSON.parse(dataLine.substring(6));
                    setBlockchainStatus(`🤖 ${data.message}`);
                    setProgress(96);
                    setCurrentStage("Releasing funds...");
                    setLogs((prev) => [
                      ...prev,
                      `Settlement initiated: ${data.message}`,
                    ]);
                    toast.loading("Releasing Funds", {
                      description: "Submitting transaction to blockchain...",
                      id: "settlement-toast",
                    });
                  } catch (e) {
                    console.error(
                      "Failed to parse settlement_initiated event:",
                      e,
                    );
                  }
                }
              }
            } else if (eventType === "settlement_completed") {
              i++;
              if (i < lines.length - 1) {
                const dataLine = lines[i];
                if (dataLine.startsWith("data: ")) {
                  try {
                    const data = JSON.parse(dataLine.substring(6));
                    setSettlementCompleted(true);
                    setBlockchainStatus(`✅ ${data.message}`);
                    setProgress(100);
                    setCurrentStage("Settlement complete!");
                    setLogs((prev) => [
                      ...prev,
                      `✅ Automatic Settlement Completed: ${data.message}`,
                    ]);
                    toast.success("Funds Released!", {
                      description: data.message,
                      id: "settlement-toast",
                    });
                  } catch (e) {
                    console.error(
                      "Failed to parse settlement_completed event:",
                      e,
                    );
                  }
                }
              }
            } else if (eventType === "settlement_failed") {
              i++;
              if (i < lines.length - 1) {
                const dataLine = lines[i];
                if (dataLine.startsWith("data: ")) {
                  try {
                    const data = JSON.parse(dataLine.substring(6));
                    setSettlementCompleted(false);
                    setBlockchainStatus(`⚠️ ${data.message}`);
                    setLogs((prev) => [
                      ...prev,
                      `⚠️ Automatic Settlement Failed: ${data.error}`,
                    ]);
                    toast.error("Settlement Failed", {
                      description: data.error,
                      id: "settlement-toast",
                    });
                  } catch (e) {
                    console.error(
                      "Failed to parse settlement_failed event:",
                      e,
                    );
                  }
                }
              }
            } else if (eventType === "blockchain_error") {
              i++;
              if (i < lines.length - 1) {
                const dataLine = lines[i];
                if (dataLine.startsWith("data: ")) {
                  try {
                    const data = JSON.parse(dataLine.substring(6));
                    setBlockchainStatus(data.message);
                    setLogs((prev) => [
                      ...prev,
                      `Blockchain storage failed: ${data.error}`,
                    ]);
                  } catch (e) {
                    console.error("Failed to parse blockchain error:", e);
                  }
                }
              }
            } else if (eventType === "error") {
              i++;
              if (i < lines.length - 1) {
                const dataLine = lines[i];
                if (dataLine.startsWith("data: ")) {
                  try {
                    const data = JSON.parse(dataLine.substring(6));
                    setLogs((prev) => [...prev, `Error: ${data.error}`]);
                  } catch (e) {
                    console.error("Failed to parse error:", e);
                  }
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Verification failed:", error);
      setLogs((prev) => [
        ...prev,
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      ]);
      // Unlock files on error so user can retry
      setFilesLocked(false);
    } finally {
      setIsVerifying(false);
    }
  }, [files, requirements, requestId, buyerAddress]);

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div key="complete-work-modal">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 dark:bg-black/85 backdrop-blur-md z-[200]"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={SPRING}
              className="glass-macos rounded-3xl w-full max-w-2xl max-h-[85vh] pointer-events-auto shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b border-black/5 dark:border-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-serif font-bold text-black dark:text-white">
                      Complete &amp; Verify Work
                    </h2>
                    <p className="text-sm text-black/60 dark:text-white/60">
                      Upload deliverables for AI-powered verification
                    </p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    transition={SPRING}
                    onClick={onClose}
                    disabled={isVerifying}
                    className="w-10 h-10 rounded-full glass-macos glass-macos-hover flex items-center justify-center text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white disabled:opacity-50"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
                {/* File Upload Section — hidden once files are locked */}
                {!filesLocked && (
                  <div className="space-y-4">
                    {/* Drop zone */}
                    <label className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-black/10 dark:border-white/10 hover:border-cyan-500/40 dark:hover:border-cyan-500/40 transition-colors cursor-pointer glass-macos">
                      <Upload className="w-8 h-8 text-black/30 dark:text-white/30 mb-3" />
                      <p className="text-sm font-semibold text-black/70 dark:text-white/70">
                        Click to upload files
                      </p>
                      <p className="text-xs text-black/40 dark:text-white/40 mt-1">
                        Images, code, documents, or any deliverable
                      </p>
                      <input
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>

                    {/* Files List */}
                    {files.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-black/70 dark:text-white/70">
                          FILES TO VERIFY ({files.length})
                        </p>
                        {files.map((file, idx) => (
                          <div
                            key={`${file.name}-${idx}`}
                            className="flex items-center justify-between gap-2 glass-macos rounded-xl px-3 py-2"
                          >
                            <div className="flex items-center gap-2 truncate text-black dark:text-white">
                              {isImage(file) ? (
                                <ImageIcon className="w-4 h-4 text-black/50 dark:text-white/50 flex-shrink-0" />
                              ) : (
                                <FileText className="w-4 h-4 text-black/50 dark:text-white/50 flex-shrink-0" />
                              )}
                              <span className="text-sm truncate">
                                {file.name}
                              </span>
                              <span className="text-[10px] text-black/40 dark:text-white/40 flex-shrink-0">
                                {(file.size / 1024).toFixed(0)} KB
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(idx)}
                              className="text-black/40 dark:text-white/40 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Requirements Summary */}
                    <div className="glass-macos rounded-xl p-4">
                      <h3 className="text-xs font-semibold text-black/70 dark:text-white/70 mb-2">
                        REQUIREMENTS TO VERIFY
                      </h3>
                      <ul className="space-y-1">
                        {requirements.slice(0, 4).map((req, idx) => (
                          <li
                            key={idx}
                            className="text-xs text-black/60 dark:text-white/60 flex items-start gap-2"
                          >
                            <span className="text-cyan-500 mt-0.5">-</span>
                            <span className="truncate">
                              {req.substring(0, 80)}
                              {req.length > 80 ? "..." : ""}
                            </span>
                          </li>
                        ))}
                        {requirements.length > 4 && (
                          <li className="text-xs text-black/40 dark:text-white/40 italic pl-4">
                            +{requirements.length - 4} more
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Locked files indicator */}
                {filesLocked && (
                  <div className="glass-macos rounded-xl p-3 flex items-center gap-2 border border-amber-500/20">
                    <Lock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                      {files.length} file(s) locked for verification
                    </p>
                  </div>
                )}

                {/* Verification Progress */}
                {(isVerifying || logs.length > 0) && (
                  <div className="space-y-3">
                    {/* Progress Bar */}
                    {isVerifying && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-black/70 dark:text-white/70">
                            {currentStage || "Processing..."}
                          </p>
                          <p className="text-xs font-mono text-black/50 dark:text-white/50">
                            {progress}%
                          </p>
                        </div>
                        <div className="relative h-2 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                          />
                          {/* Animated shimmer effect */}
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                            animate={{
                              x: ["-100%", "200%"],
                            }}
                            transition={{
                              duration: 1.5,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                          />
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      {isVerifying && (
                        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
                      )}
                      <p className="text-xs font-semibold text-black/70 dark:text-white/70">
                        {isVerifying
                          ? "VERIFICATION IN PROGRESS"
                          : "VERIFICATION LOG"}
                      </p>
                    </div>
                    <div className="glass-macos rounded-xl p-4 max-h-64 overflow-y-auto custom-scrollbar bg-black/5 dark:bg-black/40">
                      {logs.map((log, idx) => (
                        <div
                          key={idx}
                          className="text-xs font-mono text-black/70 dark:text-white/70 py-0.5 leading-relaxed"
                        >
                          {log}
                        </div>
                      ))}
                      <div ref={logsEndRef} />
                    </div>
                  </div>
                )}

                {/* Detailed Agent Results */}
                {agentResults.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-black/70 dark:text-white/70">
                      AGENT FINDINGS ({agentResults.length} agent
                      {agentResults.length !== 1 ? "s" : ""})
                    </p>
                    {agentResults.map((agent) => {
                      const isExpanded = expandedAgents.has(agent.agent_name);
                      const passCount = agent.requirement_checks.filter(
                        (c) => c.checked,
                      ).length;
                      const totalCount = agent.requirement_checks.length;
                      return (
                        <div
                          key={agent.agent_name}
                          className="glass-macos rounded-xl overflow-hidden"
                        >
                          <button
                            type="button"
                            onClick={() => toggleAgent(agent.agent_name)}
                            className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5 text-black/50 dark:text-white/50" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-black/50 dark:text-white/50" />
                              )}
                              <span className="text-xs font-semibold text-black dark:text-white">
                                {agent.agent_name}
                              </span>
                            </div>
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-600 dark:text-cyan-400"
                            >
                              {totalCount} {totalCount === 1 ? "check" : "checks"}
                            </span>
                          </button>
                          {isExpanded && (
                            <div className="px-3 pb-3 space-y-1.5 border-t border-black/5 dark:border-white/5 pt-2">
                              {agent.requirement_checks.map((check, idx) => (
                                <div
                                  key={`${check.requirement}-${idx}`}
                                  className="glass-macos rounded-lg p-2 space-y-1"
                                >
                                  <div className="flex justify-between items-center gap-2">
                                    <span className="text-xs font-medium text-black dark:text-white truncate">
                                      {check.requirement || "Unnamed check"}
                                    </span>
                                    <span
                                      className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 bg-cyan-500/20 text-cyan-600 dark:text-cyan-400"
                                    >
                                      Checked
                                    </span>
                                  </div>
                                  {check.evidence && (
                                    <p className="text-[11px] text-black/50 dark:text-white/50 leading-relaxed pl-1">
                                      {check.evidence}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Result Section */}
                {result && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="glass-macos rounded-xl p-3">
                        <p className="text-[10px] text-black/50 dark:text-white/50">
                          Status
                        </p>
                        <p className="font-semibold capitalize text-sm text-black dark:text-white">
                          {result.overall_status}
                        </p>
                      </div>
                      <div className="glass-macos rounded-xl p-3">
                        <p className="text-[10px] text-black/50 dark:text-white/50">
                          Completion
                        </p>
                        <p className="font-semibold text-sm text-black dark:text-white">
                          {result.completion_pct}%
                        </p>
                      </div>
                      <div className="glass-macos rounded-xl p-3">
                        <p className="text-[10px] text-black/50 dark:text-white/50">
                          Confidence
                        </p>
                        <p className="font-semibold text-sm text-black dark:text-white">
                          {result.confidence_pct}%
                        </p>
                      </div>
                    </div>

                    <div className="glass-macos rounded-xl p-3 text-xs text-black/70 dark:text-white/70 border border-black/5 dark:border-white/5">
                      {result.summary}
                    </div>

                    {result.requirement_checks?.length > 0 && (
                      <div className="space-y-2">
                        {(() => {
                          const failedChecks = result.requirement_checks.filter(
                            (req) => !req.checked
                          );
                          const passedChecks = result.requirement_checks.filter(
                            (req) => req.checked
                          );

                          if (failedChecks.length > 0) {
                            return (
                              <div className="glass-macos rounded-xl p-4 border border-red-500/20">
                                <div className="flex items-start gap-2 mb-3">
                                  <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                  <div className="flex-1">
                                    <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-1">
                                      Work Not Completed Properly
                                    </p>
                                    <p className="text-xs text-black/60 dark:text-white/60">
                                      The service provider did not meet the following {failedChecks.length} requirement{failedChecks.length !== 1 ? "s" : ""}:
                                    </p>
                                  </div>
                                </div>
                                <ul className="space-y-2 pl-6">
                                  {failedChecks.map((req, idx) => (
                                    <li
                                      key={`failed-${idx}`}
                                      className="text-xs text-black/70 dark:text-white/70 list-disc"
                                    >
                                      <span className="font-medium">{req.requirement}</span>
                                      {req.evidence && req.evidence !== "No evidence provided" && (
                                        <p className="text-[11px] text-black/50 dark:text-white/50 mt-1 leading-relaxed">
                                          {req.evidence}
                                        </p>
                                      )}
                                      {(!req.evidence || req.evidence === "No evidence provided") && (
                                        <p className="text-[11px] text-red-500/70 dark:text-red-400/70 mt-1 leading-relaxed italic">
                                          This requirement was not addressed in the deliverables
                                        </p>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            );
                          } else {
                            return (
                              <div className="glass-macos rounded-xl p-4 border border-emerald-500/20">
                                <div className="flex items-start gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                                  <div className="flex-1">
                                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                                      All Requirements Met
                                    </p>
                                    <p className="text-xs text-black/60 dark:text-white/60">
                                      The service provider successfully completed all {passedChecks.length} requirement{passedChecks.length !== 1 ? "s" : ""}.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                        })()}
                      </div>
                    )}

                    {blockchainStatus && (
                      <div className={`glass-macos rounded-xl p-2 flex items-center gap-2 ${
                        settlementCompleted 
                          ? 'border border-emerald-500/20' 
                          : ''
                      }`}>
                        {settlementCompleted ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        ) : blockchainStatus.includes('⚠️') ? (
                          <X className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                        ) : (
                          <Loader2 className="w-3.5 h-3.5 text-cyan-500 animate-spin flex-shrink-0" />
                        )}
                        <p className="text-xs font-mono text-black/60 dark:text-white/60">
                          {blockchainStatus}
                        </p>
                      </div>
                    )}

                    {/* Auto-complete status indicator */}
                    {autoCompleteTriggered && !settlementCompleted && (
                      <div className="glass-macos rounded-xl p-3 flex items-center gap-2 border border-cyan-500/20">
                        <Loader2 className="w-4 h-4 text-cyan-500 animate-spin flex-shrink-0" />
                        <p className="text-xs font-semibold text-cyan-700 dark:text-cyan-400">
                          Completing transaction...
                        </p>
                      </div>
                    )}
                    
                    {settlementCompleted && autoCompleteTriggered && (
                      <div className="glass-macos rounded-xl p-3 flex items-center gap-2 border border-emerald-500/20">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                          Settlement complete! Refreshing...
                        </p>
                      </div>
                    )}
                    
                    {settlementTimeout && !settlementCompleted && (
                      <div className="glass-macos rounded-xl p-3 flex items-center gap-2 border border-amber-500/20">
                        <X className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                          Settlement is taking longer than expected. The transaction may still complete on-chain.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-black/5 dark:border-white/5 p-4 flex justify-end gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  disabled={isVerifying}
                  className="px-5 py-2.5 rounded-2xl glass-macos text-black/70 dark:text-white/70 font-semibold text-sm disabled:opacity-50"
                >
                  Close
                </motion.button>
                {!filesLocked && (
                  <motion.button
                    whileHover={files.length > 0 ? { scale: 1.02 } : {}}
                    whileTap={files.length > 0 ? { scale: 0.98 } : {}}
                    onClick={handleSubmit}
                    disabled={isVerifying || files.length === 0}
                    className={`px-6 py-2.5 rounded-2xl font-semibold text-sm flex items-center gap-2 transition-all ${
                      files.length > 0
                        ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
                        : "bg-gray-400/50 dark:bg-gray-600/50 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Submit &amp; Verify
                      </>
                    )}
                  </motion.button>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
