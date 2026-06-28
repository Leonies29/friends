"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { DragEvent, FormEvent } from "react";
import { useState } from "react";
import { ArrowRight, Camera, ImagePlus, Loader2, Mail, UserPlus } from "lucide-react";
import { Avatar, Badge, Button, Card, Field } from "@/components/ui";
import { friendGroups } from "@/lib/mock-data";

const countries = [
  { label: "South Africa", code: "ZA" },
  { label: "Estonia", code: "EE" },
  { label: "France", code: "FR" },
  { label: "Turkey", code: "TR" }
];

const copy = {
  login: {
    icon: Mail,
    title: "Welcome back, adventurer",
    description: "Log in and connect your account to the selected private group space.",
    cta: "Start Adventure",
    alt: "Need an account?",
    href: "/register",
    hrefLabel: "Register"
  },
  register: {
    icon: UserPlus,
    title: "Join your friend group",
    description: "Create your hero profile, upload a real avatar, and link it to the selected group.",
    cta: "Create Account",
    alt: "Already invited?",
    href: "/login",
    hrefLabel: "Log in"
  },
  forgot: {
    icon: Camera,
    title: "Recover your portal key",
    description: "Enter your email and Firebase Auth will send a reset link once connected.",
    cta: "Send Reset Link",
    alt: "Remembered it?",
    href: "/login",
    hrefLabel: "Back to login"
  }
};

