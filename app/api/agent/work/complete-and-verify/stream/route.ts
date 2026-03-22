/**
 * API route: POST /api/agent/work/complete-and-verify/stream
 *
 * Proxies file uploads and verification requests to the backend
 * FastAPI endpoint at POST /agent/work/complete-and-verify/stream.
 *
 * Streams the raw request body through to avoid FormData re-serialization
 * issues in Next.js Turbopack (which can drop file content or break
 * multipart boundaries).
 */

import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
  const endpoint = `${backendUrl}/agent/work/complete-and-verify/stream`;

  try {
    // Pass the raw request body + original Content-Type straight through
    // so the multipart boundaries and file data are preserved exactly.
    const contentType = request.headers.get("Content-Type") || "";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": contentType },
      body: request.body,
      // @ts-expect-error -- duplex is required for streaming request bodies in Node >=18
      duplex: "half",
    });

    if (!response.ok) {
      console.error(
        `Backend error: ${response.status} ${response.statusText}`,
      );
      const errorBody = await response.text().catch(() => "");
      return new Response(
        errorBody ||
          JSON.stringify({
            error: `Backend error: ${response.status} ${response.statusText}`,
          }),
        {
          status: response.status,
          headers: {
            "Content-Type":
              response.headers.get("Content-Type") || "application/json",
          },
        },
      );
    }

    // Stream the SSE response back to the client
    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
