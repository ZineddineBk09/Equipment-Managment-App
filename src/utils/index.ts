import { FirebaseTimeStamp } from "@/interfaces/firebase";

export const calculateMaintenanceDate = (
  createdAt: FirebaseTimeStamp | string,
  operatingHours: number
): { date: string; daysLeft: number } => {
  const createdDate = createdAt instanceof Object ? new Date(createdAt.seconds * 1000) : new Date(createdAt);
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
