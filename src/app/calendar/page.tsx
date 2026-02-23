"use client";

import { useEffect, useState } from "react";
import { pb } from "@/lib/pb";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Calendar as CalIcon,
  StickyNote,
  CheckSquare,
} from "lucide-react";

type CalendarEvent = {
  id: string;
  title: string;
  all_day: boolean;
  description: string;
  start: string;
  end: string;
  user: string;
  category?: string;
  expand?: {
    category?: {
      id: string;
      name: string;
      color?: string;
    };
  };
  created: string;
  updated: string;
};

type Category = {
  id: string;
  name: string;
  color?: string;
};

type CalendarNote = {
  id: string;
  title: string;
  date: string;
  category?: string;
  expand?: { category?: Category };
};

type CalendarTodo = {
  id: string;
  task: string;
  is_completed: boolean;
  due_date: string;
  category?: string;
  expand?: { category?: Category };
};

// Simple utility to get days in a month
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay(); // 0 is Sunday
}

export default function CalendarPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [notes, setNotes] = useState<CalendarNote[]>([]);
  const [todos, setTodos] = useState<CalendarTodo[]>([]);

  // Current viewed month state
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-11

  // Dialog & Form states
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDesc, setNewEventDesc] = useState("");
  const [newEventAllDay, setNewEventAllDay] = useState(true);
  const [newEventCategory, setNewEventCategory] = useState("none");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  // Summary State
  const [summaryMode, setSummaryMode] = useState<"summary" | "add">("summary");

  // Load events for the chosen month
  const fetchEvents = async () => {
    try {
      // Find range: from start of month to end of month.
      // But we just fetch all for this user to keep it simple, or filter by date
      // PocketBase doesn't have a date range easily without raw SQL/filters in string format.
      // E.g filter: `start >= '2022-01-01' && start <= '2022-01-31'`
      // Since it's a calendar based on `start`.
      const records = await pb.collection("events").getFullList<CalendarEvent>({
        sort: "start",
        expand: "category",
        requestKey: null,
      });
      setEvents(records);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!pb.authStore.isValid) {
      router.push("/");
      return;
    }

    const loadInitial = async () => {
      try {
        const [cats, evs, nts, tds] = await Promise.all([
          pb
            .collection("categories")
            .getFullList<Category>({ sort: "name", requestKey: null }),
          pb.collection("events").getFullList<CalendarEvent>({
            expand: "category",
            requestKey: null,
          }),
          pb.collection("notes").getFullList<CalendarNote>({
            filter: `date != ""`,
            expand: "category",
            requestKey: null,
          }),
          pb.collection("todos").getFullList<CalendarTodo>({
            filter: `due_date != ""`,
            expand: "category",
            requestKey: null,
          }),
        ]);
        setCategories(cats);
        setEvents(evs);
        setNotes(nts);
        setTodos(tds);
      } catch (err) {
        console.error("Fetch error", err);
      } finally {
        setLoading(false);
      }
    };

    loadInitial();

    // In a complete implementation, handle subs for all 3 collections here.
    return () => {
      pb.collection("events").unsubscribe("*");
    };
  }, [router, currentYear, currentMonth]);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleDayClick = (dayNumber: number) => {
    const clickedDate = new Date(currentYear, currentMonth, dayNumber);
    setSelectedDate(clickedDate);
    setNewEventTitle("");
    setNewEventDesc("");
    setNewEventAllDay(true);
    setNewEventCategory("none");
    setFormError("");
    setSummaryMode("summary");
    setIsDialogOpen(true);
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim() || !selectedDate) return;

    setSaving(true);
    setFormError("");
    try {
      const data: any = {
        title: newEventTitle,
        description: newEventDesc,
        all_day: newEventAllDay,
        user: pb.authStore.model?.id,
        start:
          selectedDate.toISOString().replace("T", " ").substring(0, 19) +
          ".000Z",
        end:
          selectedDate.toISOString().replace("T", " ").substring(0, 19) +
          ".000Z",
      };

      if (newEventCategory !== "none") {
        data.category = newEventCategory;
      }

      await pb.collection("events").create(data, { requestKey: null });
      // update local
      const newEv = await pb
        .collection("events")
        .getOne<CalendarEvent>(data.id || "", { expand: "category" })
        .catch(() => null);
      if (newEv) setEvents([...events, newEv]);
      setIsDialogOpen(false);
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || "Failed to create event.");
    } finally {
      // Lazy refresh
      const evs = await pb
        .collection("events")
        .getFullList<CalendarEvent>({ expand: "category", requestKey: null });
      setEvents(evs);
      setSaving(false);
      setSummaryMode("summary");
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await pb.collection("events").delete(id);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  // Shift to have Monday first, or Sunday first. Let's do Sunday first.
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const monthName = new Intl.DateTimeFormat("en-US", { month: "long" }).format(
    new Date(currentYear, currentMonth, 1),
  );

  return (
    <div className="container mx-auto p-4 max-w-6xl space-y-6 mt-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
        <Button variant="outline" onClick={() => router.push("/")}>
          Back to Home
        </Button>
      </div>

      <Card className="p-4 shadow-sm border bg-card text-card-foreground">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-2xl font-semibold">
            {monthName} {currentYear}
          </h2>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Days of Week Row */}
        <div className="grid grid-cols-7 gap-px mb-2 text-center text-sm font-medium text-muted-foreground">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="min-h-[120px] rounded-md bg-muted/30"
            ></div>
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNumber = i + 1;
            // Map events to this day
            const dayEvents = events.filter((ev) => {
              const d = new Date(ev.start || ev.created);
              return (
                d.getFullYear() === currentYear &&
                d.getMonth() === currentMonth &&
                d.getDate() === dayNumber
              );
            });
            const dayNotes = notes.filter((nt) => {
              if (!nt.date) return false;
              const d = new Date(nt.date);
              return (
                d.getFullYear() === currentYear &&
                d.getMonth() === currentMonth &&
                d.getDate() === dayNumber
              );
            });
            const dayTodos = todos.filter((td) => {
              if (!td.due_date) return false;
              const d = new Date(td.due_date);
              return (
                d.getFullYear() === currentYear &&
                d.getMonth() === currentMonth &&
                d.getDate() === dayNumber
              );
            });

            const isToday =
              today.getDate() === dayNumber &&
              today.getMonth() === currentMonth &&
              today.getFullYear() === currentYear;

            return (
              <div
                key={`day-${dayNumber}`}
                onClick={() => handleDayClick(dayNumber)}
                className={`min-h-[120px] border rounded-md p-2 transition-colors cursor-pointer hover:bg-muted/50 group flex flex-col gap-1 ${
                  isToday ? "border-primary bg-primary/5" : "border-border/50"
                }`}
              >
                <div
                  className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${
                    isToday
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground"
                  }`}
                >
                  {dayNumber}
                </div>

                <ScrollArea className="flex-1 w-full mt-1">
                  <div className="flex flex-col gap-1 pr-3 shadow-inner">
                    {dayEvents.map((ev) => (
                      <div
                        key={`ev-${ev.id}`}
                        className="text-[10px] leading-tight rounded px-1.5 py-0.5 truncate relative flex items-center justify-between group/ev"
                        style={{
                          backgroundColor:
                            ev.expand?.category?.color ||
                            "hsl(var(--secondary))",
                          color: ev.expand?.category?.color
                            ? "#fff"
                            : "hsl(var(--secondary-foreground))",
                        }}
                      >
                        <span
                          className="truncate flex items-center gap-1"
                          title={ev.title}
                        >
                          <CalIcon className="w-3 h-3 shrink-0" />
                          {ev.title}
                        </span>
                      </div>
                    ))}
                    {dayNotes.map((nt) => (
                      <div
                        key={`nt-${nt.id}`}
                        className="text-[10px] leading-tight rounded px-1.5 py-0.5 truncate relative flex items-center justify-between group/nt"
                        style={{
                          backgroundColor: nt.expand?.category?.color
                            ? `${nt.expand.category.color}33`
                            : "hsl(var(--secondary))",
                          color:
                            nt.expand?.category?.color ||
                            "hsl(var(--secondary-foreground))",
                          border: `1px solid ${nt.expand?.category?.color || "transparent"}`,
                        }}
                      >
                        <span
                          className="truncate flex items-center gap-1"
                          title={nt.title}
                        >
                          <StickyNote className="w-3 h-3 shrink-0" />
                          {nt.title}
                        </span>
                      </div>
                    ))}
                    {dayTodos.map((td) => (
                      <div
                        key={`td-${td.id}`}
                        className={`text-[10px] leading-tight rounded px-1.5 py-0.5 truncate relative flex items-center justify-between group/td ${td.is_completed ? "line-through opacity-50" : ""}`}
                        style={{
                          backgroundColor: td.expand?.category?.color
                            ? `${td.expand.category.color}15`
                            : "hsl(var(--secondary))",
                          color:
                            td.expand?.category?.color ||
                            "hsl(var(--secondary-foreground))",
                          borderLeft: `3px solid ${td.expand?.category?.color || "hsl(var(--muted-foreground))"}`,
                        }}
                      >
                        <span
                          className="truncate flex items-center gap-1"
                          title={td.task}
                        >
                          <CheckSquare className="w-3 h-3 shrink-0" />
                          {td.task}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {summaryMode === "summary"
                ? `Activities for ${selectedDate?.toLocaleDateString()}`
                : "Add Event"}
            </DialogTitle>
            <DialogDescription>
              {summaryMode === "summary"
                ? "Here is the summary of events, notes, and todos for this date."
                : "Create a new calendar event for this date."}
            </DialogDescription>
          </DialogHeader>

          {summaryMode === "summary" ? (
            <div className="space-y-4 py-4">
              {/* Quick Summary Render here */}
              <div className="text-sm font-medium">
                Click the button below to add a direct event here. Note that
                Notes and Todos are added from their respective pages.
              </div>
              <Button className="w-full" onClick={() => setSummaryMode("add")}>
                <Plus className="w-4 h-4 mr-2" /> Add Calendar Event
              </Button>
            </div>
          ) : (
            <form onSubmit={handleAddEvent} className="space-y-4 py-4">
              {formError && (
                <div className="text-sm font-medium text-destructive">
                  {formError}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  placeholder="Event title"
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={newEventCategory}
                  onValueChange={setNewEventCategory}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newEventDesc}
                  onChange={(e) => setNewEventDesc(e.target.value)}
                  placeholder="Optional details..."
                />
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="all_day"
                  checked={newEventAllDay}
                  onCheckedChange={(checked) => setNewEventAllDay(!!checked)}
                />
                <Label htmlFor="all_day" className="font-normal cursor-pointer">
                  All Day Event
                </Label>
              </div>
              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSummaryMode("summary")}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Event"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
