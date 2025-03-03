"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Clipboard,
  FileText,
  FolderTree,
  Home,
  Settings,
  Users,
  Bell,
  HardHat,
  ChevronLeft,
  LogOut,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Equipment List", href: "/dashboard/equipment", icon: Clipboard },
  { name: "Maintenance Tasks", href: "/dashboard/tasks", icon: FileText },
  { name: "Archive", href: "/dashboard/reports", icon: FolderTree },
  // { name: "Finances", href: "/dashboard/finances", icon: DollarSign },
  // { name: "Reports", href: "/reports", icon: FileText },
  // { name: "Users & Permissions", href: "/users", icon: Users },
  // { name: "Notifications", href: "/notifications", icon: Bell },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-64 flex-col bg-gray-900 text-white">
      <Link
        href="/welcome"
        className="group space-x-2 flex h-16 items-center justify-center border-b border-gray-700"
      >
        <ChevronLeft className="font-thin text-xs  text-red-950 group-hover:-translate-x-1 duration-300" />
        <img src="/logo-removebg.png" alt="" className="h-12 w-12" />
        <h1 className="text-lg font-bold truncate">ResenixPro</h1>
      </Link>
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navItems.map((item) => (
          <Link key={item.name} href={item.href}>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start",
                pathname === item.href
                  ? "bg-gray-700 text-white"
                  : "text-gray-300 hover:bg-gray-700 hover:text-white"
              )}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Button>
          </Link>
        ))}
      </nav>
    </div>
  );
}

