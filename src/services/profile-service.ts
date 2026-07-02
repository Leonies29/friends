import { FirebaseError } from "firebase/app";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getFirebaseFirestore } from "@/firebase/firestore";
import { getFirebaseStorage } from "@/firebase/storage";
import { compressImage } from "@/lib/image-utils";

const MAX_PROFILE_SIZE = 2 * 1024 * 1024;

function profileUploadError(error: unknown): Error {
  if (error instanceof FirebaseError) {
    if (error.code === "storage/unauthorized") {
      return new Error("Accès refusé par Firebase Storage. Vérifie les règles de sécurité pour profilePictures/{uid}.");
    }
    if (error.code === "storage/canceled") {
      return new Error("Upload annulé. Vérifie ta connexion internet.");
    }
    if (error.code === "storage/retry-limit-exceeded" || error.code === "storage/unknown") {
      return new Error(
        "Upload bloqué par CORS. Configure Firebase Storage pour autoriser https://leonies29.github.io (voir docs/firebase-storage-setup.md)."
      );
    }
  }

  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("cors") || message.includes("network") || message.includes("failed to fetch")) {
    return new Error(
      "Upload bloqué par CORS. Configure Firebase Storage pour autoriser https://leonies29.github.io (voir docs/firebase-storage-setup.md)."
    );
  }

  return new Error("Upload échoué. Réessaie ou vérifie la configuration Firebase Storage.");
}

export async function uploadProfilePicture(uid: string, file: File) {
  if (file.size > MAX_PROFILE_SIZE * 2) {
    throw new Error("Image trop lourde. Taille max : 4 Mo avant compression.");
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error("Pas de connexion internet.");
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
