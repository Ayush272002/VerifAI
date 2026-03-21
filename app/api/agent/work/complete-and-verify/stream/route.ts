/**
 * API route: POST /api/agent/work/complete-and-verify/stream
 *
 * Proxies file uploads and verification requests to the backend
 * FastAPI endpoint at POST /agent/work/complete-and-verify/stream
 */

import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Get form data from request
    const formData = await request.formData();

    // Forward to backend
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    const endpoint = `${backendUrl}/agent/work/complete-and-verify/stream`;

    console.log(`Proxying to backend: ${endpoint}`);

    const response = await fetch(endpoint, {
      method: "POST",
      body: formData,
      // Don't set Content-Type header - let fetch handle it with FormData
    });

    if (!response.ok) {
      console.error(`Backend error: ${response.status} ${response.statusText}`);
      return new Response(
        JSON.stringify({
          error: `Backend error: ${response.status} ${response.statusText}`,
        }),
        {
          status: response.status,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Stream the response
    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("API error:", error);
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
