"use client";

import { useEffect, useState } from "react";
import { pb } from "@/lib/pb";
import { useParams, useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileQuestion,
  UserCircle2,
  Book,
  CheckSquare,
  StickyNote,
  Activity,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type PublicUser = {
  id: string;
  name: string;
  avatar: string;
  is_public: boolean;
  slug: string;
  created: string;
  // Note: We avoid pulling email to keep it secure on a public page
};

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({
    todos: 0,
    notebooks: 0,
    notes: 0,
  });

  useEffect(() => {
    if (!slug) return;

    const fetchPublicUser = async () => {
      try {
        // Query PocketBase expecting exactly one active match
        const record = await pb
          .collection("users")
          .getFirstListItem<PublicUser>(
            `slug = "${slug}" && is_public = true`,
            {
              requestKey: null,
            },
          );

        setUser(record);

        // Fetch user stats (This works securely if API Rules on these collections allow access.
        // It's possible API rules restrict this, but we'll try to fetch public counts if possible.)
        // E.g 'todos' API rule: `@request.auth.id != "" && user != ""` (example)
        // If the backend prevents viewing other people's notebooks, these will just fail or return 0, which is perfectly safe.
        try {
          const [todos, notebooks, notes] = await Promise.all([
            pb.collection("todos").getList(1, 1, {
              filter: `user = "${record.id}"`,
              requestKey: null,
            }),
            pb.collection("notebooks").getList(1, 1, {
              filter: `user = "${record.id}"`,
              requestKey: null,
            }),
            pb.collection("notes").getList(1, 1, {
              filter: `user = "${record.id}"`,
              requestKey: null,
            }),
          ]);
          setStats({
            todos: todos.totalItems,
            notebooks: notebooks.totalItems,
            notes: notes.totalItems,
          });
        } catch (statsErr) {
          console.log("Stats fetch hidden by permissions, skipping...");
        }
      } catch (err: any) {
        console.error("User not found or not public", err);
        setError("User not found or profile is private.");
      } finally {
        setLoading(false);
      }
    };

    fetchPublicUser();
  }, [slug]);

  if (loading) {
    return (
      <div className="container mx-auto p-4 max-w-3xl space-y-8 mt-16 flex flex-col items-center">
        <Skeleton className="w-32 h-32 rounded-full mb-4" />
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="container mx-auto p-4 max-w-md mt-20">
        <Card className="border-dashed border-2 text-center p-8 bg-muted/20">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="bg-muted p-4 rounded-full">
              <FileQuestion className="w-12 h-12 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Profile Not Found
            </h1>
            <p className="text-muted-foreground">
              The user "{slug}" does not exist or has set their profile to
              private.
            </p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => router.push("/")}
            >
              Return to Home
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const avatarUrl = user.avatar ? pb.files.getURL(user, user.avatar) : "";

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-8 mt-10 pb-20">
      {/* Header Banner Section */}
      <div className="relative w-full h-48 bg-linear-to-r from-primary/10 via-primary/5 to-transparent rounded-xl border flex items-end mb-16 overflow-visible shadow-sm">
        <div className="absolute -bottom-12 left-8 sm:left-12 drop-shadow-lg">
          <Avatar className="w-32 h-32 border-4 border-background bg-secondary">
            {avatarUrl ? (
              <AvatarImage
                src={avatarUrl}
                alt={user.name}
                className="object-cover"
              />
            ) : (
              <AvatarFallback className="bg-primary/10 text-primary">
                <UserCircle2 className="w-16 h-16" />
              </AvatarFallback>
            )}
          </Avatar>
        </div>
      </div>

      {/* Main Content Info */}
      <div className="pl-4 sm:pl-12 pt-4 flex flex-col sm:flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-extrabold tracking-tight">
            {user.name || "Unnamed Explorer"}
          </h1>
          <p className="text-lg text-muted-foreground font-medium">
            nootle.com/u/{user.slug}
          </p>
          <p className="text-sm text-muted-foreground/80 mt-2">
            Joined {new Date(user.created).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mt-10">
        <Card className="col-span-1 md:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Knowledge Base
            </CardTitle>
            <CardDescription>Public metrics and contributions.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col items-center justify-center p-6 border rounded-xl bg-card">
              <CheckSquare className="w-8 h-8 text-emerald-500 mb-3" />
              <span className="text-3xl font-bold">{stats.todos}</span>
              <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider mt-1">
                Todos
              </span>
            </div>

            <div className="flex flex-col items-center justify-center p-6 border rounded-xl bg-card">
              <Book className="w-8 h-8 text-blue-500 mb-3" />
              <span className="text-3xl font-bold">{stats.notebooks}</span>
              <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider mt-1">
                Notebooks
              </span>
            </div>

            <div className="flex flex-col items-center justify-center p-6 border rounded-xl bg-card">
              <StickyNote className="w-8 h-8 text-amber-500 mb-3" />
              <span className="text-3xl font-bold">{stats.notes}</span>
              <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider mt-1">
                Notes
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
