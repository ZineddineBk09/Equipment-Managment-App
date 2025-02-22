import { useEffect, useRef, useState } from "react";
import { Bell, Copy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot } from "firebase/firestore";
import dayjs from "dayjs";
import { toast } from "@/hooks/use-toast";
import { getTimeCategory, playNotificationSound } from "@/utils";
import Link from "next/link";

export function NotificationsPanel() {
  const [notifications, setNotifications] = useState([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const tasksQuery = query(collection(db, "tasks"));
    const equipmentQuery = query(collection(db, "equipments"));

    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      const tasksNotifications = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          const category = getTimeCategory(data.dueDate);
          if (!category) return null;
          if (data.status === "completed") return null;
          console.log(data, category);

          return {
            id: doc.id,
            title:
              category === "overdue"
                ? `🚨 Task Overdue: ${data.maintenanceType}`
                : `🔧 Task Due Soon: ${data.maintenanceType}`,
            description:
              category === "overdue"
                ? `Task was due on ${dayjs(data.dueDate).format("MMM D, YYYY")}`
                : `Due in ${category}`,
            date: data.dueDate,
            type: category,
            imageUrl:
              "https://img.freepik.com/free-vector/ecology-protection-environment-preservation-nature-conservation-eco-friendly-mechanism-idea-cogwheels-leaves-mechanical-parts-with-foliage_335657-1588.jpg?semt=ais_hybrid", // Placeholder, replace with actual,
            itemId: data.equipmentId,
            maintenanceId: doc.id,
          };
        })
        .filter(Boolean);
      setNotifications((prev: any) => [...prev, ...tasksNotifications] as any);
      playNotificationSound(audioRef);
    });

    const unsubscribeEquipment = onSnapshot(equipmentQuery, (snapshot) => {
      const equipmentNotifications = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          const remainingHours = data.operatingHours - data.cumulativeHours;
          let category = null;

          if (remainingHours <= 0) category = "overdue";
          else if (remainingHours <= 24) category = "24h";
          // else if (remainingHours <= 48) category = "48h";
          // else if (remainingHours <= 168) category = "1week";

          if (!category) return null;

          return {
            id: doc.id,
            title:
              category === "overdue"
                ? `🚨 Maintenance Required: ${data.name} - ${data.assetNumber}`
                : `🛠️ Maintenance Soon: ${data.name} - ${data.assetNumber}`,
            description:
              category === "overdue"
                ? `Exceeded operating hours by ${-remainingHours} hrs`
                : `Requires maintenance in ${remainingHours} hrs`,
            date: new Date().toISOString(),
            type: category,
            imageUrl:
              data.imageUrl ||
              "https://img.freepik.com/free-vector/ecology-protection-environment-preservation-nature-conservation-eco-friendly-mechanism-idea-cogwheels-leaves-mechanical-parts-with-foliage_335657-1588.jpg?semt=ais_hybrid",
            itemId: doc.id,
          };
        })
        .filter(Boolean);
      setNotifications((prev) => [...prev, ...equipmentNotifications] as any);
      playNotificationSound(audioRef);
    });

    return () => {
      unsubscribeTasks();
      unsubscribeEquipment();
    };
  }, []);

  useEffect(() => {
    if (notifications.length > 0) {
      playNotificationSound(audioRef);
    }
  }, [notifications]);

  return (
    <Card className="w-[380px]">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Bell className="mr-2 h-4 w-4" />
          Notifications
        </CardTitle>
        <CardDescription>
          You have {notifications.length} unread messages
        </CardDescription>
      </CardHeader>
      <CardContent className="grid max-h-[400px] overflow-y-auto px-2 gap-y-2">
        {notifications.map((notification: any) => (
          <div
            key={notification.id}
            className={cn(
              "relative h-fit grid grid-cols-[50px_1fr] items-start p-3 rounded-lg border transition-colors hover:bg-accent/40",
              notification.type === "overdue" &&
                "bg-red-500/10 hover:bg-red-500/20 border-red-500/50",
              notification.type === "24h" &&
                "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/50",
              notification.type === "48h" &&
                "bg-yellow-100/50 hover:bg-yellow-100 border-yellow-200",
              notification.type === "1week" &&
                "bg-blue-100/50 hover:bg-blue-100 border-blue-200"
            )}
          >
            <audio ref={audioRef} preload="auto">
              <source src="/sounds/notification.mp3" type="audio/mpeg" />
            </audio>

            <div className="relative">
              <img
                src={notification.imageUrl}
                // alt={notification.title}
                className="w-10 h-10 rounded-full object-cover border-2 border-background shadow-sm"
              />
              <span
                className={cn(
                  "absolute -bottom-0 -right-0 w-4 h-4 rounded-full border-2 border-background",
                  notification.type === "overdue" && "bg-red-500",
                  notification.type === "24h" && "bg-amber-500",
                  notification.type === "48h" && "bg-yellow-500",
                  notification.type === "1week" && "bg-blue-500"
                )}
              />
            </div>
            <div className="space-y-1 ml-3">
              <p className="text-sm font-medium leading-none">
                {notification.title}
              </p>
              <p className="text-sm text-muted-foreground">
                {notification.description}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-block w-2 h-2 rounded-full bg-muted-foreground/40" />
                {new Date(notification.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              <div className="!z-20 text-sm text-muted-foreground flex items-center gap-x-2">
                <button
                  title="Copy equipment ID"
                  className="border-none outline-none z-20"
                  onClick={() => {
                    navigator.clipboard.writeText(notification.itemId);
                    toast({
                      title: "Copied",
                      description:
                        "Copied equipment ID to clipboard. Paste it to search.",
                    });
                  }}
                >
                  <Copy className="text-cyan-500 h-4 w-4" />
                </button>{" "}
                {notification.itemId}
              </div>

              <Link
                href={
                  notification.maintenanceId
                    ? `/dashboard/tasks?search=${encodeURIComponent(
                        notification.maintenanceId
                      )}`
                    : `/dashboard/equipment?search=${encodeURIComponent(
                        notification.itemId
                      )}`
                }
                className="absolute inset-0 w-full h-full z-10"
              ></Link>
            </div>
          </div>
        ))}
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={() => setNotifications([])}>
          <X className="mr-2 h-4 w-4" /> Clear all notifications
        </Button>
      </CardFooter>
    </Card>
  );
}
