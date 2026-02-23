"use client";

import { useEffect, useState, useRef } from "react";
import { db, Profile } from "@/lib/db";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Camera, UserCircle2 } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const profile = useLiveQuery(() => db.profiles.toCollection().first());

  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile Form States
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string>("");

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setEmail(profile.email || "");
      if (profile.avatar) {
        setAvatarPreview(profile.avatar);
      }
    }
  }, [profile]);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Convert image to base64 for local storage
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearAvatar = () => {
    setAvatarPreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    try {
      await db.profiles.update(profile.id, {
        name: name.trim(),
        email: email.trim(),
        avatar: avatarPreview,
        updated: new Date().toISOString(),
      });
      toast.success("Profile updated successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (profile === undefined) {
    return (
      <div className="container mx-auto p-4 max-w-xl space-y-6 mt-10">
        <Skeleton className="h-10 w-48 mb-6" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  // If no profile exists they haven't onboarded
  if (profile === null) {
    router.push("/");
    return null;
  }

  return (
    <div className="container mx-auto p-4 max-w-xl space-y-8 mt-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
        <Button variant="outline" onClick={() => router.push("/")}>
          Back to Home
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>
            Update your local identity settings. Data is stored purely on your
            device.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSaveProfile}>
          <CardContent className="space-y-6">
            {/* A V A T A R */}
            <div className="flex items-center gap-6">
              <Avatar className="w-24 h-24 border-2 border-border/50">
                {avatarPreview ? (
                  <AvatarImage src={avatarPreview} />
                ) : (
                  <AvatarFallback className="bg-muted text-muted-foreground w-full h-full">
                    <UserCircle2 className="w-12 h-12" />
                  </AvatarFallback>
                )}
              </Avatar>

              <div className="space-y-2 flex-1">
                <Label
                  htmlFor="avatar-upload"
                  className="cursor-pointer flex items-center gap-2 border w-fit px-4 py-2 rounded-md hover:bg-muted font-medium text-sm transition-colors"
                >
                  <Camera className="w-4 h-4" /> Change Avatar
                </Label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarSelect}
                  ref={fileInputRef}
                />
                <div className="flex gap-2 items-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground h-auto p-0 hover:bg-transparent hover:text-red-500 hover:underline"
                    onClick={clearAvatar}
                  >
                    Remove Avatar
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Recommended: 256x256, max 2MB
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* N A M E   &   E M A I L */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  Email doesn't apply for local Dexie store.
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-end border-t pt-4">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
