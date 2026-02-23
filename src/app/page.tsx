"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { pb } from "@/lib/pb";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [user, setUser] = useState(pb.authStore.model);
  const [isClient, setIsClient] = useState(false);

  // Login states
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register states
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerPasswordConfirm, setRegisterPasswordConfirm] = useState("");

  const [error, setError] = useState("");
  const [stats, setStats] = useState({
    todosTotal: 0,
    todosCompleted: 0,
    todosPending: 0,
    notebooks: 0,
    notes: 0,
    events: 0,
  });

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];

  useEffect(() => {
    setIsClient(true);
    const unsub = pb.authStore.onChange((token, model) => {
      setUser(model);
      if (model) fetchStats();
    });

    if (pb.authStore.isValid) {
      fetchStats();
    }

    return () => unsub();
  }, []);

  const fetchStats = async () => {
    try {
      const [todosReq, notebooks, notes, events] = await Promise.all([
        pb.collection("todos").getFullList({ requestKey: null }),
        pb.collection("notebooks").getList(1, 1, { requestKey: null }),
        pb.collection("notes").getList(1, 1, { requestKey: null }),
        pb.collection("events").getList(1, 1, { requestKey: null }),
      ]);

      const completed = todosReq.filter((t: any) => t.is_completed).length;

      setStats({
        todosTotal: todosReq.length,
        todosCompleted: completed,
        todosPending: todosReq.length - completed,
        notebooks: notebooks.totalItems,
        notes: notes.totalItems,
        events: events.totalItems,
      });
    } catch (err) {
      console.error("Failed to fetch stats", err);
    }
  };

  const chartData = [
    { name: "Todos", count: stats.todosTotal },
    { name: "Notebooks", count: stats.notebooks },
    { name: "Notes", count: stats.notes },
    { name: "Events", count: stats.events },
  ];

  const pieData = [
    { name: "Completed", value: stats.todosCompleted },
    { name: "Pending", value: stats.todosPending },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await pb.collection("users").authWithPassword(loginEmail, loginPassword);
    } catch (err: any) {
      setError(err.message || "Login failed");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await pb.collection("users").create({
        email: registerEmail,
        password: registerPassword,
        passwordConfirm: registerPasswordConfirm,
      });
      await pb
        .collection("users")
        .authWithPassword(registerEmail, registerPassword);
    } catch (err: any) {
      setError(err.message || "Registration failed");
    }
  };

  const handleLogout = () => {
    pb.authStore.clear();
  };

  if (!isClient) {
    return null;
  }

  if (user) {
    return (
      <div className="container mx-auto p-4 max-w-5xl mt-10 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user.name || user.email}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Total Todos</CardTitle>
              <CheckSquare className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todosTotal}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Pending and completed tasks
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Notebooks</CardTitle>
              <Book className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.notebooks}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Active collections
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Total Notes</CardTitle>
              <StickyNote className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.notes}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Written across notebooks
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Events</CardTitle>
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.events}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Scheduled in calendar
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="w-5 h-5 text-primary" />
                Workspace Activity Overview
              </CardTitle>
              <CardDescription>
                A visual summary of your created resources.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="name"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted))" }}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--card-foreground))",
                      }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckSquare className="w-5 h-5 text-emerald-500" />
                Tasks Completion
              </CardTitle>
              <CardDescription>
                Your overall progress on to-do items.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full flex flex-col items-center justify-center">
                {stats.todosTotal === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No tasks added yet.
                  </p>
                ) : (
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
                        <Cell fill="#10b981" /> {/* Completed */}
                        <Cell fill="#cbd5e1" /> {/* Pending */}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "8px",
                          color: "hsl(var(--card-foreground))",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                {stats.todosTotal > 0 && (
                  <div className="flex justify-center gap-6 mt-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span className="text-muted-foreground">
                        Completed ({stats.todosCompleted})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-slate-300" />
                      <span className="text-muted-foreground">
                        Pending ({stats.todosPending})
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen">
      <Tabs defaultValue="login" className="w-[400px]">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="register">Register</TabsTrigger>
        </TabsList>

        <TabsContent value="login">
          <Card>
            <form onSubmit={handleLogin}>
              <CardHeader>
                <CardTitle>Login</CardTitle>
                <CardDescription>
                  Enter your credentials to access your account.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full">
                  Login
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="register">
          <Card>
            <form onSubmit={handleRegister}>
              <CardHeader>
                <CardTitle>Register</CardTitle>
                <CardDescription>Create a new account.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-email">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">Password</Label>
                  <Input
                    id="register-password"
                    type="password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password-confirm">
                    Confirm Password
                  </Label>
                  <Input
                    id="register-password-confirm"
                    type="password"
                    value={registerPasswordConfirm}
                    onChange={(e) => setRegisterPasswordConfirm(e.target.value)}
                    required
                  />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full">
                  Register
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
