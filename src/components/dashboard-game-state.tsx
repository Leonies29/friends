"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Camera, Loader2, Play, Settings, Trophy, Users } from "lucide-react";
import { Avatar, Badge, Button, Card, GameCard } from "@/components/ui";

type GroupStatus = "setup" | "active" | "completed";

type ActiveGroup = {
  id: string;
  name?: string;
  destination?: string;
  inviteCode?: string;
  dates?: string;
  memberIds?: string[];
  plannedMembers?: Array<{ nickname: string; claimedBy?: string | null }>;
  gameModes?: string[];
  gameStarted?: boolean;
  status?: GroupStatus;
  currentDay?: number;
};

type GroupMember = {
  id: string;
  username?: string;
  avatarUrl?: string | null;
  level?: number;
  totalXp?: number;
};

export function DashboardGameState() {
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<ActiveGroup | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let unsubscribeAuth = () => {};
    let unsubscribeGroup = () => {};

    async function loadGroupState() {
      const [{ onAuthStateChanged }, { doc, getDoc, onSnapshot }, { getFirebaseAuth }, { getFirebaseFirestore }] = await Promise.all([
        import("firebase/auth"),
        import("firebase/firestore"),
        import("@/firebase/auth"),
        import("@/firebase/firestore")
      ]);

      const auth = getFirebaseAuth();
      const db = getFirebaseFirestore();

      unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
        setLoading(true);
        setError("");
        unsubscribeGroup();

        try {
          if (!firebaseUser) {
            setGroup(null);
            setMembers([]);
            setLoading(false);
            return;
          }

          const userSnapshot = await getDoc(doc(db, "users", firebaseUser.uid));
          const activeGroupId = userSnapshot.exists() ? userSnapshot.data().activeGroupId as string | undefined : undefined;

          if (!activeGroupId) {
            setGroup(null);
            setMembers([]);
            setLoading(false);
            return;
          }

          unsubscribeGroup = onSnapshot(doc(db, "friendGroups", activeGroupId), async (snapshot) => {
            if (!snapshot.exists()) {
              setGroup(null);
              setMembers([]);
              setLoading(false);
              return;
            }

            const groupData = { id: snapshot.id, ...snapshot.data() } as ActiveGroup;
            setGroup(groupData);

            const memberProfiles = await Promise.all(
              (groupData.memberIds ?? []).map(async (memberId) => {
                const memberSnapshot = await getDoc(doc(db, "users", memberId));
                return memberSnapshot.exists()
                  ? ({ id: memberSnapshot.id, ...memberSnapshot.data() } as GroupMember)
                  : { id: memberId, username: memberId };
              })
            );
            setMembers(memberProfiles);
            setLoading(false);
          });
        } catch (error) {
          setError(error instanceof Error ? error.message : "Unable to load group state.");
          setLoading(false);
        }
      });
    }

    void loadGroupState();
    return () => {
      unsubscribeAuth();
      unsubscribeGroup();
    };
  }, []);

  async function startGame() {
    if (!group) return;
    setStarting(true);
    setError("");

    try {
      const [{ doc, serverTimestamp, setDoc }, { getFirebaseFirestore }] = await Promise.all([
        import("firebase/firestore"),
        import("@/firebase/firestore")
      ]);
      const db = getFirebaseFirestore();

      await setDoc(doc(db, "friendGroups", group.id), {
        gameStarted: true,
        status: "active",
        currentDay: 1,
        startedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      await setDoc(doc(db, "appConfig", group.id), {
        activeGroupId: group.id,
        gameStarted: true,
        status: "active",
        currentDay: 1,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to start the game.");
    } finally {
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <Card className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
        <p className="font-semibold text-muted-foreground">Checking group status...</p>
      </Card>
    );
  }

  if (!group) {
    return (
      <Card>
        <Badge>No active group</Badge>
        <h1 className="mt-3 text-3xl font-black">Join or create a group first</h1>
        <p className="mt-2 text-muted-foreground">Your dashboard only shows data from your active group.</p>
      </Card>
    );
  }

  if (!group.gameStarted) {
    return (
      <div className="grid gap-6">
        <GameCard className="bg-primary text-primary-foreground">
          <Badge className="border-white/20 bg-white/10 text-primary-foreground/80">Game not started</Badge>
          <h1 className="mt-4 font-display text-5xl font-black leading-none">{group.name ?? "Your quest group"}</h1>
          <p className="mt-4 max-w-2xl text-primary-foreground/75">
            This group is created, but the adventure has not started yet. Invite everyone, finish the setup, then start day 1 when the group is ready.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="button" variant="gold" size="lg" onClick={startGame} disabled={starting}>
              {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {starting ? "Starting..." : "Start game"}
            </Button>
          </div>
        </GameCard>

        {error && <Card className="text-sm font-semibold text-rose-600">{error}</Card>}

        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <Users className="h-7 w-7 text-accent" />
            <p className="mt-4 text-3xl font-black">{members.length}/{group.plannedMembers?.length ?? members.length}</p>
            <p className="text-sm text-muted-foreground">members joined</p>
          </Card>
          <Card>
            <CalendarDays className="h-7 w-7 text-accent" />
            <p className="mt-4 text-xl font-black">{group.dates || "Custom dates"}</p>
            <p className="text-sm text-muted-foreground">planned dates</p>
          </Card>
          <Card>
            <Settings className="h-7 w-7 text-accent" />
            <p className="mt-4 text-3xl font-black">{group.gameModes?.length ?? 0}</p>
            <p className="text-sm text-muted-foreground">game modes selected</p>
          </Card>
        </section>

        <Card>
          <Badge>Planned friends</Badge>
          <div className="mt-4 flex flex-wrap gap-2">
            {(group.plannedMembers ?? []).map((member) => (
              <span key={member.nickname} className="rounded-full bg-muted px-4 py-2 text-sm font-black text-muted-foreground">
                {member.nickname}{member.claimedBy ? " joined" : " pending"}
              </span>
            ))}
          </div>
        </Card>

        <Card>
          <Badge>Invite code</Badge>
          <p className="mt-3 text-4xl font-black">{group.inviteCode}</p>
          <p className="mt-2 text-muted-foreground">Share this code with your friends so they can join before the game starts.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <GameCard className="bg-primary text-primary-foreground">
        <Badge className="border-white/20 bg-white/10 text-primary-foreground/80">Active group</Badge>
        <h1 className="mt-4 font-display text-5xl font-black leading-none">{group.name}</h1>
        <p className="mt-4 text-primary-foreground/75">Day {group.currentDay ?? 1} / {group.destination}</p>
      </GameCard>

      <section className="grid gap-4 md:grid-cols-4">
        <Card><Users className="h-7 w-7 text-accent" /><p className="mt-4 text-3xl font-black">{members.length}</p><p className="text-sm text-muted-foreground">group members</p></Card>
        <Card><Trophy className="h-7 w-7 text-accent" /><p className="mt-4 text-3xl font-black">0</p><p className="text-sm text-muted-foreground">group XP earned</p></Card>
        <Card><Camera className="h-7 w-7 text-accent" /><p className="mt-4 text-3xl font-black">0</p><p className="text-sm text-muted-foreground">photos uploaded</p></Card>
        <Card><CalendarDays className="h-7 w-7 text-accent" /><p className="mt-4 text-3xl font-black">0</p><p className="text-sm text-muted-foreground">events planned</p></Card>
      </section>

      <Card>
        <Badge>Members in this group only</Badge>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <div key={member.id} className="flex items-center gap-3 rounded-3xl border border-border bg-white/45 p-3 dark:bg-white/5">
              <Avatar src={member.avatarUrl ?? ""} alt={member.username ?? "Member"} />
              <div>
                <p className="font-black">{member.username ?? "Unnamed member"}</p>
                <p className="text-sm text-muted-foreground">0 group XP / fresh group progress</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <Badge>Group data starts empty</Badge>
        <p className="mt-3 text-muted-foreground">
          No photos, schedule events, challenges, awards, assassin missions, or quest progress are shared from another group. This group starts from zero.
        </p>
      </Card>
    </div>
  );
}
