import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";
import { getFirestore, collection as modularCollection, addDoc as modularAddDoc, serverTimestamp as modularServerTimestamp } from "firebase/firestore";
import { deleteObject, getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import { getFirebaseApp } from "@/firebase/config";
import { getFirebaseFirestore } from "@/firebase/firestore";
import { getFirebaseStorage } from "@/firebase/storage";
import type { Photo, ReactionType } from "@/types";

export const PHOTOS_COLLECTION = "photos";
export const PHOTO_REACTIONS_COLLECTION = "photoReactions";
export const PHOTO_COMMENTS_COLLECTION = "photoComments";
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export type ChallengePhotoMetadata = {
  id: string;
  userId: string;
  challengeId: string;
  photoUrl: string;
  fileName: string;
  uploadedAt: ReturnType<typeof modularServerTimestamp>;
  validated: false;
};

export class PhotoUploadError extends Error {
  constructor(message: string, public code: "file-too-large" | "offline" | "upload-failed") {
    super(message);
    this.name = "PhotoUploadError";
  }
}

function sanitizeFileName(fileName: string) {
  return fileName.trim().replace(/[^\w.-]+/g, "_") || "photo.jpg";
}

function assertValidImage(file: File) {
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new PhotoUploadError("Image too large. Maximum size is 5 MB.", "file-too-large");
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new PhotoUploadError("Connection lost. Check your internet connection and try again.", "offline");
  }
}

function normalizeUploadError(error: unknown): PhotoUploadError {
  if (error instanceof PhotoUploadError) return error;

  const message = error instanceof Error ? error.message : "";
  if (message.includes("storage/retry-limit-exceeded") || message.includes("storage/canceled") || message.includes("storage/unknown")) {
    return new PhotoUploadError("Upload failed. Check your connection and try again.", "upload-failed");
  }

  return new PhotoUploadError("Unable to upload the photo right now.", "upload-failed");
}

export async function uploadChallengePhoto(file: File, userId: string, challengeId: string): Promise<ChallengePhotoMetadata> {
  try {
    assertValidImage(file);

    const app = getFirebaseApp();
    const storage = getStorage(app);
    const db = getFirestore(app);
    const fileName = sanitizeFileName(file.name);
    const storagePath = `photos/${userId}/${Date.now()}_${fileName}`;
    const storageRef = ref(storage, storagePath);

    await uploadBytes(storageRef, file);
    const photoUrl = await getDownloadURL(storageRef);
    const metadata = {
      userId,
      challengeId,
      photoUrl,
      fileName,
      uploadedAt: modularServerTimestamp(),
      validated: false as const
    };
    const docRef = await modularAddDoc(modularCollection(db, PHOTOS_COLLECTION), metadata);

    return {
      id: docRef.id,
      ...metadata
    };
  } catch (error) {
    throw normalizeUploadError(error);
  }
}

export async function listPhotos(groupId: string) {
  const db = getFirebaseFirestore();
  const snapshot = await getDocs(query(collection(db, PHOTOS_COLLECTION), where("groupId", "==", groupId)));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Photo);
}

export async function uploadGroupPhoto(input: {
  groupId: string;
  ownerId: string;
  ownerName: string;
  ownerAvatar?: string | null;
  file: File;
  caption: string;
}) {
  assertValidImage(input.file);

  const fileName = sanitizeFileName(input.file.name);
  const storagePath = `photos/${input.ownerId}/${Date.now()}_${fileName}`;
  const storageRef = ref(getFirebaseStorage(), storagePath);
  let photoUrl = "";

  try {
    await uploadBytes(storageRef, input.file);
    photoUrl = await getDownloadURL(storageRef);
  } catch (error) {
    throw normalizeUploadError(error);
  }

  const db = getFirebaseFirestore();
  const created = await addDoc(collection(db, PHOTOS_COLLECTION), {
    groupId: input.groupId,
    userId: input.ownerId,
    challengeId: "",
    ownerId: input.ownerId,
    ownerName: input.ownerName,
    ownerAvatar: input.ownerAvatar ?? "",
    photoUrl,
    imageUrl: photoUrl,
    fileName,
    storagePath,
    caption: input.caption,
    uploadedAt: serverTimestamp(),
    validated: false,
    status: "visible",
    featured: false,
    commentCount: 0,
    reactionCounts: {},
    reactions: [],
    createdAt: new Date().toISOString(),
    updatedAt: serverTimestamp()
  });

  return created.id;
}

export async function deletePhoto(photo: Pick<Photo, "id" | "storagePath">) {
  const db = getFirebaseFirestore();
  await updateDoc(doc(db, PHOTOS_COLLECTION, photo.id), {
    status: "deleted",
    updatedAt: serverTimestamp()
  });

  if (photo.storagePath) {
    await deleteObject(ref(getFirebaseStorage(), photo.storagePath)).catch(() => undefined);
  }
}

export async function setPhotoFeatured(photoId: string, featured: boolean) {
  const db = getFirebaseFirestore();
  await updateDoc(doc(db, PHOTOS_COLLECTION, photoId), {
    featured,
    status: featured ? "featured" : "visible",
    updatedAt: serverTimestamp()
  });
}

export async function reactToPhoto(input: {
  groupId: string;
  photoId: string;
  userId: string;
  type: ReactionType;
}) {
  const db = getFirebaseFirestore();
  const reactionId = `${input.photoId}_${input.userId}`;

  await setDoc(doc(db, PHOTO_REACTIONS_COLLECTION, reactionId), {
    id: reactionId,
    groupId: input.groupId,
    photoId: input.photoId,
    userId: input.userId,
    type: input.type,
    xpGranted: 0,
    updatedAt: serverTimestamp()
  }, { merge: true });

  await updateDoc(doc(db, PHOTOS_COLLECTION, input.photoId), {
    [`reactionCounts.${input.type}`]: increment(1),
    updatedAt: serverTimestamp()
  });
}

export async function addPhotoComment(input: {
  groupId: string;
  photoId: string;
  userId: string;
  userName: string;
  body: string;
}) {
  const db = getFirebaseFirestore();
  await addDoc(collection(db, PHOTO_COMMENTS_COLLECTION), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  await updateDoc(doc(db, PHOTOS_COLLECTION, input.photoId), {
    commentCount: increment(1),
    updatedAt: serverTimestamp()
  });
}

export async function hardDeletePhotoDoc(photoId: string) {
  const db = getFirebaseFirestore();
  await deleteDoc(doc(db, PHOTOS_COLLECTION, photoId));
}
