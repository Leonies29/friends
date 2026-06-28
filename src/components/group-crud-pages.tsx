"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarDays, Camera, Check, Loader2, Plus, Trash2, Trophy, Users } from "lucide-react";
import { Avatar, Badge, Button, Card, GameCard, Progress } from "@/components/ui";
import { useActiveGroup, type ActiveGroup, type GroupMember } from "@/hooks/use-active-group";

type GroupState = ReturnType<typeof useActiveGroup>;
type ReadyStatus = "ready" | "not-ready";

type ScheduleEventDoc = { id: string; groupId: string; title: string; description: string; date: string; time: string; meetingLocation: string; notes: string; readiness?: Record<string, ReadyStatus> };
type PhotoDoc = { id: string; groupId: string; ownerId: string; ownerName: string; ownerAvatar?: string; imageUrl: string; caption: string; reactionCounts?: Record<string, number> };
type ChallengeDoc = { id: string; groupId: string; ownerId: string; ownerName: string; title: string; description: string; difficulty: "Easy" | "Medium" | "Hard"; xpReward: number; status: "secret" | "submitted" | "approved"; proof?: { type: "description"; value: string; submittedAt: string } };
type RelicDoc = { id: string; groupId: string; key: string; label: string; xpReward: number; collectedBy?: string; collectedByName?: string };

const relicTemplates = [
  ["cat-photo", "Cat photo"],
  ["ferry-photo", "Ferry photo"],
  ["tea-glass", "Tea glass"],
  ["bazaar-item", "Bazaar item"],
  ["turkish-dessert", "Turkish dessert"],
  ["sunset", "Sunset"],
  ["group-selfie", "Group selfie"],
  ["street-musician", "Street musician"],
  ["historic-monument", "Historic monument"],
  ["funny-sign", "Funny sign"]
] as const;

function renderGroupState(state: GroupState) {
  if (state.loading) {
    return <Card className="flex items-center gap-3"><Loader2 className="h-5 w-5 animate-spin text-accent" /><p className="font-semibold text-muted-foreground">Loading your group space...</p></Card>;
  }
  if (state.error) return <Card className="text-sm font-semibold text-rose-600">{state.error}</Card>;
  if (!state.group) {
    return <Card><Badge>No active group</Badge><h1 className="mt-3 text-3xl font-black">Join or create a group first</h1><p className="mt-2 text-muted-foreground">This page only reads and writes data for your active group.</p></Card>;
  }
  return null;
}

function PageHero({ eyebrow, title, description, group }: { eyebrow: string; title: string; description: string; group: ActiveGroup }) {
  return <GameCard className="bg-primary text-primary-foreground"><Badge className="border-white/20 bg-white/10 text-primary-foreground/80">{eyebrow}</Badge><h1 className="mt-4 font-display text-5xl font-black leading-none">{title}</h1><p className="mt-4 max-w-2xl text-primary-foreground/75">{description}</p><p className="mt-4 text-sm font-black text-primary-foreground/70">{group.name ?? "Active group"}</p></GameCard>;
}

async function listGroupDocs<T>(collectionName: string, groupId: string) {
  const [{ collection, getDocs, query, where }, { getFirebaseFirestore }] = await Promise.all([import("firebase/firestore"), import("@/firebase/firestore")]);
  const snapshot = await getDocs(query(collection(getFirebaseFirestore(), collectionName), where("groupId", "==", groupId)));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as T);
}

function readinessPercent(event: ScheduleEventDoc, members: GroupMember[]) {
  if (!members.length) return 0;
  return Math.round((members.filter((member) => event.readiness?.[member.id] === "ready").length / members.length) * 100);
}

