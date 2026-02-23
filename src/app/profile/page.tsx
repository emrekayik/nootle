"use client";

import { useEffect, useState, useRef } from "react";
import { pb } from "@/lib/pb";
import { useRouter } from "next/navigation";
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Camera, CheckCircle2, UserCircle2, XCircle } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile Form States
  const [name, setName] = useState("");
  const [emailVisibility, setEmailVisibility] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [isPublic, setIsPublic] = useState(false);
  const [slug, setSlug] = useState("");

  // Read-only States
  const [email, setEmail] = useState("");
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!pb.authStore.isValid) {
      router.push("/");
      return;
    }

    // Load initial values from the auth store model
    const user = pb.authStore.model;
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setEmailVisibility(user.emailVisibility || false);
      setVerified(user.verified || false);

      if (user.avatar) {
        setAvatarPreview(pb.files.getURL(user, user.avatar));
      }
      setIsPublic(user.is_public || false);
      setSlug(user.slug || "");
    }
    setLoading(false);
  }, [router]);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const clearAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const model = pb.authStore.model;
      if (!model) throw new Error("No user model available.");

      const formData = new FormData();
      formData.append("name", name);
      formData.append("emailVisibility", String(emailVisibility));

      // If a new avatar file was selected, append it
      if (avatarFile) {
        formData.append("avatar", avatarFile);
      } else if (!avatarPreview && model.avatar) {
        // If avatar preview is empty but model has avatar, user removed it.
        formData.append("avatar", "");
      }

      formData.append("is_public", String(isPublic));
      formData.append("slug", slug);

      await pb.collection("users").update(model.id, formData);
      toast.success("Profile updated successfully!");

      // Update the preview to reflect the actual file url
      const updatedUser = pb.authStore.model;
      if (updatedUser?.avatar) {
        setAvatarPreview(pb.files.getURL(updatedUser, updatedUser.avatar));
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 max-w-xl space-y-6 mt-10">
        <Skeleton className="h-10 w-48 mb-6" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
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
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Update your account details, avatar, and visibility settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            id="profile-form"
            onSubmit={handleSaveProfile}
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative group">
                <Avatar className="w-24 h-24 border-2 border-border">
                  {avatarPreview ? (
                    <AvatarImage
                      src={avatarPreview}
                      alt="Profile avatar"
                      className="object-cover"
                    />
                  ) : (
                    <AvatarFallback className="bg-muted text-muted-foreground text-3xl">
                      <UserCircle2 className="w-12 h-12" />
                    </AvatarFallback>
                  )}
                </Avatar>

                {avatarPreview && (
                  <button
                    type="button"
                    onClick={clearAvatar}
                    className="absolute -top-2 -right-2 bg-background rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                )}

                <Label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-1.5 rounded-full cursor-pointer hover:bg-primary/90 transition-colors shadow-sm"
                >
                  <Camera className="w-4 h-4" />
                </Label>
                <input
                  id="avatar-upload"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarSelect}
                />
              </div>

              <div className="flex-1 space-y-1 text-center sm:text-left">
                <h3 className="font-medium text-lg">
                  {name || "Unnamed User"}
                </h3>
                <p className="text-sm text-muted-foreground">{email}</p>
                <div className="mt-2 flex items-center justify-center sm:justify-start">
                  <Badge
                    variant={verified ? "default" : "secondary"}
                    className={
                      verified ? "bg-green-600 hover:bg-green-700" : ""
                    }
                  >
                    {verified ? (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Verified
                      </span>
                    ) : (
                      "Unverified"
                    )}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Email Visibility</Label>
                  <p className="text-sm text-muted-foreground">
                    Show your email address to other users.
                  </p>
                </div>
                <Switch
                  checked={emailVisibility}
                  onCheckedChange={setEmailVisibility}
                />
              </div>

              <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Public Profile</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow others to view your profile using your unique slug.
                  </p>
                </div>
                <Switch checked={isPublic} onCheckedChange={setIsPublic} />
              </div>

              {isPublic && (
                <div className="space-y-2">
                  <Label htmlFor="slug">Profile Slug</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground bg-secondary px-3 py-2 rounded-md border text-sm">
                      nootle.com/u/
                    </span>
                    <Input
                      id="slug"
                      placeholder="e.g. johndoe"
                      value={slug}
                      onChange={(e) =>
                        setSlug(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]/g, ""),
                        )
                      }
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Only letters, numbers, and hyphens are allowed.
                  </p>
                </div>
              )}
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-between border-t p-6">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.refresh()}
          >
            Discard Changes
          </Button>
          <Button type="submit" form="profile-form" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
