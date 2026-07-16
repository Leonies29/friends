"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { DragEvent, FormEvent } from "react";
import { useState } from "react";
import { ArrowRight, Camera, ImagePlus, Loader2, Mail, UserPlus } from "lucide-react";
import { Avatar, Badge, Button, Card, Field } from "@/components/ui";
import { friendGroups } from "@/lib/mock-data";
import { setActiveGroupCookie } from "@/lib/session-cookies";

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
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const content = copy[mode];
  const Icon = content.icon;
  const groupParam = searchParams.get("group");
  const inviteCodeParam = searchParams.get("inviteCode");
  const hasGroupContext = Boolean(groupParam || inviteCodeParam || searchParams.get("groupName"));
  const selectedGroup = hasGroupContext ? (friendGroups.find((group) => group.id === groupParam) ?? {
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
  }) : null;
  const selectedNickname = searchParams.get("nickname") ?? "";

  function completeAuth(userId: string) {
    document.cookie = `istanbul_quest_session=${userId}; path=/; max-age=604800; SameSite=Lax`;
    if (selectedGroup) {
      setActiveGroupCookie(selectedGroup.id);
      router.push("/dashboard");
    } else {
      router.push("/select-group");
    }
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError("");
    try {
      const { signInWithGoogleAndJoinGroup } = await import("@/services/firebase-app-service");
      const user = await signInWithGoogleAndJoinGroup({
        groupId: selectedGroup?.id,
        inviteCode: selectedGroup?.inviteCode,
        nickname: selectedNickname
      });
      completeAuth(user.uid);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Google sign-in failed.";
      setError(message.includes("auth/popup-closed-by-user") ? "" : message);
    } finally {
      setGoogleLoading(false);
    }
  }

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
        const user = selectedGroup
          ? await firebaseService.signInAndJoinGroup(email, password, selectedGroup.id, selectedGroup.inviteCode, selectedNickname)
          : await firebaseService.signInExistingAccount(email, password);
        authenticatedUserId = user.uid;
      }

      if (mode === "register") {
        const user = await firebaseService.registerUserAndJoinGroup({
          username: String(formData.get("username") ?? ""),
          email,
          password,
          groupId: selectedGroup?.id ?? "",
          inviteCode: selectedGroup?.inviteCode ?? "",
          avatarFile
        });
        authenticatedUserId = user.uid;
      }

      completeAuth(authenticatedUserId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Firebase action failed.";
      const friendlyMessage = message.includes("auth/configuration-not-found")
        ? "Firebase Authentication is not configured yet. Enable Authentication > Email/Password in Firebase Console, then try again."
        : message.includes("auth/unauthorized-domain")
          ? "This domain is not authorized in Firebase Authentication. Add your GitHub Pages domain in Firebase Auth settings."
          : message;
      setError(friendlyMessage);
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
    <main className="grid min-h-screen place-items-center px-3 py-6 sm:px-4 sm:py-10">
      <Card className="grid w-full max-w-5xl overflow-hidden p-0 md:grid-cols-[1fr_1.1fr]">
        <section className="turkish-tile bg-primary p-5 text-primary-foreground sm:p-8 md:p-12">
          <div className="grid h-full content-between gap-8 sm:gap-12">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-primary-foreground/70">Private Vacation Platform</p>
              <h1 className="mt-3 font-display text-3xl font-black leading-tight sm:mt-4 sm:text-5xl">ISTANBUL QUEST</h1>
              <p className="mt-3 text-base text-primary-foreground/80 sm:mt-4 sm:text-lg">7 Days. 1 City. Endless Memories.</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/15 bg-white/10 p-4 backdrop-blur sm:rounded-[2rem] sm:p-5">
              <p className="text-sm font-semibold">Current friend space</p>
              <p className="mt-2 break-words text-xl font-black sm:text-2xl">{selectedGroup?.name ?? "Your existing group"}</p>
              <p className="mt-2 text-sm text-primary-foreground/75 sm:text-base">{selectedGroup?.description ?? "Log in to access the group already linked to your account."}</p>
            </div>
          </div>
        </section>

        <section className="p-5 sm:p-8 md:p-12">
          <div className="mb-6 inline-grid h-14 w-14 place-items-center rounded-2xl bg-accent/15 text-accent sm:mb-8">
            <Icon className="h-7 w-7" />
          </div>
          <h2 className="font-display text-2xl font-black sm:text-4xl">{content.title}</h2>
          <p className="mt-3 text-muted-foreground">{content.description}</p>

          {mode !== "forgot" && (
            <>
              <Button
                type="button"
                variant="secondary"
                size="lg"
                className="mt-6 w-full"
                disabled={googleLoading}
                onClick={() => void handleGoogleSignIn()}
              >
                {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                    <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3a7.4 7.4 0 0 1-11-3.89H1.06v3.09A12 12 0 0 0 12 24Z" />
                    <path fill="#FBBC05" d="M5.07 14.2a7.2 7.2 0 0 1 0-4.4V6.71H1.06a12 12 0 0 0 0 10.58l4.01-3.09Z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.06 6.71l4.01 3.09A7.15 7.15 0 0 1 12 4.75Z" />
                  </svg>
                )}
                {googleLoading ? "Connecting..." : "Continue with Google"}
              </Button>
              <div className="mt-6 flex items-center gap-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

          <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
            {mode === "register" && (
              <>
                <div className="rounded-3xl border border-border bg-surface-elevated p-4">
                  <Badge>Joining Group</Badge>
                  <p className="mt-2 text-xl font-black">{selectedGroup?.name ?? "Selected group"}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Invite code: {selectedGroup?.inviteCode ?? "Required"}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Destination: {selectedGroup?.destination ?? "Group destination"}</p>
                </div>

                <label
                  onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  className={`grid cursor-pointer place-items-center rounded-[2rem] border-2 border-dashed p-6 text-center transition ${dragging ? "border-accent bg-accent/15" : "border-border bg-surface-elevated"}`}
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
                <Field name="username" label="Nickname" placeholder="Choose your group nickname" defaultValue={selectedNickname} readOnly={Boolean(selectedNickname)} required />
                <Field name="email" label="Email" type="email" placeholder="Email" required />
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
