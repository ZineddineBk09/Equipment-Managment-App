import { FirebaseTimeStamp } from "./firebase";

export interface Task {
  id: string;
  dueDate: string;
  equipmentId: string;
  maintenanceType: string;
  notes: string;
  status: string;
  createdAt: string | FirebaseTimeStamp;
}
