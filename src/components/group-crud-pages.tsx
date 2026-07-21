"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Camera,
  Check,
  Loader2,
  Plus,
  Star,
  Trash2,
  Trophy
} from "lucide-react";
import { Avatar, Badge, Button, Card, Progress } from "@/components/ui";
import { filterActiveGameMembers, memberUserId } from "@/lib/game-members";
import { useActiveGroup, type ActiveGroup, type GroupMember } from "@/hooks/use-active-group";
import { canManageGames, canManagePlanning, canManageScores, canModeratePhotos } from "@/services/permissions";
import {
  addPhotoComment,
  deletePhoto,
  listPhotos,
  reactToPhoto,
  setPhotoFeatured,
  uploadChallengePhoto,
  uploadGroupPhoto
} from "@/services/photo-service";
import {
  createScheduleEvent,
  deleteScheduleEvent,
  listScheduleEvents,
  setScheduleAttendance,
  summarizeAttendance
} from "@/services/schedule-service";
import { addXpTransaction, awardGameXp, getWeekKey, listXpTransactions } from "@/services/xp-service";
import { resolveGameByCategory } from "@/services/game-service";
import type { AttendanceStatus, Challenge, Photo, ScheduleEvent, XpTransaction } from "@/types";
import { calculateLevel } from "@/lib/utils";

type GroupState = ReturnType<typeof useActiveGroup>;
type RelicDoc = { id: string; groupId: string; key: string; label: string; xpReward: number; collectedBy?: string; collectedByName?: string };

const CHALLENGE_XP_REWARD = 50;

const relicTemplates = [
  ["group-selfie", "Group selfie"],
  ["local-snack", "Local snack"],
  ["sunset", "Sunset"],
  ["funny-sign", "Funny sign"],
  ["public-transport", "Public transport"],
  ["best-view", "Best view"],
  ["street-moment", "Street moment"],
  ["souvenir", "Souvenir"],
  ["hidden-gem", "Hidden gem"],
  ["final-memory", "Final memory"]
] as const;

const inputClass = "rounded-2xl border border-border bg-background px-4 py-3 font-semibold outline-none focus:border-accent focus:ring-4 focus:ring-accent/15";
const textareaClass = `${inputClass} min-h-24`;

function memberName(member?: GroupMember | null) {
  return member?.nickname || member?.username || "Group member";
}

function photoSrc(photo: Pick<Photo, "photoUrl" | "imageUrl">) {
  return photo.photoUrl || photo.imageUrl || "";
}

function renderGroupState(state: GroupState) {
  if (state.loading) {
    return (
      <Card className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
        <p className="font-semibold text-muted-foreground">Loading your group space...</p>
      </Card>
    );
  }

  if (state.error) return <Card className="text-sm font-semibold text-rose-600">{state.error}</Card>;

  if (!state.group) {
    return (
      <Card>
        <Badge>No active group</Badge>
        <h1 className="mt-3 text-3xl font-black">Join or create a group first</h1>
        <p className="mt-2 text-muted-foreground">This page only reads and writes data for your active group.</p>
      </Card>
    );
  }

  return null;
}

function PageHero({ eyebrow, title, description, group }: { eyebrow: string; title: string; description: string; group: ActiveGroup }) {
  return (
    <Card className="bg-primary text-primary-foreground">
      <Badge className="border-white/20 bg-white/10 text-primary-foreground/80">{eyebrow}</Badge>
      <h1 className="mt-4 font-display text-4xl font-black leading-none md:text-5xl">{title}</h1>
      <p className="mt-4 max-w-2xl text-primary-foreground/75">{description}</p>
      <p className="mt-4 text-sm font-black text-primary-foreground/70">{group.name ?? "Active group"}</p>
    </Card>
  );
}

async function listGroupDocs<T>(collectionName: string, groupId: string) {
  const [{ collection, getDocs, query, where }, { getFirebaseFirestore }] = await Promise.all([import("firebase/firestore"), import("@/firebase/firestore")]);
  const snapshot = await getDocs(query(collection(getFirebaseFirestore(), collectionName), where("groupId", "==", groupId)));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as T);
}

async function updateGroupDoc(collectionName: string, id: string, data: Record<string, unknown>) {
  const [{ doc, serverTimestamp, updateDoc }, { getFirebaseFirestore }] = await Promise.all([import("firebase/firestore"), import("@/firebase/firestore")]);
  await updateDoc(doc(getFirebaseFirestore(), collectionName, id), { ...data, updatedAt: serverTimestamp() });
}

