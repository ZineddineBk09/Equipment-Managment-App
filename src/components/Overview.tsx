"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { FIREBASE_COLLECTIONS } from "@/enums/collections";

export function Overview() {
  const [chartData, setChartData] = useState<
    { name: string; usage: number; maintenance: number }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch usage history
        const usageSnapshot = await getDocs(
          collection(db, FIREBASE_COLLECTIONS.EQUIPMENT_USAGE)
        );
        const usageData = usageSnapshot.docs.flatMap(
          (doc) => doc.data()?.usage || []
        );

        // Fetch maintenance tasks
        // const tasksQuery = query(collection(db, FIREBASE_COLLECTIONS.TASKS), where("status", "==", "completed"));
        const tasksQuery = query(collection(db, FIREBASE_COLLECTIONS.TASKS));
        const tasksSnapshot = await getDocs(tasksQuery);
        const tasksData = tasksSnapshot.docs.map((doc) => doc.data());

        // Helper function to group data by month
        const groupByMonth = () => {
          const months = Array.from({ length: 12 }, (_, i) => ({
            name: new Date(2025, i, 1).toLocaleString("default", {
              month: "short",
            }), // Jan, Feb...
            usage: 0,
            maintenance: 0,
          }));

          // Aggregate usage hours by month
          usageData.forEach(({ date, hoursWorked }) => {
            const monthIndex = new Date(date).getMonth();
            months[monthIndex].usage += hoursWorked;
          });

          // Count completed maintenance tasks per month
          tasksData.forEach(({ createdAt }) => {
            const monthIndex = new Date(createdAt).getMonth();
            months[monthIndex].maintenance += 1;
          });

          return months;
        };

        setChartData(groupByMonth());
      } catch (error) {
        console.error("Error fetching chart data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={chartData}>
        <XAxis
          dataKey="name"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}h`}
        />
        <Tooltip />
        <Bar dataKey="usage" fill="#adfa1d" radius={[4, 4, 0, 0]} />
        <Bar dataKey="maintenance" fill="#f97316" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
