import type { AwardCategory, QuestCategory, QuestDifficulty, QuestTemplate, SecretQuestDifficulty } from "@/types/game";
import type { DestinationId } from "@/lib/destinations";

export const SHARED_ALBUM_URL = "https://www.icloud.com/sharedalbum/#B2PGI9HKKipq3Zt";

export const QUEST_CATEGORIES: Record<QuestCategory, { emoji: string; label: string }> = {
  istanbul_legends: { emoji: "🏛️", label: "Istanbul Legends" },
  bosphorus: { emoji: "🚢", label: "Bosphorus Adventures" },
  food_hunter: { emoji: "🍔", label: "Food Hunter" },
  turkish_treasures: { emoji: "🧿", label: "Turkish Treasures" },
  chaos: { emoji: "🎭", label: "Chaos Missions" }
};

export const QUEST_TEMPLATES: QuestTemplate[] = [
  { key: "hagia-sophia", title: "Hagia Sophia", description: "Visit Hagia Sophia.", category: "istanbul_legends", difficulty: "Medium", xpReward: 120, isSecret: false },
  { key: "blue-mosque", title: "Blue Mosque", description: "Visit the Blue Mosque.", category: "istanbul_legends", difficulty: "Medium", xpReward: 120, isSecret: false },
  { key: "topkapi", title: "Topkapi Palace", description: "Explore Topkapi Palace.", category: "istanbul_legends", difficulty: "Hard", xpReward: 180, isSecret: false },
  { key: "galata", title: "Galata Tower", description: "Climb Galata Tower.", category: "istanbul_legends", difficulty: "Hard", xpReward: 160, isSecret: false },
  { key: "bazaar", title: "Grand Bazaar", description: "Get lost in the Grand Bazaar.", category: "istanbul_legends", difficulty: "Easy", xpReward: 90, isSecret: false },
  { key: "taksim", title: "Taksim Square", description: "Reach Taksim Square.", category: "istanbul_legends", difficulty: "Easy", xpReward: 80, isSecret: false },
  { key: "cross-bosphorus", title: "Cross the Bosphorus", description: "Cross from Europe to Asia or the reverse.", category: "bosphorus", difficulty: "Easy", xpReward: 100, isSecret: false },
  { key: "tea-view", title: "Tea with Bosphorus view", description: "Drink tea with a Bosphorus view.", category: "bosphorus", difficulty: "Easy", xpReward: 80, isSecret: false },
  { key: "sunset", title: "Watch a sunset", description: "Catch a Bosphorus sunset.", category: "bosphorus", difficulty: "Medium", xpReward: 110, isSecret: false },
  { key: "kebab", title: "Eat a kebab", description: "Try an Istanbul kebab.", category: "food_hunter", difficulty: "Easy", xpReward: 70, isSecret: false },
  { key: "baklava", title: "Eat baklava", description: "Try Turkish baklava.", category: "food_hunter", difficulty: "Easy", xpReward: 70, isSecret: false },
  { key: "simit", title: "Eat simit", description: "Grab a simit on the go.", category: "food_hunter", difficulty: "Easy", xpReward: 60, isSecret: false },
  { key: "turkish-tea", title: "Drink Turkish tea", description: "Enjoy a glass of Turkish tea.", category: "food_hunter", difficulty: "Easy", xpReward: 60, isSecret: false },
  { key: "nazar", title: "Find a Nazar", description: "Spot a Nazar amulet.", category: "turkish_treasures", difficulty: "Easy", xpReward: 75, isSecret: false },
  { key: "carpet", title: "Traditional carpet", description: "Find a traditional carpet.", category: "turkish_treasures", difficulty: "Medium", xpReward: 90, isSecret: false },
  { key: "lantern", title: "Lantern", description: "Find a Turkish lantern.", category: "turkish_treasures", difficulty: "Easy", xpReward: 75, isSecret: false },
  { key: "ferry", title: "Ferry", description: "Ride a ferry.", category: "turkish_treasures", difficulty: "Easy", xpReward: 80, isSecret: false },
  { key: "street-seller", title: "Street seller", description: "Buy something from a street seller.", category: "turkish_treasures", difficulty: "Easy", xpReward: 70, isSecret: false },
  { key: "group-jump", title: "Group jump photo", description: "Take a synchronized group jump photo.", category: "chaos", difficulty: "Medium", xpReward: 120, isSecret: false },
  { key: "ask-directions", title: "Ask directions", description: "Ask a local for directions.", category: "chaos", difficulty: "Easy", xpReward: 80, isSecret: false },
  { key: "tourist-pose", title: "Tourist pose recreation", description: "Recreate a classic tourist pose.", category: "chaos", difficulty: "Medium", xpReward: 100, isSecret: false },
  { key: "charismatic-cat", title: "Find the most charismatic cat", description: "Find Istanbul's most charismatic cat.", category: "chaos", difficulty: "Hard", xpReward: 140, isSecret: false }
];

