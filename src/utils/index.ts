import {
  Equipment,
  EquipmentMaintenance,
  EquipmentUsage,
} from "@/interfaces/equipment";
import { FirebaseTimeStamp } from "@/interfaces/firebase";
import { collection, getDocs, getDoc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { doc } from "firebase/firestore";
import { FIREBASE_COLLECTIONS } from "@/enums/collections";
import { toast } from "@/hooks/use-toast";

export const calculateMaintenanceDate = (
  createdAt: FirebaseTimeStamp | string,
  operatingHours: number
): { date: string; daysLeft: number } => {
  const createdDate =
    createdAt instanceof Object
      ? new Date(createdAt.seconds * 1000)
      : new Date(createdAt);
  const maintenanceIntervalDays = operatingHours / 24; // Convert hours to days
  const maintenanceDate = new Date(createdDate);
  maintenanceDate.setDate(createdDate.getDate() + maintenanceIntervalDays);
  const daysLeft = Math.floor(
    (maintenanceDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  return {
    date: new Date().toISOString()?.split("T")[0] || "",
    daysLeft: daysLeft,
  };
};

export const formatHours = (hours: number, unit?: string): string => {
  if (unit == "hr" && hours >= 24) {
    return `${(hours / 24).toFixed(0)} days`;
  }
  return `${hours.toFixed(2)} ${unit || "hr"}`;
};

export const calculateRemainingHours = async (
  equipment: Equipment
): Promise<{ hoursLeft: number; percentageLeft: number }> => {
  const equipmentUsageQuery = query(
    collection(db, FIREBASE_COLLECTIONS.EQUIPMENT_USAGE),
    where("equipmentId", "==", equipment.id)
  );
  const equipmentUsageSnap = await getDocs(equipmentUsageQuery);
  const usage = equipmentUsageSnap.docs.map((doc) => doc.data())[0]
    .usage as EquipmentUsage[];
  const maintenances = equipmentUsageSnap.docs.map((doc) => doc.data())[0]
    .maintenances as EquipmentMaintenance[];

  if (!usage || usage.length === 0) {
    return {
      hoursLeft: equipment.operatingHours,
      percentageLeft: 100,
    };
  }

  // Calculate total hours worked from usage array
  const totalHoursWorked = usage.reduce(
    (total, record) => total + (record.hoursWorked || 0),
    0
  );

  // Calculate remaining hours
  const hoursLeft = Math.max(0, equipment.operatingHours - totalHoursWorked);
  const previousMaintenancesHours = maintenances
    .filter((maintenance) => maintenance.maintenanceType === "Maintenance")
    .reduce((total, record) => total + (record.previousHours || 0), 0);

  // Calculate percentage of hours remaining
  const percentageLeft = Math.round(
    (hoursLeft / equipment.operatingHours) * 100
  );

  return {
    hoursLeft: hoursLeft + previousMaintenancesHours,
    percentageLeft,
  };
};

export const playNotificationSound = async (
  audioRef: React.MutableRefObject<HTMLAudioElement | null>
) => {
  try {
    if (audioRef.current) {
      // Reset the audio to ensure it plays every time
      audioRef.current.currentTime = 0;
      // Use the play() method within a user interaction or after a Promise
      await audioRef.current.play();
      toast({
        title: "New Notification",
      });
    }
  } catch (error) {
    console.error("Error playing notification sound:", error);
  }
};

export const getTimeCategory = (dateStr: string) => {
  const now = new Date();
  const targetDate = new Date(dateStr);
  const diffMs = targetDate.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "overdue";
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "24h";
  if (diffDays === 2) return "48h";
  if (diffDays <= 7) return "1week";
  return null;
};

export const trimFirebaseError = (error: string) => {
  // handle different firebase errors: auth/invalid-credential, auth/user-not-found, etc.
  if (error.includes("auth/internal-error")) {
    return "Internal error occurred. Please try again later.";
  } else if (error.includes("auth/invalid-credential")) {
    return "Invalid credentials. Please try again.";
  } else if (error.includes("auth/user-not-found")) {
    return "User not found. Please try again.";
  }
  return error.replace("Firebase: ", "");
};

export const formatFirebaseTime = (time: FirebaseTimeStamp) => {
  return new Date(time.seconds * 1000 + time.nanoseconds / 1000000);
};
