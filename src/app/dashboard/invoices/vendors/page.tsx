"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { getFirestore, collection, getDocs, addDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
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
import { db, fetchVendors } from "@/lib/firebase";
import withAuth from "@/lib/hocs/withAuth";
import { USER_ROLES, FIREBASE_RESOURCES } from "@/enums/resources";

const formSchema = z.object({
  name: z.string().min(1, { message: "Vendor name is required" }),
  address: z.string().min(1, { message: "Address is required" }),
  terms: z.string().min(1, { message: "Payment terms are required" }),
});


function VendorsPage() {
  const [vendors, setVendors] = useState<any[]>([]);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      address: "",
      terms: "",
    },
  });

  useEffect(() => {
    const fetchAndSetVendors = async () => {
      const vendorData = await fetchVendors();
      setVendors(vendorData);
    };

    fetchAndSetVendors();
  }, []);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    await addDoc(collection(db, "vendors"), values);
    form.reset();
    const vendorCollection = collection(db, "vendors");
    const vendorSnapshot = await getDocs(vendorCollection);
    const vendorData = vendorSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setVendors(vendorData);
  };

  return (
    <div className="container mx-auto py-10">
      <Card className="mb-8">
        <CardHeader className="bg-muted/50">
          <CardTitle className="text-2xl">Vendors</CardTitle>
          <CardDescription>Manage vendors</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Vendor name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="terms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Terms</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Payment terms" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <CardFooter className="flex justify-end border-t pt-6">
                <Button type="submit">Add Vendor</Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="bg-muted/50">
          <CardTitle className="text-2xl">Vendor List</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Payment Terms</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell>{vendor.name}</TableCell>
                  <TableCell>{vendor.address}</TableCell>
                  <TableCell>{vendor.terms}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default withAuth(VendorsPage, {
  requiredRole: USER_ROLES.VIEWER,
  requiredPermissions: [FIREBASE_RESOURCES.INVOICES + ":view", FIREBASE_RESOURCES.INVOICES + ":edit"],
});
