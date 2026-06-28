import type {
  AssassinMission,
  Badge,
  Challenge,
  EliminationRecord,
  FunAward,
  FriendGroup,
  Photo,
  Quest,
  ScheduleEvent,
  User,
  WorldEvent
} from "@/types";

const avatar = (seed: string) => `https://api.dicebear.com/9.x/adventurer/svg?seed=${encodeURIComponent(seed)}`;

export const badges: Badge[] = [
  { id: "photographer", name: "Photographer", description: "Uploaded iconic Istanbul memories.", icon: "Camera", unlockedAt: "2026-06-28" },
  { id: "explorer", name: "Explorer", description: "Found secret corners of the city.", icon: "Compass", unlockedAt: "2026-06-28" },
  { id: "night-owl", name: "Night Owl", description: "Still awake when sensible people sleep.", icon: "Moon" },
  { id: "chaos", name: "Chaos Agent", description: "Created confusion, but made it stylish.", icon: "Sparkles", unlockedAt: "2026-06-28" },
  { id: "detective", name: "Detective", description: "Solved suspiciously silly mysteries.", icon: "Search" },
  { id: "vizier", name: "Grand Vizier", description: "Strategic mastermind of the squad.", icon: "Crown" },
  { id: "social", name: "Social Butterfly", description: "Talked to everyone, including street cats.", icon: "Users" },
  { id: "constantinople", name: "Legend of Constantinople", description: "Collected every Istanbul relic.", icon: "Landmark" },
  { id: "cat-whisperer", name: "Cat Whisperer", description: "Found all 50 hidden cats.", icon: "Cat" }
];

export const users: User[] = [
  {
    id: "u1",
    username: "Keira",
    email: "keira@example.com",
    avatarUrl: avatar("Keira South Africa"),
    country: "South Africa",
    countryCode: "ZA",
    flagEmoji: "ZA",
    level: 7,
    totalXp: 3290,
    joinedAt: "2026-06-01",
    stats: { challengesCompleted: 9, assassinations: 2, photosUploaded: 18, pointsEarned: 3290, relicsCollected: 7, catsFound: 18 },
    badges: [badges[0], badges[1], badges[3]],
    achievements: [
      { id: "a1", title: "Group Comedian", description: "Make the squad laugh 10 times.", progress: 8, goal: 10, xpReward: 150 },
      { id: "a2", title: "Memory Hoarder", description: "Upload 25 photos.", progress: 18, goal: 25, xpReward: 200 }
    ]
  },
  {
    id: "u2",
    username: "Marko",
    email: "marko@example.com",
    avatarUrl: avatar("Marko Estonia"),
    country: "Estonia",
    countryCode: "EE",
    flagEmoji: "EE",
    level: 6,
    totalXp: 2865,
    joinedAt: "2026-06-02",
    stats: { challengesCompleted: 7, assassinations: 4, photosUploaded: 12, pointsEarned: 2865, relicsCollected: 6, catsFound: 12 },
    badges: [badges[1], badges[5]],
    achievements: [{ id: "a3", title: "Silent Assassin", description: "Complete 5 eliminations.", progress: 4, goal: 5, xpReward: 300 }]
  },
  {
    id: "u3",
    username: "Noah",
    email: "noah@example.com",
    avatarUrl: avatar("Noah France"),
    country: "France",
    countryCode: "FR",
    flagEmoji: "FR",
    level: 5,
    totalXp: 2410,
    joinedAt: "2026-06-03",
    stats: { challengesCompleted: 6, assassinations: 1, photosUploaded: 22, pointsEarned: 2410, relicsCollected: 8, catsFound: 9 },
    badges: [badges[0], badges[6]],
    achievements: [{ id: "a4", title: "Photo Legend", description: "Collect 50 reactions.", progress: 36, goal: 50, xpReward: 250 }]
  },
  {
    id: "u4",
    username: "Yaman",
    email: "yaman@example.com",
    avatarUrl: avatar("Yaman Turkiye"),
    country: "Turkey",
    countryCode: "TR",
    flagEmoji: "TR",
    level: 4,
    totalXp: 1815,
    joinedAt: "2026-06-05",
    stats: { challengesCompleted: 5, assassinations: 0, photosUploaded: 9, pointsEarned: 1815, relicsCollected: 5, catsFound: 6 },
    badges: [badges[2]],
    achievements: [{ id: "a5", title: "Tea Time", description: "Find 5 tea glasses.", progress: 3, goal: 5, xpReward: 100 }]
  },
  {
    id: "u5",
    username: "L\u00e9onie",
    email: "leonie@example.com",
    avatarUrl: avatar("Leonie France"),
    country: "France",
    countryCode: "FR",
    flagEmoji: "????",
    level: 5,
    totalXp: 2250,
    joinedAt: "2026-06-06",
    isAdmin: true,
    stats: { challengesCompleted: 6, assassinations: 1, photosUploaded: 14, pointsEarned: 2250, relicsCollected: 6, catsFound: 11 },
    badges: [badges[1], badges[3]],
    achievements: [{ id: "a6", title: "Squad Architect", description: "Create the perfect Istanbul group plan.", progress: 4, goal: 5, xpReward: 180 }]
  }
];

