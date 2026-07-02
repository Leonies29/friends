import { Suspense } from "react";
import { SelectGroupPage } from "@/components/select-group-page";

export default function SelectGroupRoute() {
  return (
    <Suspense fallback={null}>
      <SelectGroupPage />
    </Suspense>
  );
}
