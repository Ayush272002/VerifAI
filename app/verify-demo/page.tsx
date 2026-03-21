/**
 * @fileoverview Verification Demo Page
 *
 * Two-stage multi-file verification: uploads files of any type,
 * runs content analysis per file, then verifies requirements
 * strictly against gathered evidence.
 */

"use client";

import {
  ArrowLeft,
  FileText,
  ImageIcon,
  Loader2,
  Scale,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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

/** Maps common file extensions to MIME types for content_type. */
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

/** Converts a File to base64 in chunks to avoid call-stack overflow. */
const fileToBase64 = async (file: File): Promise<string> => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const CHUNK = 8192;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
};

const VerificationDemoPage = (): React.JSX.Element => {
  const [requirementsText, setRequirementsText] = useState(
    "Functions have return type hints\nPublic methods include docstrings\nCode is readable and maintainable",
  );
  const [sellerProfile, setSellerProfile] = useState("Python backend engineer");
  const [offerText, setOfferText] = useState(
    "Code review and implementation support",
  );

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [analyses, setAnalyses] = useState<FileAnalysis[]>([]);
  const [streamingOutput, setStreamingOutput] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStage, setCurrentStage] = useState<StageInfo | null>(null);
  const streamScrollRef = useRef<HTMLDivElement>(null);

  const requirements = useMemo(() => {
    return requirementsText
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean);
  }, [requirementsText]);

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
    //  Reset input so re-selecting same file triggers change
    event.target.value = "";
  };

  const removeFile = (index: number): void => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  /**
   * Consumes SSE stream from unified verify endpoint.
   * Handles: stage, token, analysis, and report events.
   */
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
            setResult(reportData);
            setIsStreaming(false);
            setCurrentStage(null); // Clear stage indicator once the final report arrives
          }
        } catch {
          // Malformed chunk; skip
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

  /** Builds file payloads and calls the unified verify endpoint. */
  const handleSubmit = async (): Promise<void> => {
    if (requirements.length === 0) {
      setErrorMessage("Please add at least one requirement.");
      return;
    }
    if (uploadedFiles.length === 0) {
      setErrorMessage("Please upload at least one file.");
      return;
    }

    try {
      setIsSubmitting(true);
      setIsStreaming(true);
      setErrorMessage("");
      setResult(null);
      setAnalyses([]);
      setStreamingOutput("");
      setCurrentStage(null);

      //  Build payloads: text files as raw content, images as base64
      const filePayloads = await Promise.all(
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

      const body = {
        requirements_list: requirements.map((item) => ({ requirement: item })),
        seller_profile: sellerProfile,
        what_they_offer: offerText,
        seller_description: sellerProfile, // Intentionally minimal
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
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col bg-background">
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-70 transition-opacity"
          >
            <Scale className="w-6 h-6" />
            <span className="font-serif text-xl tracking-tight">VerifAI</span>
          </Link>
          <Button variant="outline" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
          </Button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 grid lg:grid-cols-3 gap-6">
        {/* --- Input Panel --- */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="font-serif text-2xl">
              Verification Demo
            </CardTitle>
            <CardDescription>
              Upload files (code, images, text), set requirements, then verify.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Requirements (one per line)
              </label>
              <textarea
                value={requirementsText}
                onChange={(event) => setRequirementsText(event.target.value)}
                className="w-full min-h-28 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Seller Profile</label>
              <input
                value={sellerProfile}
                onChange={(event) => setSellerProfile(event.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">What They Offer</label>
              <input
                value={offerText}
                onChange={(event) => setOfferText(event.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            {/* Multi-file upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Upload Files (code, images, text — any supported type)
              </label>
              <input
                type="file"
                multiple
                onChange={handleFilesChange}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              {uploadedFiles.length > 0 && (
                <div className="space-y-1 mt-2">
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-xs"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        {(file.type || inferContentType(file.name)).startsWith(
                          "image/",
                        ) ? (
                          <ImageIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        )}
                        <span className="truncate">{file.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    {uploadedFiles.length} file(s) ready for verification
                  </p>
                </div>
              )}
            </div>

            {errorMessage ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {errorMessage}
              </div>
            ) : null}

            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Running Verification...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Run Verification
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* --- Streaming Output Panel --- */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="font-serif text-lg">Live Output</CardTitle>
            <CardDescription>
              Two-stage pipeline: content analysis, then requirement
              verification.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isStreaming && !streamingOutput ? (
              <p className="text-sm text-muted-foreground">
                Submit to see streaming output here.
              </p>
            ) : (
              <>
                {currentStage && (
                  <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                    {currentStage.message}
                  </div>
                )}
                <div
                  ref={streamScrollRef}
                  className="rounded-md border border-border/50 bg-muted/30 p-3 min-h-96 max-h-96 overflow-y-auto font-mono text-xs relative"
                >
                  <div className="text-foreground/80 whitespace-pre-wrap overflow-wrap-break-word">
                    {streamingOutput}
                  </div>
                  {isStreaming && (
                    <div className="absolute bottom-2 right-2">
                      <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                        Processing...
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Per-file analyses */}
            {analyses.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Content Analyses ({analyses.length} file(s))
                </p>
                {analyses.map((a, idx) => (
                  <div
                    key={`analysis-${idx}`}
                    className="rounded-md border p-2 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{a.file_name}</span>
                      <span className="text-muted-foreground capitalize">
                        {a.media_type}
                      </span>
                    </div>
                    <p className="text-muted-foreground">{a.summary}</p>
                    {a.key_elements.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {a.key_elements.map((el, elIdx) => (
                          <span
                            key={`el-${elIdx}`}
                            className="rounded-full border px-1.5 py-0.5 text-[10px]"
                          >
                            {el}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* --- Results Panel --- */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="font-serif text-lg">Results</CardTitle>
            <CardDescription>
              Completion percentage, confidence, and requirement checklist.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!result ? (
              <p className="text-sm text-muted-foreground">
                Submit the form to see results here.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="font-semibold capitalize">
                      {result.overall_status}
                    </p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Completion</p>
                    <p className="font-semibold">{result.completion_pct}%</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Confidence</p>
                    <p className="font-semibold">{result.confidence_pct}%</p>
                  </div>
                </div>

                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground mb-1">Summary</p>
                  <p className="text-sm">{result.summary}</p>
                </div>

                <div className="rounded-md border p-3 max-h-80 overflow-y-auto">
                  <p className="text-xs text-muted-foreground mb-2">
                    Checklist
                  </p>
                  <div className="space-y-2">
                    {result.requirement_checks.map((item) => (
                      <div
                        key={item.requirement}
                        className="rounded-md border p-2"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium">
                            {item.requirement}
                          </p>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full border ${
                              item.checked
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-400/40"
                                : "bg-amber-500/10 text-amber-600 border-amber-400/40"
                            }`}
                          >
                            {item.checked ? "Pass" : "Fail"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.evidence}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Completed {result.totals.completed} / {result.totals.total}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default VerificationDemoPage;
