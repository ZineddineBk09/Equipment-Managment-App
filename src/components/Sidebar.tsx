"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Clipboard,
  FileText,
  Home,
  Settings,
  Users,
  Bell,
  HardHat,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Equipment List", href: "/dashboard/equipment", icon: Clipboard },
  { name: "Maintenance Tasks", href: "/dashboard/tasks", icon: FileText },
  // { name: "Reports", href: "/reports", icon: FileText },
  // { name: "Users & Permissions", href: "/users", icon: Users },
  // { name: "Notifications", href: "/notifications", icon: Bell },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-64 flex-col bg-gray-900 text-white">
      <div className="space-x-2 flex h-16 items-center justify-center border-b border-gray-700">
        <img src="/logo-removebg.png" alt="" className="h-12 w-12"/>
        <h1 className="text-lg font-bold truncate">ResenixPro</h1>
      </div>
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navItems.map((item) => (
          <Link key={item.name} href={item.href}>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start",
                pathname === item.href
                  ? "bg-gray-900 text-white"
                  : "text-gray-300 hover:bg-gray-700 hover:text-white"
              )}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Button>
          </Link>
        ))}
      </nav>
      {/* <div className="w-full ml-auto border-t border-gray-700 py-4">
        <Button variant="outline" className="w-full bg-transparent border-none">
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Button>
      </div> */}
    </div>
  );
}
