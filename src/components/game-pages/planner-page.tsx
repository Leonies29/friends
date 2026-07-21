"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, MapPin } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import { useActiveGroup } from "@/hooks/use-active-group";
import { canManagePlanning } from "@/services/permissions";
import { createScheduleEvent, listScheduleEvents } from "@/services/schedule-service";
import type { ScheduleEvent } from "@/types";
import { EmptyGroupCard, LoadingCard, PageShell } from "@/components/game-pages/page-shell";

const inputClass = "w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold";

export function PlannerPage() {
  const state = useActiveGroup();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const canEdit = canManagePlanning(state.currentMember?.role);

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
    if (!state.group?.id || !canEdit) return;
    const form = new FormData(event.currentTarget);
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
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Badge>{event.startTime}{event.endTime ? ` – ${event.endTime}` : ""}</Badge>
                    <h3 className="mt-3 text-2xl font-black">{event.title}</h3>
                    {event.description && <p className="mt-2 text-muted-foreground">{event.description}</p>}
                  </div>
                  <CalendarDays className="h-6 w-6 text-accent" />
                </div>
                {event.location && (
                  <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {event.location}
                  </p>
                )}
              </Card>
            </motion.div>
          ))}
        </div>

        {canEdit && (
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
        )}
      </section>
    </PageShell>
  );
}
