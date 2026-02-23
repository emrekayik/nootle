"use client";

import { useState, useRef } from "react";
import { db, generateId, Drawing } from "@/lib/db";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Plus,
  Trash2,
  Loader2,
  Save,
  PenTool,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Tldraw, Editor, getSnapshot, loadSnapshot } from "tldraw";
import "tldraw/tldraw.css";

export default function DrawingsPage() {
  const router = useRouter();

  const rawDrawings = useLiveQuery(
    () => db.drawings.orderBy("created").reverse().toArray(),
    [],
  );
  const rawCategories = useLiveQuery(() => db.categories.toArray(), []);

  const categoriesMap =
    rawCategories?.reduce(
      (acc, cat) => {
        acc[cat.id] = cat;
        return acc;
      },
      {} as Record<string, any>,
    ) || {};

  const drawings =
    rawDrawings?.map((d) => ({
      ...d,
      expand: {
        category: d.categoryId ? categoriesMap[d.categoryId] : undefined,
      },
    })) || undefined;

  // Selection
  const [selectedDrawing, setSelectedDrawing] = useState<any | null>(null);

  // Form (Create)
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("none");
  const [isCreating, setIsCreating] = useState(false);

  // Editor saving
  const [isSaving, setIsSaving] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<
    "idle" | "saving" | "saved"
  >("idle");
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleCreateDrawing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsCreating(true);
    try {
      const data: Partial<Drawing> = {
        id: generateId(),
        title: newTitle.trim(),
        data: "",
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      };

      if (newCategory !== "none") {
        data.categoryId = newCategory;
      }

      await db.drawings.add(data as Drawing);

      setNewTitle("");
      setNewCategory("none");
      setIsDialogOpen(false);
      toast.success("Whiteboard created successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to create whiteboard");
    } finally {
      setIsCreating(false);
    }
  };

  const handleManualSave = async () => {
    if (!selectedDrawing || !editor) return;

    setIsSaving(true);
    const snap = getSnapshot(editor.store);
    try {
      await db.drawings.update(selectedDrawing.id, {
        data: JSON.stringify(snap),
        updated: new Date().toISOString(),
      });
      setAutoSaveStatus("saved");
      toast.success("Board saved");
    } catch (err: any) {
      console.error("Save failed", err);
      toast.error("Failed to save drawing state");
    } finally {
      setIsSaving(false);
    }
  };

  // Editor Change handler (Auto-save)
  const handleChange = (ed: Editor) => {
    setAutoSaveStatus("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(async () => {
      if (!selectedDrawing) return;
      const snap = getSnapshot(ed.store);
      try {
        await db.drawings.update(selectedDrawing.id, {
          data: JSON.stringify(snap),
          updated: new Date().toISOString(),
        });
        setAutoSaveStatus("saved");
      } catch (err) {
        console.error("Autosave Error", err);
      }
    }, 2000); // Autosave 2sec after typing stops
  };

  const loadDataIntoEditor = (ed: Editor, drw: any) => {
    try {
      if (drw.data) {
        const snap = JSON.parse(drw.data);
        loadSnapshot(ed.store, snap);
      } else {
        // Clear editor for new boards
        ed.store.clear();
      }
      toast.success(`Loaded: ${drw.title}`);
    } catch (err) {
      console.error("Failed to parse existing drawing data", err);
      ed.store.clear();
    }
  };

  const handleMount = (ed: Editor) => {
    setEditor(ed);
    if (selectedDrawing) {
      loadDataIntoEditor(ed, selectedDrawing);
    }
    ed.store.listen(() => handleChange(ed), {
      source: "user",
      scope: "document",
    });
  };

  // Whenever we pick a new drawing, load its state immediately if editor is ready
  const selectDrawing = (d: any) => {
    if (selectedDrawing?.id === d.id) return; // same doc
    setSelectedDrawing(d);
    setAutoSaveStatus("idle");

    if (editor) {
      loadDataIntoEditor(editor, d);
    }
  };

  const handleDeleteDrawing = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this board?")) return;

    try {
      await db.drawings.delete(id);
      if (selectedDrawing?.id === id) {
        setSelectedDrawing(null);
        if (editor) editor.store.clear();
      }
      toast.success("Board deleted");
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    }
  };

  const handleRenameDrawing = async (id: string, currentTitle: string) => {
    const freshTitle = prompt("Enter new title:", currentTitle);
    if (!freshTitle || !freshTitle.trim() || freshTitle === currentTitle)
      return;

    try {
      await db.drawings.update(id, {
        title: freshTitle.trim(),
        updated: new Date().toISOString(),
      });
      toast.success("Board renamed");

      // Update local selected state to reflect rename instantly in header
      if (selectedDrawing?.id === id) {
        setSelectedDrawing((prev: Drawing | null) =>
          prev ? { ...prev, title: freshTitle.trim() } : null,
        );
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to rename board");
    }
  };

  if (drawings === undefined || rawCategories === undefined) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl h-screen flex flex-col pt-10 pb-6">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-md">
            <ImageIcon className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Drawings</h1>
        </div>
        <Button variant="outline" onClick={() => router.push("/")}>
          Back to Home
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0">
        {/* L E F T   S I D E B A R   ( B O A R D S ) */}
        <Card className="w-full md:w-1/4 flex flex-col shadow-sm border h-full min-h-0">
          <CardHeader className="py-4 px-4 border-b shrink-0 flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Whiteboards</CardTitle>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </CardHeader>
          <ScrollArea className="flex-1 p-2">
            {drawings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No whiteboards found.
              </p>
            ) : (
              <div className="space-y-1">
                {drawings.map((d) => (
                  <ContextMenu key={d.id}>
                    <ContextMenuTrigger asChild>
                      <div
                        onClick={() => selectDrawing(d)}
                        className={`w-full flex justify-between items-center p-2 rounded-md transition-colors cursor-pointer text-left text-sm group ${
                          selectedDrawing?.id === d.id
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-muted"
                        }`}
                      >
                        <div className="flex flex-col gap-1 truncate pr-2">
                          <span className="font-medium truncate">
                            {d.title}
                          </span>
                          {d.expand?.category && (
                            <Badge
                              style={
                                d.expand.category.color
                                  ? {
                                      backgroundColor: d.expand.category.color,
                                      color: "#fff",
                                    }
                                  : undefined
                              }
                              className="text-[10px] w-fit h-4 px-1"
                              variant={
                                d.expand.category.color
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {d.expand.category.name}
                            </Badge>
                          )}
                        </div>
                        <button
                          onClick={(e) => handleDeleteDrawing(d.id, e)}
                          className={`shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${
                            selectedDrawing?.id === d.id ? "opacity-100" : ""
                          }`}
                          title="Delete Board"
                        >
                          <Trash2 className="w-4 h-4 text-red-500 hover:text-red-700" />
                        </button>
                      </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-48">
                      <ContextMenuLabel className="truncate">
                        {d.title}
                      </ContextMenuLabel>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        onClick={() => handleRenameDrawing(d.id, d.title)}
                        className="cursor-pointer gap-2"
                      >
                        <PenTool className="w-4 h-4" /> Rename Board
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        onClick={(e) => handleDeleteDrawing(d.id, e as any)}
                        className="cursor-pointer gap-2 text-red-500 focus:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" /> Delete Board
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>

        {/* R I G H T   M A I N   A R E A   ( C A N V A S ) */}
        <Card className="flex-1 flex flex-col shadow-sm border h-[400px] md:h-full min-h-0 overflow-hidden relative">
          {selectedDrawing ? (
            <>
              {/* Canvas Toolbar Overlays */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-background/80 backdrop-blur-md p-2 rounded-full shadow-sm border">
                <span className="font-semibold text-sm px-2">
                  {selectedDrawing.title}
                </span>

                <div className="flex items-center gap-2 border-l pl-4">
                  <span className="text-xs text-muted-foreground w-16 text-center">
                    {autoSaveStatus === "saving" && "Saving..."}
                    {autoSaveStatus === "saved" && "Saved."}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 rounded-full px-3"
                    onClick={handleManualSave}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Save className="h-3 w-3 mr-1" />
                    )}
                    Force Save
                  </Button>
                </div>
              </div>

              {/* TLDRAW COMPONENT */}
              <div className="w-full h-full tldraw-wrapper">
                <Tldraw onMount={handleMount} options={{ maxPages: 1 }} />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground h-full">
              <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
              <p>Select a whiteboard or create a new one to start drawing.</p>
            </div>
          )}
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Whiteboard</DialogTitle>
            <DialogDescription>
              Start sketching and brainstorming immediately.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateDrawing} className="space-y-4">
            <div className="space-y-2">
              <Label>Board Title</Label>
              <Input
                placeholder="Product Roadmap 2024"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Category (Optional)</Label>
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
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Create"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