export function AuthCard({ mode }: { mode: keyof typeof copy }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sent, setSent] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | undefined>();
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const content = copy[mode];
  const Icon = content.icon;
  const groupParam = searchParams.get("group");
  const inviteCodeParam = searchParams.get("inviteCode");
  const selectedGroup = friendGroups.find((group) => group.id === groupParam) ?? {
    id: groupParam ?? friendGroups[0].id,
    name: searchParams.get("groupName") ?? friendGroups[0].name,
    inviteCode: inviteCodeParam ?? groupParam ?? friendGroups[0].inviteCode,
    description: searchParams.get("destination")
      ? `New private quest space for ${searchParams.get("destination")}.`
      : friendGroups[0].description,
    destination: searchParams.get("destination") ?? friendGroups[0].destination,
    dates: "Custom dates",
    memberIds: [],
    createdBy: "pending"
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    try {
      const firebaseService = await import("@/services/firebase-app-service");

      if (mode === "forgot") {
        await firebaseService.requestPasswordReset(email);
        setSent(true);
        return;
      }

      let authenticatedUserId = "";

      if (mode === "login") {
        const user = await firebaseService.signInAndJoinGroup(email, password, selectedGroup.id, selectedGroup.inviteCode);
        authenticatedUserId = user.uid;
      }

      if (mode === "register") {
        const countryCode = String(formData.get("countryCode") ?? "FR");
        const country = countries.find((item) => item.code === countryCode)?.label ?? "France";

        const user = await firebaseService.registerUserAndJoinGroup({
          username: String(formData.get("username") ?? ""),
          email,
          password,
          country,
          countryCode,
          groupId: selectedGroup.id,
          inviteCode: selectedGroup.inviteCode,
          avatarFile
        });
        authenticatedUserId = user.uid;
      }

      document.cookie = `istanbul_quest_session=${authenticatedUserId}; path=/; max-age=604800; SameSite=Lax`;
      document.cookie = `istanbul_quest_active_group=${selectedGroup.id}; path=/; max-age=604800; SameSite=Lax`;
      router.push("/dashboard");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Firebase action failed.");
    } finally {
      setLoading(false);
    }
  }

  function handleFile(file?: File) {
    if (!file || !file.type.startsWith("image/")) return;
    setAvatarFile(file);
    setPreview(URL.createObjectURL(file));
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    handleFile(event.dataTransfer.files[0]);
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <Card className="grid w-full max-w-5xl overflow-hidden p-0 md:grid-cols-[1fr_1.1fr]">
        <section className="turkish-tile bg-primary p-8 text-primary-foreground md:p-12">
          <div className="grid h-full content-between gap-12">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-primary-foreground/70">Private Vacation Platform</p>
              <h1 className="mt-4 font-display text-5xl font-black leading-tight">ISTANBUL QUEST</h1>
              <p className="mt-4 max-w-sm text-lg text-primary-foreground/80">7 Days. 1 City. Endless Memories.</p>
            </div>
            <div className="rounded-[2rem] border border-white/15 bg-white/10 p-5 backdrop-blur">
              <p className="text-sm font-semibold">Current friend space</p>
              <p className="mt-2 text-2xl font-black">{selectedGroup.name}</p>
              <p className="mt-2 text-primary-foreground/75">{selectedGroup.description}</p>
            </div>
          </div>
        </section>

        <section className="p-8 md:p-12">
          <div className="mb-8 inline-grid h-14 w-14 place-items-center rounded-2xl bg-accent/15 text-accent">
            <Icon className="h-7 w-7" />
          </div>
          <h2 className="font-display text-4xl font-black">{content.title}</h2>
          <p className="mt-3 text-muted-foreground">{content.description}</p>

          <form className="mt-8 grid gap-4" onSubmit={handleSubmit}>
            {mode === "register" && (
              <>
                <div className="rounded-3xl border border-border bg-white/45 p-4 dark:bg-white/5">
                  <Badge>Joining Group</Badge>
                  <p className="mt-2 text-xl font-black">{selectedGroup.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Invite code: {selectedGroup.inviteCode}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Destination: {selectedGroup.destination}</p>
                </div>

                <label
                  onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  className={`grid cursor-pointer place-items-center rounded-[2rem] border-2 border-dashed p-6 text-center transition ${dragging ? "border-accent bg-accent/15" : "border-border bg-white/45 dark:bg-white/5"}`}
                >
                  <input name="avatar" type="file" accept="image/*" className="hidden" onChange={(event) => handleFile(event.target.files?.[0])} />
                  {preview ? <Avatar src={preview} alt="Profile preview" className="h-24 w-24" /> : <ImagePlus className="h-12 w-12 text-accent" />}
                  <p className="mt-3 font-black">Drag and drop your profile photo</p>
                  <p className="text-sm text-muted-foreground">or click to choose an image</p>
                </label>
              </>
            )}

            {mode === "login" && <><Field name="email" label="Email" type="email" placeholder="Email" required /><Field name="password" label="Password" type="password" placeholder="Password" required /></>}
            {mode === "forgot" && <Field name="email" label="Email" type="email" placeholder="Email" required />}
            {mode === "register" && (
              <>
                <Field name="username" label="Username" placeholder={"Keira, Marko, Noah, Yaman or L\u00e9onie"} required />
                <Field name="email" label="Email" type="email" placeholder="Email" required />
                <label className="grid gap-2 text-sm font-bold text-muted-foreground">
                  Country
                  <select name="countryCode" className="rounded-2xl border border-border bg-white/72 px-4 py-3 text-foreground shadow-inner outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 dark:bg-white/10" defaultValue="FR">
                    {countries.map((country) => <option key={country.code} value={country.code}>{country.label} / {country.code}</option>)}
                  </select>
                </label>
                <Field name="password" label="Password" type="password" placeholder="Password" required />
              </>
            )}

            {mode === "login" && <Link href="/forgot-password" className="text-right text-sm font-bold text-accent">Forgot password?</Link>}
            {sent && <p className="rounded-2xl bg-accent/15 p-3 text-sm font-semibold text-accent">Reset link sent by Firebase Auth.</p>}
            {error && <p className="rounded-2xl bg-rose-500/10 p-3 text-sm font-semibold text-rose-600">{error}</p>}
            <Button type="submit" size="lg" className="mt-2" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {loading ? "Saving to Firebase..." : content.cta}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {content.alt} <Link href={content.href} className="font-bold text-accent">{content.hrefLabel}</Link>
          </p>
        </section>
      </Card>
    </main>
  );
}
