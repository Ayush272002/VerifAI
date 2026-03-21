export const GIG_CATEGORIES = [
  "Art & Design",
  "Business",
  "Programming & Tech",
  "Marketing",
  "Writing & Translation",
  "Video & Animation",
  "Photography",
  "Music & Audio",
  "Data Science & AI",
  "Education & Tutoring",
  "Lifestyle & Hobbies"
] as const;

export const CATEGORY_PLACEHOLDER_IMAGES: Record<string, string[]> = {
  "Art & Design": [
    "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1660092626225-f291ab2970b9?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1611241893603-3c359704e0ee?auto=format&fit=crop&w=1200&q=80"
  ],
  "Business": [
    "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80"
  ],
  "Programming & Tech": [
    "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1508830524289-0adcbe822b40?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1534665482403-a909d0d97c67?auto=format&fit=crop&w=1200&q=80",
  ],
  "Marketing": [
    "https://images.unsplash.com/photo-1533750349088-cd871a92f312?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/vector-1761384981242-d241755c4da4?auto=format&fit=crop&w=1200&q=80"
  ],
  "Writing & Translation": [
    "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1676302477502-fa8a634aaa8e?auto=format&fit=crop&w=1200&q=80",
  ],
  "Video & Animation": [
    "https://images.unsplash.com/photo-1528109966604-5a6a4a964e8d?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1530712024539-ecd73dfb1c9d?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1628494391268-c9935bc384d5?auto=format&fit=crop&w=1200&q=80"
  ],
  "Photography": [
    "https://images.unsplash.com/photo-1558185348-c1e6420f12d2?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1523698120758-030a38a90d16?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=80"
  ],
  "Music & Audio": [
    "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80"
  ],
  "Data Science & AI": [
    "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1727434032773-af3cd98375ba?auto=format&fit=crop&w=1200&q=80",
  ],
  "Education & Tutoring": [
    "https://images.unsplash.com/photo-1580894732930-0babd100d356?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1532619187608-e5375cab36aa?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1676302447092-14a103558511?auto=format&fit=crop&w=1200&q=80"
  ],
  "Lifestyle & Hobbies": [
    "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=80"
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
