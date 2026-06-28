import { getFirestore } from "firebase/firestore";
import { getFirebaseApp } from "./config";

export function getFirebaseFirestore() {
  return getFirestore(getFirebaseApp());
}
