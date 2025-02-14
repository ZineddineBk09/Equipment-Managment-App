interface Maintenance {
  id: string;
  equipmentId: string; // Reference to Equipment
  type: "preventive" | "corrective";
  scheduledDate: Date;
  completedDate?: Date;
  notes: string;
  assignedTo: string;
}
