"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Clipboard,
  FileText,
  FolderTree,
  Home,
  Users,
  ChevronLeft,
  Package,
  File,
  FileCheck,
  PackageSearch,
  Send,
  PackageCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useUser } from "@/hooks/use-user";
import { USER_ROLES, FIREBASE_RESOURCES } from "@/enums/resources";

const maintenanceDashboard = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: Home,
    permissions: [FIREBASE_RESOURCES.DASHBOARD + ":view"],
  },
  {
    name: "Equipment List",
    href: "/dashboard/equipment",
    icon: Clipboard,
    permissions: [FIREBASE_RESOURCES.EQUIPMENTS + ":view"],
  },
  {
    name: "Maintenance Tasks",
    href: "/dashboard/tasks",
    icon: FileText,
    permissions: [FIREBASE_RESOURCES.TASKS + ":view"],
  },
  {
    name: "Archive",
    href: "/dashboard/reports",
    icon: FolderTree,
    permissions: [FIREBASE_RESOURCES.REPORTS + ":view"],
  },
  // { name: "User Management", href: "/dashboard/hr", icon: Users },
];

const hrDashboard = [
  {
    name: "User Management",
    href: "/dashboard/hr",
    icon: Users,
    permissions: [FIREBASE_RESOURCES.USERS + ":view"],
  },
  {
    name: "Messages",
    href: "/dashboard/hr/messages",
    icon: Send,
    permissions: [FIREBASE_RESOURCES.INVOICES + ":view"],
  },
];

const invoicesDashboard = [
  {
    name: "Create Requisition",
    href: "/dashboard/invoices/requisition/create",
    icon: File,
    permissions: [FIREBASE_RESOURCES.INVOICES + ":view"],
  },
  {
    name: "Approve Requisition",
    href: "/dashboard/invoices/requisition/approval",
    icon: FileCheck,
    permissions: [FIREBASE_RESOURCES.INVOICES + ":view"],
  },
  {
    name: "Order",
    href: "/dashboard/invoices/order/create",
    icon: Package,
    permissions: [FIREBASE_RESOURCES.INVOICES + ":view"],
  },
  {
    name: "Approve Order",
    href: "/dashboard/invoices/order/approval",
    icon: PackageCheck,
    permissions: [FIREBASE_RESOURCES.INVOICES + ":view"],
  },
  {
    name: "Vendors",
    href: "/dashboard/invoices/vendors",
    icon: PackageSearch,
    permissions: [FIREBASE_RESOURCES.INVOICES + ":view"],
  },
];

export function Sidebar({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();
  const { user, loading } = useUser();
  const [navItems, setNavItems] = useState<
    {
      name: string;
      href: string;
      icon: any;
      disabled?: boolean;
      permissions: string[];
    }[]
  >([]);

  const hasPermission = (permissions: string[]) => {
    return permissions.some((permission) => {
      const [resource, perm] = permission.split(":");
      return user?.permissions?.[resource]?.[perm];
    });
  };

  useEffect(() => {
    let items = [];
    if (pathname.includes("/hr")) items = hrDashboard;
    else if (pathname.includes("/invoices")) items = invoicesDashboard;
    else if (pathname.includes("/profile")) items = [] as any;
    else items = maintenanceDashboard;
    /**permissions:{
    "users": {
        "admin": true,
        "delete": true,
        "view": true,
        "edit": true
    },
    "reports": {
        "view": true,
        "edit": true,
        "admin": true,
        "delete": true
    },
    "tasks": {
        "delete": true,
        "edit": true,
        "view": true,
        "admin": true
    },
    "dashboard": {
        "admin": true,
        "edit": true,
        "delete": true,
        "view": true
    },
    "equipments": {
        "view": true,
        "edit": true,
        "admin": true,
        "delete": true
    },
    "invoices": {
        "admin": true,
        "edit": true,
        "view": true,
        "delete": true
    }
} */
    // items = items.map((item) => ({
    //   ...item,
    //   disabled: !checkPermissions(item.href),
    // }));

    setNavItems(items);
  }, [pathname, user]);

  if (loading) return null;

  return (
    <div
      className={cn(
        "flex h-screen flex-col bg-gray-900 text-white transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <Link
        href="/welcome"
        className={cn(
          "group space-x-2 flex h-16 items-center justify-center border-b border-gray-700",
          collapsed && "justify-center"
        )}
      >
        <ChevronLeft
          className={cn(
            "font-thin text-xs text-purple-900 group-hover:-translate-x-1 duration-300",
            collapsed && "hidden"
          )}
        />
        <img
          src="/logo-removebg-new.png"
          alt=""
          className={cn("h-12 w-12", collapsed && "h-8 w-8")}
        />
        {!collapsed && (
          <h1 className="text-lg font-bold truncate">ResenixPro</h1>
        )}
      </Link>
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navItems.map((item) => {
          if (item.disabled) return null;
          if (!hasPermission(item.permissions)) return null;
          return (
            <Link key={item.name} href={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start",
                  pathname === item.href
                    ? "bg-gray-700 text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                )}
                disabled={item.disabled}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {!collapsed && item.name}
              </Button>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
