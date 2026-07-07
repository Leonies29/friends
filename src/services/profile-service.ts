import { FirebaseError } from "firebase/app";
import { EmailAuthProvider, reauthenticateWithCredential, updateEmail } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getFirebaseAuth } from "@/firebase/auth";
import { getFirebaseFirestore } from "@/firebase/firestore";
import { getFirebaseStorage } from "@/firebase/storage";
import { compressImage } from "@/lib/image-utils";
import { GROUP_MEMBERS_COLLECTION } from "@/services/group-service";

const MAX_PROFILE_SIZE = 2 * 1024 * 1024;

export type PersonalProfileInput = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  nickname?: string;
};

export type UserProfileRecord = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  username?: string;
};

function profileUpdateError(error: unknown, fallback: string): Error {
  if (error instanceof FirebaseError) {
    if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
      return new Error("Current password is incorrect.");
    }
    if (error.code === "auth/email-already-in-use") {
      return new Error("This email is already used by another account.");
    }
    if (error.code === "auth/invalid-email") {
      return new Error("Enter a valid email address.");
    }
    if (error.code === "auth/requires-recent-login") {
      return new Error("Please sign out and sign in again before changing your email.");
    }
  }

  return error instanceof Error ? error : new Error(fallback);
}

export async function getUserProfile(uid: string): Promise<UserProfileRecord | null> {
  const snapshot = await getDoc(doc(getFirebaseFirestore(), "users", uid));
  if (!snapshot.exists()) return null;

  const data = snapshot.data();
  return {
    firstName: typeof data.firstName === "string" ? data.firstName : "",
    lastName: typeof data.lastName === "string" ? data.lastName : "",
    phone: typeof data.phone === "string" ? data.phone : "",
    email: typeof data.email === "string" ? data.email : "",
    username: typeof data.username === "string" ? data.username : ""
  };
}

export async function updatePersonalProfile(uid: string, groupId: string | null, input: PersonalProfileInput) {
  const db = getFirebaseFirestore();
  const updates: Record<string, unknown> = { updatedAt: serverTimestamp() };

  if (input.firstName !== undefined) updates.firstName = input.firstName.trim();
  if (input.lastName !== undefined) updates.lastName = input.lastName.trim();
  if (input.phone !== undefined) updates.phone = input.phone.trim();

  await setDoc(doc(db, "users", uid), updates, { merge: true });

  if (groupId && input.nickname !== undefined) {
    const nickname = input.nickname.trim();
    if (!nickname) {
      throw new Error("Nickname cannot be empty.");
    }

    await setDoc(doc(db, GROUP_MEMBERS_COLLECTION, `${groupId}_${uid}`), {
      nickname,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }
}

export async function updateAccountEmail(uid: string, newEmail: string, currentPassword: string) {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  const trimmedEmail = newEmail.trim();

  if (!user || user.uid !== uid) {
    throw new Error("You must be signed in to update your email.");
  }

  const currentEmail = user.email;
  if (!currentEmail) {
    throw new Error("No email is linked to this account.");
  }

  if (!trimmedEmail) {
    throw new Error("Email cannot be empty.");
  }

  if (trimmedEmail === currentEmail) {
    return trimmedEmail;
  }

  try {
    const credential = EmailAuthProvider.credential(currentEmail, currentPassword);
    await reauthenticateWithCredential(user, credential);
    await updateEmail(user, trimmedEmail);
  } catch (error) {
    throw profileUpdateError(error, "Unable to update email.");
  }

  const db = getFirebaseFirestore();
  await setDoc(doc(db, "users", uid), {
    email: trimmedEmail,
    updatedAt: serverTimestamp()
  }, { merge: true });

  const userSnapshot = await getDoc(doc(db, "users", uid));
  const activeGroupId = userSnapshot.data()?.activeGroupId as string | undefined;
  if (activeGroupId) {
    await setDoc(doc(db, GROUP_MEMBERS_COLLECTION, `${activeGroupId}_${uid}`), {
      email: trimmedEmail,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }

  return trimmedEmail;
}

function profileUploadError(error: unknown): Error {
  if (error instanceof FirebaseError) {
    if (error.code === "storage/unauthorized") {
      return new Error("Access denied by Firebase Storage. Check security rules for profilePictures/{uid}.");
    }
    if (error.code === "storage/canceled") {
      return new Error("Upload canceled. Check your internet connection.");
    }
    if (error.code === "storage/retry-limit-exceeded" || error.code === "storage/unknown") {
      return new Error(
        "Upload blocked by CORS. Configure Firebase Storage to allow https://leonies29.github.io (see docs/firebase-storage-setup.md)."
      );
    }
  }

  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("cors") || message.includes("network") || message.includes("failed to fetch")) {
    return new Error(
      "Upload blocked by CORS. Configure Firebase Storage to allow https://leonies29.github.io (see docs/firebase-storage-setup.md)."
    );
  }

  return new Error("Upload failed. Try again or check your Firebase Storage configuration.");
}

export async function uploadProfilePicture(uid: string, file: File) {
  if (file.size > MAX_PROFILE_SIZE * 2) {
    throw new Error("Image too large. Max size: 4 MB before compression.");
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error("No internet connection.");
  }

  const compressed = await compressImage(file, 800, 0.82);
  const storagePath = `profilePictures/${uid}`;
  const storageRef = ref(getFirebaseStorage(), storagePath);

  try {
    await uploadBytes(storageRef, compressed, { contentType: "image/jpeg" });
    const avatarUrl = await getDownloadURL(storageRef);
    const db = getFirebaseFirestore();

    await setDoc(doc(db, "users", uid), {
      uid,
      avatarUrl,
      updatedAt: serverTimestamp()
    }, { merge: true });

    const userSnapshot = await getDoc(doc(db, "users", uid));
    const activeGroupId = userSnapshot.data()?.activeGroupId as string | undefined;
    if (activeGroupId) {
      await setDoc(doc(db, "groupMembers", `${activeGroupId}_${uid}`), {
        avatarUrl,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    return avatarUrl;
  } catch (error) {
    throw profileUploadError(error);
  }
}
