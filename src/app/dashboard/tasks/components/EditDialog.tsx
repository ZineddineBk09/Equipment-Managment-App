"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { PencilRuler, Plus } from "lucide-react";
import { FIREBASE_COLLECTIONS } from "@/enums/collections";
import { Textarea } from "@/components/ui/textarea";
import { Task } from "@/interfaces/task";
import { Calendar } from "@/components/ui/calendar";

// ✅ Zod schema to match Add Maintenance Task Page
const editSchema = z.object({
  dueDate: z.date({
    required_error: "Please select a due date.",
  }),
  resources: z.array(
    z.object({
      resource: z.string().min(2, {
        message: "Resource must be at least 2 characters.",
      }),
      quantity: z
        .string()
        .refine((value) => !isNaN(Number(value)), "Quantity must be a number."),
      unit: z.string().min(2, {
        message: "Unit must be at least 2 characters.",
      }),
    })
  ),
  notes: z.string(),
});

interface EditDialogProps {
  task: Task;
  onUpdate: () => void;
}

export function EditDialog({ task, onUpdate }: EditDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof editSchema>>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      dueDate: new Date(task.dueDate),
      resources: task.resources || [],
      notes: task.notes || "",
    },
  });

  const handleAddResource = (
    resource: string,
    quantity: string,
    unit: string
  ) => {
    form.setValue("resources", [
      ...form.getValues("resources"),
      { resource, quantity, unit },
    ]);
  };

  const handleUpdateResourceField = (
    index: number,
    field: string,
    value: string
  ) => {
    const resources = form.getValues("resources");
    //@ts-ignore
    resources[index][field] = value;
    form.setValue("resources", resources);
  };

  async function onSubmit(values: z.infer<typeof editSchema>) {
    setIsSubmitting(true);

    try {
      // Update Firestore Document
      await updateDoc(doc(db, FIREBASE_COLLECTIONS.TASKS, task.id), {
        dueDate: new Date(values.dueDate).toISOString(),
        resources: values.resources,
        notes: values.notes,
        status: "scheduled",
      });

      toast({
        title: "Maintenance Task updated",
        description: "Maintenance Task details have been successfully updated.",
      });
      setIsOpen(false);
      onUpdate(); // Refresh Maintenance Task List
    } catch (error) {
      console.error("Error updating task:", error);
      toast({
        title: "Error",
        description: "Failed to update task. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" title="Edit Maintenance Task">
          <PencilRuler className="text-amber-500 text-xl" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Maintenance Task</DialogTitle>
          <DialogDescription>Update the details of the task.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Due Date</FormLabel>
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date: Date) =>
                      date < new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                  <FormDescription>
                    Select the due date for the maintenance task.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="w-full flex flex-col gap-y-2 max-h-[200px] overflow-y-auto">
              {form.watch("resources").map((resource, index) => (
                <div
                  key={index}
                  className="w-full flex justify-between gap-x-2"
                >
                  <FormItem className="w-full">
                    <FormLabel>Resources</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter resources"
                        value={resource.resource}
                        onChange={(e) =>
                          handleUpdateResourceField(
                            index,
                            "resource",
                            e.target.value
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>

                  <FormItem className="w-full">
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter quantity"
                        value={resource.quantity}
                        onChange={(e) =>
                          handleUpdateResourceField(
                            index,
                            "quantity",
                            e.target.value
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>

                  <FormItem className="w-full">
                    <FormLabel>Unit</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter unit"
                        value={resource.unit}
                        onChange={(e) =>
                          handleUpdateResourceField(
                            index,
                            "unit",
                            e.target.value
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </div>
              ))}
              <Button
                className="max-w-48"
                variant={"outline"}
                onClick={() => handleAddResource("", "", "")}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Resource
              </Button>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea rows={5} placeholder="Enter notes" {...field} />
                  </FormControl>
                  <FormDescription>
                    Add any notes or instructions for the technicians.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
