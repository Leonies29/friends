import { readFileSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { doc, getFirestore, writeBatch } from "firebase/firestore";

function loadEnv(path = ".env.local") {
  const content = readFileSync(path, "utf8");
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    process.env[key] = value;
  }
}

loadEnv();

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

const required = Object.entries(firebaseConfig).filter(([key, value]) => key !== "measurementId" && !value);
if (required.length) {
  throw new Error(`Missing Firebase env values: ${required.map(([key]) => key).join(", ")}`);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const batch = writeBatch(db);

const now = new Date().toISOString();

const collections = {
  users: [
    ["u1", { username: "Keira", email: "keira@example.com", avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=Keira%20South%20Africa", country: "South Africa", countryCode: "ZA", flagEmoji: "ZA", level: 7, totalXp: 3290, joinedAt: "2026-06-01", isAdmin: false, stats: { challengesCompleted: 9, assassinations: 2, photosUploaded: 18, pointsEarned: 3290, relicsCollected: 7, catsFound: 18 } }],
    ["u2", { username: "Marko", email: "marko@example.com", avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=Marko%20Estonia", country: "Estonia", countryCode: "EE", flagEmoji: "EE", level: 6, totalXp: 2865, joinedAt: "2026-06-02", isAdmin: false, stats: { challengesCompleted: 7, assassinations: 4, photosUploaded: 12, pointsEarned: 2865, relicsCollected: 6, catsFound: 12 } }],
    ["u3", { username: "Noah", email: "noah@example.com", avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=Noah%20France", country: "France", countryCode: "FR", flagEmoji: "FR", level: 5, totalXp: 2410, joinedAt: "2026-06-03", isAdmin: false, stats: { challengesCompleted: 6, assassinations: 1, photosUploaded: 22, pointsEarned: 2410, relicsCollected: 8, catsFound: 9 } }],
    ["u4", { username: "Yaman", email: "yaman@example.com", avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=Yaman%20Turkiye", country: "Turkey", countryCode: "TR", flagEmoji: "TR", level: 4, totalXp: 1815, joinedAt: "2026-06-05", isAdmin: false, stats: { challengesCompleted: 5, assassinations: 0, photosUploaded: 9, pointsEarned: 1815, relicsCollected: 5, catsFound: 6 } }],
    ["u5", { username: "L\u00e9onie", email: "leonie@example.com", avatarUrl: "https://api.dicebear.com/9.x/adventurer/svg?seed=Leonie%20France", country: "France", countryCode: "FR", flagEmoji: "FR", level: 5, totalXp: 2250, joinedAt: "2026-06-06", isAdmin: true, stats: { challengesCompleted: 6, assassinations: 1, photosUploaded: 14, pointsEarned: 2250, relicsCollected: 6, catsFound: 11 } }]
  ],
  friendGroups: [
    ["istanbul-crew-2026", { name: "Istanbul Crew 2026", inviteCode: "ISTANBUL-5", description: "Keira, Marko, Noah, Yaman and L\u00e9onie's private Istanbul adventure space.", destination: "Istanbul, Turkey", dates: "7 days", memberIds: ["u1", "u2", "u3", "u4", "u5"], createdBy: "u5" }]
  ],
  badges: [
    ["photographer", { name: "Photographer", description: "Uploaded iconic Istanbul memories.", icon: "Camera" }],
    ["explorer", { name: "Explorer", description: "Found secret corners of the city.", icon: "Compass" }],
    ["legend-of-constantinople", { name: "Legend of Constantinople", description: "Collected every Istanbul relic.", icon: "Landmark" }],
    ["cat-whisperer", { name: "Cat Whisperer", description: "Found all 50 hidden cats.", icon: "Cat" }]
  ],
  challenges: [
    ["c1", { ownerId: "u1", title: "Historical Drama", description: "Use 'This feels surprisingly historical' three times.", difficulty: "Easy", xpReward: 80, status: "secret", groupId: "istanbul-crew-2026" }],
    ["c2", { ownerId: "u2", title: "Cat Government", description: "Convince someone cats secretly run Istanbul.", difficulty: "Medium", xpReward: 160, status: "secret", groupId: "istanbul-crew-2026" }]
  ],
  scheduleEvents: [
    ["e1", { groupId: "istanbul-crew-2026", title: "Sultanahmet Sunrise Sprint", description: "Blue Mosque, Hagia Sophia, and dramatic coffee poses before breakfast.", date: "2026-06-28", time: "08:30", meetingLocation: "Hotel lobby", notes: "Bring water, sunglasses, and one historically accurate fun fact.", readiness: { u1: "ready", u2: "ready", u3: "not-ready", u4: "ready", u5: "ready" } }],
    ["e2", { groupId: "istanbul-crew-2026", title: "Ferry Quest to Kadikoy", description: "Snacks, seagulls, and a mandatory sunset group selfie.", date: "2026-06-28", time: "17:45", meetingLocation: "Eminonu ferry pier", notes: "Anyone late buys simit.", readiness: { u1: "ready", u2: "not-ready", u3: "ready", u4: "not-ready", u5: "ready" } }]
  ],
  photos: [
    ["p1", { groupId: "istanbul-crew-2026", ownerId: "u3", ownerName: "Noah", imageUrl: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=900&q=80", caption: "Istanbul decided to be photogenic again. Rude.", reactions: [], createdAt: now }]
  ],
  assassinMissions: [
    ["m1", { groupId: "istanbul-crew-2026", playerId: "u1", targetId: "u2", condition: "Get Marko to take a selfie with you.", status: "active", xpReward: 250 }],
    ["m2", { groupId: "istanbul-crew-2026", playerId: "u2", targetId: "u3", condition: "Make Noah say the secret word: baklava.", status: "active", xpReward: 250 }],
    ["m3", { groupId: "istanbul-crew-2026", playerId: "u3", targetId: "u4", condition: "Make Yaman hold your phone.", status: "active", xpReward: 250 }],
    ["m4", { groupId: "istanbul-crew-2026", playerId: "u4", targetId: "u5", condition: "Make L\u00e9onie take a photo of a street musician.", status: "active", xpReward: 250 }],
    ["m5", { groupId: "istanbul-crew-2026", playerId: "u5", targetId: "u1", condition: "Make Keira say the secret word: Bosphorus.", status: "active", xpReward: 250 }]
  ],
  worldEvents: [
    ["w1", { groupId: "istanbul-crew-2026", title: "Double XP Day", description: "Every challenge completed today rewards double XP.", effect: "2x XP for challenges and relics", startsAt: "2026-06-28T08:00:00.000Z", endsAt: "2026-06-28T23:59:00.000Z" }]
  ],
  quests: [
    ["istanbul-questline", { groupId: "istanbul-crew-2026", name: "Istanbul Questline", description: "Collect iconic relics across seven days.", completionBadgeId: "legend-of-constantinople", relics: ["Cat photo", "Ferry photo", "Tea glass", "Bazaar item", "Turkish dessert", "Sunset", "Group selfie", "Street musician", "Historic monument", "Funny sign"].map((label, index) => ({ id: `relic-${index + 1}`, label, xpReward: 75, collected: index < 6 })) }]
  ],
  funAwards: [
    ["most-likely-to-get-lost", { groupId: "istanbul-crew-2026", title: "Most Likely To Get Lost", winnerId: "u4", reason: "Asked Google Maps for emotional support." }]
  ],
  appConfig: [
    ["istanbulQuest", { activeGroupId: "istanbul-crew-2026", name: "Istanbul Quest", tagline: "7 Days. 1 City. Endless Memories.", currentDay: 3, totalDays: 7, seededAt: now, storagePaths: { photos: "groups/{groupId}/photos/{userId}/{photoId}", avatars: "groups/{groupId}/avatars/{userId}", challengeProofs: "groups/{groupId}/challengeProofs/{challengeId}" } }]
  ]
};

for (const [collectionName, docs] of Object.entries(collections)) {
  for (const [id, data] of docs) {
    batch.set(doc(db, collectionName, id), { ...data, updatedAt: now }, { merge: true });
  }
}

await batch.commit();
console.log(`Firebase seeded: ${Object.keys(collections).length} collections initialized in project ${firebaseConfig.projectId}.`);
