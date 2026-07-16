"use client";

import { FormEvent, useEffect, useState } from "react";
import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { Badge, Button } from "@/components/ui";
import { getFirebaseFirestore } from "@/firebase/firestore";
import type { Challenge } from "@/types";

const inputClass = "w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold";
const CHALLENGE_XP_REWARD = 50;

export function ChallengeSetupPanel({ groupId }: { groupId: string }) {
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  async function load() {
    const db = getFirebaseFirestore();
    const snapshot = await getDocs(query(collection(db, "challenges"), where("groupId", "==", groupId)));
    setChallenges(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Challenge));
  }

  useEffect(() => { void load(); }, [groupId]);

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const db = getFirebaseFirestore();
    await addDoc(collection(db, "challenges"), {
      groupId,
      ownerId: "admin",
      ownerName: "Admin",
      title: String(form.get("title") ?? ""),
      description: String(form.get("description") ?? ""),
      difficulty: String(form.get("difficulty") ?? "Easy"),
      xpReward: CHALLENGE_XP_REWARD,
      status: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    event.currentTarget.reset();
    await load();
  }

  return (
    <div className="grid gap-4">
      <form className="grid gap-2 rounded-2xl border border-border bg-background p-4" onSubmit={(event) => void handleAdd(event)}>
        <Badge>Add challenge</Badge>
        <input name="title" required placeholder="Title" className={inputClass} />
        <textarea name="description" required placeholder="Description" className={`${inputClass} min-h-20`} />
        <select name="difficulty" className={inputClass}><option>Easy</option><option>Medium</option><option>Hard</option></select>
        <p className="text-xs font-semibold text-muted-foreground">Every challenge is worth {CHALLENGE_XP_REWARD} XP.</p>
        <Button type="submit" size="sm">➕ Add</Button>
      </form>

      <div className="grid gap-2">
        {challenges.map((challenge) => (
          <div key={challenge.id} className="flex items-start justify-between gap-2 rounded-2xl border border-border bg-background p-3">
            <div>
              <p className="font-black">{challenge.title}</p>
              <p className="text-sm text-muted-foreground">{challenge.description}</p>
              <p className="text-xs font-semibold text-muted-foreground">{challenge.difficulty} · {challenge.xpReward} XP · {challenge.status}</p>
            </div>
            <div className="flex gap-1">
              <button type="button" title="Edit" className="grid h-9 w-9 place-items-center rounded-xl border border-border" onClick={() => {
                const title = window.prompt("Title", challenge.title);
                const description = window.prompt("Description", challenge.description);
                if (!title || !description) return;
                void updateDoc(doc(getFirebaseFirestore(), "challenges", challenge.id), { title, description, updatedAt: serverTimestamp() }).then(load);
              }}>✏️</button>
              <button type="button" title="Delete" className="grid h-9 w-9 place-items-center rounded-xl border border-border" onClick={() => void deleteDoc(doc(getFirebaseFirestore(), "challenges", challenge.id)).then(load)}>🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
