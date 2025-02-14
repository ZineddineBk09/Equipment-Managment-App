"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertCircle,
  CheckCircle,
  ClipboardList,
  Cog,
  DollarSign,
  FileText,
  PencilRuler,
  Plus,
  Users,
  Wrench,
} from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";
import Link from "next/link";

const pageSections = [
  {
    title: "Maintenance",
    subTitle: "Recent Maintenance Tasks",
    icon: <Cog />,
    href: "/dashboard",
  },
  {
    title: "Invoices",
    subTitle: "Invoices and Payments",
    icon: <FileText />,
  },
  {
    title: "Equipment",
    subTitle: "Manage All Equipment",
    icon: <PencilRuler />,
  },
  {
    title: "Sales",
    subTitle: "Track Sales and Revenue",
    icon: <DollarSign />,
  },
  {
    title: "Customers",
    subTitle: "Manage Customer Relationships",
    icon: <Users />,
  },
  {
    title: "Reports",
    subTitle: "Generate Custom Reports",
    icon: <ClipboardList />,
  },
  {
    title: "Settings",
    subTitle: "Customize Your Dashboard",
    icon: <Wrench />,
  },
  {
    title: "Alerts",
    subTitle: "Recent Alerts and Notifications",
    icon: <AlertCircle />,
  },
  {
    title: "Feedback",
    subTitle: "Send Us Your Feedback",
    icon: <CheckCircle />,
  },
];

export default function WelcomePage() {
  const { user } = useUser();

  return (
    <div className="flex-1 p-8 pt-6 h-[calc(100vh-65px)]">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold tracking-tight">
          Welcome to ResenixPro,{" "}
          <span className="capitalize text-blue-900">
            {user?.email.split("@")[0]}
          </span>
        </h2>
      </div>

      {/* Section Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {pageSections.map((section, index) => (
          <Card
            key={section.title}
            className="relative group hover:shadow-lg transition-all duration-200 cursor-pointer"
          >
            <CardHeader>
              <div className="flex items-center space-x-4">
                <div className="p-2 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  {section.icon}
                </div>
                <div>
                  <CardTitle className="text-xl group-hover:text-primary transition-colors">
                    {section.title}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {section.subTitle}
                  </p>
                </div>
              </div>
            </CardHeader>
            {section?.href && <Link href={section?.href} className="absolute inset-0"></Link>}
          </Card>
        ))}

        {/* Add New Section Card */}
        <Card
          className={cn(
            "col-span-3 border-2 group hover:shadow-lg transition-all duration-200 cursor-pointer border-dashed",
            "flex flex-col items-center justify-center min-h-[200px]"
          )}
        >
          <CardContent className="flex flex-col items-center justify-center p-6">
            <div className="p-3 rounded-full bg-primary/10 group-hover:bg-primary transition-colors mb-4">
              <Plus className="w-6 h-6 text-primary group-hover:text-primary-foreground transition-colors" />
            </div>
            <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
              Add New Section
            </h3>
            <p className="text-sm text-muted-foreground text-center mt-2">
              Create a custom section for your dashboard
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
