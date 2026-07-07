"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import { ImagePlus, Loader2, LogOut, Moon, RefreshCw, Shield, Sun } from "lucide-react";
import { signOut } from "firebase/auth";
import { useTheme } from "next-themes";
import { Avatar, Badge, Button, Card, Field } from "@/components/ui";
import { LoadingCard } from "@/components/game-pages/page-shell";
import { getFirebaseAuth } from "@/firebase/auth";
import { useActiveGroup } from "@/hooks/use-active-group";
import { resolveMemberAvatar } from "@/lib/istanbul-avatars";
import { clearActiveGroupCookie } from "@/lib/session-cookies";
import { canManageGames, resolveEffectiveRole } from "@/services/permissions";
import {
  getUserProfile,
  updateAccountEmail,
  updatePersonalProfile,
  uploadProfilePicture
} from "@/services/profile-service";
import { listXpTransactions } from "@/services/xp-service";
import { calculateLevel } from "@/lib/utils";

type PersonalForm = {
  firstName: string;
  lastName: string;
  nickname: string;
  email: string;
  phone: string;
  currentPassword: string;
};

const emptyForm: PersonalForm = {
  firstName: "",
  lastName: "",
  nickname: "",
  email: "",
  phone: "",
  currentPassword: ""
};

export function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const state = useActiveGroup();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [totalXp, setTotalXp] = useState(0);
  const [profileLoading, setProfileLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [passwordResetMessage, setPasswordResetMessage] = useState("");
  const [passwordResetError, setPasswordResetError] = useState("");
  const [sendingPasswordReset, setSendingPasswordReset] = useState(false);
  const [form, setForm] = useState<PersonalForm>(emptyForm);
  const [initialEmail, setInitialEmail] = useState("");

  const member = state.members.find((item) => item.id === state.userId || item.userId === state.userId);
  const displayName = member?.nickname || member?.username || "Traveler";
  const avatarUrl = resolveMemberAvatar(state.group, member ?? {});
  const role = resolveEffectiveRole(state.currentMember, state.group, state.userId);
  const canAdmin = canManageGames(role);
  const level = calculateLevel(totalXp);
  const emailChanged = form.email.trim() !== initialEmail.trim();

  useEffect(() => {
    if (!state.group?.id || !state.userId) return;
    void listXpTransactions(state.group.id)
      .then((transactions) => {
        const xp = transactions.filter((item) => item.userId === state.userId).reduce((sum, item) => sum + item.amount, 0);
        setTotalXp(xp);
      })
      .catch(() => undefined);
  }, [state.group?.id, state.userId]);

  useEffect(() => {
    if (!state.userId) {
      setProfileLoading(false);
      return;
    }

    let cancelled = false;

    async function loadProfile() {
      setProfileLoading(true);
      try {
        const [{ getGroupMember }, profile, authUser] = await Promise.all([
          import("@/services/member-service"),
          getUserProfile(state.userId!),
          Promise.resolve(getFirebaseAuth().currentUser)
        ]);

        const membership = state.group?.id
          ? await getGroupMember(state.group.id, state.userId!)
          : null;

        if (cancelled) return;

        const email = authUser?.email ?? profile?.email ?? "";
        setInitialEmail(email);
        setForm({
          firstName: profile?.firstName ?? "",
          lastName: profile?.lastName ?? "",
          nickname: membership?.nickname ?? profile?.username ?? "",
          email,
          phone: profile?.phone ?? "",
          currentPassword: ""
        });
      } catch {
        if (!cancelled) {
          setProfileError("Unable to load your personal information.");
        }
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [state.userId, state.group?.id]);

  function updateField<K extends keyof PersonalForm>(key: K, value: PersonalForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setProfileMessage("");
    setProfileError("");
  }

  async function logout() {
    await signOut(getFirebaseAuth()).catch(() => undefined);
    document.cookie = "istanbul_quest_session=; path=/; max-age=0; SameSite=Lax";
    clearActiveGroupCookie();
    router.push("/");
  }

  async function handleAvatarChange(file?: File) {
    if (!file || !state.userId) return;
    setUploading(true);
    setUploadError("");
    setUploadMessage("");

    try {
      await uploadProfilePicture(state.userId, file);
      state.reload();
      setUploadMessage("Profile photo updated.");
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Unable to update profile photo.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveProfile() {
    if (!state.userId) return;

    setSavingProfile(true);
    setProfileMessage("");
    setProfileError("");

    try {
      if (emailChanged) {
        if (!form.currentPassword.trim()) {
          throw new Error("Enter your current password to change your email.");
        }
        const updatedEmail = await updateAccountEmail(state.userId, form.email, form.currentPassword);
        setInitialEmail(updatedEmail);
        updateField("email", updatedEmail);
        updateField("currentPassword", "");
      }

      await updatePersonalProfile(state.userId, state.group?.id ?? null, {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        ...(state.group ? { nickname: form.nickname } : {})
      });

      state.reload();
      setProfileMessage("Personal information updated.");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Unable to save your information.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordReset() {
    const email = form.email.trim() || initialEmail.trim();
    if (!email) {
      setPasswordResetError("No email address on this account.");
      return;
    }

    setSendingPasswordReset(true);
    setPasswordResetMessage("");
    setPasswordResetError("");

    try {
      const { requestPasswordReset } = await import("@/services/firebase-app-service");
      await requestPasswordReset(email);
      setPasswordResetMessage("Password reset link sent to your email.");
    } catch (error) {
      setPasswordResetError(error instanceof Error ? error.message : "Unable to send password reset email.");
    } finally {
      setSendingPasswordReset(false);
    }
  }

  if (state.loading) {
    return <LoadingCard label="Loading settings..." />;
  }

  if (!state.group) {
    return (
      <div className="grid gap-4 sm:gap-6">
        <Card className="bg-surface-warm">
          <Badge>Settings</Badge>
          <h1 className="mt-3 text-2xl font-black">Your account</h1>
          <p className="mt-2 text-sm text-muted-foreground">Update your personal details or choose a group.</p>
        </Card>

        <Card>
          <p className="font-black">Personal information</p>
          {profileLoading ? (
            <p className="mt-3 text-sm text-muted-foreground">Loading profile...</p>
          ) : (
            <form
              className="mt-4 grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSaveProfile();
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="First name" value={form.firstName} onChange={(event) => updateField("firstName", event.target.value)} placeholder="Léonie" autoComplete="given-name" />
                <Field label="Last name" value={form.lastName} onChange={(event) => updateField("lastName", event.target.value)} placeholder="Martin" autoComplete="family-name" />
              </div>
              <Field label="Email" type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} placeholder="you@example.com" autoComplete="email" required />
              {emailChanged && (
                <Field
                  label="Current password"
                  type="password"
                  value={form.currentPassword}
                  onChange={(event) => updateField("currentPassword", event.target.value)}
                  placeholder="Required to change email"
                  autoComplete="current-password"
                />
              )}
              <Field label="Phone" type="tel" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} placeholder="+33 6 12 34 56 78" autoComplete="tel" />
              {profileMessage && <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{profileMessage}</p>}
              {profileError && <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">{profileError}</p>}
              <Button type="submit" size="sm" disabled={savingProfile || profileLoading}>
                {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save changes
              </Button>
            </form>
          )}
        </Card>

        <Card>
          <Badge>Settings</Badge>
          <h1 className="mt-3 text-2xl font-black">No active group</h1>
          <Button asChild className="mt-4" variant="secondary">
            <Link href="/select-group">Choose a group</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:gap-6">
      <Card className="bg-surface-warm">
        <Badge>Settings</Badge>
        <h1 className="mt-3 font-display text-2xl font-black sm:text-3xl">Your account</h1>
        <p className="mt-2 text-sm text-muted-foreground">Profile, trip, and app preferences.</p>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <Avatar src={avatarUrl} alt={displayName} className="h-20 w-20 sm:h-24 sm:w-24" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-black">{displayName}</p>
            <p className="text-sm text-muted-foreground">{state.group.name}</p>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">Level {level} · {role}</p>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => void handleAvatarChange(event.target.files?.[0])}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-4"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          Change profile photo
        </Button>
        {uploadMessage && <p className="mt-3 text-sm font-semibold text-emerald-700 dark:text-emerald-400">{uploadMessage}</p>}
        {uploadError && <p className="mt-3 text-sm font-semibold text-rose-700 dark:text-rose-400">{uploadError}</p>}
      </Card>

      <Card>
        <p className="font-black">Personal information</p>
        <p className="mt-1 text-sm text-muted-foreground">Name, contact details, and your nickname in this group.</p>
        {profileLoading ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading profile...</p>
        ) : (
          <form
            className="mt-4 grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSaveProfile();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name" value={form.firstName} onChange={(event) => updateField("firstName", event.target.value)} placeholder="Léonie" autoComplete="given-name" />
              <Field label="Last name" value={form.lastName} onChange={(event) => updateField("lastName", event.target.value)} placeholder="Martin" autoComplete="family-name" />
            </div>
            <Field
              label="Nickname in this group"
              value={form.nickname}
              onChange={(event) => updateField("nickname", event.target.value)}
              placeholder="How others see you in the game"
              required
            />
            <Field label="Email" type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} placeholder="you@example.com" autoComplete="email" required />
            {emailChanged && (
              <Field
                label="Current password"
                type="password"
                value={form.currentPassword}
                onChange={(event) => updateField("currentPassword", event.target.value)}
                placeholder="Required to change email"
                autoComplete="current-password"
              />
            )}
            <Field label="Phone" type="tel" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} placeholder="+33 6 12 34 56 78" autoComplete="tel" />
            {profileMessage && <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{profileMessage}</p>}
            {profileError && <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">{profileError}</p>}
            <Button type="submit" size="sm" disabled={savingProfile}>
              {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save changes
            </Button>
          </form>
        )}
      </Card>

      <Card>
        <p className="font-black">Security</p>
        <p className="mt-1 text-sm text-muted-foreground">Change your password via email.</p>
        <Button type="button" variant="secondary" size="sm" className="mt-4" disabled={sendingPasswordReset} onClick={() => void handlePasswordReset()}>
          {sendingPasswordReset ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Send password reset email
        </Button>
        {passwordResetMessage && <p className="mt-3 text-sm font-semibold text-emerald-700 dark:text-emerald-400">{passwordResetMessage}</p>}
        {passwordResetError && <p className="mt-3 text-sm font-semibold text-rose-700 dark:text-rose-400">{passwordResetError}</p>}
      </Card>

      <Card>
        <p className="font-black">Trip</p>
        <p className="mt-1 text-sm text-muted-foreground">{state.group.destination || "Your current adventure"}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link href="/select-group?switch=1">
              <RefreshCw className="h-4 w-4" />
              Switch group
            </Link>
          </Button>
          {canAdmin && (
            <Button asChild size="sm">
              <Link href="/admin">
                <Shield className="h-4 w-4" />
                Admin
              </Link>
            </Button>
          )}
        </div>
      </Card>

      <Card>
        <p className="font-black">Appearance</p>
        <p className="mt-1 text-sm text-muted-foreground">Choose light or dark mode.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant={theme === "light" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setTheme("light")}
          >
            <Sun className="h-4 w-4" />
            Light
          </Button>
          <Button
            type="button"
            variant={theme === "dark" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setTheme("dark")}
          >
            <Moon className="h-4 w-4" />
            Dark
          </Button>
        </div>
      </Card>

      <Card>
        <p className="font-black">Session</p>
        <p className="mt-1 text-sm text-muted-foreground">Sign out from this device.</p>
        <Button type="button" variant="danger" size="sm" className="mt-4" onClick={() => void logout()}>
          <LogOut className="h-4 w-4" />
          Log out
        </Button>
      </Card>
    </div>
  );
}
