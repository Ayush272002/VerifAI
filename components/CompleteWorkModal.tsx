"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";

interface VerificationResult {
  modality: string;
  overall_status: string;
  completion_pct: number;
  confidence_pct: number;
  summary: string;
  totals: {
    completed: number;
    total: number;
  };
}

interface CompleteWorkModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: string;
  requirements: string[];
  buyerAddress: string;
}

export function CompleteWorkModal({
  isOpen,
  onClose,
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

  const handleSubmit = useCallback(async () => {
    if (files.length === 0) {
      alert("Please upload at least one file");
      return;
    }

    setIsVerifying(true);
    setLogs(["🚀 Starting verification process..."]);
    setResult(null);
    setBlockchainStatus("");

    try {
      // Create FormData for file upload
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });
      formData.append("requirements", JSON.stringify(requirements));
      formData.append("requestId", requestId);
      formData.append("buyerAddress", buyerAddress);

      // Call backend endpoint with streaming response
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

        // Keep the last incomplete line in the buffer
        buffer = lines[lines.length - 1];

        // Process complete lines
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i];

          if (line.startsWith("event: ")) {
            const eventType = line.substring(7);

            if (eventType === "stage") {
              // Next line should be data
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
                      `📄 ${data.file_name}: ${data.summary}`,
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
                      `🤖 Agent #${data.agent_id} assigned to ${data.criteria_count} requirements`,
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
                      `✅ Verification Complete`,
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
                    setBlockchainStatus(`✓ ${data.message}`);
                    setLogs((prev) => [
                      ...prev,
                      `📦 Blockchain: ${data.tx_hash}`,
                    ]);
                  } catch (e) {
                    console.error("Failed to parse blockchain event:", e);
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
                    setBlockchainStatus(`⚠ ${data.message}`);
                    setLogs((prev) => [
                      ...prev,
                      `⚠ Blockchain storage failed: ${data.error}`,
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
                    setLogs((prev) => [...prev, `❌ Error: ${data.error}`]);
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
        `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      ]);
    } finally {
      setIsVerifying(false);
    }
  }, [files, requirements, requestId, buyerAddress]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Complete & Verify Work</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload Section */}
          {!isVerifying && !result && (
            <div className="space-y-3">
              <label className="block text-sm font-medium">
                Upload Deliverables
              </label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6">
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  disabled={isVerifying}
                  className="w-full"
                />
              </div>

              {/* Files List */}
              {files.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Files to upload:
                  </label>
                  {files.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center p-2 bg-slate-100 rounded text-sm"
                    >
                      <span>{file.name}</span>
                      <button
                        onClick={() => removeFile(idx)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Requirements Summary */}
              <Card className="p-4 bg-blue-50">
                <h3 className="text-sm font-semibold mb-2">Requirements:</h3>
                <ul className="text-xs space-y-1">
                  {requirements.slice(0, 3).map((req, idx) => (
                    <li key={idx} className="text-slate-700">
                      • {req.substring(0, 60)}...
                    </li>
                  ))}
                  {requirements.length > 3 && (
                    <li className="text-slate-600 italic">
                      +{requirements.length - 3} more requirements
                    </li>
                  )}
                </ul>
              </Card>
            </div>
          )}

          {/* Verification Progress Section */}
          {(isVerifying || logs.length > 0) && (
            <div className="space-y-3">
              <label className="text-sm font-medium">
                Verification Progress:
              </label>
              <Card className="p-4 bg-slate-50 max-h-96 overflow-y-auto">
                {logs.map((log, idx) => (
                  <div
                    key={idx}
                    className="text-xs font-mono text-slate-700 py-1"
                  >
                    {log}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </Card>
            </div>
          )}

          {/* Result Section */}
          {result && (
            <div className="space-y-3">
              <Card
                className={`p-4 ${
                  result.confidence_pct >= 80
                    ? "bg-green-50 border-green-200"
                    : "bg-yellow-50 border-yellow-200"
                }`}
              >
                <h3 className="font-semibold mb-3">Verification Result</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-600">Status:</span>
                    <p className="font-semibold text-slate-900">
                      {result.overall_status}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-600">Confidence:</span>
                    <p className="font-semibold text-slate-900">
                      {result.confidence_pct}%
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-600">Completion:</span>
                    <p className="font-semibold text-slate-900">
                      {result.completion_pct}%
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-600">Requirements:</span>
                    <p className="font-semibold text-slate-900">
                      {result.totals.completed}/{result.totals.total}
                    </p>
                  </div>
                </div>
                <div className="mt-3 p-2 bg-white rounded text-xs">
                  <p className="text-slate-700">{result.summary}</p>
                </div>
              </Card>

              {blockchainStatus && (
                <Card className="p-3 bg-slate-100">
                  <p className="text-xs font-mono">{blockchainStatus}</p>
                </Card>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isVerifying}>
              Close
            </Button>
            {!result && (
              <Button
                onClick={handleSubmit}
                disabled={isVerifying || files.length === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isVerifying ? "Verifying..." : "Submit & Verify"}
              </Button>
            )}
            {result && (
              <Button
                onClick={onClose}
                className="bg-green-600 hover:bg-green-700"
              >
                Done
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
