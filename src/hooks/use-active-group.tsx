"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getActiveGroupCookie } from "@/lib/session-cookies";
import type { DestinationId } from "@/lib/destinations";

export type ActiveGroup = {
  id: string;
  name?: string;
  destination?: string;
  destinationId?: DestinationId;
  inviteCode?: string;
  currentDay?: number;
  gameStarted?: boolean;
  memberIds?: string[];
  plannedMembers?: Array<{ id?: string; nickname: string; claimedBy?: string | null }>;
  createdBy?: string | null;
  ownerId?: string | null;
  ownerEmail?: string | null;
};

export type GroupMember = {
  id: string;
  userId?: string;
  username?: string;
  nickname?: string;
  email?: string;
  avatarUrl?: string | null;
  role?: "OWNER" | "ADMIN" | "PLAYER";
  status?: "pending" | "active" | "inactive" | "removed";
};

type ActiveGroupState = {
  loading: boolean;
  error: string;
  userId: string | null;
  group: ActiveGroup | null;
  members: GroupMember[];
  currentMember: GroupMember | null;
  reload: () => void;
};

function useActiveGroupState(): ActiveGroupState {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [group, setGroup] = useState<ActiveGroup | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [currentMember, setCurrentMember] = useState<GroupMember | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe = () => {};

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [{ onAuthStateChanged }, { doc, getDoc }, { getFirebaseAuth }, { getFirebaseFirestore }] = await Promise.all([
          import("firebase/auth"),
          import("firebase/firestore"),
          import("@/firebase/auth"),
          import("@/firebase/firestore")
        ]);

        const auth = getFirebaseAuth();
        const db = getFirebaseFirestore();

        unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
          void (async () => {
            try {
              if (!firebaseUser) {
                if (!cancelled) {
                  setUserId(null);
                  setGroup(null);
                  setMembers([]);
                  setCurrentMember(null);
                  setLoading(false);
                }
                return;
              }

              const userSnapshot = await getDoc(doc(db, "users", firebaseUser.uid));
              const activeGroupId = userSnapshot.exists()
                ? (userSnapshot.data().activeGroupId as string | undefined)
                : undefined;
              const resolvedGroupId = activeGroupId ?? getActiveGroupCookie() ?? undefined;

              if (!resolvedGroupId) {
                if (!cancelled) {
                  setUserId(firebaseUser.uid);
                  setGroup(null);
                  setMembers([]);
                  setCurrentMember(null);
                  setLoading(false);
                }
                return;
              }

              const groupSnapshot = await getDoc(doc(db, "friendGroups", resolvedGroupId));
              const groupData = groupSnapshot.exists() ? ({ id: groupSnapshot.id, ...groupSnapshot.data() } as ActiveGroup) : null;
              if (groupData) {
                const [{ ensureGroupOwnership, ensureActiveGroupMembership }] = await Promise.all([import("@/services/group-service")]);
                await ensureGroupOwnership(groupData.id, firebaseUser.uid, firebaseUser.email);
                await ensureActiveGroupMembership(groupData.id, firebaseUser.uid, {
                  nickname: userSnapshot.exists() ? String(userSnapshot.data().username ?? "") : undefined,
                  email: firebaseUser.email ?? userSnapshot.data()?.email as string | undefined
                });
                const refreshedGroupSnapshot = await getDoc(doc(db, "friendGroups", resolvedGroupId));
                if (refreshedGroupSnapshot.exists()) {
                  Object.assign(groupData, refreshedGroupSnapshot.data());
                }
              }
              const [{ listAllGroupMembers }] = await Promise.all([import("@/services/member-service")]);
              const membershipDocs = groupData ? await listAllGroupMembers(groupData.id) : [];
              const memberProfiles = await Promise.all(
                (groupData?.memberIds ?? []).map(async (memberId) => {
                  const memberSnapshot = await getDoc(doc(db, "users", memberId));
                  const membership = membershipDocs.find((member) => member.userId === memberId);
                  const profile = memberSnapshot.exists()
                    ? ({
                        ...memberSnapshot.data(),
                        ...membership,
                        id: memberSnapshot.id,
                        userId: membership?.userId ?? memberSnapshot.id,
                        username: membership?.nickname ?? memberSnapshot.data().username,
                        status: membership?.status ?? "active"
                      } as GroupMember)
                    : { id: memberId, userId: memberId, username: membership?.nickname ?? memberId, status: membership?.status ?? "active", ...membership };
                  return profile;
                })
              );
              const [{ resolveMemberAvatar }] = await Promise.all([import("@/lib/istanbul-avatars")]);
              const membersWithAvatars = memberProfiles.map((member) => ({
                ...member,
                avatarUrl: resolveMemberAvatar(groupData, member)
              }));
              const currentMembership = membershipDocs.find((member) => member.userId === firebaseUser.uid) ?? null;
              const [{ resolveEffectiveRole }] = await Promise.all([import("@/services/permissions")]);
              const effectiveRole = resolveEffectiveRole(
                currentMembership,
                groupData,
                firebaseUser.uid,
                firebaseUser.email ?? currentMembership?.email
              );

              if (!cancelled) {
                setUserId(firebaseUser.uid);
                setGroup(groupData);
                setMembers(membersWithAvatars);
                setCurrentMember(currentMembership ? {
                  ...currentMembership,
                  role: effectiveRole,
                  avatarUrl: resolveMemberAvatar(groupData, {
                    nickname: currentMembership.nickname,
                    username: currentMembership.nickname,
                    email: currentMembership.email,
                    avatarUrl: membersWithAvatars.find((member) => member.userId === firebaseUser.uid)?.avatarUrl
                  })
                } : (groupData ? {
                  id: `${groupData.id}_${firebaseUser.uid}`,
                  userId: firebaseUser.uid,
                  role: effectiveRole,
                  nickname: membersWithAvatars.find((member) => member.userId === firebaseUser.uid)?.nickname,
                  username: membersWithAvatars.find((member) => member.userId === firebaseUser.uid)?.username,
                  avatarUrl: membersWithAvatars.find((member) => member.userId === firebaseUser.uid)?.avatarUrl ?? null,
                  status: "active" as const
                } : null));
                setLoading(false);
              }
            } catch (loadError) {
              if (!cancelled) {
                setError(loadError instanceof Error ? loadError.message : "Unable to load your group.");
                setLoading(false);
              }
            }
          })();
        });
      } catch (error) {
        if (!cancelled) {
          setError(error instanceof Error ? error.message : "Unable to load your group.");
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [version]);

  return {
    loading,
    error,
    userId,
    group,
    members,
    currentMember,
    reload: () => setVersion((value) => value + 1)
  };
}

const ActiveGroupContext = createContext<ActiveGroupState | null>(null);

export function ActiveGroupProvider({ children }: { children: React.ReactNode }) {
  const state = useActiveGroupState();
  return <ActiveGroupContext.Provider value={state}>{children}</ActiveGroupContext.Provider>;
}

export function useActiveGroup(): ActiveGroupState {
  const context = useContext(ActiveGroupContext);
  if (!context) {
    throw new Error("useActiveGroup must be used within an ActiveGroupProvider");
  }
  return context;
}