export function GroupSchedulePage() {
  const state = useActiveGroup();
  const [events, setEvents] = useState<ScheduleEventDoc[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [saving, setSaving] = useState(false);

  async function loadEvents(groupId = state.group?.id) {
    if (!groupId) return;
    setLoadingItems(true);
    const items = await listGroupDocs<ScheduleEventDoc>("scheduleEvents", groupId);
    setEvents(items.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)));
    setLoadingItems(false);
  }

  useEffect(() => { void loadEvents(); }, [state.group?.id]);

  const fallback = renderGroupState(state);
  if (fallback) return fallback;
  const group = state.group!;

  async function createEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const [{ addDoc, collection, serverTimestamp }, { getFirebaseFirestore }] = await Promise.all([import("firebase/firestore"), import("@/firebase/firestore")]);
    await addDoc(collection(getFirebaseFirestore(), "scheduleEvents"), { groupId: group.id, title: String(form.get("title") ?? ""), description: String(form.get("description") ?? ""), date: String(form.get("date") ?? ""), time: String(form.get("time") ?? ""), meetingLocation: String(form.get("meetingLocation") ?? ""), notes: String(form.get("notes") ?? ""), readiness: {}, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    event.currentTarget.reset();
    await loadEvents(group.id);
    setSaving(false);
  }

  async function setReady(eventId: string, status: ReadyStatus) {
    if (!state.userId) return;
    const [{ doc, serverTimestamp, updateDoc }, { getFirebaseFirestore }] = await Promise.all([import("firebase/firestore"), import("@/firebase/firestore")]);
    await updateDoc(doc(getFirebaseFirestore(), "scheduleEvents", eventId), { [`readiness.${state.userId}`]: status, updatedAt: serverTimestamp() });
    await loadEvents(group.id);
  }

  async function deleteEvent(eventId: string) {
    const [{ deleteDoc, doc }, { getFirebaseFirestore }] = await Promise.all([import("firebase/firestore"), import("@/firebase/firestore")]);
    await deleteDoc(doc(getFirebaseFirestore(), "scheduleEvents", eventId));
    await loadEvents(group.id);
  }

  return <div className="grid gap-6"><PageHero eyebrow="Group schedule" title="Planner" description="Create events that only belong to this group." group={group} /><Card><form className="grid gap-3 md:grid-cols-2" onSubmit={createEvent}><input name="title" required placeholder="Event title" className="rounded-2xl border border-border bg-background px-4 py-3 font-semibold" /><input name="meetingLocation" placeholder="Meeting location" className="rounded-2xl border border-border bg-background px-4 py-3 font-semibold" /><input name="date" type="date" required className="rounded-2xl border border-border bg-background px-4 py-3 font-semibold" /><input name="time" type="time" required className="rounded-2xl border border-border bg-background px-4 py-3 font-semibold" /><textarea name="description" placeholder="Description" className="min-h-24 rounded-2xl border border-border bg-background px-4 py-3 font-semibold md:col-span-2" /><textarea name="notes" placeholder="Notes" className="min-h-20 rounded-2xl border border-border bg-background px-4 py-3 font-semibold md:col-span-2" /><Button type="submit" disabled={saving} className="md:col-span-2"><Plus className="h-4 w-4" />{saving ? "Saving..." : "Create event"}</Button></form></Card><div className="grid gap-4">{loadingItems && <Card>Loading events...</Card>}{!loadingItems && events.length === 0 && <Card><Badge>Empty</Badge><p className="mt-3 font-black">No events yet for this group.</p></Card>}{events.map((item) => <Card key={item.id}><div className="flex flex-wrap items-start justify-between gap-4"><div><Badge>{item.date} / {item.time}</Badge><h2 className="mt-3 text-2xl font-black">{item.title}</h2><p className="mt-1 text-muted-foreground">{item.meetingLocation}</p><p className="mt-3 text-sm text-muted-foreground">{item.description}</p></div><Button variant="ghost" size="sm" onClick={() => deleteEvent(item.id)}><Trash2 className="h-4 w-4" />Delete</Button></div><Progress value={readinessPercent(item, state.members)} className="mt-4" /><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="secondary" onClick={() => setReady(item.id, "ready")}><Check className="h-4 w-4" />Ready</Button><Button size="sm" variant="ghost" onClick={() => setReady(item.id, "not-ready")}>Not ready</Button><span className="px-2 py-2 text-sm font-black text-muted-foreground">{readinessPercent(item, state.members)}% ready</span></div></Card>)}</div></div>;
}

