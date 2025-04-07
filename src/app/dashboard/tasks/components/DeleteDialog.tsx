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
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Task } from "@/interfaces/task";
import { FIREBASE_COLLECTIONS } from "@/enums/collections";

interface DeleteDialogProps {
  task: Task;
  onDelete: () => void;
}

export function DeleteDialog({ task, onDelete }: DeleteDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      await deleteDoc(doc(db, FIREBASE_COLLECTIONS.TASKS, task.id));
      toast({
        title: "Task deleted",
        description: "The task has been successfully deleted.",
      });
      setIsOpen(false);
      onDelete(); // Refresh the task list
    } catch (error) {
      console.error("Error deleting task:", error);
      toast({
        title: "Error",
        description: "Failed to delete task. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" title='Delete Task'>
          <Trash2 className="text-red-500 text-xl" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Delete Task</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this task? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}