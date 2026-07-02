"use client";

import { useEffect, useState } from "react";

export type ActiveGroup = {
  id: string;
  name?: string;
  destination?: string;
  inviteCode?: string;
  currentDay?: number;
  gameStarted?: boolean;
  memberIds?: string[];
  plannedMembers?: Array<{ nickname: string; claimedBy?: string | null }>;
  createdBy?: string | null;
  ownerId?: string | null;
};

export type GroupMember = {
  id: string;
  userId?: string;
  username?: string;
  nickname?: string;
  email?: string;
  avatarUrl?: string | null;
  role?: "OWNER" | "ADMIN" | "PLAYER";
  status?: "pending" | "active" | "removed";
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

export function useActiveGroup(): ActiveGroupState {
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

        unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
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
          const activeGroupId = userSnapshot.exists() ? userSnapshot.data().activeGroupId as string | undefined : undefined;

          if (!activeGroupId) {
            if (!cancelled) {
              setUserId(firebaseUser.uid);
              setGroup(null);
              setMembers([]);
              setCurrentMember(null);
              setLoading(false);
            }
            return;
          }

          const groupSnapshot = await getDoc(doc(db, "friendGroups", activeGroupId));
          const groupData = groupSnapshot.exists() ? ({ id: groupSnapshot.id, ...groupSnapshot.data() } as ActiveGroup) : null;
          const [{ getGroupMember, listGroupMembers }] = await Promise.all([import("@/services/member-service")]);
          const membershipDocs = groupData ? await listGroupMembers(groupData.id) : [];
          const memberProfiles = await Promise.all(
            (groupData?.memberIds ?? []).map(async (memberId) => {
              const memberSnapshot = await getDoc(doc(db, "users", memberId));
              const membership = membershipDocs.find((member) => member.userId === memberId);
              return memberSnapshot.exists()
                ? ({ id: memberSnapshot.id, ...memberSnapshot.data(), ...membership, username: membership?.nickname ?? memberSnapshot.data().username } as GroupMember)
                : { id: memberId, userId: memberId, username: membership?.nickname ?? memberId, ...membership };
            })
          );
          const currentMembership = groupData ? await getGroupMember(groupData.id, firebaseUser.uid) : null;

          if (!cancelled) {
            setUserId(firebaseUser.uid);
            setGroup(groupData);
            setMembers(memberProfiles);
            setCurrentMember(currentMembership);
            setLoading(false);
          }
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
