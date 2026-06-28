"use client";

import { useEffect, useState } from "react";
import type { User as FirebaseUser } from "firebase/auth";
import { BadgeCheck, Camera, Crosshair, Loader2, Sparkles, Star, Trophy, Users } from "lucide-react";
import { Avatar, Badge, Card, GameCard, Progress } from "@/components/ui";
import { LevelMedallion } from "@/components/game/level-medallion";
import { getLevelProgress } from "@/lib/utils";
import { currentUser as fallbackUser } from "@/lib/mock-data";
import type { FriendGroup, User } from "@/types";

type FirestoreUser = User & {
  activeGroupId?: string;
  groupIds?: string[];
};

const emptyStats = {
  challengesCompleted: 0,
  assassinations: 0,
  photosUploaded: 0,
  pointsEarned: 0,
  relicsCollected: 0,
  catsFound: 0
};

function normalizeUser(firebaseUser: FirebaseUser | null, data?: Partial<FirestoreUser>): FirestoreUser {
  return {
    id: firebaseUser?.uid ?? fallbackUser.id,
    username: data?.username ?? firebaseUser?.displayName ?? fallbackUser.username,
    email: data?.email ?? firebaseUser?.email ?? fallbackUser.email,
    avatarUrl: data?.avatarUrl ?? firebaseUser?.photoURL ?? fallbackUser.avatarUrl,
    country: data?.country ?? fallbackUser.country,
    countryCode: data?.countryCode ?? fallbackUser.countryCode,
    flagEmoji: data?.flagEmoji ?? data?.countryCode ?? fallbackUser.countryCode,
    level: data?.level ?? 1,
    totalXp: data?.totalXp ?? 0,
    joinedAt: data?.joinedAt ?? new Date().toISOString(),
    isAdmin: data?.isAdmin,
    stats: data?.stats ?? emptyStats,
    badges: data?.badges ?? [],
    achievements: data?.achievements ?? [],
    activeGroupId: data?.activeGroupId,
    groupIds: data?.groupIds ?? []
  };
}

