import { FIREBASE_RESOURCES } from "@/enums/resources";

export interface FirebaseTimeStamp {
  seconds: number;
  nanoseconds: number;
}

export interface User {
  id: string;
  email: string;
  role: string;
  status: string;
  permissions: {
    [resource: string]: {
      view: boolean;
      edit: boolean;
      admin: boolean;
      delete: boolean;
    };
  };
}

export interface PRFormData {
  prNumber: string;
  date: FirebaseTimeStamp | string;
  requester: string;
  location: string;
  department: string;
  items: {
    material: string;
    description: string;
    qty: number;
    unit: string;
    photo: string;
  }[];
  status: "pending" | "approved" | "rejected";
  justification?: string;
}

export type Status = "pending" | "approved" | "rejected";
