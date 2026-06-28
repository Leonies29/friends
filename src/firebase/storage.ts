import { getStorage } from "firebase/storage";
import { getFirebaseApp } from "./config";

export function getFirebaseStorage() {
  return getStorage(getFirebaseApp());
}
