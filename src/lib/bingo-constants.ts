import type { BingoCategory, BingoDifficulty } from "@/types/bingo";

export const BINGO_GRID_SIZE = 5;
export const BINGO_CENTER_INDEX = 12;
export const BINGO_CELLS_PER_CARD = 24;
export const BINGO_LINE_BONUS = 10;

export const BINGO_POINTS: Record<BingoDifficulty, number> = {
  common: 1,
  rare: 3,
  legendary: 5
};

export const BINGO_DIFFICULTY_META: Record<BingoDifficulty, { emoji: string; label: string; color: string }> = {
  common: { emoji: "🟢", label: "Commun", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  rare: { emoji: "🟠", label: "Rare", color: "bg-amber-100 text-amber-800 border-amber-200" },
  legendary: { emoji: "🔴", label: "Légendaire", color: "bg-rose-100 text-rose-800 border-rose-200" }
};

export const BINGO_CATEGORY_META: Record<BingoCategory, { emoji: string; label: string }> = {
  social: { emoji: "🗣️", label: "Social" },
  travel: { emoji: "✈️", label: "Voyage" },
  group: { emoji: "👥", label: "Groupe" },
  istanbul: { emoji: "🕌", label: "Istanbul" },
  custom: { emoji: "✨", label: "Custom" }
};

export const DEFAULT_BINGO_CHALLENGES: Array<{
  title: string;
  description: string;
  category: BingoCategory;
  difficulty: BingoDifficulty;
}> = [
  { title: "Faire rire un serveur", description: "Fais rire quelqu'un qui te sert.", category: "social", difficulty: "common" },
  { title: "Prénom d'un inconnu", description: "Obtiens le prénom d'une personne que tu ne connaissais pas.", category: "social", difficulty: "rare" },
  { title: "Compliment sincère", description: "Fais un compliment à quelqu'un.", category: "social", difficulty: "common" },
  { title: "Coucher de soleil", description: "Admire un coucher de soleil en photo.", category: "travel", difficulty: "common" },
  { title: "Transport inhabituel", description: "Prends un moyen de transport original.", category: "travel", difficulty: "rare" },
  { title: "Objet couleur imposée", description: "Trouve un objet d'une couleur choisie par le groupe.", category: "travel", difficulty: "common" },
  { title: "Selfie de groupe", description: "Prends un selfie avec au moins 3 amis du voyage.", category: "group", difficulty: "common" },
  { title: "Chant surprise", description: "Fais chanter un membre du groupe en public.", category: "group", difficulty: "rare" },
  { title: "Mot codé", description: "Fais dire un mot précis à un ami sans qu'il comprenne le piège.", category: "group", difficulty: "legendary" },
  { title: "Thé turc", description: "Boire un thé turc authentique.", category: "istanbul", difficulty: "common" },
  { title: "Traverser le Bosphore", description: "Traverse le Bosphore en ferry ou pont.", category: "istanbul", difficulty: "rare" },
  { title: "Chat dormeur", description: "Photographie un chat istanbulite en pleine sieste.", category: "istanbul", difficulty: "common" },
  { title: "Lokum tasting", description: "Goûter un lokum local.", category: "istanbul", difficulty: "common" },
  { title: "Marché local", description: "Achète quelque chose dans un marché.", category: "istanbul", difficulty: "common" },
  { title: "Mosquée majeure", description: "Visite une mosquée historique.", category: "istanbul", difficulty: "rare" },
  { title: "Street food", description: "Goûte un street food local.", category: "istanbul", difficulty: "common" },
  { title: "Panorama rooftop", description: "Trouve une vue panoramique sur la ville.", category: "travel", difficulty: "rare" },
  { title: "Photo miroir", description: "Photo créative avec reflet ou miroir.", category: "travel", difficulty: "common" },
  { title: "Danse spontanée", description: "Danse 10 secondes dans un lieu public.", category: "social", difficulty: "legendary" },
  { title: "Carte postale", description: "Envoie ou achète une carte postale du voyage.", category: "travel", difficulty: "common" },
  { title: "Blague locale", description: "Raconte une blague avec un accent local.", category: "group", difficulty: "rare" },
  { title: "Souvenir insolite", description: "Trouve le souvenir le plus bizarre possible.", category: "travel", difficulty: "rare" },
  { title: "Douceur orientale", description: "Goûte une pâtisserie orientale.", category: "istanbul", difficulty: "common" },
  { title: "Bateau du Bosphore", description: "Prends une photo depuis un bateau.", category: "istanbul", difficulty: "legendary" },
  { title: "High five étranger", description: "Fais un high five à un inconnu.", category: "social", difficulty: "rare" },
  { title: "Menu en turc", description: "Commande quelque chose en montrant un menu turc.", category: "istanbul", difficulty: "legendary" }
];
