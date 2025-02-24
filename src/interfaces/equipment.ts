import { FirebaseTimeStamp } from "./firebase";

export interface Equipment {
  id: string;
  name: string;
  serialNumber: string;
  assetNumber: string;
  assetType: "hr" | "km" | "dav";
  location: string;
  cumulativeHours: number;
  status: "active" | "maintenance" | "decommissioned";
  imageUrl: string;
  operatingHours: number;
  remainingHours?: number;
  createdAt: string | FirebaseTimeStamp;
}

export interface EquipmentUsage {
  date: string;
  hoursWorked: number;
}

export interface EquipmentMaintenance {
  maintenanceDate: string;
  maintenanceType: string;
  previousHours: number;
}
