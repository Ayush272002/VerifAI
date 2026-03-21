export const GIG_CATEGORIES = [
  "Web Development",
  "Design & Creative",
  "Content Writing",
  "Marketing",
  "Consulting",
  "Blockchain Development",
  "Mobile Development",
  "Video & Animation",
  "Data Science & AI",
] as const;

export const CATEGORY_PLACEHOLDER_IMAGES: Record<string, string[]> = {
  "Web Development": [
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=1200&q=80",
  ],
  "Design & Creative": [
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1496346651079-6ca5cb67f42f?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1535909339361-7f5f4cbf49e8?auto=format&fit=crop&w=1200&q=80",
  ],
  "Content Writing": [
    "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1200&q=80",
  ],
  "Marketing": [
    "https://images.unsplash.com/photo-1542744094-24638cff5f96?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80",
  ],
  "Consulting": [
    "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1517142089942-ba376ce32a82?auto=format&fit=crop&w=1200&q=80",
  ],
  "Blockchain Development": [
    "https://images.unsplash.com/photo-1551273336-6a36549ae2d1?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1518779578993-ec3579fee39f?auto=format&fit=crop&w=1200&q=80",
  ],
  "Mobile Development": [
    "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=1200&q=80",
  ],
  "Video & Animation": [
    "https://images.unsplash.com/photo-1505253213530-137f2db32d98?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1436450412740-2a6a5f2755e0?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1437750769464-6d41e08e8bdf?auto=format&fit=crop&w=1200&q=80",
  ],
  "Data Science & AI": [
    "https://images.unsplash.com/photo-1526379095098-07d7b7b58b0d?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1508385082359-fd5399948f17?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1504805572947-34fad45aed93?auto=format&fit=crop&w=1200&q=80",
  ],
};

export function getRandomPlaceholderImage(category: string): string {
  const candidateImages = CATEGORY_PLACEHOLDER_IMAGES[category];
  if (!candidateImages || candidateImages.length === 0) {
    return "https://images.unsplash.com/photo-1501630834273-4b5604d2ee31?auto=format&fit=crop&w=1200&q=80";
  }
  const idx = Math.floor(Math.random() * candidateImages.length);
  return candidateImages[idx];
}
