"use client";

import { useState, useEffect } from "react";
import { db, generateId, Notebook, Note } from "@/lib/db";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
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

export default function NotebooksPage() {
  const router = useRouter();

  const rawNotebooks = useLiveQuery(
    () => db.notebooks.orderBy("created").reverse().toArray(),
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

  const notebooks =
    rawNotebooks?.map((nb) => ({
      ...nb,
      expand: {
        category: nb.categoryId ? categoriesMap[nb.categoryId] : undefined,
      },
    })) || undefined;

  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(
    null,
  );

  const rawNotes = useLiveQuery(async () => {
    if (!selectedNotebookId) return [];
    const n = await db.notes
      .where("notebookId")
      .equals(selectedNotebookId)
      .toArray();
    // Sort logic: is_favorite first, then by created desc
    return n.sort((a, b) => {
      if (a.is_favorite === b.is_favorite) {
        return new Date(b.created).getTime() - new Date(a.created).getTime();
      }
      return a.is_favorite ? -1 : 1;
    });
  }, [selectedNotebookId]);

  const notes =
    rawNotes?.map((n) => ({
      ...n,
      expand: {
        category: n.categoryId ? categoriesMap[n.categoryId] : undefined,
      },
    })) || [];

  const [selectedNote, setSelectedNote] = useState<any | null>(null);

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

  useEffect(() => {
    if (selectedNote) {
      setEditTitle(selectedNote.title);
      setEditContent(selectedNote.content);
      setEditDate(
        selectedNote.date
          ? new Date(selectedNote.date).toISOString().split("T")[0]
          : "",
      );
    } else {
      setEditTitle("");
      setEditContent("");
      setEditDate("");
    }
  }, [selectedNote]);

  // Deselect note if notebook changes
  useEffect(() => {
    setSelectedNote(null);
  }, [selectedNotebookId]);

  const handleCreateNotebook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNbTitle.trim()) return;

    try {
      const data: Partial<Notebook> = {
        id: generateId(),
        title: newNbTitle.trim(),
        color: newNbColor,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      };

      if (newNbCategory !== "none") {
        data.categoryId = newNbCategory;
      }

      await db.notebooks.add(data as Notebook);

      setNewNbTitle("");
      setNewNbColor("#3b82f6");
      setNewNbCategory("none");
      setIsNotebookDialogOpen(false);
      toast.success("Notebook created!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to create notebook.");
    }
  };

  const handleDeleteNotebook = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      !window.confirm(
        "Are you sure you want to delete this notebook and ALL its notes?",
      )
    )
      return;

    try {
      await db.notebooks.delete(id);

      // Delete cascade relations
      const notesToDelete = await db.notes
        .where("notebookId")
        .equals(id)
        .primaryKeys();
      await db.notes.bulkDelete(notesToDelete);

      if (selectedNotebookId === id) {
        setSelectedNotebookId(null);
        setSelectedNote(null);
      }
      toast.success("Notebook deleted");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to delete notebook");
    }
  };

  const handleRenameNotebook = async (id: string, currentTitle: string) => {
    const freshTitle = prompt("Enter new notebook name:", currentTitle);
    if (!freshTitle || !freshTitle.trim() || freshTitle === currentTitle)
      return;
    try {
      await db.notebooks.update(id, {
        title: freshTitle.trim(),
        updated: new Date().toISOString(),
      });
      toast.success("Notebook renamed");
    } catch (err: any) {
      toast.error(err.message || "Failed to rename notebook");
    }
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim() || !selectedNotebookId) return;

    try {
      const data: Partial<Note> = {
        id: generateId(),
        title: newNoteTitle.trim(),
        content: "",
        notebookId: selectedNotebookId,
        is_favorite: false,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        date: "",
      };

      if (newNoteCategory !== "none") {
        data.categoryId = newNoteCategory;
      }

      const freshId = await db.notes.add(data as Note);
      const newlyCreatedNote = await db.notes.get(freshId as string);

      if (newlyCreatedNote) {
        setSelectedNote(newlyCreatedNote);
      }

      setNewNoteTitle("");
      setNewNoteCategory("none");
      setIsNoteDialogOpen(false);
      toast.success("Note created!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to create note.");
    }
  };

  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Delete this note?")) return;

    try {
      await db.notes.delete(id);
      if (selectedNote?.id === id) {
        setSelectedNote(null);
      }
      toast.success("Note deleted");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to delete note");
    }
  };

  const handleRenameNote = async (id: string, currentTitle: string) => {
    const freshTitle = prompt("Enter new note title:", currentTitle);
    if (!freshTitle || !freshTitle.trim() || freshTitle === currentTitle)
      return;
    try {
      await db.notes.update(id, {
        title: freshTitle.trim(),
        updated: new Date().toISOString(),
      });
      if (selectedNote && selectedNote.id === id) {
        setSelectedNote((prev: any) =>
          prev ? { ...prev, title: freshTitle.trim() } : null,
        );
      }
      toast.success("Note renamed");
    } catch (err: any) {
      toast.error(err.message || "Failed to rename note");
    }
  };

  const toggleFavorite = async (note: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await db.notes.update(note.id, {
        is_favorite: !note.is_favorite,
        updated: new Date().toISOString(),
      });
      if (selectedNote?.id === note.id) {
        setSelectedNote({ ...selectedNote, is_favorite: !note.is_favorite });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveNoteContent = async () => {
    if (!selectedNote) return;
    setIsSaving(true);
    try {
      const d = {
        title: editTitle.trim() || "Untitled Note",
        content: editContent,
        date: editDate ? new Date(editDate).toISOString() : "",
        updated: new Date().toISOString(),
      };

      await db.notes.update(selectedNote.id, d);
      setSelectedNote({ ...selectedNote, ...d });
      toast.success("Note fully saved");
    } catch (err) {
      console.error(err);
      toast.error("Failed to fully save note");
    } finally {
      setIsSaving(false);
    }
  };

  if (notebooks === undefined || rawCategories === undefined) {
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
                              className="text-[10px] px-1 py-0 h-4"
                              variant={
                                nb.expand.category.color
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {nb.expand.category.name}
                            </Badge>
                          )}
                        </div>
                        <button
                          onClick={(e) => handleDeleteNotebook(nb.id, e)}
                          className={`shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${
                            selectedNotebookId === nb.id ? "opacity-100" : ""
                          }`}
                        >
                          <Trash2 className="w-4 h-4 text-red-500 hover:text-red-700" />
                        </button>
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
                        <PenTool className="w-4 h-4" /> Rename Notebook
                      </ContextMenuItem>
                      <ContextMenuSeparator />
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
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save Note
                    </Button>
                  </div>
                </CardHeader>
                <div className="flex-1 overflow-hidden relative">
                  <TipTapEditor
                    value={editContent}
                    onChange={(html: string) => {
                      setEditContent(html);
                      // Optionally auto-save occasionally
                    }}
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground">
                <StickyNote className="w-16 h-16 mb-4 opacity-20" />
                <p>Select a note or create a new one to start writing.</p>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* D I A L O G S */}
      {/* Notebook Dialog */}
      <Dialog
        open={isNotebookDialogOpen}
        onOpenChange={setIsNotebookDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Notebook</DialogTitle>
            <DialogDescription>Group related notes together.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateNotebook} className="space-y-4">
            <div className="space-y-2">
              <Label>Notebook Title</Label>
              <Input
                placeholder="Work Project XYZ"
                value={newNbTitle}
                onChange={(e) => setNewNbTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Theme Color</Label>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={newNbColor}
                  onChange={(e) => setNewNbColor(e.target.value)}
                  className="w-10 h-10 p-1 rounded cursor-pointer border bg-background"
                />
                <span className="text-sm text-muted-foreground font-mono">
                  {newNbColor}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category (Optional)</Label>
              <Select value={newNbCategory} onValueChange={setNewNbCategory}>
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
                onClick={() => setIsNotebookDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Create</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Note Dialog */}
      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Note</DialogTitle>
            <DialogDescription>Write down your thoughts.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateNote} className="space-y-4">
            <div className="space-y-2">
              <Label>Note Title</Label>
              <Input
                placeholder="Meeting Notes"
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Category (Optional)</Label>
              <Select
                value={newNoteCategory}
                onValueChange={setNewNoteCategory}
              >
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
                onClick={() => setIsNoteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Create Note</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
