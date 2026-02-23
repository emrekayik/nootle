"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Calendar,
  CheckSquare,
  Home,
  LogOut,
  Book,
  UserCircle2,
  Clock,
  Tags,
  PenTool,
  RefreshCw,
} from "lucide-react";

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const { state, setOpenMobile, isMobile } = useSidebar();
  const profile = useLiveQuery(() => db.profiles.toCollection().first());

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient || !profile) {
    return null; // Don't render sidebar if not authenticated or not hydrated
  }

  const items = [
    { title: "Home", url: "/", icon: Home },
    { title: "Todos", url: "/todos", icon: CheckSquare },
    { title: "Notebooks", url: "/notebooks", icon: Book },
    { title: "Calendar", url: "/calendar", icon: Calendar },
    { title: "Drawings", url: "/drawings", icon: PenTool },
    { title: "Timer", url: "/timer", icon: Clock },
    { title: "Categories", url: "/categories", icon: Tags },
  ];

  const handleLogout = async () => {
    await db.delete(); // Clear entire database
    window.location.href = window.location.pathname.startsWith("/nootle")
      ? "/nootle/"
      : "/";
  };

  const avatarUrl = profile.avatar;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b h-14 flex items-center shrink-0 justify-center group-data-[collapsible=icon]:p-2 group-data-[state=expanded]:px-4 group-data-[state=expanded]:justify-between">
        <div className="flex items-center gap-3 w-full group-data-[collapsible=icon]:hidden">
          <div className="flex bg-primary/10 p-1.5 rounded-md items-center justify-center shrink-0">
            <Book className="w-5 h-5 text-primary" />
          </div>
          <span className="font-bold tracking-tight text-lg">Nootle</span>
          <div className="flex-1" />
          <SidebarTrigger className="bg-muted/50 w-8 h-8 rounded-md" />
        </div>
        <div className="flex items-center justify-center w-full group-data-[state=expanded]:hidden">
          <SidebarTrigger className="bg-muted/50 w-8 h-8 rounded-md" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    className={`tour-sidebar-${item.title.toLowerCase()}`}
                  >
                    <Link
                      href={item.url}
                      onClick={() => isMobile && setOpenMobile(false)}
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="mb-2 w-full justify-start hover:bg-transparent cursor-default"
            >
              <Avatar className="w-8 h-8 shrink-0 rounded-md">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={profile.name} />
                ) : (
                  <AvatarFallback className="rounded-md">
                    <UserCircle2 className="w-4 h-4" />
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex flex-col text-sm truncate flex-1 leading-none">
                <span className="font-semibold truncate">
                  {profile.name || "User"}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {profile.email}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/sync"}>
              <Link
                href="/sync"
                onClick={() => isMobile && setOpenMobile(false)}
              >
                <RefreshCw className="w-4 h-4 shrink-0" />
                <span>Sync Devices</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/profile"}>
              <Link
                href="/profile"
                onClick={() => isMobile && setOpenMobile(false)}
              >
                <UserCircle2 className="w-4 h-4 shrink-0" />
                <span>Profile</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              className="text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Reset Data</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
