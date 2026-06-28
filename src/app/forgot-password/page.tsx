import { Suspense } from "react";
import { AuthCard } from "@/components/auth-card";

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <AuthCard mode="forgot" />
    </Suspense>
  );
}
