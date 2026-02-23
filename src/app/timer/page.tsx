"use client";

import { useEffect, useState, useRef } from "react";
import { pb } from "@/lib/pb";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Play, Pause, Square, Loader2, RotateCcw } from "lucide-react";

type ActiveTimer = {
  id: string;
  initial_duration: number; // in seconds
  is_paused: boolean;
  mode: string;
  user: string;
  created: string;
  updated: string;
};

type Todo = {
  id: string;
  task: string;
};

type Category = {
  id: string;
  name: string;
  color?: string;
};

// Default times for Pomodoro modes
const MODES: Record<string, number> = {
  focus: 25 * 60,
  short_break: 5 * 60,
  long_break: 15 * 60,
  stopwatch: 0,
};

export default function TimerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // PB active record
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);

  // Form states mapping for the resulting log
  const [title, setTitle] = useState("Focus Session");
  const [mode, setMode] = useState("focus");
  const [relatedTodo, setRelatedTodo] = useState("none");
  const [category, setCategory] = useState("none");
  const [todos, setTodos] = useState<Todo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Local timer display states
  const [timeRemaining, setTimeRemaining] = useState<number>(MODES.focus);
  const totalDuration = activeTimer
    ? activeTimer.initial_duration
    : MODES[mode];

  // Interval ref
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load active timer and todos
  useEffect(() => {
    if (!pb.authStore.isValid) {
      router.push("/");
      return;
    }

    const loadData = async () => {
      try {
        const [activeList, todosList, catsList] = await Promise.all([
          pb.collection("active_timers").getFullList<ActiveTimer>({
            filter: `user = "${pb.authStore.model?.id}"`,
            requestKey: null,
          }),
          pb.collection("todos").getFullList<Todo>({
            sort: "-created",
            filter: "is_completed = false",
            requestKey: null,
          }),
          pb.collection("categories").getFullList<Category>({
            sort: "name",
            requestKey: null,
          }),
        ]);

        setTodos(todosList);
        setCategories(catsList);

        if (activeList.length > 0) {
          const at = activeList[0];
          setActiveTimer(at);
          setMode(at.mode);

          // Calculate current time remaining
          if (at.is_paused) {
            setTimeRemaining(at.initial_duration);
          } else {
            const now = new Date().getTime();
            const updated = new Date(at.updated).getTime();
            const elapsedSeconds = (now - updated) / 1000;
            if (at.mode === "stopwatch") {
              setTimeRemaining(at.initial_duration + elapsedSeconds);
            } else {
              const rem = Math.max(0, at.initial_duration - elapsedSeconds);
              setTimeRemaining(rem);
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Clean up timer interval on unmount
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [router]);

  // Sync the local tick whenever activeTimer is running
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (activeTimer && !activeTimer.is_paused) {
      // Must not double wrap interval if timeRemaining is already <= 0 and it's not a stopwatch
      if (activeTimer.mode !== "stopwatch" && timeRemaining <= 0) return;

      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (activeTimer.mode === "stopwatch") {
            return prev + 1;
          } else {
            if (prev <= 1) {
              // Timer just finished!
              handleCompleteTimer(activeTimer);
              return 0;
            }
            return prev - 1;
          }
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeTimer]);

  // If there's no active timer, change default duration when mode changes
  useEffect(() => {
    if (!activeTimer) {
      setTimeRemaining(MODES[mode]);
    }
  }, [mode, activeTimer]);

  const handleStart = async () => {
    if (activeTimer) return; // already active

    try {
      const newAt = await pb.collection("active_timers").create<ActiveTimer>({
        initial_duration: timeRemaining,
        mode: mode,
        is_paused: false,
        user: pb.authStore.model?.id,
      });
      setActiveTimer(newAt);
    } catch (err: any) {
      toast.error("Failed to start timer: " + err.message);
    }
  };

  const handlePause = async () => {
    if (!activeTimer || activeTimer.is_paused) return;
    try {
      const updated = await pb
        .collection("active_timers")
        .update<ActiveTimer>(activeTimer.id, {
          is_paused: true,
          initial_duration: Math.round(timeRemaining),
        });
      setActiveTimer(updated);
      setTimeRemaining(updated.initial_duration);
    } catch (err: any) {
      toast.error("Failed to pause timer");
    }
  };

  const handleResume = async () => {
    if (!activeTimer || !activeTimer.is_paused) return;
    try {
      const updated = await pb
        .collection("active_timers")
        .update<ActiveTimer>(activeTimer.id, {
          is_paused: false,
          initial_duration: Math.round(timeRemaining),
        });
      setActiveTimer(updated);
    } catch (err: any) {
      toast.error("Failed to resume timer");
    }
  };

  const handleStop = async () => {
    if (!activeTimer) {
      // just reset locally
      setTimeRemaining(MODES[mode]);
      return;
    }

    // Stop & save a partial log
    try {
      const spent =
        mode === "stopwatch" ? timeRemaining : MODES[mode] - timeRemaining;
      if (spent > 60) {
        // save only if they spent more than 60 seconds
        await saveTimeLog(spent);
      }

      await pb.collection("active_timers").delete(activeTimer.id);
      setActiveTimer(null);
      setTimeRemaining(MODES[mode]);
      toast.success("Timer stopped.");
    } catch (err) {
      toast.error("Error stopping timer.");
    }
  };

  const handleCompleteTimer = async (at: ActiveTimer) => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    try {
      const spent =
        at.mode === "stopwatch" ? timeRemaining : MODES[at.mode] || 0;
      await saveTimeLog(spent); // They did the full time
      await pb.collection("active_timers").delete(at.id);
      setActiveTimer(null);
      setTimeRemaining(MODES[at.mode]);
      toast.success("Timer completed!");
      // Optionally play a sound here in a real app
    } catch (err) {
      console.error(err);
    }
  };

  const saveTimeLog = async (durationSecs: number) => {
    const data: any = {
      title: title || "Timer Session",
      duration: Math.round(durationSecs),
      type: "focus",
      started_at: new Date(Date.now() - durationSecs * 1000).toISOString(),
      user: pb.authStore.model?.id,
    };
    if (relatedTodo !== "none") {
      data.related_todo = relatedTodo;
    }
    if (category !== "none") {
      data.category = category;
    }

    try {
      await pb.collection("time_logs").create(data);
    } catch (err) {
      console.error("Error saving log", err);
    }
  };

  // Format MM:SS
  const mins = Math.floor(timeRemaining / 60);
  const secs = Math.floor(timeRemaining % 60);
  const timeString = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

  // Progress calc
  // Max duration is what they initially set for the mode
  const isStopwatch = activeTimer
    ? activeTimer.mode === "stopwatch"
    : mode === "stopwatch";
  const progressPercent = activeTimer
    ? isStopwatch
      ? 100
      : Math.max(0, 100 - (timeRemaining / MODES[mode]) * 100)
    : isStopwatch
      ? 0
      : 0;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isRunning = activeTimer && !activeTimer.is_paused;
  const isPaused = activeTimer && activeTimer.is_paused;

  return (
    <div className="container mx-auto p-4 max-w-xl space-y-8 mt-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Focus Timer</h1>
      </div>

      <Card className="shadow-lg border-2">
        <CardHeader className="text-center pb-2">
          {activeTimer ? (
            <CardTitle className="text-muted-foreground text-lg uppercase tracking-widest">
              {isRunning ? "Focusing..." : "Paused"}
            </CardTitle>
          ) : (
            <CardTitle className="text-muted-foreground text-lg uppercase tracking-widest">
              Ready to focus
            </CardTitle>
          )}
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-8 pb-8">
          <div className="text-8xl md:text-9xl font-extrabold tracking-tighter tabular-nums text-primary/90 mt-4">
            {timeString}
          </div>

          <div className="w-full max-w-sm">
            <Progress value={progressPercent} className="h-3" />
          </div>

          <div className="flex items-center gap-4 mt-6">
            {!activeTimer ? (
              <Button
                size="lg"
                className="w-32 h-14 text-lg rounded-full"
                onClick={handleStart}
              >
                <Play className="w-6 h-6 mr-2" fill="currentColor" /> Start
              </Button>
            ) : isRunning ? (
              <Button
                size="lg"
                variant="secondary"
                className="w-32 h-14 text-lg rounded-full"
                onClick={handlePause}
              >
                <Pause className="w-6 h-6 mr-2" fill="currentColor" /> Pause
              </Button>
            ) : (
              <Button
                size="lg"
                className="w-32 h-14 text-lg rounded-full"
                onClick={handleResume}
              >
                <Play className="w-6 h-6 mr-2" fill="currentColor" /> Resume
              </Button>
            )}

            <Button
              size="icon"
              variant="destructive"
              className="h-14 w-14 rounded-full disabled:opacity-50"
              disabled={
                !activeTimer && !isStopwatch && timeRemaining === MODES[mode]
              }
              onClick={handleStop}
            >
              {activeTimer ? (
                <Square className="w-6 h-6" fill="currentColor" />
              ) : (
                <RotateCcw className="w-6 h-6" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border">
        <CardHeader>
          <CardTitle className="text-lg">Session Details</CardTitle>
          <CardDescription>Configure what you are working on.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Session Type</Label>
              <Select
                value={mode}
                onValueChange={setMode}
                disabled={!!activeTimer}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="focus">Focus (25m)</SelectItem>
                  <SelectItem value="short_break">Short Break (5m)</SelectItem>
                  <SelectItem value="long_break">Long Break (15m)</SelectItem>
                  <SelectItem value="stopwatch">
                    Stopwatch (Count up)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Link to Todo</Label>
              <Select value={relatedTodo} onValueChange={setRelatedTodo}>
                <SelectTrigger>
                  <SelectValue placeholder="No linking" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {todos.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.task}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
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
          </div>

          <div className="space-y-2 pt-2">
            <Label>Session Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What are you working on?"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
