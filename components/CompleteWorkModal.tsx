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
} from "lucide-react";

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
  const [isVerifying, setIsVerifying] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [blockchainStatus, setBlockchainStatus] = useState<string>("");
  const [proofCid, setProofCid] = useState<string>("");

  // Auto-scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const isImage = (file: File) =>
    file.type.startsWith("image/") ||
    /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name);

  const handleSubmit = useCallback(async () => {
    if (files.length === 0) return;

    setIsVerifying(true);
    setLogs(["Starting verification process..."]);
    setResult(null);
    setBlockchainStatus("");

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });
      formData.append("requirements", JSON.stringify(requirements));
      formData.append("requestId", requestId);
      formData.append("buyerAddress", buyerAddress);

      const response = await fetch(
        "/api/agent/work/complete-and-verify/stream",
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
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
                    setLogs((prev) => [
                      ...prev,
                      `${data.stage}: ${data.message}`,
                    ]);
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
            } else if (eventType === "report") {
              i++;
              if (i < lines.length - 1) {
                const dataLine = lines[i];
                if (dataLine.startsWith("data: ")) {
                  try {
                    const report = JSON.parse(dataLine.substring(6));
                    setResult(report);
                    setLogs((prev) => [
                      ...prev,
                      `Verification Complete`,
                      `   Status: ${report.overall_status}`,
                      `   Confidence: ${report.confidence_pct}%`,
                      `   Requirements: ${report.totals?.completed}/${report.totals?.total} passed`,
                    ]);
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
                    setLogs((prev) => [
                      ...prev,
                      `Blockchain: ${data.tx_hash}`,
                    ]);
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
                    setLogs((prev) => [
                      ...prev,
                      `Proof CID: ${data.proof_cid}`,
                    ]);
                  } catch (e) {
                    console.error("Failed to parse proof_cid event:", e);
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
                {/* File Upload Section */}
                {!isVerifying && !result && (
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
                        disabled={isVerifying}
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

                {/* Verification Progress */}
                {(isVerifying || logs.length > 0) && (
                  <div className="space-y-3">
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
                      <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                        {result.requirement_checks.map((req, idx) => (
                          <div
                            key={`${req.requirement}-${idx}`}
                            className="glass-macos rounded-lg p-2 flex justify-between items-center gap-2"
                          >
                            <span
                              className="text-xs truncate font-medium text-black dark:text-white"
                              title={req.requirement}
                            >
                              {req.requirement}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                                req.checked
                                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                  : "bg-red-500/20 text-red-600 dark:text-red-400"
                              }`}
                            >
                              {req.checked ? "Pass" : "Fail"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {blockchainStatus && (
                      <div className="glass-macos rounded-xl p-2 flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        <p className="text-xs font-mono text-black/60 dark:text-white/60">
                          {blockchainStatus}
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
                {!result && (
                  <motion.button
                    whileHover={
                      !isVerifying && files.length > 0 ? { scale: 1.02 } : {}
                    }
                    whileTap={
                      !isVerifying && files.length > 0 ? { scale: 0.98 } : {}
                    }
                    onClick={handleSubmit}
                    disabled={isVerifying || files.length === 0}
                    className={`px-6 py-2.5 rounded-2xl font-semibold text-sm flex items-center gap-2 transition-all ${
                      !isVerifying && files.length > 0
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
                {result && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      if (onComplete && proofCid) {
                        onComplete(result, proofCid);
                      }
                      onClose();
                    }}
                    className="px-6 py-2.5 rounded-2xl font-semibold text-sm bg-gradient-to-r from-emerald-500 to-teal-500 text-white flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Lock Evidence &amp; Settle
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
