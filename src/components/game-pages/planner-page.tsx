"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, MapPin, Pencil, Trash2 } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import { useActiveGroup } from "@/hooks/use-active-group";
import { formatFirestoreError } from "@/lib/firebase-errors";
import { createScheduleEvent, deleteScheduleEvent, listScheduleEvents, updateScheduleEvent } from "@/services/schedule-service";
import type { ScheduleEvent } from "@/types";
import { EmptyGroupCard, LoadingCard, PageShell } from "@/components/game-pages/page-shell";

const inputClass = "w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold";

export function PlannerPage() {
  const state = useActiveGroup();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!state.group?.id) return;
    setLoading(true);
    const items = await listScheduleEvents(state.group.id);
    setEvents(items);
    setSelectedDate((current) => current || items[0]?.date || current);
    setLoading(false);
  }, [state.group?.id]);

  useEffect(() => { void load(); }, [load]);

  const dates = useMemo(() => [...new Set(events.map((event) => event.date))].sort(), [events]);
  const dayEvents = events.filter((event) => event.date === selectedDate);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!state.group?.id) return;
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await createScheduleEvent(state.group.id, {
        title: String(form.get("title") ?? ""),
        description: String(form.get("description") ?? ""),
        date: String(form.get("date") ?? ""),
        startTime: String(form.get("startTime") ?? ""),
        endTime: String(form.get("endTime") ?? ""),
        location: String(form.get("location") ?? "")
      });
      event.currentTarget.reset();
      await load();
    } catch (err) {
      setError(formatFirestoreError(err, "Unable to save this event."));
    }
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>, eventId: string) {
    event.preventDefault();
    setError("");
    setBusyId(eventId);
    const form = new FormData(event.currentTarget);
    try {
      await updateScheduleEvent(eventId, {
        title: String(form.get("title") ?? ""),
        description: String(form.get("description") ?? ""),
        date: String(form.get("date") ?? ""),
        startTime: String(form.get("startTime") ?? ""),
        endTime: String(form.get("endTime") ?? ""),
        location: String(form.get("location") ?? "")
      });
      setEditingEventId(null);
      await load();
    } catch (err) {
      setError(formatFirestoreError(err, "Unable to update this event."));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(eventId: string) {
    setError("");
    setBusyId(eventId);
    try {
      await deleteScheduleEvent(eventId);
      await load();
    } catch (err) {
      setError(formatFirestoreError(err, "Unable to delete this event."));
    } finally {
      setBusyId(null);
    }
  }

  if (state.loading || loading) return <LoadingCard label="Loading planner..." />;
  if (!state.group) return <EmptyGroupCard />;

  return (
    <PageShell eyebrow="Planner" title="Trip Planner" description="Daily schedule, activities, locations, and notes for Istanbul." group={state.group}>
      <Card>
        <Badge>Calendar</Badge>
        <div className="mt-4 flex flex-wrap gap-2">
          {dates.length === 0 && <p className="text-sm text-muted-foreground">No events yet.</p>}
          {dates.map((date) => (
            <button
              key={date}
              type="button"
              onClick={() => setSelectedDate(date)}
              className={`rounded-2xl px-4 py-3 text-sm font-black ${selectedDate === date ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}
            >
              {new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            </button>
          ))}
        </div>
      </Card>

      {error && <Card className="border-rose-200 bg-rose-50 text-sm font-semibold text-rose-700">{error}</Card>}

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-4">
          {dayEvents.length === 0 && (
            <Card>
              <p className="text-muted-foreground">No activities for this day yet.</p>
            </Card>
          )}
          {dayEvents.map((event, index) => (
            <motion.div key={event.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
              <Card>
                {editingEventId === event.id ? (
                  <form className="grid gap-3" onSubmit={(formEvent) => void handleUpdate(formEvent, event.id)}>
                    <input name="title" required placeholder="Title" defaultValue={event.title} className={inputClass} />
                    <input name="date" type="date" required defaultValue={event.date} className={inputClass} />
                    <input name="startTime" type="time" required defaultValue={event.startTime || event.time} className={inputClass} />
                    <input name="endTime" type="time" defaultValue={event.endTime} className={inputClass} />
                    <input name="location" placeholder="Location" defaultValue={event.location || event.meetingLocation} className={inputClass} />
                    <textarea name="description" placeholder="Notes" defaultValue={event.description} className={`${inputClass} min-h-24`} />
                    <div className="grid gap-2 sm:flex">
                      <Button type="submit" size="sm" disabled={busyId === event.id}>Save changes</Button>
                      <Button type="button" variant="ghost" size="sm" disabled={busyId === event.id} onClick={() => setEditingEventId(null)}>Cancel</Button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <Badge>{event.startTime}{event.endTime ? ` – ${event.endTime}` : ""}</Badge>
                        <h3 className="mt-3 text-2xl font-black">{event.title}</h3>
                        {event.description && <p className="mt-2 text-muted-foreground">{event.description}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setEditingEventId(event.id)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="sm" disabled={busyId === event.id} onClick={() => void handleDelete(event.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <CalendarDays className="h-6 w-6 text-accent" />
                      </div>
                    </div>
                    {event.location && (
                      <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {event.location}
                      </p>
                    )}
                  </>
                )}
              </Card>
            </motion.div>
          ))}
        </div>

        <Card>
          <Badge>Add event</Badge>
          <form className="mt-4 grid gap-3" onSubmit={(event) => void handleCreate(event)}>
            <input name="title" required placeholder="Title" className={inputClass} />
            <input name="date" type="date" required defaultValue={selectedDate} className={inputClass} />
            <input name="startTime" type="time" required className={inputClass} />
            <input name="endTime" type="time" className={inputClass} />
            <input name="location" placeholder="Location" className={inputClass} />
            <textarea name="description" placeholder="Notes" className={`${inputClass} min-h-24`} />
            <Button type="submit">Save event</Button>
          </form>
        </Card>
      </section>
    </PageShell>
  );
}
