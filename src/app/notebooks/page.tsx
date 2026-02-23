"use client";

import { useEffect, useState } from "react";
import { pb } from "@/lib/pb";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Book,
  Trash2,
  Plus,
  StickyNote,
  Loader2,
  Star,
  Save,
  PenTool,
} from "lucide-react";
import { toast } from "sonner";
import { TipTapEditor } from "@/components/TipTapEditor";

type Notebook = {
  id: string;
  title: string;
  color: string;
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

type Note = {
  id: string;
  title: string;
  content: string;
  notebook: string;
  is_favorite: boolean;
  date?: string;
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

export default function NotebooksPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // Data States
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(
    null,
  );

  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  // Form States - Notebook
  const [isNotebookDialogOpen, setIsNotebookDialogOpen] = useState(false);
  const [newNbTitle, setNewNbTitle] = useState("");
  const [newNbColor, setNewNbColor] = useState("#3b82f6");
  const [newNbCategory, setNewNbCategory] = useState("none");

  // Form States - Note Creation
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteCategory, setNewNoteCategory] = useState("none");

  // Form States - Note Editing
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editDate, setEditDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchNotebooks = async () => {
    try {
      const records = await pb.collection("notebooks").getFullList<Notebook>({
        sort: "-created",
        expand: "category",
        requestKey: null,
      });
      setNotebooks(records);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchNotes = async (notebookId: string) => {
    try {
      const records = await pb.collection("notes").getFullList<Note>({
        filter: `notebook = "${notebookId}"`,
        sort: "-is_favorite,-created",
        expand: "category",
        requestKey: null,
      });
      setNotes(records);
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
      Promise.all([fetchNotebooks()]).finally(() => setLoading(false));
    };

    loadInitial();

    // Optional Realtime
    pb.collection("notebooks").subscribe("*", function () {
      fetchNotebooks();
    });
    return () => {
      pb.collection("notebooks").unsubscribe("*");
    };
  }, [router]);

  useEffect(() => {
    if (selectedNotebookId) {
      fetchNotes(selectedNotebookId);
      // Let's also do a targeted subscription for notes
      pb.collection("notes").subscribe("*", function () {
        fetchNotes(selectedNotebookId);
      });
      return () => {
        pb.collection("notes").unsubscribe("*");
      };
    } else {
      setNotes([]);
      setSelectedNote(null);
    }
  }, [selectedNotebookId]);

  // Handle Note Selection
  useEffect(() => {
    if (selectedNote) {
      setEditTitle(selectedNote.title);
      setEditContent(selectedNote.content);
      // slice(0,10) to get YYYY-MM-DD for standard html date input if present
      setEditDate(selectedNote.date ? selectedNote.date.slice(0, 10) : "");
    }
  }, [selectedNote]);

  const handleCreateNotebook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNbTitle.trim()) return;

    try {
      const data: Record<string, any> = {
        title: newNbTitle,
        color: newNbColor,
        user: pb.authStore.model?.id,
      };
      if (newNbCategory !== "none") {
        data.category = newNbCategory;
      }
      const newNb = await pb.collection("notebooks").create<Notebook>(data);
      setNewNbTitle("");
      setNewNbColor("#3b82f6");
      setNewNbCategory("none");
      setIsNotebookDialogOpen(false);
      setSelectedNotebookId(newNb.id);
      toast.success("Notebook created");
    } catch (err: any) {
      toast.error(err.message || "Failed to create notebook");
    }
  };

  const handleDeleteNotebook = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure? All notes inside will be lost.")) return;
    try {
      await pb.collection("notebooks").delete(id);
      if (selectedNotebookId === id) setSelectedNotebookId(null);
      toast.success("Notebook deleted");
    } catch (err) {
      console.error(err);
    }
  };

  const handleRenameNotebook = async (id: string, currentTitle: string) => {
    const newTitle = prompt("Enter new notebook name:", currentTitle);
    if (!newTitle || !newTitle.trim() || newTitle === currentTitle) return;
    try {
      await pb.collection("notebooks").update(id, { title: newTitle.trim() });
      toast.success("Notebook renamed");
    } catch (err: any) {
      toast.error(err.message || "Failed to rename notebook");
    }
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNotebookId || !newNoteTitle.trim()) return;

    try {
      const data: Record<string, any> = {
        title: newNoteTitle,
        content: "",
        is_favorite: false,
        notebook: selectedNotebookId,
        user: pb.authStore.model?.id,
      };
      if (newNoteCategory !== "none") {
        data.category = newNoteCategory;
      }
      const newNote = await pb.collection("notes").create<Note>(data);
      setNewNoteTitle("");
      setNewNoteCategory("none");
      setIsNoteDialogOpen(false);
      setSelectedNote(newNote);
      toast.success("Note created");
    } catch (err: any) {
      toast.error(err.message || "Failed to create note");
    }
  };

  const handleSaveNoteContent = async () => {
    if (!selectedNote) return;
    setIsSaving(true);
    try {
      await pb.collection("notes").update(selectedNote.id, {
        title: editTitle,
        content: editContent,
        date: editDate ? new Date(editDate).toISOString() : null,
      });
      // The local selected note will be updated via real-time subscription or a refetch
      toast.success("Note saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save note");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleFavorite = async (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await pb.collection("notes").update(note.id, {
        is_favorite: !note.is_favorite,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await pb.collection("notes").delete(id);
      if (selectedNote?.id === id) setSelectedNote(null);
      toast.success("Note deleted");
    } catch (err) {
      console.error(err);
    }
  };

  const handleRenameNote = async (id: string, currentTitle: string) => {
    const newTitle = prompt("Enter new note title:", currentTitle);
    if (!newTitle || !newTitle.trim() || newTitle === currentTitle) return;
    try {
      await pb.collection("notes").update(id, { title: newTitle.trim() });
      if (selectedNote?.id === id) {
        setEditTitle(newTitle.trim());
      }
      toast.success("Note renamed");
    } catch (err: any) {
      toast.error(err.message || "Failed to rename note");
    }
  };

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
        <h1 className="text-3xl font-bold tracking-tight">Notebooks & Notes</h1>
        <Button variant="outline" onClick={() => router.push("/")}>
          Back to Home
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0">
        {/* L E F T   S I D E B A R   ( N O T E B O O K S ) */}
        <Card className="w-full md:w-1/4 flex flex-col shadow-sm border h-full min-h-0">
          <CardHeader className="py-4 px-4 border-b shrink-0 flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Notebooks</CardTitle>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => setIsNotebookDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </CardHeader>
          <ScrollArea className="flex-1 p-2">
            {notebooks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No notebooks found.
              </p>
            ) : (
              <div className="space-y-1">
                {notebooks.map((nb) => (
                  <ContextMenu key={nb.id}>
                    <ContextMenuTrigger asChild>
                      <div
                        onClick={() => setSelectedNotebookId(nb.id)}
                        className={`w-full flex items-center justify-between p-2 rounded-md transition-colors cursor-pointer text-left text-sm group ${
                          selectedNotebookId === nb.id
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-muted"
                        }`}
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{
                              backgroundColor:
                                nb.expand?.category?.color ||
                                nb.color ||
                                "#ccc",
                            }}
                          />
                          <span className="truncate">{nb.title}</span>
                          {nb.expand?.category && (
                            <Badge
                              style={
                                nb.expand.category.color
                                  ? {
                                      backgroundColor: nb.expand.category.color,
                                      color: "#fff",
                                    }
                                  : undefined
                              }
                              variant={
                                nb.expand.category.color
                                  ? "default"
                                  : "secondary"
                              }
                              className="ml-2 text-[10px] px-1 py-0 h-4"
                            >
                              {nb.expand.category.name}
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                          onClick={(e) => handleDeleteNotebook(nb.id, e)}
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-48">
                      <ContextMenuLabel className="truncate">
                        {nb.title}
                      </ContextMenuLabel>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        onClick={() => handleRenameNotebook(nb.id, nb.title)}
                        className="cursor-pointer gap-2"
                      >
                        <PenTool className="w-4 h-4" /> Rename
                      </ContextMenuItem>
                      <ContextMenuItem
                        onClick={(e) => handleDeleteNotebook(nb.id, e as any)}
                        className="cursor-pointer gap-2 text-red-500 focus:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" /> Delete Notebook
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>

        {/* M I D D L E   S I D E B A R   ( N O T E S   L I S T ) */}
        {selectedNotebookId && (
          <Card className="w-full md:w-1/4 flex flex-col shadow-sm border h-full min-h-0">
            <CardHeader className="py-4 px-4 border-b shrink-0 flex flex-row items-center justify-between">
              <CardTitle className="text-lg truncate pl-1">Notes</CardTitle>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setIsNoteDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </CardHeader>
            <ScrollArea className="flex-1 p-2">
              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No notes here yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {notes.map((note) => (
                    <ContextMenu key={note.id}>
                      <ContextMenuTrigger asChild>
                        <div
                          onClick={() => setSelectedNote(note)}
                          className={`cursor-pointer p-3 rounded-md border text-sm transition-all group ${
                            selectedNote?.id === note.id
                              ? "border-primary bg-primary/5 shadow-sm"
                              : note.is_favorite
                                ? "border-amber-200 bg-amber-50/50 hover:bg-amber-100/50 dark:border-amber-900/50 dark:bg-amber-950/50 dark:hover:bg-amber-900/30"
                                : "border-border hover:bg-muted"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2 truncate pr-2 flex-1">
                              <span className="font-semibold truncate">
                                {note.title}
                              </span>
                              {note.expand?.category && (
                                <Badge
                                  style={
                                    note.expand.category.color
                                      ? {
                                          backgroundColor:
                                            note.expand.category.color,
                                          color: "#fff",
                                        }
                                      : undefined
                                  }
                                  variant={
                                    note.expand.category.color
                                      ? "default"
                                      : "secondary"
                                  }
                                  className="text-[10px] px-1 py-0 h-4"
                                >
                                  {note.expand.category.name}
                                </Badge>
                              )}
                            </div>
                            <div className="flex space-x-1 shrink-0">
                              <button onClick={(e) => toggleFavorite(note, e)}>
                                <Star
                                  className={`h-4 w-4 ${note.is_favorite ? "fill-yellow-400 text-yellow-500" : "text-muted-foreground"}`}
                                />
                              </button>
                            </div>
                          </div>
                          <div
                            className="text-xs text-muted-foreground mt-1 line-clamp-2"
                            dangerouslySetInnerHTML={{
                              __html:
                                note.content.slice(0, 100) || "No content",
                            }}
                          />
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-[10px] text-muted-foreground/60">
                              {new Date(note.created).toLocaleDateString()}
                            </span>
                            <button
                              onClick={(e) => handleDeleteNote(note.id, e)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="h-3 w-3 text-red-500 hover:text-red-700" />
                            </button>
                          </div>
                        </div>
                      </ContextMenuTrigger>
                      <ContextMenuContent className="w-48">
                        <ContextMenuLabel className="truncate">
                          {note.title}
                        </ContextMenuLabel>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          onClick={() => handleRenameNote(note.id, note.title)}
                          className="cursor-pointer gap-2"
                        >
                          <PenTool className="w-4 h-4" /> Rename Note
                        </ContextMenuItem>
                        <ContextMenuItem
                          onClick={(e) => toggleFavorite(note, e as any)}
                          className="cursor-pointer gap-2"
                        >
                          <Star
                            className={`w-4 h-4 ${note.is_favorite ? "fill-yellow-400 text-yellow-500" : ""}`}
                          />
                          {note.is_favorite ? "Remove Favorite" : "Favorite"}
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          onClick={(e) => handleDeleteNote(note.id, e as any)}
                          className="cursor-pointer gap-2 text-red-500 focus:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" /> Delete Note
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  ))}
                </div>
              )}
            </ScrollArea>
          </Card>
        )}

        {/* R I G H T   M A I N   A R E A   ( E D I T O R ) */}
        {selectedNotebookId && (
          <Card className="flex-1 flex flex-col shadow-sm border h-full min-h-0">
            {selectedNote ? (
              <>
                <CardHeader className="py-4 px-6 border-b shrink-0 flex flex-row items-center justify-between space-y-0 gap-4">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="text-lg font-bold border-none bg-transparent px-0 focus-visible:ring-0 shadow-none h-auto rounded-none flex-1 truncate"
                    placeholder="Note Title..."
                  />
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="text-sm h-9 w-[140px]"
                      title="Assign to Calendar Date"
                    />
                    <Button
                      onClick={handleSaveNoteContent}
                      disabled={isSaving}
                      className="shrink-0 gap-2 h-9"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Save
                    </Button>
                  </div>
                </CardHeader>
                <div className="flex-1 flex flex-col p-0 min-h-0 bg-background/50">
                  <TipTapEditor
                    value={editContent}
                    onChange={(val) => setEditContent(val)}
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground space-y-4">
                <StickyNote className="w-12 h-12 opacity-20" />
                <p>Select a note or create a new one.</p>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* D I A L O G S */}
      <Dialog
        open={isNotebookDialogOpen}
        onOpenChange={setIsNotebookDialogOpen}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create Notebook</DialogTitle>
            <DialogDescription>
              Add a new collection for your notes.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateNotebook} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nbTitle">Title</Label>
              <Input
                id="nbTitle"
                value={newNbTitle}
                onChange={(e) => setNewNbTitle(e.target.value)}
                placeholder="Work, Personal, Ideas..."
                required
                autoFocus
              />
            </div>
            <div className="space-y-2 flex flex-col">
              <Label htmlFor="nbColor">Color (Optional)</Label>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  id="nbColor"
                  value={newNbColor}
                  onChange={(e) => setNewNbColor(e.target.value)}
                  className="w-12 h-12 p-1 rounded cursor-pointer border bg-background"
                />
                <span className="text-sm text-muted-foreground">
                  {newNbColor}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={newNbCategory} onValueChange={setNewNbCategory}>
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
              <Button type="submit">Create</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create Note</DialogTitle>
            <DialogDescription>
              Add a new note to the selected notebook.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateNote} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="noteTitle">Title</Label>
              <Input
                id="noteTitle"
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                placeholder="Note title..."
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={newNoteCategory}
                onValueChange={setNewNoteCategory}
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
            <div className="flex justify-end pt-4">
              <Button type="submit">Create</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
