import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type QueryConstraint
} from "firebase/firestore";
import { getFirebaseFirestore } from "@/firebase/firestore";

export async function createDocument<T extends DocumentData>(collectionName: string, data: T, id?: string) {
  const db = getFirebaseFirestore();
  const payload = { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };

  if (id) {
    await setDoc(doc(db, collectionName, id), payload, { merge: true });
    return id;
  }

  const ref = await addDoc(collection(db, collectionName), payload);
  return ref.id;
}

export async function updateDocument<T extends DocumentData>(collectionName: string, id: string, data: Partial<T>) {
  const db = getFirebaseFirestore();
  await updateDoc(doc(db, collectionName, id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteDocument(collectionName: string, id: string) {
  const db = getFirebaseFirestore();
  await deleteDoc(doc(db, collectionName, id));
}

export async function getDocument<T>(collectionName: string, id: string) {
  const db = getFirebaseFirestore();
  const snapshot = await getDoc(doc(db, collectionName, id));
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as T & { id: string }) : null;
}

export async function listDocuments<T>(collectionName: string, constraints: QueryConstraint[] = []) {
  const db = getFirebaseFirestore();
  const snapshot = await getDocs(query(collection(db, collectionName), ...constraints));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as T & { id: string });
}

export const crudConstraints = {
  where,
  orderBy
};
