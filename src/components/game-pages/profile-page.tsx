"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Crosshair, Loader2, Sparkles, Trophy } from "lucide-react";
import { Avatar, Badge, Button, Card, Progress } from "@/components/ui";
import { useActiveGroup } from "@/hooks/use-active-group";
import { loadAssassinState } from "@/services/assassin-service";
import { listQuestCompletions } from "@/services/quest-service";
import { uploadProfilePicture } from "@/services/profile-service";
import { listXpTransactions } from "@/services/xp-service";
import { calculateLevel, getLevelProgress } from "@/lib/utils";
import { EmptyGroupCard, LoadingCard, PageShell } from "@/components/game-pages/page-shell";

export function ProfilePage() {
  const state = useActiveGroup();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [xp, setXp] = useState(0);
  const [questsDone, setQuestsDone] = useState(0);
  const [eliminations, setEliminations] = useState(0);
  const [awardsWon, setAwardsWon] = useState(0);

  const member = state.members.find((item) => item.id === state.userId || item.userId === state.userId);
  const displayName = member?.nickname || member?.username || "Traveler";

  useEffect(() => {
    if (!state.group?.id || !state.userId) return;
    async function load() {
      setLoading(true);
      const groupId = state.group!.id;
      const userId = state.userId!;
      const [transactions, completions, assassin] = await Promise.all([
        listXpTransactions(groupId),
        listQuestCompletions(groupId),
        loadAssassinState(groupId)
      ]);
      const userXp = transactions.filter((item) => item.userId === userId).reduce((sum, item) => sum + item.amount, 0);
      const player = assassin.players.find((item) => item.uid === userId);
      setXp(userXp);
      setQuestsDone(completions.filter((item) => item.userId === userId).length);
      setEliminations(player?.eliminationCount ?? 0);
      setAvatarUrl(member?.avatarUrl ?? "");
      setLoading(false);
    }
    void load();
  }, [state.group?.id, state.userId, state.members, member?.avatarUrl]);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !state.userId) return;
    setUploading(true);
    setError("");
    try {
      const url = await uploadProfilePicture(state.userId, file);
      setAvatarUrl(url);
      state.reload();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  const level = calculateLevel(xp);
  const stats = [
    { label: "Completed quests", value: questsDone, icon: Sparkles },
    { label: "Assassin eliminations", value: eliminations, icon: Crosshair },
    { label: "Awards won", value: awardsWon, icon: Trophy }
  ];

  if (state.loading || loading) return <LoadingCard label="Loading profile..." />;
  if (!state.group) return <EmptyGroupCard />;

  return (
    <PageShell eyebrow="Profile" title={displayName} description="Your Istanbul Quest identity. Profile pictures are the only images stored in Firebase." group={state.group}>
      <Card>
        <div className="flex flex-wrap items-center gap-5">
          <div className="relative">
            <Avatar src={avatarUrl} alt={displayName} className="h-28 w-28" />
            <button
              type="button"
              className="absolute bottom-0 right-0 grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(event) => void handleUpload(event)} />
          </div>
          <div className="flex-1">
            <Badge>Level {level}</Badge>
            <h2 className="mt-2 text-3xl font-black">{displayName}</h2>
            <p className="text-sm font-semibold text-muted-foreground">{xp.toLocaleString()} XP</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? "Uploading..." : "Replace picture"}
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">Images are compressed before upload to profilePictures/{state.userId}</p>
          </div>
        </div>
        {error && <p className="mt-4 text-sm font-semibold text-rose-600">{error}</p>}
        <Progress value={getLevelProgress(xp)} className="mt-5" />
      </Card>

      <section className="grid gap-4 md:grid-cols-3">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
              <Card>
                <Icon className="h-6 w-6 text-accent" />
                <p className="mt-4 text-3xl font-black">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </Card>
            </motion.div>
          );
        })}
      </section>
    </PageShell>
  );
}