export const friendGroups: FriendGroup[] = [
  {
    id: "istanbul-crew-2026",
    name: "Istanbul Crew 2026",
    inviteCode: "ISTANBUL-5",
    description: "Keira, Marko, Noah, Yaman and L\u00e9onie's private Istanbul adventure space.",
    destination: "Istanbul, Turkey",
    dates: "7 days",
    memberIds: users.map((user) => user.id),
    createdBy: "u5"
  }
];

export const currentUser = users[4];

export const worldEvents: WorldEvent[] = [
  {
    id: "w1",
    title: "Double XP Day",
    description: "Every challenge completed today rewards double XP. Chaos is now financially encouraged.",
    effect: "2x XP for challenges and relics",
    startsAt: "2026-06-28T08:00:00.000Z",
    endsAt: "2026-06-28T23:59:00.000Z",
    accent: "from-amber-400 to-orange-500"
  },
  {
    id: "w2",
    title: "Photo Frenzy",
    description: "All reactions grant bonus XP. Make those blurry ferry photos count.",
    effect: "+10 XP per reaction",
    startsAt: "2026-06-29T08:00:00.000Z",
    endsAt: "2026-06-29T23:59:00.000Z",
    accent: "from-pink-400 to-rose-500"
  }
];

export const scheduleEvents: ScheduleEvent[] = [
  {
    id: "e1",
    title: "Sultanahmet Sunrise Sprint",
    description: "Blue Mosque, Hagia Sophia, and dramatic coffee poses before breakfast.",
    date: "2026-06-28",
    time: "08:30",
    meetingLocation: "Hotel lobby",
    notes: "Bring water, sunglasses, and one historically accurate fun fact.",
    readiness: { u1: "ready", u2: "ready", u3: "not-ready", u4: "ready", u5: "ready" }
  },
  {
    id: "e2",
    title: "Ferry Quest to Kadikoy",
    description: "Snacks, seagulls, and a mandatory sunset group selfie.",
    date: "2026-06-28",
    time: "17:45",
    meetingLocation: "Eminonu ferry pier",
    notes: "Anyone late buys simit.",
    readiness: { u1: "ready", u2: "not-ready", u3: "ready", u4: "not-ready", u5: "ready" }
  },
  {
    id: "e3",
    title: "Grand Bazaar Negotiation Arc",
    description: "Find the weirdest tiny treasure and bargain like a charming menace.",
    date: "2026-06-29",
    time: "12:00",
    meetingLocation: "Beyazit Gate",
    notes: "Quest relic: Bazaar item.",
    readiness: { u1: "not-ready", u2: "ready", u3: "ready", u4: "ready", u5: "not-ready" }
  }
];

