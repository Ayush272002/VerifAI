/**
 * @fileoverview Client-side search combining:
 *   - Semantic cosine similarity via all-MiniLM-L6-v2 embeddings (main thread),
 *   - Fuzzy matching via Fuse.js as an instant fallback while the model loads,
 *   - Exact substring boost for direct hits.
 *
 * The embedding model runs in the main thread using dynamic import to avoid
 * blocking initial page load. Model downloads once (23MB), cached forever.
 */

import Fuse, { type IFuseOptions } from "fuse.js";
import type { ResultData } from "@/components/search/ResultCard";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScoredResult {
  result: ResultData;
  /** Normalised relevance score in [0, 1]; higher is more relevant. */
  score: number;
}

export interface SearchIndex {
  /**
   * Resolves when all service embeddings have been computed.
   * Safe to call `search` before this — it will use fuzzy fallback.
   */
  ready: Promise<void>;
  /**
   * Searches services by query.
   *
   * @param query - The user's search string.
   * @returns Scored results sorted by relevance, highest first.
   */
  search: (query: string) => Promise<ScoredResult[]>;
}

// ---------------------------------------------------------------------------
// Fuse.js config — instant fallback while embeddings load
// ---------------------------------------------------------------------------

const FUSE_OPTIONS: IFuseOptions<ResultData> = {
  keys: [
    { name: "title",         weight: 0.45 },
    { name: "tags",          weight: 0.30 },
    { name: "category",      weight: 0.20 },
    { name: "provider.name", weight: 0.05 },
  ],
  includeScore:       true,
  threshold:          0.4,
  ignoreLocation:     true,
  minMatchCharLength: 2,
};

// ---------------------------------------------------------------------------
// Embedding model (lazy-loaded)
// ---------------------------------------------------------------------------

type EmbedPipeline = Awaited<ReturnType<typeof import("@xenova/transformers").pipeline>>;

let embedder: EmbedPipeline | null = null;

/**
 * Lazily loads the embedding pipeline via dynamic import.
 * The model downloads once (23MB) and is cached by the browser.
 *
 * @returns The feature-extraction pipeline instance.
 */
const getEmbedder = async (): Promise<EmbedPipeline> => {
  if (!embedder) {
    console.log("→ Loading embedding model (all-MiniLM-L6-v2, ~23MB)...");
    
    // Dynamic import with proper error handling for ESM/CJS interop
    // Patch Object.keys temporarily to safely handle Next.js Turbopack yielding undefined for fs/path fallbacks
    const originalKeys = Object.keys;
    Object.keys = function(obj: any) {
      if (obj === undefined || obj === null) return [];
      return originalKeys(obj);
    } as any;
    
    let transformers;
    try {
      transformers = await import("@xenova/transformers");
    } finally {
      Object.keys = originalKeys;
    }
    
    const { pipeline, env } = transformers.default || transformers;
    
    // Force WASM backend — Node ONNX runtime won't work in browser
    if (env?.backends?.onnx?.wasm) {
      env.backends.onnx.wasm.proxy = false;
    }
    if (env) {
      env.allowLocalModels = false;
    }
    
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    console.log("✓ Embedding model loaded successfully");
  }
  return embedder;
};

/**
 * Mean-pools a raw tensor output across the sequence dimension,
 * then L2-normalises so dot product equals cosine similarity.
 *
 * @param output - Raw tensor from the pipeline.
 * @returns Normalised embedding vector.
 */
const toVector = (output: { data: Float32Array; dims: number[] }): number[] => {
  const [, seqLen, hiddenSize] = output.dims;
  const vector = new Array<number>(hiddenSize).fill(0);

  for (let t = 0; t < seqLen; t++) {
    for (let h = 0; h < hiddenSize; h++) {
      vector[h] += output.data[t * hiddenSize + h];
    }
  }

  for (let h = 0; h < hiddenSize; h++) vector[h] /= seqLen;

  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  return norm === 0 ? vector : vector.map((v) => v / norm);
};

