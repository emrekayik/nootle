"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { db, generateId, Profile } from "@/lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CheckSquare,
  Book,
  StickyNote,
  Calendar,
  Activity,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function Home() {
  const profile = useLiveQuery(() => db.profiles.toCollection().first());
  const [initFinished, setInitFinished] = useState(false);

  // Stats via Dexie
  const totalTodos = useLiveQuery(() => db.todos.count()) || 0;
  const completedTodos =
    useLiveQuery(async () => {
      const allMatches = await db.todos.filter((t) => t.is_completed).toArray();
      return allMatches.length;
    }) || 0;
  const totalNotebooks = useLiveQuery(() => db.notebooks.count()) || 0;
  const totalNotes = useLiveQuery(() => db.notes.count()) || 0;
  const totalEvents = useLiveQuery(() => db.events.count()) || 0;

  // Onboarding UI state
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const pendingTodos = totalTodos - completedTodos;

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];

  useEffect(() => {
    // Basic loading check since useLiveQuery might initially return undefined during mount
    const timer = setTimeout(() => setInitFinished(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const chartData = [
    { name: "Todos", count: totalTodos },
    { name: "Notebooks", count: totalNotebooks },
    { name: "Notes", count: totalNotes },
    { name: "Events", count: totalEvents },
  ];

  const pieData = [
    { name: "Completed", value: completedTodos },
    { name: "Pending", value: pendingTodos },
  ];

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Name is required");

    try {
      await db.profiles.add({
        id: generateId(),
        name: name.trim(),
        email: "",
        avatar: "",
        slug: "",
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      });
    } catch (err: any) {
      setError(err.message || "Failed to create profile");
    }
  };

  if (!initFinished) return null;

  if (profile) {
    return (
      <div className="container mx-auto p-4 max-w-5xl mt-10 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {profile.name}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Total Todos</CardTitle>
              <CheckSquare className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTodos}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {pendingTodos} remaining tasks
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Notebooks</CardTitle>
              <Book className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalNotebooks}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across all categories
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Notes</CardTitle>
              <StickyNote className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalNotes}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Captured thoughts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Events</CardTitle>
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalEvents}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Scheduled meetings
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Overviews Activity Chart */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Activity Overview</CardTitle>
              <CardDescription>Records by feature</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "currentColor" }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "currentColor" }}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(0,0,0,0.1)" }}
                      contentStyle={{
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Todo Completion Pie Chart */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Todo Completion</CardTitle>
              <CardDescription>Your task success rate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full flex items-center justify-center">
                {totalTodos > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "none",
                          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center text-muted-foreground h-full">
                    <CheckSquare className="w-12 h-12 mb-4 opacity-20" />
                    <p>No tasks yet.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Not "logged in" / Onboarding
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-sm shadow-xl border-t-4 border-t-primary">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <Activity className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Nootle
          </CardTitle>
          <CardDescription>
            Your purely local workspace. Everything stays on your device.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleStart}>
          <CardContent className="space-y-4 pt-4">
            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">What should we call you?</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full font-semibold">
              Get Started
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
