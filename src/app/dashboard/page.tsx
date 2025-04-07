"use client";

import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FIREBASE_COLLECTIONS } from "@/enums/collections";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Overview } from "@/components/Overview";
import { RecentMaintenanceTasks } from "@/components/RecentSales";
import { AlertCircle, CheckCircle, ClipboardList, Wrench } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import withAuth from "@/lib/hocs/withAuth";
import { FIREBASE_RESOURCES } from "@/enums/resources";

function DashboardPage() {
  const [totalEquipment, setTotalEquipment] = useState(0);
  const [activeTasks, setActiveTasks] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [overdueTasks, setOverdueTasks] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch Equipment Count
        const equipmentSnapshot = await getDocs(
          collection(db, FIREBASE_COLLECTIONS.EQUIPMENTS)
        );
        setTotalEquipment(equipmentSnapshot.size);

        // Fetch Tasks
        const tasksSnapshot = await getDocs(
          collection(db, FIREBASE_COLLECTIONS.TASKS)
        );
        const tasksData = tasksSnapshot.docs.map((doc) => doc.data());

        // Count active, completed, and overdue tasks
        const now = new Date();
        const overdue = tasksData.filter(
          (task) => new Date(task.dueDate) < now && task.status !== "completed"
        ).length;
        const completed = tasksData.filter(
          (task) => task.status === "completed"
        ).length;
        const active = tasksData.filter(
          (task) => task.status !== "completed"
        ).length;

        setActiveTasks(active);
        setCompletedTasks(completed);
        setOverdueTasks(overdue);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <div className="text-center py-10">Loading...</div>;
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold tracking-tight">
          Welcome to ResenixPro,{" "}
          <span className="capitalize text-blue-900">
            {user?.email.split("@")[0]}
          </span>
        </h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Equipment
            </CardTitle>
            <Wrench className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEquipment}</div>
            <p className="text-xs text-muted-foreground">
              Tracking all registered equipment
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Maintenance Tasks
            </CardTitle>
            <ClipboardList className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTasks}</div>
            <p className="text-xs text-muted-foreground">
              Ongoing maintenance tasks
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completed Maintenance
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedTasks}</div>
            <p className="text-xs text-muted-foreground">
              Tasks completed in the last 30 days
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overdueTasks}</div>
            <p className="text-xs text-muted-foreground">
              Require immediate attention
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Equipment Usage & Maintenance Trends</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <Overview />
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Maintenance Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentMaintenanceTasks />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default withAuth(DashboardPage, {
  requiredRole: "viewer",
  requiredPermissions: [FIREBASE_RESOURCES.DASHBOARD + ":view"],
});
