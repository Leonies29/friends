import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { JoinGroupCard } from "@/components/join-group-card";

export default function JoinPage() {
  return (
    <main className="min-h-screen px-4 py-8 md:px-8">
      <section className="mx-auto grid max-w-3xl gap-4">
        <Button asChild variant="ghost" className="w-fit">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
        <Suspense fallback={<Card>Loading invite...</Card>}>
          <JoinGroupCard />
        </Suspense>
      </section>
    </main>
  );
}
