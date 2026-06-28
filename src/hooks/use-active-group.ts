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
};

export type GroupMember = {
  id: string;
  username?: string;
  email?: string;
  avatarUrl?: string | null;
};

type ActiveGroupState = {
  loading: boolean;
  error: string;
  userId: string | null;
  group: ActiveGroup | null;
  members: GroupMember[];
  reload: () => void;
};

export function useActiveGroup(): ActiveGroupState {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [group, setGroup] = useState<ActiveGroup | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
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
              setLoading(false);
            }
            return;
          }

          const groupSnapshot = await getDoc(doc(db, "friendGroups", activeGroupId));
          const groupData = groupSnapshot.exists() ? ({ id: groupSnapshot.id, ...groupSnapshot.data() } as ActiveGroup) : null;
          const memberProfiles = await Promise.all(
            (groupData?.memberIds ?? []).map(async (memberId) => {
              const memberSnapshot = await getDoc(doc(db, "users", memberId));
              return memberSnapshot.exists()
                ? ({ id: memberSnapshot.id, ...memberSnapshot.data() } as GroupMember)
                : { id: memberId, username: memberId };
            })
          );

          if (!cancelled) {
            setUserId(firebaseUser.uid);
            setGroup(groupData);
            setMembers(memberProfiles);
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
    reload: () => setVersion((value) => value + 1)
  };
}
