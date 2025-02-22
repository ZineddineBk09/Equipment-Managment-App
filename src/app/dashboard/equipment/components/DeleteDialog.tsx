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
import { Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  doc,
  deleteDoc,
  query,
  collection,
  where,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Equipment } from "@/interfaces/equipment";
import { FIREBASE_COLLECTIONS } from "@/enums/collections";

interface DeleteDialogProps {
  equipment: Equipment;
  onDelete: () => void;
}

export function DeleteDialog({ equipment, onDelete }: DeleteDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      await deleteDoc(doc(db, FIREBASE_COLLECTIONS.EQUIPMENTS, equipment.id));
      // Delete the associated equipment usage records
      const equipmentUsageQuery = query(
        collection(db, FIREBASE_COLLECTIONS.EQUIPMENT_USAGE),
        where("equipmentId", "==", equipment.id)
      );
      const equipmentUsageSnap = await getDocs(equipmentUsageQuery);
      equipmentUsageSnap.forEach(async (doc) => {
        await deleteDoc(doc.ref);
      });

      // Delete the associated maintenance tasks
      const taskQuery = query(
        collection(db, FIREBASE_COLLECTIONS.TASKS),
        where("equipmentId", "==", equipment.id)
      );
      const taskSnap = await getDocs(taskQuery);
      taskSnap.forEach(async (doc) => {
        await deleteDoc(doc.ref);
      });

      toast({
        title: "Equipment deleted",
        description: "The equipment has been successfully deleted.",
      });
      setIsOpen(false);
      onDelete(); // Refresh the equipment list
    } catch (error) {
      console.error("Error deleting equipment:", error);
      toast({
        title: "Error",
        description: "Failed to delete equipment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" title="Delete Equipment">
          <Trash2 className="text-red-500 text-xl" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete Equipment</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this equipment? This action cannot
            be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
