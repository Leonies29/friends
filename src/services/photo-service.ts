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
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getFirebaseFirestore } from "@/firebase/firestore";
import { getFirebaseStorage } from "@/firebase/storage";
import type { Photo, ReactionType } from "@/types";

export const PHOTOS_COLLECTION = "photos";
export const PHOTO_REACTIONS_COLLECTION = "photoReactions";
export const PHOTO_COMMENTS_COLLECTION = "photoComments";

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
  const storagePath = `groups/${input.groupId}/photos/${input.ownerId}/${Date.now()}-${input.file.name}`;
  const storageRef = ref(getFirebaseStorage(), storagePath);
  await uploadBytes(storageRef, input.file);
  const imageUrl = await getDownloadURL(storageRef);

  const db = getFirebaseFirestore();
  const created = await addDoc(collection(db, PHOTOS_COLLECTION), {
    groupId: input.groupId,
    ownerId: input.ownerId,
    ownerName: input.ownerName,
    ownerAvatar: input.ownerAvatar ?? "",
    imageUrl,
    storagePath,
    caption: input.caption,
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
