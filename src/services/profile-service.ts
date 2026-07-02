import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getFirebaseFirestore } from "@/firebase/firestore";
import { getFirebaseStorage } from "@/firebase/storage";
import { compressImage } from "@/lib/image-utils";

const MAX_PROFILE_SIZE = 2 * 1024 * 1024;

export async function uploadProfilePicture(uid: string, file: File) {
  if (file.size > MAX_PROFILE_SIZE * 2) {
    throw new Error("Image too large. Maximum size is 4 MB before compression.");
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error("Connection lost. Check your internet and try again.");
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
  } catch {
    throw new Error("Upload failed. Please try again.");
  }
}
