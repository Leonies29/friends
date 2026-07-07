import { Suspense } from "react";
import { SelectGroupPage } from "@/components/select-group-page";

export default function SelectGroupRoute() {
  return (
    <Suspense fallback={
      <main className="grid min-h-screen place-items-center px-4">
        <p className="font-black">Loading your trips...</p>
      </main>
    }>
      <SelectGroupPage />
    </Suspense>
  );
}
