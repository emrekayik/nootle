"use client";

import { useState } from "react";
import { db, generateId, Todo } from "@/lib/db";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
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

export default function TodosPage() {
  const router = useRouter();

  const rawTodos = useLiveQuery(
    () => db.todos.orderBy("created").reverse().toArray(),
    [],
  );
  const rawCategories = useLiveQuery(() => db.categories.toArray(), []);

  // Map to safely extract expand properties locally (replacement for pb expand)
  const categoriesMap =
    rawCategories?.reduce(
      (acc, cat) => {
        acc[cat.id] = cat;
        return acc;
      },
      {} as Record<string, any>,
    ) || {};

  const todos =
    rawTodos?.map((todo) => ({
      ...todo,
      expand: {
        category: todo.categoryId ? categoriesMap[todo.categoryId] : undefined,
      },
    })) || undefined;

  const [newTask, setNewTask] = useState("");
  const [newPriority, setNewPriority] = useState("low");
  const [newDueDate, setNewDueDate] = useState("");
  const [newCategory, setNewCategory] = useState("none");
  const [error, setError] = useState("");

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    setError("");

    try {
      const data: Partial<Todo> = {
        id: generateId(),
        task: newTask,
        priority: newPriority,
        is_completed: false,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      };

      if (newCategory !== "none") {
        data.categoryId = newCategory;
      }

      if (newDueDate) {
        data.due_date = new Date(newDueDate).toISOString();
      }

      await db.todos.add(data as Todo);

      setNewTask("");
      setNewPriority("low");
      setNewDueDate("");
      setNewCategory("none");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create task.");
    }
  };

  const toggleTodo = async (todo: Todo) => {
    try {
      await db.todos.update(todo.id, {
        is_completed: !todo.is_completed,
        updated: new Date().toISOString(),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      await db.todos.delete(id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRenameTodo = async (id: string, currentTask: string) => {
    const newTaskName = prompt("Edit task:", currentTask);
    if (!newTaskName || !newTaskName.trim() || newTaskName === currentTask)
      return;
    try {
      await db.todos.update(id, {
        task: newTaskName.trim(),
        updated: new Date().toISOString(),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const priorityColors: Record<string, string> = {
    low: "bg-green-100 text-green-800 hover:bg-green-100/80",
    medium: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100/80",
    high: "bg-red-100 text-red-800 hover:bg-red-100/80",
  };

  if (todos === undefined || rawCategories === undefined) {
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
                    {rawCategories.map((c) => (
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
