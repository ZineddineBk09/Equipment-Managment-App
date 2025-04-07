"use client";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
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
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Import Firestore
import { FIREBASE_COLLECTIONS } from "@/enums/collections";
import withAuth from "@/lib/hocs/withAuth";
import { FIREBASE_RESOURCES, USER_ROLES } from "@/enums/resources";

// Updated Zod schema to include image link
const formSchema = z.object({
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
  assetType: z.enum(["hr", "km", "dav"]),
  operatingHours: z.string().refine((value) => parseFloat(value) >= 0, {
    message: "Operating hours must be a positive number.",
  }),
  imageUrl: z.string().url({
    message: "Please enter a valid image URL.",
  }),
});

function AddEquipmentPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      serialNumber: "",
      assetNumber: "",
      assetType: "hr",
      location: "NBP",
      status: "active",
      operatingHours: "0",
      imageUrl: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);

    try {
      // Save equipment data to Firestore
      const equipmentData = {
        name: values.name,
        serialNumber: values.serialNumber,
        assetNumber: values.assetNumber,
        assetType: values.assetType,
        location: values.location,
        status: values.status,
        operatingHours: parseFloat(values.operatingHours),
        imageUrl: values.imageUrl, // Save the image URL directly
        cumulativeHours: 0,
        createdAt: new Date().toISOString(),
      };

      const equipmentRef = await addDoc(
        collection(db, FIREBASE_COLLECTIONS.EQUIPMENTS),
        equipmentData
      );

      // To keep track of device usage (cumulative hours), we can add a new collection to store usage data
      await addDoc(collection(db, FIREBASE_COLLECTIONS.EQUIPMENT_USAGE), {
        equipmentId: equipmentRef.id,
        // the usage should contain an array of objects with a timestamp and hours used
        history: [
          {
            status: values.status,
            timestamp: new Date().toISOString(),
          },
        ],
        usage: [],
        maintenances: [],
      });

      toast({
        title: "Equipment added",
        description: "New equipment has been successfully added.",
      });
      router.push("/dashboard/equipment");
    } catch (error) {
      console.error("Error adding equipment:", error);
      toast({
        title: "Error",
        description: "Failed to add equipment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-5">Add New Equipment</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Equipment Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter equipment name" {...field} />
                </FormControl>
                {/* <FormDescription>
                  The name or model of the equipment.
                </FormDescription> */}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="serialNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Serial Number</FormLabel>
                <FormControl>
                  <Input placeholder="Enter serial number" {...field} />
                </FormControl>
                {/* <FormDescription>
                  The unique serial number of the equipment.
                </FormDescription>
                <FormMessage /> */}
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="assetNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Asset Number</FormLabel>
                <FormControl>
                  <Input placeholder="Enter asset number" {...field} />
                </FormControl>
                {/* <FormDescription>
                  The asset number of the equipment.
                </FormDescription> */}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input placeholder="Enter location" {...field} />
                </FormControl>
                {/* <FormDescription>
                  Where the equipment is located.
                </FormDescription> */}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select equipment status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="decommissioned">
                      Decommissioned
                    </SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
                {/* <FormDescription>
                  The current status of the equipment.
                </FormDescription> */}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="assetType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Asset Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select equipment type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="hr">Hours</SelectItem>
                    <SelectItem value="km">Km</SelectItem>
                    <SelectItem value="dav">DAV</SelectItem>
                  </SelectContent>
                </Select>
                {/* <FormDescription>
                  The asset measurment type.
                </FormDescription> */}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="operatingHours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Maintenance Schedule</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter operating hours"
                    type="number"
                    {...field}
                  />
                </FormControl>
                {/* <FormDescription>
                  The total operating hours of the equipment (in hours) until
                  next maintenance.
                </FormDescription> */}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="imageUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Equipment Image URL</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter image URL (e.g., https://example.com/image.jpg)"
                    {...field}
                  />
                </FormControl>
                {/* <FormDescription>
                  Provide a direct link to the equipment image.
                </FormDescription> */}
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Adding Equipment..." : "Add Equipment"}
          </Button>
        </form>
      </Form>
    </div>
  );
}

export default withAuth(AddEquipmentPage, {
  requiredRole: USER_ROLES.VIEWER,
  requiredPermissions: [FIREBASE_RESOURCES.EQUIPMENTS + ":edit"],
});