export function GroupPhotosPage() {
  const state = useActiveGroup();
  const [photos, setPhotos] = useState<PhotoDoc[]>([]);
  const [uploading, setUploading] = useState(false);

  async function loadPhotos(groupId = state.group?.id) {
    if (!groupId) return;
    setPhotos(await listGroupDocs<PhotoDoc>("photos", groupId));
  }

  useEffect(() => { void loadPhotos(); }, [state.group?.id]);

  const fallback = renderGroupState(state);
  if (fallback) return fallback;
  const group = state.group!;
  const currentMember = state.members.find((member) => member.id === state.userId);

  async function uploadPhoto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!state.userId) return;
    setUploading(true);
    const form = new FormData(event.currentTarget);
    const file = form.get("photo");
    if (!(file instanceof File) || !file.name) { setUploading(false); return; }
    const [{ addDoc, collection, serverTimestamp }, { getDownloadURL, ref, uploadBytes }, { getFirebaseFirestore }, { getFirebaseStorage }] = await Promise.all([import("firebase/firestore"), import("firebase/storage"), import("@/firebase/firestore"), import("@/firebase/storage")]);
    const storageRef = ref(getFirebaseStorage(), `groupPhotos/${group.id}/${state.userId}/${Date.now()}-${file.name}`);
    await uploadBytes(storageRef, file);
    await addDoc(collection(getFirebaseFirestore(), "photos"), { groupId: group.id, ownerId: state.userId, ownerName: currentMember?.username ?? "Group member", ownerAvatar: currentMember?.avatarUrl ?? "", imageUrl: await getDownloadURL(storageRef), caption: String(form.get("caption") ?? ""), reactionCounts: {}, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    event.currentTarget.reset();
    await loadPhotos(group.id);
    setUploading(false);
  }

  async function react(photoId: string, reaction: string) {
    const [{ doc, increment, serverTimestamp, updateDoc }, { getFirebaseFirestore }] = await Promise.all([import("firebase/firestore"), import("@/firebase/firestore")]);
    await updateDoc(doc(getFirebaseFirestore(), "photos", photoId), { [`reactionCounts.${reaction}`]: increment(1), updatedAt: serverTimestamp() });
    await loadPhotos(group.id);
  }

  async function deletePhoto(photoId: string) {
    const [{ deleteDoc, doc }, { getFirebaseFirestore }] = await Promise.all([import("firebase/firestore"), import("@/firebase/firestore")]);
    await deleteDoc(doc(getFirebaseFirestore(), "photos", photoId));
    await loadPhotos(group.id);
  }

  return <div className="grid gap-6"><PageHero eyebrow="Private photo wall" title="Memories" description="Photos are stored with this group's ID only." group={group} /><Card><form className="grid gap-3" onSubmit={uploadPhoto}><input name="photo" type="file" accept="image/*" required className="rounded-2xl border border-dashed border-border bg-background px-4 py-5 font-semibold" /><input name="caption" placeholder="Caption" className="rounded-2xl border border-border bg-background px-4 py-3 font-semibold" /><Button type="submit" disabled={uploading}><Camera className="h-4 w-4" />{uploading ? "Uploading..." : "Upload to this group"}</Button></form></Card><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{photos.length === 0 && <Card className="md:col-span-2 xl:col-span-3"><Badge>Empty</Badge><p className="mt-3 font-black">No photos yet for this group.</p></Card>}{photos.map((photo) => <Card key={photo.id} className="overflow-hidden"><img src={photo.imageUrl} alt={photo.caption} className="mb-4 h-56 w-full rounded-3xl object-cover" /><div className="flex items-center gap-3"><Avatar src={photo.ownerAvatar ?? ""} alt={photo.ownerName} /><div><p className="font-black">{photo.ownerName}</p><p className="text-sm text-muted-foreground">{photo.caption}</p></div></div><div className="mt-4 flex flex-wrap gap-2">{["funny", "legendary", "favorite"].map((reaction) => <Button key={reaction} size="sm" variant="secondary" onClick={() => react(photo.id, reaction)}>{reaction} {photo.reactionCounts?.[reaction] ?? 0}</Button>)}{photo.ownerId === state.userId && <Button size="sm" variant="ghost" onClick={() => deletePhoto(photo.id)}><Trash2 className="h-4 w-4" /></Button>}</div></Card>)}</div></div>;
}

