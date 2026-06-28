"use client";

import { useEffect, useState } from "react";
import { Loader2, Users } from "lucide-react";
import { Avatar, Badge, Card, GameCard } from "@/components/ui";

type ActiveGroup = {
  id: string;
  name?: string;
  destination?: string;
  currentDay?: number;
  memberIds?: string[];
  plannedMembers?: Array<{ nickname: string; claimedBy?: string | null }>;
};

type GroupMember = {
  id: string;
  username?: string;
  avatarUrl?: string | null;
};

type Props = {
  title: string;
  eyebrow: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  showMembers?: boolean;
};

export function GroupScopedFeaturePage({ title, eyebrow, description, emptyTitle, emptyDescription, showMembers = false }: Props) {
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<ActiveGroup | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadGroup() {
      try {
        const [{ onAuthStateChanged }, { doc, getDoc }, { getFirebaseAuth }, { getFirebaseFirestore }] = await Promise.all([
          import("firebase/auth"),
          import("firebase/firestore"),
          import("@/firebase/auth"),
          import("@/firebase/firestore")
        ]);

        const auth = getFirebaseAuth();
        const db = getFirebaseFirestore();

        return onAuthStateChanged(auth, async (firebaseUser) => {
          if (!firebaseUser) {
            if (!cancelled) {
              setGroup(null);
              setMembers([]);
              setLoading(false);
            }
            return;
          }

          const userSnapshot = await getDoc(doc(db, "users", firebaseUser.uid));
          const activeGroupId = userSnapshot.exists() ? userSnapshot.data().activeGroupId as string | undefined : undefined;

          if (!activeGroupId) {
            if (!cancelled) {
              setGroup(null);
              setMembers([]);
              setLoading(false);
            }
            return;
          }

          const groupSnapshot = await getDoc(doc(db, "friendGroups", activeGroupId));
          if (!groupSnapshot.exists()) {
            if (!cancelled) {
              setGroup(null);
              setMembers([]);
              setLoading(false);
            }
            return;
          }

          const groupData = { id: groupSnapshot.id, ...groupSnapshot.data() } as ActiveGroup;
          const memberProfiles = await Promise.all(
            (groupData.memberIds ?? []).map(async (memberId) => {
              const memberSnapshot = await getDoc(doc(db, "users", memberId));
              return memberSnapshot.exists()
                ? ({ id: memberSnapshot.id, ...memberSnapshot.data() } as GroupMember)
                : { id: memberId, username: memberId };
            })
          );

          if (!cancelled) {
            setGroup(groupData);
            setMembers(memberProfiles);
            setLoading(false);
          }
        });
      } catch (error) {
        if (!cancelled) {
          setError(error instanceof Error ? error.message : "Unable to load this group.");
          setLoading(false);
        }
        return () => {};
      }
    }

    let unsubscribe = () => {};
    void loadGroup().then((nextUnsubscribe) => {
      unsubscribe = nextUnsubscribe ?? (() => {});
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <Card className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
        <p className="font-semibold text-muted-foreground">Loading your group space...</p>
      </Card>
    );
  }

  if (error) {
    return <Card className="text-sm font-semibold text-rose-600">{error}</Card>;
  }

  if (!group) {
    return (
      <Card>
        <Badge>No active group</Badge>
        <h1 className="mt-3 text-3xl font-black">Join or create a group first</h1>
        <p className="mt-2 text-muted-foreground">This page only shows data from your active group.</p>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      <GameCard className="bg-primary text-primary-foreground">
        <Badge className="border-white/20 bg-white/10 text-primary-foreground/80">{eyebrow}</Badge>
        <h1 className="mt-4 font-display text-5xl font-black leading-none">{title}</h1>
        <p className="mt-4 max-w-2xl text-primary-foreground/75">{description}</p>
        <p className="mt-4 text-sm font-black text-primary-foreground/70">{group.name} / {group.destination ?? "custom destination"}</p>
      </GameCard>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <Users className="h-7 w-7 text-accent" />
          <p className="mt-4 text-3xl font-black">{members.length}</p>
          <p className="text-sm text-muted-foreground">members in this group</p>
        </Card>
        <Card>
          <p className="text-3xl font-black">0</p>
          <p className="mt-2 text-sm text-muted-foreground">items created in this group</p>
        </Card>
        <Card>
          <p className="text-3xl font-black">0%</p>
          <p className="mt-2 text-sm text-muted-foreground">group progress</p>
        </Card>
      </section>

      {showMembers && (
        <Card>
          <Badge>Members in this group only</Badge>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-3 rounded-3xl border border-border bg-white/45 p-3 dark:bg-white/5">
                <Avatar src={member.avatarUrl ?? ""} alt={member.username ?? "Member"} />
                <p className="font-black">{member.username ?? "Unnamed member"}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <Badge>Empty group data</Badge>
        <h2 className="mt-3 text-2xl font-black">{emptyTitle}</h2>
        <p className="mt-2 text-muted-foreground">{emptyDescription}</p>
      </Card>
    </div>
  );
}
