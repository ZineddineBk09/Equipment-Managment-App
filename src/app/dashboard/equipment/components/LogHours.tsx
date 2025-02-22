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
import { Calendar } from "@/components/ui/calendar";
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
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Clock } from "lucide-react";
import { Equipment } from "@/interfaces/equipment";
import { FIREBASE_COLLECTIONS } from "@/enums/collections";
import dayjs from "dayjs";

// ✅ Define Validation Schema
const logHoursSchema = z.object({
  date: z.date().refine((date) => date < new Date(), {
    message: "You can only select past dates.",
  }),
  hoursWorked: z
    .string()
    .refine((value) => parseFloat(value) > 0, {
      message: "Hours worked must be greater than 0.",
    })
    .refine((value) => parseFloat(value) <= 24, {
      message: "Hours worked must be less than 24.",
    }),
});

interface LogHoursDialogProps {
  equipment: Equipment;
  onUpdate: () => void;
}

export function LogHoursDialog({ equipment, onUpdate }: LogHoursDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof logHoursSchema>>({
    resolver: zodResolver(logHoursSchema),
    defaultValues: {
      date: new Date(),
      hoursWorked: "",
    },
  });

  async function onSubmit(values: z.infer<typeof logHoursSchema>) {
    setIsSubmitting(true);
    try {
      // Convert hoursWorked to number
      const hours = parseFloat(values.hoursWorked);
      const selectedDate = dayjs(values.date).format("YYYY-MM-DD");

      // ✅ Check if Equipment Usage Exists
      const equipmentUsageQuery = query(
        collection(db, FIREBASE_COLLECTIONS.EQUIPMENT_USAGE),
        where("equipmentId", "==", equipment.id)
      );

      const querySnapshot = await getDocs(equipmentUsageQuery);

      if (querySnapshot.empty) {
        // ✅ Create a New Usage Document if it Doesn't Exist
        const newUsageRef = doc(
          collection(db, FIREBASE_COLLECTIONS.EQUIPMENT_USAGE)
        );
        await setDoc(newUsageRef, {
          equipmentId: equipment.id,
          usage: [
            {
              date: selectedDate,
              hoursWorked: hours,
            },
          ],
        });
      } else {
        // check if same date exists
        const usageDocRef = querySnapshot.docs[0].ref;
        const usageData = querySnapshot.docs[0].data();
        const usageArray = usageData.usage || [];
        const dateExists = usageArray.some(
          (item: any) => item.date === selectedDate
        );
        if (dateExists) {
          // update existing date
          const updatedUsageArray = usageArray.map((item: any) => {
            if (item.date === selectedDate) {
              return {
                ...item,
                hoursWorked: hours,
              };
            }
            return item;
          });
          await updateDoc(usageDocRef, {
            usage: updatedUsageArray,
          });
        } else {
          // add new date
          await updateDoc(usageDocRef, {
            usage: arrayUnion({
              date: selectedDate,
              hoursWorked: hours,
            }),
          });
        }
      }

      toast({
        title: "Hours logged",
        description: `Logged ${hours} hours for ${equipment.name} on ${selectedDate}.`,
      });

      setIsOpen(false);
      onUpdate(); // Refresh Data
    } catch (error) {
      console.error("Error logging hours:", error);
      toast({
        title: "Error",
        description: "Failed to log working hours. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" title="Set Working Hours">
          <Clock className="text-blue-500 text-xl" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Log Working Hours</DialogTitle>
          <DialogDescription>
            Enter the hours worked for{" "}
            <strong>
              {equipment.name} - {equipment.assetNumber}
            </strong>
            .
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 flex flex-col items-center"
          >
            {/* ✅ Select Date (Past Only) */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col w-full">
                  <FormLabel>Date</FormLabel>
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date >= new Date()}
                    initialFocus
                    className="w-full mx-auto"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ✅ Input Hours Worked */}
            <FormField
              control={form.control}
              name="hoursWorked"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Hours Worked</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter hours worked"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Logging..." : "Log Hours"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
