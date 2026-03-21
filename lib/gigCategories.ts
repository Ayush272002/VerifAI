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
    "https://images.unsplash.com/photo-1561080654-d19cf473dfa8?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1453932194208-de5f1ea83d77?auto=format&fit=crop&w=1200&q=80",
  ],
  "Business": [
    "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1552664852-6caa0e4b6b46?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80",
  ],
  "Programming & Tech": [
    "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1633356122544-f134324ef6db?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80",
  ],
  "Marketing": [
    "https://images.unsplash.com/photo-1533492412633-aeb3ce811352?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80",
  ],
  "Writing & Translation": [
    "https://images.unsplash.com/photo-1455849318743-687233b62ae9?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1471879832106-c7ab9019e38b?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1507842217343-583f7270bfba?auto=format&fit=crop&w=1200&q=80",
  ],
  "Video & Animation": [
    "https://images.unsplash.com/photo-1533928298208-27ff66555d0d?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1502876851512-8bacfe45b265?auto=format&fit=crop&w=1200&q=80",
  ],
  "Photography": [
    "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1644571185769-e43bc066da94?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1535684447556-c34a0c1b2fe9?auto=format&fit=crop&w=1200&q=80",
  ],
  "Music & Audio": [
    "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1200&q=80",
  ],
  "Data Science & AI": [
    "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1537503072185-a4aa3ba29303?auto=format&fit=crop&w=1200&q=80",
  ],
  "Education & Tutoring": [
    "https://images.unsplash.com/photo-1524178232363-1601bc915a50?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1427504494785-cdafb3d3b798?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1456628949884-6ac28204b76a?auto=format&fit=crop&w=1200&q=80",
  ],
  "Lifestyle & Hobbies": [
    "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1517836357463-d25ddfcbf042?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80",
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
