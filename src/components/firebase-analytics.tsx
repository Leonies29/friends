"use client";

import { useEffect } from "react";
import { getFirebaseAnalytics } from "@/firebase/config";

export function FirebaseAnalytics() {
  useEffect(() => {
    void getFirebaseAnalytics();
  }, []);

  return null;
}