export function GroupChallengesPage() {
  const state = useActiveGroup();
  const [challenges, setChallenges] = useState<ChallengeDoc[]>([]);
  const [saving, setSaving] = useState(false);

  async function loadChallenges(groupId = state.group?.id) {
    if (!groupId) return;
    setChallenges(await listGroupDocs<ChallengeDoc>("challenges", groupId));
  }

  useEffect(() => { void loadChallenges(); }, [state.group?.id]);

  const fallback = renderGroupState(state);
  if (fallback) return fallback;
  const group = state.group!;

  async function createChallenge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const ownerId = String(form.get("ownerId") ?? "");
    const owner = state.members.find((member) => member.id === ownerId);
    const [{ addDoc, collection, serverTimestamp }, { getFirebaseFirestore }] = await Promise.all([import("firebase/firestore"), import("@/firebase/firestore")]);
    await addDoc(collection(getFirebaseFirestore(), "challenges"), { groupId: group.id, ownerId, ownerName: owner?.username ?? "Group member", title: String(form.get("title") ?? ""), description: String(form.get("description") ?? ""), difficulty: String(form.get("difficulty") ?? "Easy"), xpReward: Number(form.get("xpReward") ?? 50), status: "secret", createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    event.currentTarget.reset();
    await loadChallenges(group.id);
    setSaving(false);
  }

  async function updateChallenge(challengeId: string, data: Record<string, unknown>) {
    const [{ doc, serverTimestamp, updateDoc }, { getFirebaseFirestore }] = await Promise.all([import("firebase/firestore"), import("@/firebase/firestore")]);
    await updateDoc(doc(getFirebaseFirestore(), "challenges", challengeId), { ...data, updatedAt: serverTimestamp() });
    await loadChallenges(group.id);
  }

  return <div className="grid gap-6"><PageHero eyebrow="Secret challenges" title="Secrets" description="Challenges are assigned inside this group only." group={group} /><Card><form className="grid gap-3 md:grid-cols-2" onSubmit={createChallenge}><input name="title" required placeholder="Challenge title" className="rounded-2xl border border-border bg-background px-4 py-3 font-semibold" /><select name="ownerId" required className="rounded-2xl border border-border bg-background px-4 py-3 font-semibold"><option value="">Choose a friend</option>{state.members.map((member) => <option key={member.id} value={member.id}>{member.username ?? member.id}</option>)}</select><select name="difficulty" className="rounded-2xl border border-border bg-background px-4 py-3 font-semibold"><option>Easy</option><option>Medium</option><option>Hard</option></select><input name="xpReward" type="number" defaultValue={50} className="rounded-2xl border border-border bg-background px-4 py-3 font-semibold" /><textarea name="description" required placeholder="Secret mission description" className="min-h-24 rounded-2xl border border-border bg-background px-4 py-3 font-semibold md:col-span-2" /><Button type="submit" disabled={saving} className="md:col-span-2"><Plus className="h-4 w-4" />{saving ? "Saving..." : "Create challenge"}</Button></form></Card><div className="grid gap-4">{challenges.length === 0 && <Card><Badge>Empty</Badge><p className="mt-3 font-black">No challenges yet for this group.</p></Card>}{challenges.map((challenge) => <Card key={challenge.id}><div className="flex flex-wrap justify-between gap-3"><div><Badge>{challenge.difficulty} / {challenge.xpReward} XP / {challenge.status}</Badge><h2 className="mt-3 text-2xl font-black">{challenge.title}</h2><p className="mt-1 text-muted-foreground">For {challenge.ownerName}</p>{(challenge.ownerId === state.userId || challenge.status !== "secret") && <p className="mt-3 text-sm text-muted-foreground">{challenge.description}</p>}</div>{challenge.status === "submitted" && <Button variant="gold" onClick={() => updateChallenge(challenge.id, { status: "approved" })}>Approve</Button>}</div>{challenge.ownerId === state.userId && challenge.status === "secret" && <form className="mt-4 flex gap-2" onSubmit={(event) => { event.preventDefault(); const value = String(new FormData(event.currentTarget).get("proof") ?? ""); void updateChallenge(challenge.id, { status: "submitted", proof: { type: "description", value, submittedAt: new Date().toISOString() } }); }}><input name="proof" required placeholder="Proof description" className="flex-1 rounded-2xl border border-border bg-background px-4 py-3 font-semibold" /><Button type="submit">Submit proof</Button></form>}</Card>)}</div></div>;
}

export function GroupQuestlinePage() {
  const state = useActiveGroup();
  const [relics, setRelics] = useState<RelicDoc[]>([]);

  async function loadRelics(groupId = state.group?.id) {
    if (!groupId) return;
    setRelics(await listGroupDocs<RelicDoc>("questRelics", groupId));
  }

  useEffect(() => { void loadRelics(); }, [state.group?.id]);

  const fallback = renderGroupState(state);
  if (fallback) return fallback;
  const group = state.group!;
  const currentMember = state.members.find((member) => member.id === state.userId);
  const mergedRelics = relicTemplates.map(([key, label]) => relics.find((relic) => relic.key === key) ?? { id: `${group.id}-${key}`, groupId: group.id, key, label, xpReward: 75 });
  const collected = mergedRelics.filter((relic) => relic.collectedBy).length;

  async function collectRelic(relic: RelicDoc) {
    if (!state.userId) return;
    const [{ doc, serverTimestamp, setDoc }, { getFirebaseFirestore }] = await Promise.all([import("firebase/firestore"), import("@/firebase/firestore")]);
    await setDoc(doc(getFirebaseFirestore(), "questRelics", `${group.id}-${relic.key}`), { groupId: group.id, key: relic.key, label: relic.label, xpReward: relic.xpReward, collectedBy: state.userId, collectedByName: currentMember?.username ?? "Group member", collectedAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
    await loadRelics(group.id);
  }

  return <div className="grid gap-6"><PageHero eyebrow="Questline" title="Map" description="Relic progress is fresh for this group." group={group} /><Card><Badge>Progress</Badge><Progress value={(collected / relicTemplates.length) * 100} className="mt-4" /><p className="mt-2 font-black text-muted-foreground">{collected}/{relicTemplates.length} relics collected</p></Card><div className="grid gap-4 md:grid-cols-2">{mergedRelics.map((relic) => <Card key={relic.key}><Badge>{relic.xpReward} XP</Badge><h2 className="mt-3 text-2xl font-black">{relic.label}</h2><p className="mt-2 text-sm text-muted-foreground">{relic.collectedBy ? `Collected by ${relic.collectedByName}` : "Not collected in this group yet."}</p>{!relic.collectedBy && <Button className="mt-4" onClick={() => collectRelic(relic)}><Trophy className="h-4 w-4" />Collect</Button>}</Card>)}</div></div>;
}

export function GroupLeaderboardPage() {
  const state = useActiveGroup();
  const [photos, setPhotos] = useState<PhotoDoc[]>([]);
  const [challenges, setChallenges] = useState<ChallengeDoc[]>([]);
  const [relics, setRelics] = useState<RelicDoc[]>([]);

  useEffect(() => {
    if (!state.group) return;
    async function load() {
      const groupId = state.group!.id;
      const [photoItems, challengeItems, relicItems] = await Promise.all([listGroupDocs<PhotoDoc>("photos", groupId), listGroupDocs<ChallengeDoc>("challenges", groupId), listGroupDocs<RelicDoc>("questRelics", groupId)]);
      setPhotos(photoItems); setChallenges(challengeItems); setRelics(relicItems);
    }
    void load();
  }, [state.group?.id]);

  const rows = useMemo(() => state.members.map((member) => {
    const photoXp = photos.filter((photo) => photo.ownerId === member.id).length * 10;
    const challengeXp = challenges.filter((challenge) => challenge.ownerId === member.id && challenge.status === "approved").reduce((sum, challenge) => sum + challenge.xpReward, 0);
    const relicXp = relics.filter((relic) => relic.collectedBy === member.id).reduce((sum, relic) => sum + relic.xpReward, 0);
    return { member, xp: photoXp + challengeXp + relicXp, photos: photoXp / 10, relics: relicXp / 75 };
  }).sort((a, b) => b.xp - a.xp), [state.members, photos, challenges, relics]);

  const fallback = renderGroupState(state);
  if (fallback) return fallback;
  const group = state.group!;

  return <div className="grid gap-6"><PageHero eyebrow="Group leaderboard" title="Guild Rank" description="Rankings are calculated from this group's photos, challenges, and relics only." group={group} /><div className="grid gap-4">{rows.length === 0 && <Card><Badge>Empty</Badge><p className="mt-3 font-black">No members in this group yet.</p></Card>}{rows.map((row, index) => <Card key={row.member.id}><div className="flex items-center gap-4"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent font-black text-slate-950">#{index + 1}</span><Avatar src={row.member.avatarUrl ?? ""} alt={row.member.username ?? "Member"} /><div className="flex-1"><h2 className="text-xl font-black">{row.member.username ?? "Unnamed member"}</h2><p className="text-sm text-muted-foreground">{row.photos} photos / {row.relics} relics</p></div><p className="text-2xl font-black">{row.xp} XP</p></div></Card>)}</div></div>;
}

export function GroupAdminPage() {
  const state = useActiveGroup();
  const [counts, setCounts] = useState({ events: 0, photos: 0, challenges: 0, relics: 0 });

  useEffect(() => {
    if (!state.group) return;
    async function load() {
      const groupId = state.group!.id;
      const [events, photos, challenges, relics] = await Promise.all([listGroupDocs<ScheduleEventDoc>("scheduleEvents", groupId), listGroupDocs<PhotoDoc>("photos", groupId), listGroupDocs<ChallengeDoc>("challenges", groupId), listGroupDocs<RelicDoc>("questRelics", groupId)]);
      setCounts({ events: events.length, photos: photos.length, challenges: challenges.length, relics: relics.length });
    }
    void load();
  }, [state.group?.id]);

  const fallback = renderGroupState(state);
  if (fallback) return fallback;
  const group = state.group!;

  return <div className="grid gap-6"><PageHero eyebrow="Group admin" title="Admin" description="This admin overview only counts documents from the active group." group={group} /><section className="grid gap-4 md:grid-cols-5"><Card><Users className="h-7 w-7 text-accent" /><p className="mt-4 text-3xl font-black">{state.members.length}</p><p className="text-sm text-muted-foreground">members</p></Card><Card><CalendarDays className="h-7 w-7 text-accent" /><p className="mt-4 text-3xl font-black">{counts.events}</p><p className="text-sm text-muted-foreground">events</p></Card><Card><Camera className="h-7 w-7 text-accent" /><p className="mt-4 text-3xl font-black">{counts.photos}</p><p className="text-sm text-muted-foreground">photos</p></Card><Card><Check className="h-7 w-7 text-accent" /><p className="mt-4 text-3xl font-black">{counts.challenges}</p><p className="text-sm text-muted-foreground">challenges</p></Card><Card><Trophy className="h-7 w-7 text-accent" /><p className="mt-4 text-3xl font-black">{counts.relics}</p><p className="text-sm text-muted-foreground">relics</p></Card></section></div>;
}