export const SECRET_QUEST_TEMPLATES: QuestTemplate[] = [
  { key: "hidden-rooftop", title: "Hidden Rooftop", description: "Find a hidden rooftop view.", category: "chaos", difficulty: "Rare", xpReward: 250, isSecret: true, secretDifficulty: "Rare" },
  { key: "local-secret", title: "Local Secret", description: "Discover a local-only spot.", category: "chaos", difficulty: "Epic", xpReward: 350, isSecret: true, secretDifficulty: "Epic" },
  { key: "two-continents", title: "Two Continents", description: "Be in Europe and Asia the same day.", category: "bosphorus", difficulty: "Epic", xpReward: 300, isSecret: true, secretDifficulty: "Epic" },
  { key: "cat-whisperer", title: "Cat Whisperer", description: "Befriend an Istanbul cat.", category: "chaos", difficulty: "Rare", xpReward: 220, isSecret: true, secretDifficulty: "Rare" },
  { key: "golden-sunset", title: "Golden Sunset", description: "Catch the perfect golden sunset.", category: "bosphorus", difficulty: "Legendary", xpReward: 400, isSecret: true, secretDifficulty: "Legendary" },
  { key: "hidden-passage", title: "Hidden Passage", description: "Find a hidden passage in the old city.", category: "istanbul_legends", difficulty: "Epic", xpReward: 320, isSecret: true, secretDifficulty: "Epic" },
  { key: "sultans-secret", title: "Sultan's Secret", description: "Discover all secret quests.", category: "istanbul_legends", difficulty: "Legendary", xpReward: 1000, isSecret: true, secretDifficulty: "Legendary", unlockRequiresAllSecrets: true }
];

export const QUEST_TEMPLATES_BY_DESTINATION: Record<DestinationId, QuestTemplate[]> = {
  istanbul: QUEST_TEMPLATES
};

export const SECRET_QUEST_TEMPLATES_BY_DESTINATION: Record<DestinationId, QuestTemplate[]> = {
  istanbul: SECRET_QUEST_TEMPLATES
};

export const AWARD_CATEGORIES: AwardCategory[] = [
  { id: "kebab-machine", emoji: "🍔", title: "Kebab Machine", description: "Most likely to eat kebab again tomorrow." },
  { id: "lost-tourist", emoji: "🧭", title: "Lost Tourist", description: "Most likely to get lost." },
  { id: "influencer", emoji: "📸", title: "Influencer", description: "Most likely to turn the trip into content." },
  { id: "bargaining-king", emoji: "💰", title: "Bargaining King", description: "Best negotiator in the bazaar." },
  { id: "tea-addict", emoji: "☕", title: "Tea Addict", description: "Most tea consumed." },
  { id: "bosphorus-sleeper", emoji: "😴", title: "Bosphorus Sleeper", description: "Most likely to fall asleep on the ferry." },
  { id: "mood-maker", emoji: "🎉", title: "Mood Maker", description: "Best energy in the group." },
  { id: "transport-survivor", emoji: "🚌", title: "Transport Survivor", description: "Survived Istanbul transport like a pro." },
  { id: "lucky-duck", emoji: "🦆", title: "Lucky Duck", description: "Luckiest person of the trip." },
  { id: "future-incident", emoji: "🚨", title: "Future International Incident", description: "Most likely to cause chaos abroad." },
  { id: "goat", emoji: "🐐", title: "GOAT of the Trip", description: "Greatest of all trip." },
  { id: "sultans-choice", emoji: "👑", title: "Sultan's Choice", description: "The ultimate trip legend." }
];

export function difficultyLabel(difficulty: QuestDifficulty | SecretQuestDifficulty) {
  return difficulty;
}
