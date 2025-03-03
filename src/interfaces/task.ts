import { FirebaseTimeStamp } from "./firebase";

export interface Task {
  id: string;
  dueDate: string;
  equipmentId: string;
  maintenanceType: string;
  resources: {
    resource: string;
    unit: string;
    quantity: string;
  }[];
  notes: string;
  status: string;
  createdAt: string | FirebaseTimeStamp;
}