export function CurrentUserProfile() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<FirestoreUser>(() => normalizeUser(null));
  const [group, setGroup] = useState<(FriendGroup & { id: string }) | null>(null);
  const [members, setMembers] = useState<FirestoreUser[]>([]);

  useEffect(() => {
    let unsubscribe = () => {};

    async function loadProfile() {
      const [{ onAuthStateChanged }, { doc, getDoc }, { getFirebaseAuth }, { getFirebaseFirestore }] = await Promise.all([
        import("firebase/auth"),
        import("firebase/firestore"),
        import("@/firebase/auth"),
        import("@/firebase/firestore")
      ]);

      const auth = getFirebaseAuth();
      const db = getFirebaseFirestore();

      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        setLoading(true);
        setError("");

        try {
          if (!firebaseUser) {
            setProfile(normalizeUser(null));
            setGroup(null);
            setMembers([]);
            return;
          }

          const userSnapshot = await getDoc(doc(db, "users", firebaseUser.uid));
          const userProfile = normalizeUser(firebaseUser, userSnapshot.exists() ? userSnapshot.data() as Partial<FirestoreUser> : undefined);
          setProfile(userProfile);

          if (userProfile.activeGroupId) {
            const groupSnapshot = await getDoc(doc(db, "friendGroups", userProfile.activeGroupId));
            if (groupSnapshot.exists()) {
              const groupData = { id: groupSnapshot.id, ...groupSnapshot.data() } as FriendGroup & { id: string };
              setGroup(groupData);

              const memberProfiles = await Promise.all(
                (groupData.memberIds ?? []).map(async (memberId) => {
                  const memberSnapshot = await getDoc(doc(db, "users", memberId));
                  return normalizeUser(null, memberSnapshot.exists() ? memberSnapshot.data() as Partial<FirestoreUser> : { id: memberId, username: memberId });
                })
              );
              setMembers(memberProfiles);
            }
          }
        } catch (error) {
          setError(error instanceof Error ? error.message : "Unable to load Firebase profile.");
        } finally {
          setLoading(false);
        }
      });
    }

    void loadProfile();
    return () => unsubscribe();
  }, []);

  const stats = [
    { label: "Challenges completed", value: profile.stats.challengesCompleted, icon: Sparkles },
    { label: "Assassinations", value: profile.stats.assassinations, icon: Crosshair },
    { label: "Photos uploaded", value: profile.stats.photosUploaded, icon: Camera },
    { label: "Points earned", value: profile.stats.pointsEarned, icon: Trophy }
  ];

  return (
    <div className="grid gap-6">
      {loading && (
        <Card className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
          <p className="font-semibold text-muted-foreground">Loading your Firebase profile...</p>
        </Card>
      )}
      {error && <Card className="text-sm font-semibold text-rose-600">{error}</Card>}

      <GameCard className="overflow-hidden p-0">
        <div className="turkish-tile relative h-48 bg-primary">
          <div className="absolute bottom-6 right-6 hidden text-right text-primary-foreground md:block">
            <p className="text-xs font-black uppercase tracking-[0.35em] opacity-70">Active Group</p>
            <p className="font-display text-4xl font-black">{group?.name ?? "No group yet"}</p>
          </div>
        </div>
        <div className="-mt-20 p-6 md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex flex-wrap items-end gap-5">
              <Avatar src={profile.avatarUrl || fallbackUser.avatarUrl} alt={profile.username} className="h-36 w-36 border-4" />
              <div className="pb-2">
                <Badge>Joined {new Date(profile.joinedAt).toLocaleDateString("en")}</Badge>
                <h1 className="mt-3 font-display text-6xl font-black leading-none">{profile.username}</h1>
                <p className="mt-2 font-semibold text-muted-foreground">{profile.country} / {profile.countryCode} / Level {profile.level} / {profile.totalXp.toLocaleString()} XP</p>
              </div>
            </div>
            <LevelMedallion level={profile.level} xp={profile.totalXp} className="h-28 w-28" />
          </div>
          <div className="mt-7 rounded-[1.75rem] border border-border bg-white/45 p-4 dark:bg-white/5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="font-black">Next Level Progress</p>
              <Badge>{500 - (profile.totalXp % 500)} XP remaining</Badge>
            </div>
            <Progress value={getLevelProgress(profile.totalXp)} />
          </div>
        </div>
      </GameCard>

      {group && (
        <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <Badge>Group visible to friends</Badge>
              <h2 className="mt-3 text-3xl font-black">{group.name}</h2>
              <p className="mt-2 text-muted-foreground">Invite code: {group.inviteCode} / Destination: {group.destination}</p>
            </div>
            <Users className="h-8 w-8 text-accent" />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-3 rounded-3xl border border-border bg-white/45 p-3 dark:bg-white/5">
                <Avatar src={member.avatarUrl || fallbackUser.avatarUrl} alt={member.username} />
                <div>
                  <p className="font-black">{member.username}</p>
                  <p className="text-sm text-muted-foreground">{member.country} / {member.countryCode}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <section className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <GameCard key={stat.label}>
              <Icon className="h-7 w-7 text-accent" />
              <p className="mt-5 text-3xl font-black">{stat.value.toLocaleString()}</p>
              <p className="text-sm font-semibold text-muted-foreground">{stat.label}</p>
            </GameCard>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <Badge>Achievement Tracks</Badge>
          <div className="mt-5 grid gap-4">
            {(profile.achievements.length ? profile.achievements : fallbackUser.achievements).map((achievement) => (
              <div key={achievement.id} className="rounded-3xl border border-border bg-white/45 p-4 dark:bg-white/5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-black">{achievement.title}</h3>
                    <p className="text-sm text-muted-foreground">{achievement.description}</p>
                  </div>
                  <Star className="h-6 w-6 text-accent" />
                </div>
                <Progress value={(achievement.progress / achievement.goal) * 100} className="mt-4" />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <Badge>Unlocked Badges</Badge>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {(profile.badges.length ? profile.badges : fallbackUser.badges).map((badge) => (
              <div key={badge.id} className="rounded-3xl border border-border bg-white/45 p-4 dark:bg-white/5">
                <BadgeCheck className="h-7 w-7 text-accent" />
                <h3 className="mt-3 font-black">{badge.name}</h3>
                <p className="text-sm text-muted-foreground">{badge.description}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
