"use client";

import { useMemo, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Plus, Trash2, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCreatePR } from "@/hooks/useFirestore";
import { useUser } from "@/hooks/use-user";
import withAuth from "@/lib/hocs/withAuth";
import { USER_ROLES, FIREBASE_RESOURCES } from "@/enums/resources";

// Mock data for departments and locations
const departments = [
  { id: "eng", name: "Engineering" },
  { id: "ops", name: "Operations" },
  { id: "maint", name: "Maintenance" },
  { id: "admin", name: "Administration" },
];

const locations = [
  { id: "hq", name: "Headquarters" },
  { id: "plant1", name: "Plant 1" },
  { id: "plant2", name: "Plant 2" },
  { id: "warehouse", name: "Warehouse" },
];

// Form schema
const formSchema = z.object({
  department: z.string().min(1, { message: "Department is required" }),
  location: z.string().min(1, { message: "Location is required" }),
  justification: z
    .string()
    .min(10, { message: "Justification must be at least 10 characters" }),
  items: z
    .array(
      z.object({
        material: z.string().min(1, { message: "Material is required" }),
        description: z.string().min(1, { message: "Description is required" }),
        quantity: z.string().min(1, { message: "Quantity is required" }),
        unit: z.string().min(1, { message: "Unit is required" }),
        image: z.any().optional(),
      })
    )
    .min(1, { message: "At least one item is required" }),
});

function PRCreationPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Generate PR number and date
  const prNumber = useMemo(
    () =>
      `PR-${new Date().getFullYear()}-${Math.floor(
        1000 + Math.random() * 9000
      )}`,
    [submitSuccess]
  );
  const currentDate = format(new Date(), "yyyy-MM-dd");

  // Mock user data (would come from auth context in a real app)
  const { user, loading: loadingUser } = useUser();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      department: "",
      location: "",
      justification: "",
      items: [
        { material: "", description: "", quantity: "", unit: "", image: null },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const { create, loading, error } = useCreatePR();

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      await create({
        prNumber,
        date: new Date().toISOString(),
        requester: user.email,
        location: values.location,
        department: values.department,
        items: values.items.map((item) => ({
          material: item.material,
          description: item.description,
          qty: parseInt(item.quantity),
          unit: item.unit,
          photo: item.image,
        })),
        status: "pending",
        justification: values.justification,
      });
      setSubmitSuccess(true);
      form.reset();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingUser) return <div>Loading...</div>;

  return (
    <div className="container mx-auto py-10">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="mb-8">
            <CardHeader className="bg-muted/50">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                  <CardTitle className="text-2xl">
                    Purchase Requisition
                  </CardTitle>
                  <CardDescription>
                    Create a new purchase requisition
                  </CardDescription>
                </div>
                <div className="mt-4 md:mt-0 space-y-1 text-sm">
                  <div className="flex items-center">
                    <span className="font-medium w-20">PR Number:</span>
                    <span className="font-bold">{prNumber}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-medium w-20">Date:</span>
                    <span>{currentDate}</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-6">
                {/* Requester Information */}
                <div className="bg-muted/30 p-4 rounded-lg">
                  <h3 className="font-medium mb-4">Requester Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Name</Label>
                      <Input value={user.email.split("@")[0]} disabled />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input value={user.email} disabled />
                    </div>
                    <div>
                      <Label>Employee ID</Label>
                      <Input value={user.id} disabled />
                    </div>
                  </div>
                </div>

                {/* Department and Location */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g., Engineering, Operations"
                          />
                        </FormControl>
                        {/* <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {departments.map(dept => (
                              <SelectItem key={dept.id} value={dept.id}>
                                {dept.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select> */}
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
                          <Input
                            {...field}
                            placeholder="e.g., Headquarters, Plant 1"
                          />
                        </FormControl>
                        {/* <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select location" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {locations.map((loc) => (
                              <SelectItem key={loc.id} value={loc.id}>
                                {loc.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select> */}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Justification */}
                <FormField
                  control={form.control}
                  name="justification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Justification</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Explain why these items are needed..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Provide a clear business justification for this purchase
                        request.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Items Table */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium">Requested Items</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        append({
                          material: "",
                          description: "",
                          quantity: "",
                          unit: "",
                          image: null,
                        })
                      }
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </div>

                  <div className="border rounded-md">
                    <ScrollArea className="w-full overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[180px]">
                              Material
                            </TableHead>
                            <TableHead className="w-[300px]">
                              Description
                            </TableHead>
                            <TableHead className="w-[100px]">
                              Quantity
                            </TableHead>
                            <TableHead className="w-[100px]">Unit</TableHead>
                            <TableHead className="w-[150px]">Image</TableHead>
                            <TableHead className="w-[80px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fields.map((field, index) => (
                            <TableRow key={field.id}>
                              <TableCell>
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.material`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input
                                          {...field}
                                          placeholder="Material code"
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.description`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input
                                          {...field}
                                          placeholder="Item description"
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.quantity`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input {...field} placeholder="Qty" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.unit`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input {...field} placeholder="Unit" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.image`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input
                                          {...field}
                                          placeholder="Material image"
                                        />
                                      </FormControl>
                                      {/* <FormControl>
                                        <div className="flex items-center">
                                          <Label
                                            htmlFor={`image-${index}`}
                                            className="cursor-pointer flex items-center justify-center h-9 px-4 py-2 rounded-md border border-input bg-background hover:bg-accent text-sm"
                                          >
                                            <Upload className="h-4 w-4 mr-2" />
                                            Upload
                                          </Label>
                                          <Input
                                            id={`image-${index}`}
                                            type="file"
                                            className="hidden"
                                            onChange={(e) => {
                                              const file =
                                                e.target.files?.[0] || null;
                                              field.onChange(file);
                                            }}
                                          />
                                        </div>
                                      </FormControl> */}
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => remove(index)}
                                  disabled={fields.length === 1}
                                >
                                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                  {form.formState.errors.items?.message && (
                    <p className="text-sm font-medium text-destructive mt-2">
                      {form.formState.errors.items?.message}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-6">
              <Button
                variant="outline"
                type="button"
                onClick={() => form.reset()}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Submit for Approval
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>

      {submitSuccess && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">
            Purchase requisition submitted successfully! PR Number: {prNumber}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

export default withAuth(PRCreationPage, {
  requiredRole: USER_ROLES.VIEWER,
  requiredPermissions: [FIREBASE_RESOURCES.INVOICES + ":view", FIREBASE_RESOURCES.INVOICES + ":edit"],
});
