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

type Category = {
  id: string;
  name: string;
  color?: string;
};

type Drawing = {
  id: string;
  title: string;
  data: any; // Stored as JSON in PB
  user: string;
  category?: string;
  expand?: {
    category?: Category;
  };
  created: string;
  updated: string;
};

export default function DrawingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // States
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedDrawing, setSelectedDrawing] = useState<Drawing | null>(null);

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

  const fetchDrawings = async () => {
    try {
      const records = await pb.collection("drawings").getFullList<Drawing>({
        sort: "-created",
        expand: "category",
        requestKey: null,
      });
      setDrawings(records);
    } catch (err) {
      console.error(err);
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
      Promise.all([fetchDrawings()]).finally(() => setLoading(false));
    };

    loadInitial();

    pb.collection("drawings").subscribe("*", function () {
      fetchDrawings();
    });
    return () => {
      pb.collection("drawings").unsubscribe("*");
    };
  }, [router]);

  const handleCreateDrawing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsCreating(true);
    try {
      const payload: Record<string, any> = {
        title: newTitle,
        data: JSON.stringify({}),
        user: pb.authStore.model?.id,
      };
      if (newCategory !== "none") {
        payload.category = newCategory;
      }

      const newDw = await pb.collection("drawings").create<Drawing>(payload);
      setNewTitle("");
      setNewCategory("none");
      setIsDialogOpen(false);
      setSelectedDrawing(newDw);
      toast.success("Drawing board created");
    } catch (err: any) {
      const errorDetails = err.response?.data
        ? JSON.stringify(err.response.data)
        : "";
      toast.error(`Failed to create drawing: ${err.message}. ${errorDetails}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this drawing?")) return;
    try {
      await pb.collection("drawings").delete(id);
      if (selectedDrawing?.id === id) {
        setSelectedDrawing(null);
        setEditor(null);
      }
      toast.success("Drawing deleted");
    } catch (err) {
      console.error(err);
    }
  };

  const handleRenameDrawing = async (id: string, currentTitle: string) => {
    const newTitle = prompt("Enter new drawing name:", currentTitle);
    if (!newTitle || !newTitle.trim() || newTitle === currentTitle) return;
    try {
      await pb.collection("drawings").update(id, { title: newTitle.trim() });
      if (selectedDrawing?.id === id) {
        setSelectedDrawing((prev) =>
          prev ? { ...prev, title: newTitle.trim() } : prev,
        );
      }
      toast.success("Drawing renamed");
    } catch (err: any) {
      toast.error(err.message || "Failed to rename drawing");
    }
  };

  const handleEditorMount = (ed: Editor) => {
    setEditor(ed);
    // When the editor attaches to a new selectedDrawing, load the snapshot
    if (selectedDrawing?.data) {
      try {
        // Data can be stored as JSON object directly by pb
        const parsed =
          typeof selectedDrawing.data === "string"
            ? JSON.parse(selectedDrawing.data)
            : selectedDrawing.data;
        if (Object.keys(parsed).length > 0) {
          loadSnapshot(ed.store, parsed);
        }
      } catch (err) {
        console.error("Failed to load snapshot", err);
      }
    }
  };

  const saveDrawing = async () => {
    if (!selectedDrawing || !editor) return;
    setIsSaving(true);
    try {
      const snap = getSnapshot(editor.store);
      await pb.collection("drawings").update(selectedDrawing.id, {
        data: JSON.stringify(snap),
      });
      toast.success("Drawing saved");
    } catch (err: any) {
      const errorDetails = err.response?.data
        ? JSON.stringify(err.response.data)
        : "";
      toast.error(`Failed to save drawing: ${err.message}. ${errorDetails}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Re-bind editor if selected drawing changes and editor is already active
  useEffect(() => {
    if (editor && selectedDrawing) {
      if (selectedDrawing.data) {
        try {
          const parsed =
            typeof selectedDrawing.data === "string"
              ? JSON.parse(selectedDrawing.data)
              : selectedDrawing.data;

          if (Object.keys(parsed).length > 0) {
            loadSnapshot(editor.store, parsed);
          } else {
            editor.store.clear();
          }
        } catch (e) {
          // Ignore empty or malformed
        }
      } else {
        // Reset if no data
        editor.store.clear();
      }
    }
  }, [selectedDrawing?.id]); // only load snapshot once per selection change

  // Auto-Save mechanism
  useEffect(() => {
    if (!editor || !selectedDrawing) return;

    const handleChange = () => {
      setAutoSaveStatus("saving");
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      saveTimerRef.current = setTimeout(async () => {
        try {
          const snap = getSnapshot(editor.store);
          await pb.collection("drawings").update(selectedDrawing.id, {
            data: JSON.stringify(snap),
          });
          setAutoSaveStatus("saved");
          setTimeout(() => setAutoSaveStatus("idle"), 2000);
        } catch (err) {
          console.error("Auto-save failed", err);
          setAutoSaveStatus("idle");
        }
      }, 1500); // 1.5s debounce
    };

    const cleanup = editor.store.listen(handleChange, {
      scope: "document",
      source: "user",
    });

    return () => {
      cleanup();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [editor, selectedDrawing?.id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl h-screen flex flex-col pt-10 pb-6">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <h1 className="text-3xl font-bold tracking-tight">
          Whiteboards & Drawings
        </h1>
        <Button variant="outline" onClick={() => router.push("/")}>
          Back to Home
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-[500px]">
        {/* LEFT SIDEBAR (List) */}
        <Card className="w-full md:w-1/4 flex flex-col shadow-sm border h-full min-h-0">
          <CardHeader className="py-4 px-4 border-b shrink-0 flex flex-row items-center justify-between">
            <CardTitle className="text-lg">My Boards</CardTitle>
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
                No drawings found.
              </p>
            ) : (
              <div className="space-y-1">
                {drawings.map((dw) => (
                  <ContextMenu key={dw.id}>
                    <ContextMenuTrigger asChild>
                      <div
                        onClick={() => setSelectedDrawing(dw)}
                        className={`w-full flex items-center justify-between p-2 rounded-md transition-colors cursor-pointer text-left text-sm group ${
                          selectedDrawing?.id === dw.id
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-muted"
                        }`}
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <PenTool className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="truncate">{dw.title}</span>
                          {dw.expand?.category && (
                            <Badge
                              style={
                                dw.expand.category.color
                                  ? {
                                      backgroundColor: dw.expand.category.color,
                                      color: "#fff",
                                    }
                                  : undefined
                              }
                              variant={
                                dw.expand.category.color
                                  ? "default"
                                  : "secondary"
                              }
                              className="ml-2 text-[10px] px-1 py-0 h-4"
                            >
                              {dw.expand.category.name}
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                          onClick={(e) => handleDelete(dw.id, e)}
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-48">
                      <ContextMenuLabel className="truncate">
                        {dw.title}
                      </ContextMenuLabel>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        onClick={() => handleRenameDrawing(dw.id, dw.title)}
                        className="cursor-pointer gap-2"
                      >
                        <PenTool className="w-4 h-4" /> Rename Board
                      </ContextMenuItem>
                      <ContextMenuItem
                        onClick={(e) => handleDelete(dw.id, e as any)}
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

        {/* RIGHT AREA (Editor) */}
        <Card className="flex-1 flex flex-col shadow-sm border h-[60vh] md:h-full min-h-[500px]">
          {selectedDrawing ? (
            <>
              <CardHeader className="py-3 px-4 border-b shrink-0 flex flex-row items-center justify-between space-y-0 gap-4">
                <div className="flex items-center gap-2 truncate">
                  <span className="font-bold text-lg truncate pr-3 border-r border-border">
                    {selectedDrawing.title}
                  </span>
                  {selectedDrawing.expand?.category && (
                    <Badge
                      variant="outline"
                      className="text-xs text-muted-foreground"
                    >
                      {selectedDrawing.expand.category.name}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  {autoSaveStatus === "saving" && (
                    <span className="text-xs text-muted-foreground animate-pulse flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Saving...
                    </span>
                  )}
                  {autoSaveStatus === "saved" && (
                    <span className="text-xs text-emerald-500 flex items-center gap-1">
                      <Save className="w-3 h-3" /> Saved
                    </span>
                  )}
                  <Button
                    onClick={saveDrawing}
                    disabled={isSaving || autoSaveStatus === "saving"}
                    className="shrink-0 gap-2 h-9"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Board
                  </Button>
                </div>
              </CardHeader>

              <div className="flex-1 relative bg-white dark:invert isolate rounded-b-xl overflow-hidden">
                <div style={{ position: "absolute", inset: 0 }}>
                  <Tldraw onMount={handleEditorMount} autoFocus={false} />
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground space-y-4">
              <ImageIcon className="w-12 h-12 opacity-20" />
              <p>Select a whiteboard or create a new one.</p>
            </div>
          )}
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create Whiteboard</DialogTitle>
            <DialogDescription>
              Start a new unstructured drawing board.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateDrawing} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dwTitle">Title</Label>
              <Input
                id="dwTitle"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Design ideas, architecture, sketches..."
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
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
            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Creating..." : "Create Board"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