/**
 * Embeds a batch of texts into normalised vectors.
 *
 * @param texts - Strings to embed.
 * @returns Array of normalised float vectors, one per input text.
 */
const embedTexts = async (texts: string[]): Promise<number[][]> => {
  const embed = await getEmbedder();
  const vectors = await Promise.all(
    texts.map(async (text) => {
      const output = await embed(text, { pooling: "none", normalize: false });
      // Type assertion needed because pipeline output type is a union
      return toVector(output as { data: Float32Array; dims: number[] });
    }),
  );
  return vectors;
};

// ---------------------------------------------------------------------------
// Cosine similarity (dot product of pre-normalised vectors)
// ---------------------------------------------------------------------------

/**
 * Computes cosine similarity between two L2-normalised vectors.
 *
 * @param a - Normalised embedding vector.
 * @param b - Normalised embedding vector.
 * @returns Similarity score in [0, 1].
 */
const cosine = (a: number[], b: number[]): number => {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return Math.max(0, dot);  // clamp negative similarity to 0
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Builds a search index for the given services.
 * Kicks off embedding computation in the background immediately.
 *
 * @param services - All available services to index.
 * @returns A `SearchIndex` with a `ready` promise and a `search` method.
 */
export const createSearchIndex = (services: ResultData[]): SearchIndex => {
  const fuse = new Fuse(services, FUSE_OPTIONS);

  // One text blob per service — what the model will embed
  const docTexts = services.map(({ title, category, tags, provider }) =>
    [title, category, ...tags, provider.name].join(" "),
  );

  // Will be populated once embeddings finish
  let docVectors: number[][] | null = null;

  // Start embedding all service docs in the background immediately
  const ready = embedTexts(docTexts)
    .then((vectors) => {
      docVectors = vectors;
      console.log(`✓ Indexed ${vectors.length} services with semantic embeddings`);
    })
    .catch((err) => {
      console.error("✗ Embedding failed, falling back to fuzzy-only:", err);
    });

  const search = async (query: string): Promise<ScoredResult[]> => {
    const trimmed = query.trim();
    if (!trimmed) return services.map((result) => ({ result, score: 1 }));

    const lower = trimmed.toLowerCase();

    // --- Fuzzy scores (always available, instant) ---
    const fuseHits = fuse.search(trimmed);
    const fuzzyMap = new Map<string, number>();
    for (const { item, score } of fuseHits) {
      fuzzyMap.set(item.id, 1 - (score ?? 1));  // invert: 1 = perfect match
    }

    // --- Semantic scores (only if embeddings are ready) ---
    let semanticMap = new Map<string, number>();

    if (docVectors) {
      try {
        const [queryVec] = await embedTexts([trimmed]);
        semanticMap = new Map(
          services.map((svc, i) => [svc.id, cosine(queryVec, docVectors![i])]),
        );
      } catch (err) {
        console.error("✗ Query embedding failed:", err);
      }
    }

    const usesSemantic = semanticMap.size > 0;

    const scored: ScoredResult[] = services.map((service, i) => {
      const fuzzy    = fuzzyMap.get(service.id)    ?? 0;
      const semantic = semanticMap.get(service.id) ?? 0;
      const docText  = docTexts[i].toLowerCase();
      const exactBoost = docText.includes(lower) ? 0.2 : 0;

      const score = usesSemantic
        ? semantic * 0.65 + fuzzy * 0.20 + exactBoost * 0.15
        : fuzzy   * 0.80 +                 exactBoost * 0.20;

      return { result: service, score };
    });

    // In fuzzy-only mode, if nothing matched at all (e.g. "diet" vs "cooking"
    // — zero lexical overlap) return everything rather than an empty list.
    // Semantic mode will handle conceptual matches once the model is ready.
    const anyFuzzyHit = scored.some(({ score }) => score > 0);

    if (!usesSemantic && !anyFuzzyHit) {
      return services.map((result) => ({ result, score: 0 }));
    }

    return scored
      .filter(({ score }) => score > (usesSemantic ? 0.05 : 0))
      .sort((a, b) => b.score - a.score);
  };

  return { ready, search };
};
