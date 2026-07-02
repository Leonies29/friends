import { readFileSync } from "node:fs";
import { initializeApp } from "firebase/app";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  serverTimestamp,
  writeBatch
} from "firebase/firestore";

function loadEnv(path = ".env.local") {
  const content = readFileSync(path, "utf8");
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;
    process.env[line.slice(0, index).trim()] = line.slice(index + 1).trim();
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

const missing = Object.entries(firebaseConfig).filter(([key, value]) => key !== "measurementId" && !value);
if (missing.length) {
  throw new Error(`Missing Firebase env values: ${missing.map(([key]) => key).join(", ")}`);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const groupsSnapshot = await getDocs(collection(db, "friendGroups"));

const usersById = new Map();

for (const groupDoc of groupsSnapshot.docs) {
  const group = groupDoc.data();
  const memberIds = Array.isArray(group.memberIds) ? group.memberIds : [];
  const plannedMembers = Array.isArray(group.plannedMembers) ? group.plannedMembers : [];

  for (const memberId of memberIds) {
    const plannedProfile = plannedMembers.find((member) => member?.claimedBy === memberId);
    const current = usersById.get(memberId) ?? {
      id: memberId,
      groupIds: [],
      activeGroupId: groupDoc.id,
      username: plannedProfile?.nickname || `Member ${String(memberId).slice(0, 5)}`,
      isAdmin: group.createdBy === memberId
    };

    usersById.set(memberId, {
      ...current,
      username: plannedProfile?.nickname || current.username,
      isAdmin: current.isAdmin || group.createdBy === memberId,
      groupIds: Array.from(new Set([...current.groupIds, groupDoc.id]))
    });
  }
}

if (!usersById.size) {
  await writeBatch(db)
    .set(doc(db, "users", "_placeholder"), {
      username: "Placeholder",
      email: "",
      avatarUrl: "",
      level: 1,
      totalXp: 0,
      joinedAt: new Date().toISOString(),
      groupIds: [],
      activeGroupId: "",
      stats: {
        challengesCompleted: 0,
        assassinations: 0,
        photosUploaded: 0,
        pointsEarned: 0,
        relicsCollected: 0,
        catsFound: 0
      },
      badges: [],
      achievements: [],
      technical: true,
      repairedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true })
    .commit();
  console.log("No memberIds found in friendGroups. Created users/_placeholder so the collection exists again.");
  process.exit(0);
}

let batch = writeBatch(db);
let writes = 0;
let repaired = 0;

async function commitIfNeeded(force = false) {
  if (!writes || (!force && writes < 450)) return;
  await batch.commit();
  batch = writeBatch(db);
  writes = 0;
}

for (const profile of usersById.values()) {
  const existingSnapshot = await getDoc(doc(db, "users", profile.id));
  const existing = existingSnapshot.exists() ? existingSnapshot.data() : {};

  batch.set(doc(db, "users", profile.id), {
    username: existing.username || profile.username,
    email: existing.email || "",
    avatarUrl: existing.avatarUrl || "",
    level: existing.level || 1,
    totalXp: existing.totalXp || 0,
    joinedAt: existing.joinedAt || new Date().toISOString(),
    isAdmin: Boolean(existing.isAdmin || profile.isAdmin),
    groupIds: Array.from(new Set([...(Array.isArray(existing.groupIds) ? existing.groupIds : []), ...profile.groupIds])),
    activeGroupId: existing.activeGroupId || profile.activeGroupId,
    stats: {
      challengesCompleted: existing.stats?.challengesCompleted || 0,
      assassinations: existing.stats?.assassinations || 0,
      photosUploaded: existing.stats?.photosUploaded || 0,
      pointsEarned: existing.stats?.pointsEarned || 0,
      relicsCollected: existing.stats?.relicsCollected || 0,
      catsFound: existing.stats?.catsFound || 0
    },
    badges: Array.isArray(existing.badges) ? existing.badges : [],
    achievements: Array.isArray(existing.achievements) ? existing.achievements : [],
    repairedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });

  writes += 1;
  repaired += 1;
  await commitIfNeeded();
}

await commitIfNeeded(true);
console.log(`Repaired ${repaired} user documents in project ${firebaseConfig.projectId}.`);
