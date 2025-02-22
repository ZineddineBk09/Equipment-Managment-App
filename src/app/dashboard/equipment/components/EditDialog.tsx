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
import { PencilRuler } from "lucide-react";
import { Equipment } from "@/interfaces/equipment";
import { FIREBASE_COLLECTIONS } from "@/enums/collections";

// ✅ Zod schema to match Add Equipment Page
const editSchema = z.object({
  name: z.string().min(2, {
    message: "Equipment name must be at least 2 characters.",
  }),
  serialNumber: z.string().min(2, {
    message: "Serial number must be at least 2 characters.",
  }),
  assetNumber: z.string().min(2, {
    message: "Asset number must be at least 2 characters.",
  }),
  location: z.string().min(2, {
    message: "Location must be at least 2 characters.",
  }),
  status: z.enum(["active", "decommissioned", "maintenance"]),
  operatingHours: z.string().refine((value) => parseFloat(value) >= 0, {
    message: "Operating hours must be a positive number.",
  }),
  imageUrl: z.string().url({
    message: "Please enter a valid image URL.",
  }),
});

interface EditDialogProps {
  equipment: Equipment;
  onUpdate: () => void;
}

export function EditDialog({ equipment, onUpdate }: EditDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof editSchema>>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: equipment.name,
      serialNumber: equipment.serialNumber,
      assetNumber: equipment.assetNumber,
      location: equipment.location,
      status: equipment.status,
      operatingHours: equipment.operatingHours.toString(),
      imageUrl: equipment.imageUrl,
    },
  });

  async function onSubmit(values: z.infer<typeof editSchema>) {
    setIsSubmitting(true);

    try {
      // ✅ Step 1: Update Firestore Document
      await updateDoc(doc(db, FIREBASE_COLLECTIONS.EQUIPMENTS, equipment.id), {
        ...values,
        operatingHours: parseFloat(values.operatingHours),
      });

      // ✅ Step 2: Track Status Changes in Equipment Usage
      const statusUpdated: boolean = equipment.status !== values.status;
      if (statusUpdated) {
        await updateUsageHistory(values.status);
      }

      toast({
        title: "Equipment updated",
        description: "Equipment details have been successfully updated.",
      });
      setIsOpen(false);
      onUpdate(); // Refresh Equipment List
    } catch (error) {
      console.error("Error updating equipment:", error);
      toast({
        title: "Error",
        description: "Failed to update equipment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // ✅ Function to Track Equipment Status in Usage History
  const updateUsageHistory = async (newStatus: string) => {
    try {
      const equipmentUsageQuery = query(
        collection(db, FIREBASE_COLLECTIONS.EQUIPMENT_USAGE),
        where("equipmentId", "==", equipment.id)
      );

      const querySnapshot = await getDocs(equipmentUsageQuery);

      if (querySnapshot.empty) {
        const newUsageDocRef = doc(collection(db, FIREBASE_COLLECTIONS.EQUIPMENT_USAGE));
        await updateDoc(newUsageDocRef, {
          equipmentId: equipment.id,
          history: arrayUnion({
            status: newStatus,
            timestamp: new Date().toISOString(),
          }),
        });
      } else {
        const usageDocRef = querySnapshot.docs[0].ref;
        await updateDoc(usageDocRef, {
          history: arrayUnion({
            status: newStatus,
            timestamp: new Date().toISOString(),
          }),
        });
      }
    } catch (error) {
      console.error("Error updating usage history:", error);
      throw error; // Propagate the error
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" title='Edit Equipment'>
          <PencilRuler className="text-amber-500 text-xl" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Equipment</DialogTitle>
          <DialogDescription>
            Update the details of the equipment.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl><Input placeholder="Enter equipment name" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="serialNumber" render={({ field }) => (
              <FormItem>
                <FormLabel>Serial Number</FormLabel>
                <FormControl><Input placeholder="Enter serial number" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="assetNumber" render={({ field }) => (
              <FormItem>
                <FormLabel>Asset Number</FormLabel>
                <FormControl><Input placeholder="Enter asset number" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="location" render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl><Input placeholder="Enter location" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="decommissioned">Decommissioned</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="operatingHours" render={({ field }) => (
              <FormItem>
                <FormLabel>Maintenance Schedule</FormLabel>
                <FormControl><Input type="number" placeholder="Enter operating hours" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="imageUrl" render={({ field }) => (
              <FormItem>
                <FormLabel>Equipment Image URL</FormLabel>
                <FormControl><Input placeholder="Enter image URL" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