export const photos: Photo[] = [
  {
    id: "p1",
    ownerId: "u3",
    ownerName: "Noah",
    ownerAvatar: users[2].avatarUrl,
    imageUrl: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=900&q=80",
    caption: "Istanbul decided to be photogenic again. Rude.",
    createdAt: "2026-06-28T10:00:00.000Z",
    reactions: [
      { id: "r1", userId: "u1", type: "favorite", xpGranted: 5 },
      { id: "r2", userId: "u2", type: "legendary", xpGranted: 10 }
    ]
  },
  {
    id: "p2",
    ownerId: "u2",
    ownerName: "Marko",
    ownerAvatar: users[1].avatarUrl,
    imageUrl: "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=900&q=80",
    caption: "Ferry wind: 1. Hair: 0.",
    createdAt: "2026-06-28T12:30:00.000Z",
    reactions: [
      { id: "r3", userId: "u4", type: "funny", xpGranted: 5 },
      { id: "r4", userId: "u1", type: "legendary", xpGranted: 10 }
    ]
  },
  {
    id: "p3",
    ownerId: "u5",
    ownerName: "L\u00e9onie",
    ownerAvatar: users[4].avatarUrl,
    imageUrl: "https://images.unsplash.com/photo-1589561454226-796a8aa89b05?auto=format&fit=crop&w=900&q=80",
    caption: "Evidence that cats own this city.",
    createdAt: "2026-06-28T14:15:00.000Z",
    reactions: [{ id: "r5", userId: "u3", type: "favorite", xpGranted: 5 }]
  }
];

export const challenges: Challenge[] = [
  { id: "c1", ownerId: "u1", title: "Historical Drama", description: "Use \"This feels surprisingly historical\" three times.", difficulty: "Easy", xpReward: 80, status: "secret" },
  { id: "c2", ownerId: "u2", title: "Cat Government", description: "Convince someone cats secretly run Istanbul.", difficulty: "Medium", xpReward: 160, status: "submitted", proof: { type: "description", value: "Yaman nodded seriously for 11 seconds.", submittedAt: "2026-06-28T13:00:00.000Z" } },
  { id: "c3", ownerId: "u3", title: "Question Mode", description: "Have a conversation using only questions.", difficulty: "Medium", xpReward: 150, status: "secret" },
  { id: "c4", ownerId: "u4", title: "Imaginary Invention", description: "Get a stranger to rate your imaginary invention.", difficulty: "Hard", xpReward: 260, status: "secret" }
];

export const assassinMissions: AssassinMission[] = [
  { id: "m1", playerId: "u1", targetId: "u2", condition: "Get Marko to take a selfie with you.", status: "active", xpReward: 250 },
  { id: "m2", playerId: "u2", targetId: "u3", condition: "Make Noah say the secret word: baklava.", status: "active", xpReward: 250 },
  { id: "m3", playerId: "u3", targetId: "u4", condition: "Make Yaman hold your phone.", status: "active", xpReward: 250 },
  { id: "m4", playerId: "u4", targetId: "u5", condition: "Make L\u00e9onie take a photo of a street musician.", status: "active", xpReward: 250 },
  { id: "m5", playerId: "u5", targetId: "u1", condition: "Make Keira say the secret word: Bosphorus.", status: "active", xpReward: 250 }
];

export const eliminationHistory: EliminationRecord[] = [
  { id: "x1", assassinId: "u2", targetId: "u4", condition: "Target said \"I am lost\" unprompted.", completedAt: "2026-06-27T21:00:00.000Z" }
];

export const quest: Quest = {
  id: "q1",
  name: "Istanbul Questline",
  description: "Collect iconic relics across seven days and unlock the Legend of Constantinople badge.",
  completionBadgeId: "constantinople",
  relics: [
    "Cat photo",
    "Ferry photo",
    "Tea glass",
    "Bazaar item",
    "Turkish dessert",
    "Sunset",
    "Group selfie",
    "Street musician",
    "Historic monument",
    "Funny sign"
  ].map((label, index) => ({
    id: `relic-${index + 1}`,
    label,
    icon: ["Cat", "Ship", "CupSoda", "ShoppingBag", "CakeSlice", "Sunset", "Users", "Music", "Landmark", "Smile"][index],
    xpReward: 75,
    collectedBy: index < 6 ? users[index % users.length].id : undefined,
    collectedAt: index < 6 ? "2026-06-28" : undefined
  }))
};

export const funAwards: FunAward[] = [
  { id: "fa1", title: "Most Likely To Get Lost", winnerId: "u4", reason: "Asked Google Maps for emotional support." },
  { id: "fa2", title: "Human GPS", winnerId: "u1", reason: "Already knows every tram line and pretends it is normal." },
  { id: "fa3", title: "Chaos Goblin", winnerId: "u2", reason: "Turned a snack run into an international side quest." },
  { id: "fa4", title: "Most Dramatic Photo", winnerId: "u3", reason: "Made a ferry photo look like a movie poster." }
];
