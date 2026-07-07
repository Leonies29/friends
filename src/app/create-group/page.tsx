import { CreateGroupForm } from "@/components/create-group-form";

export default function CreateGroupPage() {
  return (
    <main className="min-h-screen px-4 py-6 sm:py-8 md:px-8">
      <section className="mx-auto max-w-3xl">
        <CreateGroupForm />
      </section>
    </main>
  );
}
