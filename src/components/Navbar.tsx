"use client";

import Link from "next/link";
import {
  Bell,
  ChevronLeft,
  Globe,
  LogOut,
  PanelRightOpen,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationsPanel } from "./NotificationPanel";
import { logout } from "@/lib/firebase";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@/hooks/use-user";

export function Navbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const isWelcomePage = pathname.includes("welcome");
  const { user, loading } = useUser();
  const handleLogout = async () => {
    await logout();
    router.push("/"); // Redirect to login after logout
  };

  return (
    <nav className="border-b bg-background">
      <div className="w-full justify-between ml-auto container flex h-16 items-center px-4">
        {!isWelcomePage && (
          <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="mr-auto">
            <PanelRightOpen className="h-7 w-7" />
          </Button>
        )}
        {isWelcomePage && (
          <Link
            href="/"
            className="absolute top-2 left-4 flex items-center space-x-2"
          >
            <img src="/logo-removebg.png" alt="" className="h-12 w-12" />
            <h1 className="text-lg font-bold truncate">ResenixPro</h1>
          </Link>
        )}
        <div className="ml-auto flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => {}}>
            <Globe className="h-7 w-7" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-7 w-7" />
                <div
                  className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary"
                  aria-hidden="true"
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="border-none shadow-none"
            >
              <NotificationsPanel />
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/avatars/01.png" alt="@username" />
                  <AvatarFallback>PR</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">User</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
