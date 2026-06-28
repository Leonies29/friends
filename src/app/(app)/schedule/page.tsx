import { Clock, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, Field, Progress, TextArea } from "@/components/ui";
import { scheduleEvents } from "@/lib/mock-data";
import { formatDate, readinessPercent } from "@/lib/utils";

export default function SchedulePage() {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <Card className="h-fit">
        <Badge>Create Event</Badge>
        <h1 className="mt-3 font-display text-4xl font-black">Shared Schedule Planner</h1>
        <p className="mt-2 text-muted-foreground">Firebase Firestore can persist these events later; the UI is already shaped for create, edit, and delete flows.</p>
        <form className="mt-6 grid gap-4">
          <Field label="Title" placeholder="Night Challenge at Galata" />
          <TextArea label="Description" placeholder="What are we doing and how much chaos is allowed?" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date" type="date" />
            <Field label="Time" type="time" />
          </div>
          <Field label="Meeting location" placeholder="Hotel lobby, ferry pier, secret baklava bunker..." />
          <TextArea label="Notes" placeholder="Bring water. Be ready. Do not trust Leo." />
          <Button type="button">
            <Plus className="h-4 w-4" />
            Create Event
          </Button>
        </form>
      </Card>

      <section className="grid gap-4">
        {scheduleEvents.map((event, index) => (
          <Card key={event.id} className="relative overflow-hidden">
            <div className="absolute left-7 top-20 hidden h-full w-px bg-border md:block" />
            <div className="grid gap-4 md:grid-cols-[3rem_1fr]">
              <div className="z-10 hidden h-14 w-14 place-items-center rounded-full bg-primary font-black text-primary-foreground md:grid">{index + 1}</div>
              <div>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Badge>{formatDate(event.date)}</Badge>
                    <h2 className="mt-3 text-2xl font-black">{event.title}</h2>
                    <p className="mt-2 text-muted-foreground">{event.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm"><Pencil className="h-4 w-4" />Edit</Button>
                    <Button variant="danger" size="sm"><Trash2 className="h-4 w-4" />Delete</Button>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <p className="flex items-center gap-2 rounded-2xl bg-white/45 p-3 text-sm font-semibold dark:bg-white/5">
                    <Clock className="h-4 w-4 text-accent" />
                    {event.time}
                  </p>
                  <p className="flex items-center gap-2 rounded-2xl bg-white/45 p-3 text-sm font-semibold dark:bg-white/5">
                    <MapPin className="h-4 w-4 text-accent" />
                    {event.meetingLocation}
                  </p>
                </div>

                <div className="mt-5 rounded-3xl border border-border bg-white/35 p-4 dark:bg-white/5">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="font-black">Readiness</p>
                    <Badge>{readinessPercent(event.readiness)}% ready</Badge>
                  </div>
                  <Progress value={readinessPercent(event.readiness)} />
                  <div className="mt-4 flex flex-wrap gap-2">
                    {Object.entries(event.readiness).map(([userId, status]) => (
                      <span key={userId} className="rounded-full bg-muted px-3 py-1 text-xs font-bold">
                        {userId.toUpperCase()} {status === "ready" ? "Ready" : "Not Ready"}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">Notes: {event.notes}</p>
              </div>
            </div>
          </Card>
        ))}
      </section>
    </div>
  );
}
