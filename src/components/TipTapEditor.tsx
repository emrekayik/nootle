"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { useEffect, useState, useRef } from "react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import TurndownService from "turndown";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Code,
  Eye,
  PenLine,
  Image as ImageIcon,
  FileText,
  FileCode,
  Download,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const lowlight = createLowlight(common);

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  title?: string;
}

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1 border-b p-2 bg-muted/30">
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={`p-1.5 rounded-md hover:bg-muted ${editor.isActive("bold") ? "bg-muted text-primary" : "text-muted-foreground"}`}
        title="Bold"
      >
        <Bold className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={`p-1.5 rounded-md hover:bg-muted ${editor.isActive("italic") ? "bg-muted text-primary" : "text-muted-foreground"}`}
        title="Italic"
      >
        <Italic className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
        className={`p-1.5 rounded-md hover:bg-muted ${editor.isActive("strike") ? "bg-muted text-primary" : "text-muted-foreground"}`}
        title="Strikethrough"
      >
        <Strikethrough className="w-4 h-4" />
      </button>
      <div className="w-px h-4 bg-border mx-1" />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`p-1.5 rounded-md hover:bg-muted ${editor.isActive("heading", { level: 1 }) ? "bg-muted text-primary" : "text-muted-foreground"}`}
        title="Heading 1"
      >
        <Heading1 className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`p-1.5 rounded-md hover:bg-muted ${editor.isActive("heading", { level: 2 }) ? "bg-muted text-primary" : "text-muted-foreground"}`}
        title="Heading 2"
      >
        <Heading2 className="w-4 h-4" />
      </button>
      <div className="w-px h-4 bg-border mx-1" />
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-1.5 rounded-md hover:bg-muted ${editor.isActive("bulletList") ? "bg-muted text-primary" : "text-muted-foreground"}`}
        title="Bullet List"
      >
        <List className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-1.5 rounded-md hover:bg-muted ${editor.isActive("orderedList") ? "bg-muted text-primary" : "text-muted-foreground"}`}
        title="Ordered List"
      >
        <ListOrdered className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`p-1.5 rounded-md hover:bg-muted ${editor.isActive("blockquote") ? "bg-muted text-primary" : "text-muted-foreground"}`}
        title="Quote"
      >
        <Quote className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={`p-1.5 rounded-md hover:bg-muted ${editor.isActive("codeBlock") ? "bg-muted text-primary" : "text-muted-foreground"}`}
        title="Code Block"
      >
        <Code className="w-4 h-4" />
      </button>
      <div className="w-px h-4 bg-border mx-1" />
      <button
        type="button"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
        title="Undo"
      >
        <Undo className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
        title="Redo"
      >
        <Redo className="w-4 h-4" />
      </button>
      <div className="flex-1" />
    </div>
  );
};

export const TipTapEditor = ({
  value,
  onChange,
  title = "Note",
}: EditorProps) => {
  const [isPreview, setIsPreview] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      CodeBlockLowlight.configure({
        lowlight,
      }),
    ],
    content: value || "", // default to empty string to prevent undefined issues
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base dark:prose-invert focus:outline-none max-w-none p-4 min-h-[300px]",
      },
    },
  });

  // To update content if the external "value" prop changes (i.e. different note selected)
  // We compare HTML strings carefully because Tiptap can wrap raw values differently.
  useEffect(() => {
    if (editor && value !== undefined && value !== editor.getHTML()) {
      if (value === "" && editor.getHTML() === "<p></p>") return;
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  // Export Functions
  const exportToImage = async () => {
    if (!containerRef.current) return;
    try {
      // Temporarily expand to full height to capture everything if scrolled
      const el = containerRef.current;
      const originalHeight = el.style.height;
      const originalOverflow = el.style.overflow;
      el.style.height = "auto";
      el.style.overflow = "visible";

      const dataUrl = await toPng(el, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
      });

      // Restore
      el.style.height = originalHeight;
      el.style.overflow = originalOverflow;

      const link = document.createElement("a");
      link.download = `${title || "note"}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error("Failed to export image", e);
    }
  };

  const exportToPDF = async () => {
    if (!containerRef.current) return;
    try {
      const el = containerRef.current;
      const originalHeight = el.style.height;
      const originalOverflow = el.style.overflow;
      el.style.height = "auto";
      el.style.overflow = "visible";

      const dataUrl = await toPng(el, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
      });

      el.style.height = originalHeight;
      el.style.overflow = originalOverflow;

      // Basic PDF A4 wrapper
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (el.offsetHeight * pdfWidth) / el.offsetWidth;
      pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${title || "note"}.pdf`);
    } catch (e) {
      console.error("Failed to export pdf", e);
    }
  };

  const exportToMarkdown = () => {
    if (!editor) return;
    const html = editor.getHTML();
    const turndownService = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
    });
    const markdown = turndownService.turndown(html);
    const blob = new Blob([markdown], { type: "text/markdown" });
    const link = document.createElement("a");
    link.download = `${title || "note"}.md`;
    link.href = URL.createObjectURL(blob);
    link.click();
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <div className="flex items-center justify-between border-b px-2 bg-muted/10">
        {!isPreview ? (
          <MenuBar editor={editor} />
        ) : (
          <div className="text-sm font-medium text-muted-foreground p-3">
            Preview Mode
          </div>
        )}

        <div className="flex items-center gap-2 pr-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPreview(!isPreview)}
            className="h-8 gap-1"
          >
            {isPreview ? (
              <PenLine className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">
              {isPreview ? "Edit" : "Preview"}
            </span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1">
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={exportToImage}
                className="gap-2 cursor-pointer"
              >
                <ImageIcon className="w-4 h-4" /> Image (.png)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={exportToPDF}
                className="gap-2 cursor-pointer"
              >
                <FileText className="w-4 h-4" /> PDF Document
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={exportToMarkdown}
                className="gap-2 cursor-pointer"
              >
                <FileCode className="w-4 h-4" /> Markdown (.md)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div
        className={`flex-1 overflow-y-auto ${!isPreview ? "cursor-text" : ""}`}
        onClick={() => {
          if (!isPreview) editor?.commands.focus();
        }}
        ref={containerRef}
      >
        {isPreview ? (
          <div
            className="prose prose-sm sm:prose-base dark:prose-invert max-w-none p-6"
            dangerouslySetInnerHTML={{ __html: editor?.getHTML() || "" }}
          />
        ) : (
          <EditorContent editor={editor} className="h-full px-2" />
        )}
      </div>
    </div>
  );
};
