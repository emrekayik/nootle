"use client";

import { useState } from "react";
import { db, generateId } from "@/lib/db";
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
import { Trash2, Tags, Loader2, PenTool } from "lucide-react";
import { toast } from "sonner";

export default function CategoriesPage() {
  const router = useRouter();

  // Connect categories query sorting by created desc
  const categories = useLiveQuery(
    () => db.categories.orderBy("created").reverse().toArray(),
    [],
  );

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#3b82f6");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setIsSubmitting(true);

    try {
      await db.categories.add({
        id: generateId(),
        name: newName.trim(),
        color: newColor,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      });
      setNewName("");
      setNewColor("#3b82f6");
      toast.success("Category created successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to create category.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this category?"))
      return;
    try {
      await db.categories.delete(id);

      // Also untag any associated entities using this deleted category
      await db.todos
        .where("categoryId")
        .equals(id)
        .modify({ categoryId: undefined });
      await db.notebooks
        .where("categoryId")
        .equals(id)
        .modify({ categoryId: undefined });
      await db.notes
        .where("categoryId")
        .equals(id)
        .modify({ categoryId: undefined });
      await db.drawings
        .where("categoryId")
        .equals(id)
        .modify({ categoryId: undefined });

      toast.success("Category and its tags cleanly removed");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to delete category");
    }
  };

  const handleRenameCategory = async (id: string, currentName: string) => {
    const freshName = prompt("Enter new category name:", currentName);
    if (!freshName || !freshName.trim() || freshName === currentName) return;
    try {
      await db.categories.update(id, {
        name: freshName.trim(),
        updated: new Date().toISOString(),
      });
      toast.success("Category renamed");
    } catch (err: any) {
      toast.error(err.message || "Failed to rename category");
    }
  };

  const handleChangeColor = async (id: string, freshColor: string) => {
    try {
      await db.categories.update(id, {
        color: freshColor,
        updated: new Date().toISOString(),
      });
      toast.success("Category color updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update category color");
    }
  };

  // Undefined means Dexie is still loading
  if (categories === undefined) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-8 mt-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-md">
            <Tags className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
        </div>
        <Button variant="outline" onClick={() => router.push("/")}>
          Back to Home
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6 items-start">
        {/* L E F T   C O L U M N   ( A D D   F O R M ) */}
        <Card className="md:col-span-1 shadow-sm border">
          <CardHeader>
            <CardTitle className="text-lg">New Category</CardTitle>
            <CardDescription>
              Create labels to organize your content.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddCategory} className="flex flex-col gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Work, Personal, Finances"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2 flex flex-col">
                <Label htmlFor="color">Theme Color</Label>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    id="color"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="w-10 h-10 p-1 rounded cursor-pointer border bg-background"
                  />
                  <span className="text-sm text-muted-foreground font-mono">
                    {newColor}
                  </span>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full mt-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Create Category
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* R I G H T   C O L U M N   ( L I S T ) */}
        <Card className="md:col-span-2 shadow-sm border">
          <CardHeader>
            <CardTitle>Your Categories</CardTitle>
          </CardHeader>
          <CardContent>
            {categories.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                No categories found. Start by creating one on the left!
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Preview</TableHead>
                    <TableHead>Color Hex</TableHead>
                    <TableHead className="w-12 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((cat) => (
                    <ContextMenu key={cat.id}>
                      <ContextMenuTrigger asChild>
                        <TableRow className="cursor-pointer">
                          <TableCell>
                            <Badge
                              style={
                                cat.color
                                  ? {
                                      backgroundColor: cat.color,
                                      color: "#fff",
                                    }
                                  : undefined
                              }
                              variant={cat.color ? "default" : "secondary"}
                            >
                              {cat.name}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
                              <input
                                type="color"
                                defaultValue={cat.color || "#cccccc"}
                                onBlur={(e) => {
                                  if (e.target.value !== cat.color) {
                                    handleChangeColor(cat.id, e.target.value);
                                  }
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-8 h-8 p-0 border-0 rounded cursor-pointer bg-transparent"
                                title="Click to change color"
                              />
                              <span>{cat.color || "None"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteCategory(cat.id);
                              }}
                              title="Delete Category"
                            >
                              <Trash2 className="h-4 w-4 text-red-500 hover:text-red-700" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      </ContextMenuTrigger>
                      <ContextMenuContent className="w-48">
                        <ContextMenuLabel className="truncate">
                          {cat.name}
                        </ContextMenuLabel>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          onClick={() => handleRenameCategory(cat.id, cat.name)}
                          className="cursor-pointer gap-2"
                        >
                          <PenTool className="w-4 h-4" /> Rename Category
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          onClick={() => deleteCategory(cat.id)}
                          className="cursor-pointer gap-2 text-red-500 focus:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" /> Delete Category
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
    </div>
  );
}
