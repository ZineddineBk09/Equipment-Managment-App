"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  orderBy,
  limit,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FIREBASE_COLLECTIONS } from "@/enums/collections";
import dayjs from "dayjs";
import { Task } from "@/interfaces/task";

interface Equipment {
  id: string;
  name: string;
  assetNumber: string;
  imageUrl: string;
}

export function RecentMaintenanceTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [equipmentData, setEquipmentData] = useState<Record<string, Equipment>>(
    {}
  );
  const [loading, setLoading] = useState(true);

  // Fetch recent completed tasks
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const tasksQuery = query(
          collection(db, FIREBASE_COLLECTIONS.TASKS),
          orderBy("createdAt", "desc"),
          limit(5)
        );

        const querySnapshot = await getDocs(tasksQuery);
        const fetchedTasks = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Task[];

        setTasks(fetchedTasks);

        // Fetch corresponding equipment details
        const equipmentIds = [
          ...new Set(fetchedTasks.map((task) => task.equipmentId)),
        ];
        const equipmentPromises = equipmentIds.map(async (id) => {
          const equipmentRef = doc(db, FIREBASE_COLLECTIONS.EQUIPMENTS, id);
          const equipmentSnap = await getDoc(equipmentRef);
          return { id, ...equipmentSnap.data() } as Equipment;
        });

        const equipmentList = await Promise.all(equipmentPromises);
        const equipmentMap: Record<string, Equipment> = Object.fromEntries(
          equipmentList.map((eq) => [eq.id, eq])
        );

        setEquipmentData(equipmentMap);
      } catch (error) {
        console.error("Error fetching recent maintenance tasks:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <div className="space-y-8">
      {tasks.map((task: Task) => {
        const equipment = equipmentData[task.equipmentId];

        return (
          <div key={task.id} className="flex items-center">
            {/* Equipment Image */}
            <Avatar className="h-9 w-9">
              <AvatarImage
                src={equipment?.imageUrl || "/placeholder-image.jpg"}
                alt={equipment?.name || "Equipment"}
              />
              <AvatarFallback>EQ</AvatarFallback>
            </Avatar>

            {/* Task & Equipment Details */}
            <div className="ml-4 space-y-1">
              <p className="text-sm font-medium leading-none">
                Type: {task.maintenanceType}
              </p>
              <p className="text-sm text-muted-foreground">
                {equipment?.name || "Unknown Equipment"} -{" "}
                {equipment?.assetNumber || "N/A"}
              </p>
            </div>

            {/* Completion Date */}
            <div className="ml-auto font-medium text-gray-500">
              {dayjs(task.createdAt as string).format("MMM D, YYYY h:mm A")}
            </div>
          </div>
        );
      })}
    </div>
  );
}
