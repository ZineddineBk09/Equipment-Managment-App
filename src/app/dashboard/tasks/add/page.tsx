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
import { Calendar } from "@/components/ui/calendar";
import { toast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Import Firestore
import { useEffect, useState } from "react";
import { FIREBASE_COLLECTIONS } from "@/enums/collections";
import { Equipment } from "@/interfaces/equipment";
import { Plus } from "lucide-react";

const formSchema = z.object({
  equipmentId: z.string().min(1, {
    message: "Please select an equipment.",
  }),
  maintenanceType: z.string().min(2, {
    message: "Maintenance type must be at least 2 characters.",
  }),
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

export default function AddMaintenanceTaskPage() {
  const router = useRouter();
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      equipmentId: "",
      maintenanceType: "",
      dueDate: new Date(),
      resources: [],
      notes: "",
    },
  });

  // Fetch equipment list from Firestore
  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        const querySnapshot = await getDocs(
          collection(db, FIREBASE_COLLECTIONS.EQUIPMENTS)
        );
        const equipmentData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
        }));
        setEquipmentList(
          querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as unknown as Equipment[]
        );
      } catch (error) {
        console.error("Error fetching equipment:", error);
        toast({
          title: "Error",
          description: "Failed to fetch equipment list. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchEquipment();
  }, []);

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

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      // Save maintenance task to Firestore
      await addDoc(collection(db, FIREBASE_COLLECTIONS.TASKS), {
        ...values,
        dueDate: values.dueDate.toISOString(),
        status: "scheduled",
        createdAt: new Date().toISOString(),
      });

      // Notify success
      toast({
        title: "Maintenance task added",
        description: "New maintenance task has been successfully scheduled.",
      });

      // Redirect to tasks page
      router.push("/dashboard/tasks");
    } catch (error) {
      console.error("Error adding maintenance task:", error);
      toast({
        title: "Error",
        description: "Failed to schedule maintenance task. Please try again.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-5">Schedule Maintenance Task</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="equipmentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Equipment</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={loading}
                >
                  <FormControl>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select equipment" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {equipmentList.map((equipment) => (
                      <SelectItem key={equipment.id} value={equipment.id}>
                        {/* {equipment.name} */}
                        <div className="flex items-center space-x-3">
                          <img
                            src={equipment.imageUrl}
                            alt={equipment.name}
                            className="w-10 h-10 rounded bg-transparent"
                          />
                          <div className="flex flex-col items-start">
                            <p className="font-semibold">{equipment.name}</p>
                            <p className="text-gray-500 text-sm">
                              {equipment.assetNumber}
                            </p>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Select the equipment for maintenance.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="maintenanceType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Maintenance Type</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                      {/* <SelectItem value="Equipment Working Hours">
                        Equipment Working Hours
                      </SelectItem> */}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormDescription>
                  The type of maintenance to be performed.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
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
                  disabled={(date) =>
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
          <div className="w-full flex flex-col gap-y-2">
            {form.watch("resources").map((resource, index) => (
              <div key={index} className="w-full flex justify-between gap-x-2">
                <FormItem className="w-full">
                  <FormLabel>Resources</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter resources"
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
                      onChange={(e) =>
                        handleUpdateResourceField(index, "unit", e.target.value)
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
          <Button type="submit" disabled={loading}>
            {loading ? "Scheduling..." : "Schedule Maintenance"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
