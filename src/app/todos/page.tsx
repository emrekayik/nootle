"use client";

import { useEffect, useState } from "react";
import { pb } from "@/lib/pb";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Trash2, PenTool, CheckCircle, Circle } from "lucide-react";

type Todo = {
  id: string;
  is_completed: boolean;
  task: string;
  priority: string;
  due_date: string;
  note_ref?: string;
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

export default function TodosPage() {
  const router = useRouter();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  const [newTask, setNewTask] = useState("");
  const [newPriority, setNewPriority] = useState("low");
  const [newDueDate, setNewDueDate] = useState("");
  const [newCategory, setNewCategory] = useState("none");
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");

  const fetchTodos = async () => {
    try {
      const records = await pb.collection("todos").getFullList<Todo>({
        sort: "-created",
        expand: "category",
        requestKey: null,
      });
      setTodos(records);
    } catch (err) {
      console.error("Failed to fetch todos", err);
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
        const cats = await pb
          .collection("categories")
          .getFullList<Category>({ sort: "name", requestKey: null });
        setCategories(cats);
      } catch (err) {
        console.error("Categories fetch error", err);
      }
      fetchTodos();
    };

    loadInitial();

    // Optionally set up real-time subscription
    let unsubscribe: () => void;
    pb.collection("todos")
      .subscribe("*", function () {
        fetchTodos();
      })
      .then((unsub) => {
        unsubscribe = unsub;
      });

    return () => {
      if (unsubscribe) unsubscribe();
      // fallback if component unmounts before promise resolves
      pb.collection("todos").unsubscribe("*");
    };
  }, [router]);

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    setError("");

    try {
      const data: Record<string, any> = {
        task: newTask,
        priority: newPriority,
        is_completed: false,
        user: pb.authStore.model?.id,
      };

      if (newCategory !== "none") {
        data.category = newCategory;
      }

      if (newDueDate) {
        data.due_date = new Date(newDueDate).toISOString();
      }

      await pb.collection("todos").create(data);
      setNewTask("");
      setNewPriority("low");
      setNewDueDate("");
      setNewCategory("none");
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data
          ? JSON.stringify(err.response.data)
          : err.message || "Failed to create task.",
      );
    }
  };

  const toggleTodo = async (todo: Todo) => {
    try {
      await pb.collection("todos").update(todo.id, {
        is_completed: !todo.is_completed,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      await pb.collection("todos").delete(id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRenameTodo = async (id: string, currentTask: string) => {
    const newTaskName = prompt("Edit task:", currentTask);
    if (!newTaskName || !newTaskName.trim() || newTaskName === currentTask)
      return;
    try {
      await pb.collection("todos").update(id, { task: newTaskName.trim() });
    } catch (err) {
      console.error(err);
    }
  };

  const priorityColors: Record<string, string> = {
    low: "bg-green-100 text-green-800 hover:bg-green-100/80",
    medium: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100/80",
    high: "bg-red-100 text-red-800 hover:bg-red-100/80",
  };

  if (loading) {
    return <div className="p-8 flex justify-center">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-8 mt-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Todos</h1>
        <Button variant="outline" onClick={() => router.push("/")}>
          Back to Home
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add New Task</CardTitle>
          <CardDescription>
            Create a new todo item in your list.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddTodo} className="flex flex-col gap-4">
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="task">Task</Label>
                <Input
                  id="task"
                  placeholder="What needs to be done?"
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  required
                />
              </div>
              <div className="w-full sm:w-32 space-y-2">
                <Label>Priority</Label>
                <Select value={newPriority} onValueChange={setNewPriority}>
                  <SelectTrigger>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-40 space-y-2">
                <Label>Category</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
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
              <div className="w-full sm:w-48 space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="datetime-local"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full sm:w-auto">
                Add
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {todos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No tasks found. Add some!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Done</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="w-12 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todos.map((todo) => (
                  <ContextMenu key={todo.id}>
                    <ContextMenuTrigger asChild>
                      <TableRow
                        className="cursor-pointer"
                        style={{
                          borderLeft: todo.expand?.category?.color
                            ? `4px solid ${todo.expand.category.color}`
                            : "4px solid transparent",
                        }}
                      >
                        <TableCell>
                          <Checkbox
                            checked={todo.is_completed}
                            onCheckedChange={() => toggleTodo(todo)}
                          />
                        </TableCell>
                        <TableCell
                          className={
                            todo.is_completed
                              ? "line-through text-muted-foreground"
                              : ""
                          }
                        >
                          {todo.task}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={priorityColors[todo.priority] || ""}
                          >
                            {todo.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {todo.expand?.category ? (
                            <Badge
                              style={
                                todo.expand.category.color
                                  ? {
                                      backgroundColor:
                                        todo.expand.category.color,
                                      color: "#fff",
                                    }
                                  : undefined
                              }
                              variant={
                                todo.expand.category.color
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {todo.expand.category.name}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {todo.due_date
                            ? new Date(todo.due_date).toLocaleString()
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTodo(todo.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-48">
                      <ContextMenuLabel className="truncate">
                        {todo.task}
                      </ContextMenuLabel>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        onClick={() => handleRenameTodo(todo.id, todo.task)}
                        className="cursor-pointer gap-2"
                      >
                        <PenTool className="w-4 h-4" /> Rename Task
                      </ContextMenuItem>
                      <ContextMenuItem
                        onClick={() => toggleTodo(todo)}
                        className="cursor-pointer gap-2"
                      >
                        {todo.is_completed ? (
                          <Circle className="w-4 h-4" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        {todo.is_completed
                          ? "Mark as Incomplete"
                          : "Mark as Done"}
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        onClick={() => deleteTodo(todo.id)}
                        className="cursor-pointer gap-2 text-red-500 focus:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" /> Delete Task
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
