import type { BingoCategory, BingoDifficulty } from "@/types/bingo";
import type { DestinationId } from "@/lib/destinations";

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
  common: { emoji: "🟢", label: "Common", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  rare: { emoji: "🟠", label: "Rare", color: "bg-amber-100 text-amber-800 border-amber-200" },
  legendary: { emoji: "🔴", label: "Legendary", color: "bg-rose-100 text-rose-800 border-rose-200" }
};

export const BINGO_CATEGORY_META: Record<BingoCategory, { emoji: string; label: string }> = {
  social: { emoji: "🗣️", label: "Social" },
  travel: { emoji: "✈️", label: "Travel" },
  group: { emoji: "👥", label: "Group" },
  istanbul: { emoji: "🕌", label: "Istanbul" },
  custom: { emoji: "✨", label: "Custom" }
};

export const DEFAULT_BINGO_CHALLENGES: Array<{
  title: string;
  description: string;
  category: BingoCategory;
  difficulty: BingoDifficulty;
}> = [
  { title: "Make a server laugh", description: "Make someone serving you laugh.", category: "social", difficulty: "common" },
  { title: "Stranger's first name", description: "Get the first name of someone you did not know before.", category: "social", difficulty: "rare" },
  { title: "Sincere compliment", description: "Give someone a genuine compliment.", category: "social", difficulty: "common" },
  { title: "Sunset photo", description: "Capture a sunset in a photo.", category: "travel", difficulty: "common" },
  { title: "Unusual transport", description: "Take an original mode of transport.", category: "travel", difficulty: "rare" },
  { title: "Assigned color object", description: "Find an object in a color chosen by the group.", category: "travel", difficulty: "common" },
  { title: "Group selfie", description: "Take a selfie with at least 3 trip friends.", category: "group", difficulty: "common" },
  { title: "Surprise song", description: "Get a group member to sing in public.", category: "group", difficulty: "rare" },
  { title: "Code word", description: "Make a friend say a specific word without them realizing the trap.", category: "group", difficulty: "legendary" },
  { title: "Turkish tea", description: "Drink an authentic Turkish tea.", category: "istanbul", difficulty: "common" },
  { title: "Cross the Bosphorus", description: "Cross the Bosphorus by ferry or bridge.", category: "istanbul", difficulty: "rare" },
  { title: "Sleeping cat", description: "Photograph an Istanbul cat taking a nap.", category: "istanbul", difficulty: "common" },
  { title: "Lokum tasting", description: "Try a local lokum.", category: "istanbul", difficulty: "common" },
  { title: "Local market", description: "Buy something at a market.", category: "istanbul", difficulty: "common" },
  { title: "Major mosque", description: "Visit a historic mosque.", category: "istanbul", difficulty: "rare" },
  { title: "Street food", description: "Try local street food.", category: "istanbul", difficulty: "common" },
  { title: "Rooftop panorama", description: "Find a panoramic view of the city.", category: "travel", difficulty: "rare" },
  { title: "Mirror photo", description: "Take a creative photo with a reflection or mirror.", category: "travel", difficulty: "common" },
  { title: "Spontaneous dance", description: "Dance for 10 seconds in a public place.", category: "social", difficulty: "legendary" },
  { title: "Postcard", description: "Send or buy a trip postcard.", category: "travel", difficulty: "common" },
  { title: "Local joke", description: "Tell a joke with a local accent.", category: "group", difficulty: "rare" },
  { title: "Unusual souvenir", description: "Find the weirdest souvenir possible.", category: "travel", difficulty: "rare" },
  { title: "Oriental pastry", description: "Try an oriental pastry.", category: "istanbul", difficulty: "common" },
  { title: "Bosphorus boat", description: "Take a photo from a boat.", category: "istanbul", difficulty: "legendary" },
  { title: "Stranger high five", description: "Give a high five to a stranger.", category: "social", difficulty: "rare" },
  { title: "Turkish menu order", description: "Order something by pointing at a Turkish menu.", category: "istanbul", difficulty: "legendary" }
];

export const BINGO_CHALLENGES_BY_DESTINATION: Record<DestinationId, typeof DEFAULT_BINGO_CHALLENGES> = {
  istanbul: DEFAULT_BINGO_CHALLENGES
};
