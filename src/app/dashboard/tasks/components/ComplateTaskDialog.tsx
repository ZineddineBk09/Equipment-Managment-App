"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  arrayUnion,
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Task } from "@/interfaces/task";
import { FIREBASE_COLLECTIONS } from "@/enums/collections";
import { Equipment } from "@/interfaces/equipment";

interface CompleteTaskDialogProps {
  task: Task;
  equipment: Equipment;
  onUpdate: () => void;
}

export function CompleteTaskDialog({
  task,
  equipment,
  onUpdate,
}: CompleteTaskDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const handleComplete = async () => {
    setIsCompleting(true);

    try {
      // Update task status to "completed"
      await updateDoc(doc(db, FIREBASE_COLLECTIONS.TASKS, task.id), {
        status: "completed",
        completedAt: new Date().toISOString(), // Save completion timestamp
      });

      // Update the equipment usage hours maintenance array (add maintenance complete date, previous working hours of equipment)
      const equipmentUsageQuery = query(
        collection(db, FIREBASE_COLLECTIONS.EQUIPMENT_USAGE),
        where("equipmentId", "==", task.equipmentId)
      );

      const querySnapshot = await getDocs(equipmentUsageQuery);

      if (querySnapshot.empty) {
        const newUsageDocRef = doc(
          collection(db, FIREBASE_COLLECTIONS.EQUIPMENT_USAGE)
        );
        await updateDoc(newUsageDocRef, {
          equipmentId: task.equipmentId,
          maintenances: arrayUnion({
            maintenanceType: task.maintenanceType,
            maintenanceDate: new Date().toISOString(),
            previousHours: equipment.operatingHours,
          }),
        });
      } else {
        querySnapshot.forEach(async (doc) => {
          await updateDoc(doc.ref, {
            maintenances: arrayUnion({
              maintenanceType: task.maintenanceType,
              maintenanceDate: new Date().toISOString(),
              previousHours: equipment.operatingHours,
            }),
          });
        });
      }

      toast({
        title: "Task Completed",
        description: "The task has been successfully marked as completed.",
      });

      setIsOpen(false);
      onUpdate(); // Refresh the task list
    } catch (error) {
      console.error("Error completing task:", error);
      toast({
        title: "Error",
        description: "Failed to complete task. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" title="Complete Task">
          <CheckCircle className="text-green-500 text-xl" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete Task</DialogTitle>
          <DialogDescription>
            Are you sure you want to mark this task as completed?
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleComplete}
            disabled={isCompleting}
            variant="destructive"
            className="!bg-green-500 !hover:bg-green-600"
          >
            {isCompleting ? "Completing..." : "Complete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
