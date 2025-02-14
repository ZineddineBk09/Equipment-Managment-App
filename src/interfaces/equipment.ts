import { FirebaseTimeStamp } from "./firebase";

export interface Equipment {
  id: string;
  name: string;
  serialNumber: string;
  assetNumber: string;
  location: string;
  cumulativeHours: number;
  status: "active" | "maintenance" | "decommissioned";
  imageUrl: string;
  operatingHours: number;
  createdAt: string | FirebaseTimeStamp;
}