async function deleteGroupDoc(collectionName: string, id: string) {
  const [{ deleteDoc, doc }, { getFirebaseFirestore }] = await Promise.all([import("firebase/firestore"), import("@/firebase/firestore")]);
  await deleteDoc(doc(getFirebaseFirestore(), collectionName, id));
}

function attendancePercent(event: ScheduleEvent, members: GroupMember[]) {
  if (!members.length) return 0;
  const summary = summarizeAttendance(event, members.map((member) => memberUserId(member)));
  return Math.round((summary.ready / members.length) * 100);
}

export function GroupSchedulePage() {
  const state = useActiveGroup();
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [saving, setSaving] = useState(false);
  const canEdit = canManagePlanning(state.currentMember?.role);

  const loadEvents = useCallback(async (groupId = state.group?.id) => {
    if (!groupId) return;
    setLoadingItems(true);
    setEvents(await listScheduleEvents(groupId));
    setLoadingItems(false);
  }, [state.group?.id]);

  useEffect(() => { void loadEvents(); }, [loadEvents]);

  const fallback = renderGroupState(state);
  if (fallback) return fallback;
  const group = state.group!;

  async function createEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    const form = new FormData(event.currentTarget);
    await createScheduleEvent(group.id, {
      title: String(form.get("title") ?? ""),
      location: String(form.get("location") ?? ""),
      date: String(form.get("date") ?? ""),
      startTime: String(form.get("startTime") ?? ""),
      endTime: String(form.get("endTime") ?? ""),
      description: String(form.get("description") ?? "")
    });
    event.currentTarget.reset();
    await loadEvents(group.id);
    setSaving(false);
  }

  async function setAttendance(eventId: string, status: AttendanceStatus) {
    if (!state.userId) return;
    await setScheduleAttendance(eventId, state.userId, status);
    await loadEvents(group.id);
  }

  return (
    <div className="grid gap-6">
      <PageHero eyebrow="Shared planning" title="Planner" description="A simple schedule with attendance for this trip only." group={group} />

      {canEdit && (
        <Card>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={createEvent}>
            <input name="title" required placeholder="Event title" className={inputClass} />
            <input name="location" placeholder="Location" className={inputClass} />
            <input name="date" type="date" required className={inputClass} />
            <div className="grid gap-3 sm:grid-cols-2">
              <input name="startTime" type="time" required className={inputClass} />
              <input name="endTime" type="time" className={inputClass} />
            </div>
            <textarea name="description" placeholder="Description" className={`${textareaClass} md:col-span-2`} />
            <Button type="submit" disabled={saving} className="md:col-span-2"><Plus className="h-4 w-4" />{saving ? "Saving..." : "Create event"}</Button>
          </form>
        </Card>
      )}

      <div className="grid gap-4">
        {loadingItems && <Card>Loading events...</Card>}
        {!loadingItems && events.length === 0 && <Card><Badge>Empty</Badge><p className="mt-3 font-black">No events yet for this group.</p></Card>}
        {events.map((item) => {
          const summary = summarizeAttendance(item, state.members.map((member) => memberUserId(member)));
          return (
            <Card key={item.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Badge>{item.date} / {item.startTime || item.time}{item.endTime ? `-${item.endTime}` : ""}</Badge>
                  <h2 className="mt-3 text-2xl font-black">{item.title}</h2>
                  <p className="mt-1 text-muted-foreground">{item.location || item.meetingLocation}</p>
                  <p className="mt-3 text-sm text-muted-foreground">{item.description}</p>
                </div>
                {canEdit && <Button variant="ghost" size="sm" onClick={() => void deleteScheduleEvent(item.id).then(() => loadEvents(group.id))}><Trash2 className="h-4 w-4" />Delete</Button>}
              </div>
              <Progress value={attendancePercent(item, state.members)} className="mt-4" />
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => setAttendance(item.id, "ready")}><Check className="h-4 w-4" />Ready</Button>
                <Button size="sm" variant="secondary" onClick={() => setAttendance(item.id, "late")}>Late</Button>
                <Button size="sm" variant="ghost" onClick={() => setAttendance(item.id, "unavailable")}>Unavailable</Button>
                <span className="px-2 py-2 text-sm font-black text-muted-foreground">
                  {summary.ready} ready / {summary.late} late / {summary.unavailable} unavailable
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export function GroupPhotosPage() {
  const state = useActiveGroup();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const canModerate = canModeratePhotos(state.currentMember?.role);

  const loadPhotos = useCallback(async (groupId = state.group?.id) => {
    if (!groupId) return;
    setPhotos((await listPhotos(groupId)).filter((photo) => photo.status !== "deleted"));
  }, [state.group?.id]);

  useEffect(() => { void loadPhotos(); }, [loadPhotos]);

  const fallback = renderGroupState(state);
  if (fallback) return fallback;
  const group = state.group!;
  const currentMember = state.members.find((member) => memberUserId(member) === state.userId);

  async function uploadPhoto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!state.userId) return;
    setUploading(true);
    setUploadError("");
    const form = new FormData(event.currentTarget);
    const file = form.get("photo");
    if (!(file instanceof File) || !file.name) {
      setUploading(false);
      return;
    }
    try {
      await uploadGroupPhoto({
        groupId: group.id,
        ownerId: state.userId,
        ownerName: memberName(currentMember),
        ownerAvatar: currentMember?.avatarUrl,
        file,
        caption: String(form.get("caption") ?? "")
      });
      event.currentTarget.reset();
      await loadPhotos(group.id);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Unable to upload the photo.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-6">
      <PageHero eyebrow="Private gallery" title="Photos" description="Photos, reactions, and comments stay inside this group." group={group} />
      <Card>
        <form className="grid gap-3" onSubmit={uploadPhoto}>
          <input name="photo" type="file" accept="image/*" required className="rounded-2xl border border-dashed border-border bg-background px-4 py-5 font-semibold" />
          <input name="caption" placeholder="Caption" className={inputClass} />
          {uploadError && <p className="rounded-2xl bg-rose-500/10 p-3 text-sm font-semibold text-rose-600">{uploadError}</p>}
          <Button type="submit" disabled={uploading}><Camera className="h-4 w-4" />{uploading ? "Uploading..." : "Upload photo"}</Button>
        </form>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {photos.length === 0 && <Card className="md:col-span-2 xl:col-span-3"><Badge>Empty</Badge><p className="mt-3 font-black">No photos yet for this group.</p></Card>}
        {photos.map((photo) => (
          <Card key={photo.id} className="overflow-hidden">
            <img src={photoSrc(photo)} alt={photo.caption} className="mb-4 h-56 w-full rounded-3xl object-cover" />
            <div className="flex items-center gap-3">
              <Avatar src={photo.ownerAvatar ?? ""} alt={photo.ownerName} />
              <div>
                <p className="font-black">{photo.ownerName}</p>
                <p className="text-sm text-muted-foreground">{photo.caption}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(["like", "funny", "favorite"] as const).map((reaction) => (
                <Button key={reaction} size="sm" variant="secondary" onClick={() => void reactToPhoto({ groupId: group.id, photoId: photo.id, userId: state.userId ?? "", type: reaction }).then(() => loadPhotos(group.id))}>
                  {reaction} {photo.reactionCounts?.[reaction] ?? 0}
                </Button>
              ))}
              {canModerate && <Button size="sm" variant="secondary" onClick={() => void setPhotoFeatured(photo.id, !photo.featured).then(() => loadPhotos(group.id))}><Star className="h-4 w-4" />{photo.featured ? "Unfeature" : "Feature"}</Button>}
              {(photo.ownerId === state.userId || canModerate) && <Button size="sm" variant="ghost" onClick={() => void deletePhoto(photo).then(() => loadPhotos(group.id))}><Trash2 className="h-4 w-4" /></Button>}
            </div>
            <form className="mt-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); const body = String(new FormData(event.currentTarget).get("comment") ?? ""); if (state.userId && body.trim()) void addPhotoComment({ groupId: group.id, photoId: photo.id, userId: state.userId, userName: memberName(currentMember), body }).then(() => { event.currentTarget.reset(); return loadPhotos(group.id); }); }}>
              <input name="comment" placeholder="Add comment" className={`${inputClass} min-w-0 flex-1`} />
              <Button type="submit" variant="secondary">Send</Button>
            </form>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function GroupChallengesPage() {
  const state = useActiveGroup();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [saving, setSaving] = useState(false);
  const [proofError, setProofError] = useState("");
  const canEdit = canManageGames(state.currentMember?.role);
  const canScore = canManageScores(state.currentMember?.role);
  const canAssignToOthers = Boolean(state.userId);

  const loadChallenges = useCallback(async (groupId = state.group?.id) => {
    if (!groupId) return;
    setChallenges(await listGroupDocs<Challenge>("challenges", groupId));
  }, [state.group?.id]);

  useEffect(() => { void loadChallenges(); }, [loadChallenges]);

  const fallback = renderGroupState(state);
  if (fallback) return fallback;
  const group = state.group!;

  async function createChallenge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!state.userId) return;
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const ownerId = String(form.get("ownerId") ?? "");
    if (ownerId === state.userId) {
      setProofError("Assign the challenge to another participant.");
      setSaving(false);
      return;
    }
    const owner = state.members.find((member) => member.id === ownerId || member.userId === ownerId);
    const assigner = state.members.find((member) => memberUserId(member) === state.userId);
    const [{ addDoc, collection, serverTimestamp }, { getFirebaseFirestore }] = await Promise.all([import("firebase/firestore"), import("@/firebase/firestore")]);
    const scheduledFor = canEdit ? String(form.get("scheduledFor") ?? "") : "";
    await addDoc(collection(getFirebaseFirestore(), "challenges"), {
      groupId: group.id,
      ownerId,
      ownerName: memberName(owner),
      assignedById: state.userId,
      assignedByName: memberName(assigner),
      title: String(form.get("title") ?? ""),
      description: String(form.get("description") ?? ""),
      difficulty: String(form.get("difficulty") ?? "Easy"),
      xpReward: CHALLENGE_XP_REWARD,
      scheduledFor,
      status: scheduledFor ? "scheduled" : "secret",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    event.currentTarget.reset();
    setProofError("");
    await loadChallenges(group.id);
    setSaving(false);
  }

  async function updateChallenge(challengeId: string, data: Record<string, unknown>) {
    await updateGroupDoc("challenges", challengeId, data);
    await loadChallenges(group.id);
  }

  // Approving used to only flip the doc's status — it never actually wrote an xpTransaction, so
  // the reward never reached the real leaderboard/ceremony (both read xpTransactions only).
  async function approveChallenge(challenge: Challenge) {
    if (!state.userId) return;
    await updateGroupDoc("challenges", challenge.id, {
      status: "approved",
      approvedBy: state.userId,
      approvedAt: new Date().toISOString()
    });

    const challengeGame = await resolveGameByCategory(group.id, "challenge");
    const xpInput = {
      groupId: group.id,
      userId: challenge.ownerId,
      amount: challenge.xpReward,
      sourceType: "challenge" as const,
      sourceId: challenge.id,
      reason: `Completed challenge: ${challenge.title}`,
      createdBy: state.userId
    };
    if (challengeGame) {
      await awardGameXp({ ...xpInput, gameId: challengeGame.id });
    } else {
      await addXpTransaction(xpInput);
    }

    await loadChallenges(group.id);
  }

  async function submitChallengeProof(event: FormEvent<HTMLFormElement>, challengeId: string) {
    event.preventDefault();
    if (!state.userId) return;

    setProofError("");
    const form = new FormData(event.currentTarget);
    const description = String(form.get("proof") ?? "");
    const file = form.get("photo");

    try {
      if (file instanceof File && file.name) {
        const uploaded = await uploadChallengePhoto(file, state.userId, challengeId);
        await updateChallenge(challengeId, {
          status: "submitted",
          proof: {
            type: "photo",
            value: uploaded.photoUrl,
            submittedAt: new Date().toISOString()
          }
        });
      } else {
        await updateChallenge(challengeId, {
          status: "submitted",
          proof: {
            type: "description",
            value: description,
            submittedAt: new Date().toISOString()
          }
        });
      }
      event.currentTarget.reset();
    } catch (error) {
      setProofError(error instanceof Error ? error.message : "Unable to submit the proof.");
    }
  }

  return (
    <div className="grid gap-6">
      <PageHero eyebrow="Challenges" title="Challenges" description="Everyone can assign private missions to other participants. Admins approve proofs." group={group} />
      {canAssignToOthers && (
        <Card>
          <Badge>Assign a mission</Badge>
          <p className="mt-2 text-sm text-muted-foreground">Pick another participant and give them a challenge. Every challenge is worth {CHALLENGE_XP_REWARD} XP.</p>
          <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={(event) => void createChallenge(event)}>
            <input name="title" required placeholder="Challenge title" className={inputClass} />
            <select name="ownerId" required className={inputClass}>
              <option value="">Choose a participant</option>
              {filterActiveGameMembers(state.members)
                .filter((member) => (memberUserId(member)) !== state.userId)
                .map((member) => <option key={member.id} value={memberUserId(member)}>{memberName(member)}</option>)}
            </select>
            <select name="difficulty" className={inputClass}><option>Easy</option><option>Medium</option><option>Hard</option></select>
            {canEdit && <input name="scheduledFor" type="datetime-local" className={inputClass} />}
            <textarea name="description" required placeholder="Challenge description" className={`${textareaClass} md:col-span-2`} />
            {proofError && <p className="text-sm font-semibold text-rose-700 md:col-span-2">{proofError}</p>}
            <Button type="submit" disabled={saving} className="md:col-span-2"><Plus className="h-4 w-4" />{saving ? "Saving..." : "Assign challenge"}</Button>
          </form>
        </Card>
      )}
      <div className="grid gap-4">
        {challenges.length === 0 && <Card><Badge>Empty</Badge><p className="mt-3 font-black">No challenges yet for this group.</p></Card>}
        {challenges.map((challenge) => (
          <Card key={challenge.id}>
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <Badge>{challenge.difficulty} / {challenge.xpReward} XP / {challenge.status}</Badge>
                <h2 className="mt-3 text-2xl font-black">{challenge.title}</h2>
                <p className="mt-1 text-muted-foreground">For {challenge.ownerName}{challenge.assignedByName ? ` · from ${challenge.assignedByName}` : ""}</p>
                {(challenge.ownerId === state.userId || challenge.status !== "secret") && <p className="mt-3 text-sm text-muted-foreground">{challenge.description}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                {canScore && challenge.status === "submitted" && <Button variant="gold" onClick={() => void approveChallenge(challenge)}>Approve</Button>}
                {canEdit && <Button variant="ghost" size="sm" onClick={() => void deleteGroupDoc("challenges", challenge.id).then(() => loadChallenges(group.id))}><Trash2 className="h-4 w-4" />Delete</Button>}
              </div>
            </div>
            {challenge.proof?.type === "photo" && (
              <img src={challenge.proof.value} alt={`Proof for ${challenge.title}`} className="mt-4 h-48 w-full rounded-3xl object-cover" />
            )}
            {challenge.ownerId === state.userId && (challenge.status === "secret" || challenge.status === "scheduled") && (
              <form className="mt-4 grid gap-2" onSubmit={(event) => void submitChallengeProof(event, challenge.id)}>
                <input name="photo" type="file" accept="image/*" className="rounded-2xl border border-dashed border-border bg-background px-4 py-4 font-semibold" />
                <input name="proof" placeholder="Or describe your proof" className={inputClass} />
                {proofError && <p className="rounded-2xl bg-rose-500/10 p-3 text-sm font-semibold text-rose-600">{proofError}</p>}
                <Button type="submit">Submit proof</Button>
              </form>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

export function GroupQuestlinePage() {
  const state = useActiveGroup();
  const [relics, setRelics] = useState<RelicDoc[]>([]);

  const loadRelics = useCallback(async (groupId = state.group?.id) => {
    if (!groupId) return;
    setRelics(await listGroupDocs<RelicDoc>("questRelics", groupId));
  }, [state.group?.id]);

  useEffect(() => { void loadRelics(); }, [loadRelics]);

  const fallback = renderGroupState(state);
  if (fallback) return fallback;
  const group = state.group!;
  const currentMember = state.members.find((member) => memberUserId(member) === state.userId);
  const mergedRelics = relicTemplates.map(([key, label]) => relics.find((relic) => relic.key === key) ?? { id: `${group.id}-${key}`, groupId: group.id, key, label, xpReward: 75 });
  const collected = mergedRelics.filter((relic) => relic.collectedBy).length;

  async function collectRelic(relic: RelicDoc) {
    if (!state.userId) return;
    const [{ doc, serverTimestamp, setDoc }, { getFirebaseFirestore }] = await Promise.all([import("firebase/firestore"), import("@/firebase/firestore")]);
    await setDoc(doc(getFirebaseFirestore(), "questRelics", `${group.id}-${relic.key}`), {
      groupId: group.id,
      key: relic.key,
      label: relic.label,
      xpReward: relic.xpReward,
      collectedBy: state.userId,
      collectedByName: memberName(currentMember),
      collectedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    await loadRelics(group.id);
  }

  return (
    <div className="grid gap-6">
      <PageHero eyebrow="Quest management" title="Quests" description="Reusable quest items for this group. Nothing is hardcoded to Istanbul." group={group} />
      <Card><Badge>Progress</Badge><Progress value={(collected / relicTemplates.length) * 100} className="mt-4" /><p className="mt-2 font-black text-muted-foreground">{collected}/{relicTemplates.length} quest items collected</p></Card>
      <div className="grid gap-4 md:grid-cols-2">
        {mergedRelics.map((relic) => (
          <Card key={relic.key}>
            <Badge>{relic.xpReward} XP</Badge>
            <h2 className="mt-3 text-2xl font-black">{relic.label}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{relic.collectedBy ? `Collected by ${relic.collectedByName}` : "Not collected in this group yet."}</p>
            {!relic.collectedBy && <Button className="mt-4" onClick={() => collectRelic(relic)}><Trophy className="h-4 w-4" />Collect</Button>}
          </Card>
        ))}
      </div>
    </div>
  );
}

export function GroupLeaderboardPage() {
  const state = useActiveGroup();
  const [transactions, setTransactions] = useState<XpTransaction[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [relics, setRelics] = useState<RelicDoc[]>([]);
  const [mode, setMode] = useState<"overall" | "weekly">("overall");

  useEffect(() => {
    if (!state.group) return;
    async function load() {
      const groupId = state.group!.id;
      const [xpItems, photoItems, challengeItems, relicItems] = await Promise.all([
        listXpTransactions(groupId),
        listPhotos(groupId),
        listGroupDocs<Challenge>("challenges", groupId),
        listGroupDocs<RelicDoc>("questRelics", groupId)
      ]);
      setTransactions(xpItems);
      setPhotos(photoItems);
      setChallenges(challengeItems);
      setRelics(relicItems);
    }
    void load();
  }, [state.group]);

  const rows = useMemo(() => {
    const weekKey = getWeekKey();
    return state.members.map((member) => {
      const memberId = memberUserId(member);
      const transactionXp = transactions
        .filter((transaction) => transaction.userId === memberId && (mode === "overall" || transaction.weekKey === weekKey))
        .reduce((sum, transaction) => sum + transaction.amount, 0);
      const fallbackXp = mode === "weekly" ? 0 :
        photos.filter((photo) => photo.ownerId === memberId && photo.status !== "deleted").length * 10 +
        challenges.filter((challenge) => challenge.ownerId === memberId && challenge.status === "approved").reduce((sum, challenge) => sum + challenge.xpReward, 0) +
        relics.filter((relic) => relic.collectedBy === memberId).reduce((sum, relic) => sum + relic.xpReward, 0);
      const xp = transactionXp || fallbackXp;
      return { member, xp, level: calculateLevel(xp) };
    }).sort((a, b) => b.xp - a.xp);
  }, [state.members, transactions, mode, photos, challenges, relics]);

  const fallback = renderGroupState(state);
  if (fallback) return fallback;
  const group = state.group!;

  return (
    <div className="grid gap-6">
      <PageHero eyebrow="Group leaderboard" title="Leaderboard" description="Overall and weekly XP rankings for this group only." group={group} />
      <Card className="flex flex-wrap gap-2">
        <Button variant={mode === "overall" ? "primary" : "secondary"} onClick={() => setMode("overall")}>Overall ranking</Button>
        <Button variant={mode === "weekly" ? "primary" : "secondary"} onClick={() => setMode("weekly")}>Weekly ranking</Button>
      </Card>
      <div className="grid gap-4">
        {rows.length === 0 && <Card><Badge>Empty</Badge><p className="mt-3 font-black">No members in this group yet.</p></Card>}
        {rows.map((row, index) => (
          <Card key={row.member.id}>
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent font-black text-slate-950">#{index + 1}</span>
              <Avatar src={row.member.avatarUrl ?? ""} alt={memberName(row.member)} />
              <div className="flex-1">
                <h2 className="text-xl font-black">{memberName(row.member)}</h2>
                <p className="text-sm text-muted-foreground">Level {row.level}</p>
              </div>
              <p className="text-2xl font-black">{row.xp} XP</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

