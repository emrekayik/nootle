"use client";

import { useEffect, useState, useRef } from "react";
import { db, generateId, TimerSession } from "@/lib/db";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
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
  initial_duration: number; // in seconds
  is_paused: boolean;
  mode: string;
  updated: number; // timestamp
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

  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);

  const [title, setTitle] = useState("Focus Session");
  const [mode, setMode] = useState("focus");
  const [relatedTodo, setRelatedTodo] = useState("none");
  const [category, setCategory] = useState("none");

  const rawTodos = useLiveQuery(
    () => db.todos.filter((t) => !t.is_completed).toArray(),
    [],
  );
  const rawCategories = useLiveQuery(() => db.categories.toArray(), []);

  const todos = rawTodos || [];
  const categories = rawCategories || [];

  const [timeRemaining, setTimeRemaining] = useState<number>(MODES.focus);
  const totalDuration = activeTimer
    ? activeTimer.initial_duration
    : MODES[mode];

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Restore timer from localStorage to persist reloads
  useEffect(() => {
    try {
      const stored = localStorage.getItem("nootle_active_timer");
      if (stored) {
        const at: ActiveTimer = JSON.parse(stored);
        setActiveTimer(at);
        setMode(at.mode);

        if (at.is_paused) {
          setTimeRemaining(at.initial_duration);
        } else {
          const now = Date.now();
          const elapsedSeconds = (now - at.updated) / 1000;
          if (at.mode === "stopwatch") {
            setTimeRemaining(at.initial_duration + elapsedSeconds);
          } else {
            const rem = Math.max(0, at.initial_duration - elapsedSeconds);
            setTimeRemaining(rem);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Sync state to localstorage when active timer changes
  useEffect(() => {
    if (activeTimer) {
      localStorage.setItem("nootle_active_timer", JSON.stringify(activeTimer));
    } else {
      localStorage.removeItem("nootle_active_timer");
    }
  }, [activeTimer]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (activeTimer && !activeTimer.is_paused) {
      if (activeTimer.mode !== "stopwatch" && timeRemaining <= 0) return;

      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (activeTimer.mode === "stopwatch") {
            return prev + 1;
          } else {
            if (prev <= 1) {
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
  }, [activeTimer, timeRemaining]); // Added timeRemaining in deps to avoid stale state in some edge cases but it can fire often

  useEffect(() => {
    if (!activeTimer) {
      setTimeRemaining(MODES[mode]);
    }
  }, [mode, activeTimer]);

  const handleStart = () => {
    if (activeTimer) return;

    setActiveTimer({
      initial_duration: timeRemaining,
      mode: mode,
      is_paused: false,
      updated: Date.now(),
    });
  };

  const handlePause = () => {
    if (!activeTimer || activeTimer.is_paused) return;
    setActiveTimer({
      mode: activeTimer.mode,
      is_paused: true,
      initial_duration: Math.round(timeRemaining),
      updated: Date.now(),
    });
  };

  const handleResume = () => {
    if (!activeTimer || !activeTimer.is_paused) return;
    setActiveTimer({
      mode: activeTimer.mode,
      is_paused: false,
      initial_duration: Math.round(timeRemaining),
      updated: Date.now(),
    });
  };

  const handleStop = async () => {
    if (!activeTimer) {
      setTimeRemaining(MODES[mode]);
      return;
    }

    try {
      const spent =
        mode === "stopwatch" ? timeRemaining : MODES[mode] - timeRemaining;
      if (spent > 60) {
        await saveTimeLog(spent);
      }

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
      await saveTimeLog(spent);
      setActiveTimer(null);
      setTimeRemaining(MODES[at.mode]);
      toast.success("Timer completed!");
    } catch (err) {
      console.error(err);
    }
  };

  const saveTimeLog = async (durationSecs: number) => {
    const data: Partial<TimerSession> = {
      id: generateId(),
      duration: Math.round(durationSecs),
      completedAt: new Date().toISOString(),
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };
    if (category !== "none") {
      data.categoryId = category;
    }
    try {
      await db.timerSessions.add(data as TimerSession);
    } catch (err) {
      console.error("Error saving log", err);
    }
  };

  const mins = Math.floor(timeRemaining / 60);
  const secs = Math.floor(timeRemaining % 60);
  const timeString = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

  const isStopwatch = activeTimer
    ? activeTimer.mode === "stopwatch"
    : mode === "stopwatch";

  let progressPercent = 0;
  if (isStopwatch) {
    progressPercent = 100; // Unbounded
  } else {
    // Math.max avoids division by 0 if modes[mode] is 0
    progressPercent =
      activeTimer && !isStopwatch
        ? (timeRemaining / Math.max(1, MODES[mode])) * 100
        : 100;
  }

  if (rawCategories === undefined) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-8 mt-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Timer</h1>
        <Button variant="outline" onClick={() => router.push("/")}>
          Back to Home
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6 items-start">
        {/* L E F T   C O L U M N   ( C O N T R O L S ) */}
        <Card className="md:col-span-1 shadow-sm border">
          <CardHeader>
            <CardTitle>Session Config</CardTitle>
            <CardDescription>
              Set up what you will be working on.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Task / Session Name</Label>
                <Input
                  id="title"
                  placeholder="Focus Session"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={activeTimer !== null}
                />
              </div>

              <div className="space-y-2">
                <Label>Mode</Label>
                <Select
                  value={mode}
                  onValueChange={setMode}
                  disabled={activeTimer !== null}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="focus">Pomodoro Focus (25m)</SelectItem>
                    <SelectItem value="short_break">
                      Short Break (5m)
                    </SelectItem>
                    <SelectItem value="long_break">Long Break (15m)</SelectItem>
                    <SelectItem value="stopwatch">Stopwatch</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Link to Todo (Optional)</Label>
                <Select
                  value={relatedTodo}
                  onValueChange={setRelatedTodo}
                  disabled={activeTimer !== null}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No Todo Linked" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {todos.map((todo) => (
                      <SelectItem key={todo.id} value={todo.id}>
                        {todo.task}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Category (Optional)</Label>
                <Select
                  value={category}
                  onValueChange={setCategory}
                  disabled={activeTimer !== null}
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
            </form>
          </CardContent>
        </Card>

        {/* R I G H T   C O L U M N   ( T I M E R ) */}
        <Card className="md:col-span-1 shadow-sm border flex flex-col justify-center items-center min-h-[350px]">
          <CardContent className="flex flex-col items-center justify-center p-8 w-full">
            <div className="relative w-48 h-48 flex items-center justify-center mb-8">
              <svg className="absolute w-full h-full -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="92"
                  className="stroke-muted/30"
                  strokeWidth="8"
                  fill="transparent"
                />
                {!isStopwatch && (
                  <circle
                    cx="96"
                    cy="96"
                    r="92"
                    className="stroke-primary transition-all duration-1000 ease-linear"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 92}
                    strokeDashoffset={
                      2 * Math.PI * 92 * (1 - progressPercent / 100)
                    }
                  />
                )}
              </svg>
              <div className="text-5xl font-bold tracking-tighter tabular-nums z-10 text-foreground">
                {timeString}
              </div>
            </div>

            <div className="flex gap-4">
              {!activeTimer ? (
                <Button size="lg" className="px-8" onClick={handleStart}>
                  <Play className="w-5 h-5 mr-2" /> Start
                </Button>
              ) : (
                <>
                  {activeTimer.is_paused ? (
                    <Button
                      size="lg"
                      variant="default"
                      className="px-6"
                      onClick={handleResume}
                    >
                      <Play className="w-5 h-5 mr-2" /> Resume
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      variant="outline"
                      className="px-6"
                      onClick={handlePause}
                    >
                      <Pause className="w-5 h-5 mr-2" /> Pause
                    </Button>
                  )}
                  <Button
                    size="lg"
                    variant="destructive"
                    className="px-6"
                    onClick={handleStop}
                  >
                    <Square className="w-5 h-5 mr-2" /> Stop
                  </Button>
                </>
              )}
            </div>

            {/* Minor quick reset / skip in certain cases */}
            {!activeTimer && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-6 text-muted-foreground"
                onClick={() => setTimeRemaining(MODES[mode])}
              >
                <RotateCcw className="w-4 h-4 mr-2" /> Reset Timer
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
