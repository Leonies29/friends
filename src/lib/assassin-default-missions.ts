import type { AssassinMissionCategory, AssassinMissionDifficulty } from "@/types/game";

export const ASSASSIN_MISSION_CATEGORIES: AssassinMissionCategory[] = [
  "Speech",
  "Photo",
  "Object",
  "Location",
  "Social",
  "Funny"
];

export const ASSASSIN_MISSION_DIFFICULTIES: AssassinMissionDifficulty[] = [
  "Easy",
  "Medium",
  "Hard",
  "Legendary"
];

export const DEFAULT_ASSASSIN_MISSION_TEMPLATES: Array<{
  key: string;
  title: string;
  text: string;
  difficulty: AssassinMissionDifficulty;
  category: AssassinMissionCategory;
}> = [
  { key: "say-taxi", title: "Say Taxi", text: "Make the target say \"Taxi\".", difficulty: "Easy", category: "Speech" },
  { key: "say-istanbul", title: "Say Istanbul", text: "Make the target say \"Istanbul\".", difficulty: "Easy", category: "Speech" },
  { key: "selfie", title: "Selfie Together", text: "Take a selfie with the target.", difficulty: "Medium", category: "Photo" },
  { key: "secret-selfie", title: "Secret Selfie", text: "Get a selfie with the target without them noticing.", difficulty: "Hard", category: "Photo" },
  { key: "hold-object", title: "Hold Object", text: "Make the target hold an object for 10 seconds.", difficulty: "Easy", category: "Object" },
  { key: "hold-sunglasses", title: "Hold Sunglasses", text: "Make the target hold your sunglasses.", difficulty: "Medium", category: "Object" },
  { key: "bench", title: "Bench Sit", text: "Make the target sit on a bench with you.", difficulty: "Medium", category: "Location" },
  { key: "ask-question", title: "Ask Question", text: "Make the target ask a stranger for directions.", difficulty: "Medium", category: "Social" },
  { key: "buy-drink", title: "Buy Drink", text: "Make the target buy you a drink.", difficulty: "Hard", category: "Social" },
  { key: "tourist-pose", title: "Tourist Pose", text: "Make the target recreate a tourist pose.", difficulty: "Medium", category: "Funny" },
  { key: "group-photo", title: "Legendary Group Photo", text: "Get the entire group into a photo without revealing your mission.", difficulty: "Legendary", category: "Photo" }
];
