"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import {
  Plus,
  Trash2,
  FileText,
  Download,
  Calculator,
  Loader2,
  LinkIcon,
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import * as XLSX from "xlsx";
// import { generatePDF } from "../../utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { fetchVendors } from "@/lib/firebase";
import withAuth from "@/lib/hocs/withAuth";
import { USER_ROLES, FIREBASE_RESOURCES } from "@/enums/resources";

// Form schema
const formSchema = z.object({
  prNumber: z.string().min(1, { message: "PR number is required" }),
  vendor: z.string().min(1, { message: "Vendor is required" }),
  paymentTerms: z.string().min(1, { message: "Payment terms are required" }),
  deliveryDate: z.string().min(1, { message: "Delivery date is required" }),
  shippingAddress: z
    .string()
    .min(1, { message: "Shipping address is required" }),
  items: z
    .array(
      z.object({
        material: z.string(),
        description: z.string(),
        qty: z.string(),
        unit: z.string(),
        unitCost: z.string().min(1, { message: "Unit cost is required" }),
        lineTotal: z.string(),
      })
    )
    .min(1, { message: "At least one item is required" }),
  subtotal: z.string(),
  taxRate: z.string(),
  taxAmount: z.string(),
  shippingCost: z.string(),
  total: z.string(),
  notes: z.string().optional(),
});

function POGenerationPage() {
  const [selectedPR, setSelectedPR] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateSuccess, setGenerateSuccess] = useState(false);
  const [termsDialogOpen, setTermsDialogOpen] = useState(false);
  const [prList, setPrList] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);

  useEffect(() => {
    const fetchPRs = async () => {
      const prCollection = collection(db, "materials");
      const prSnapshot = await getDocs(prCollection);
      const prData = prSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPrList(prData);
    };

    fetchPRs();
  }, []);

  useEffect(() => {
    const fetchAndSetVendors = async () => {
      const vendorData = await fetchVendors();
      setVendors(vendorData);
    };

    fetchAndSetVendors();
  }, []);

  // Generate PO number and date
  const poNumber = `PO-${new Date().getFullYear()}-${Math.floor(
    1000 + Math.random() * 9000
  )}`;
  const currentDate = format(new Date(), "yyyy-MM-dd");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prNumber: "",
      vendor: "",
      paymentTerms: "",
      deliveryDate: format(
        new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        "yyyy-MM-dd"
      ), // 2 weeks from now
      shippingAddress: "",
      items: [],
      subtotal: "0.00",
      taxRate: "7.5",
      taxAmount: "0.00",
      shippingCost: "0.00",
      total: "0.00",
      notes: "",
    },
  });

  // Load PR data when PR number changes
  const onPRChange = (prNumber: string) => {
    const pr = prList.find((pr) => pr.id === prNumber);
    if (pr) {
      setSelectedPR(pr);

      // Map PR items to PO items with unit cost and line total
      const items = pr.items.map((item: any) => ({
        ...item,
        unitCost: "",
        lineTotal: "",
      }));

      form.setValue("items", items);
    } else {
      setSelectedPR(null);
      form.setValue("items", []);
    }
  };

  // Load vendor data when vendor changes
  const onVendorChange = (vendorId: string) => {
    const vendor = vendors.find((v) => v.id === vendorId);
    if (vendor) {
      form.setValue("paymentTerms", vendor.terms);
      form.setValue("shippingAddress", vendor.address);
    }
  };

  // Calculate line total when unit cost or qty changes
  const calculateLineTotal = (index: number) => {
    const items = form.getValues("items");
    const item = items[index];

    const qty = parseFloat(item.qty) || 0;
    const unitCost = parseFloat(item.unitCost) || 0;
    const lineTotal = (qty * unitCost).toFixed(2);

    form.setValue(`items.${index}.lineTotal`, lineTotal);

    // Recalculate totals
    calculateTotals();
  };

  // Calculate subtotal, tax, and total
  const calculateTotals = () => {
    const items = form.getValues("items");
    const subtotal = items.reduce((sum, item) => {
      return sum + (parseFloat(item.lineTotal) || 0);
    }, 0);

    const taxRate = parseFloat(form.getValues("taxRate")) || 0;
    const taxAmount = ((subtotal * taxRate) / 100).toFixed(2);

    const shippingCost = parseFloat(form.getValues("shippingCost")) || 0;
    const total = (subtotal + parseFloat(taxAmount) + shippingCost).toFixed(2);

    form.setValue("subtotal", subtotal.toFixed(2));
    form.setValue("taxAmount", taxAmount);
    form.setValue("total", total);
  };

  const generatePDF = async (values: z.infer<typeof formSchema>) => {
    const doc = new jsPDF();
    const currentDate = format(new Date(), "yyyy-MM-dd");
    const selectedVendor = vendors.find((v) => v.id === values.vendor);

    // ===== Document Setup =====
    doc.setProperties({
      title: `Purchase Order ${poNumber}`,
    });
    doc.setFont("helvetica", "normal");

    // ===== Generate QR Code =====
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=50x50&data=${poNumber}`;
    
    // ===== Header Section =====
    // Company Logo (Left Side)
    doc.addImage("/logo-report.png", "PNG", 15, 5, 30, 15);

    // QR Code (Right Side)
    doc.addImage(qrCodeUrl, "PNG", doc.internal.pageSize.width - 40, 5, 30, 30);

    // Company details (Centered below logo and QR)
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text("OILINDUSTRYSUPPLIESSERVICESLIMITED", doc.internal.pageSize.width / 2, 25, {
      align: "center"
    });
    doc.text("Aljizzer Street, Basra, 61002, Iraq", doc.internal.pageSize.width / 2, 30, {
      align: "center"
    });
    doc.text("admin@oilindustrysupplieserviceslimited.com | +9647801552390", doc.internal.pageSize.width / 2, 35, {
      align: "center"
    });

    // Document Title (Below company info)
    doc.setFontSize(12);
    //@ts-ignore
    doc.setFont(undefined, "bold");
    doc.text("PURCHASE ORDER", doc.internal.pageSize.width / 2, 45, {
      align: "center",
    });

    // PO Number and Date (Below title)
    doc.setFontSize(8);
    //@ts-ignore
    doc.setFont(undefined, "normal");
    doc.text(`PO Number: #${poNumber}`, 15, 55);
    doc.text(`Date: ${currentDate}`, doc.internal.pageSize.width - 15, 55, {
      align: "right"
    });

    // Horizontal line separator
    doc.setDrawColor(200, 200, 200);
    doc.line(15, 60, doc.internal.pageSize.width - 15, 60);

    // ===== Vendor & Ship To Sections =====
    autoTable(doc, {
      startY: 65,
      body: [
        [
          { content: "VENDOR:", styles: { fontStyle: "bold", fontSize: 8 } },
          { content: "SHIP TO:", styles: { fontStyle: "bold", fontSize: 8 } },
        ],
        [
          selectedVendor
            ? `${selectedVendor.name}\n${selectedVendor.address}\n${selectedVendor.city}, ${selectedVendor.country}\n${selectedVendor.email}\n${selectedVendor.phone}`
            : "Vendor not selected",
          "OILINDUSTRYSUPPLIESSERVICESLIMITED\nAljizzer Street\nBasra, Basra, 61002\nIraq\nadmin@oilindustrysupplieserviceslimited.com\n+9647801552390",
        ],
        [
          {
            content: `Delivery date\nShipping method\nFreight Forwarding`,
            styles: { fontStyle: "bold", fontSize: 8 },
          },
          {
            content: "Shipping terms\nShipping cost to Umm Qasr Port Iraq",
            styles: { fontStyle: "bold", fontSize: 8 },
          },
        ],
        [values.deliveryDate, ""],
      ],
      theme: "plain",
      styles: {
        fontSize: 8,
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
        cellPadding: 1.5,
      },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 90 },
      },
    });

    // ===== Items Table =====
    doc.setFontSize(10);
    //@ts-ignore
    doc.text("ITEMS", 15, doc.lastAutoTable.finalY + 5);

    autoTable(doc, {
      //@ts-ignore
      startY: doc.lastAutoTable.finalY + 8,
      head: [
        ["Item", "Description", "Quantity", "Unit", "Unit Cost", "Line Total"],
      ],
      body: values.items.map((item) => [
        item.material,
        item.description,
        item.qty,
        item.unit,
        `USD ${parseFloat(item.unitCost).toFixed(2)}`,
        `USD ${parseFloat(item.lineTotal).toFixed(2)}`,
      ]),
      theme: "grid",
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [51, 51, 51],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 8,
      },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 60 },
        2: { cellWidth: 20 },
        3: { cellWidth: 20 },
        4: { halign: "right", cellWidth: 30 },
        5: { halign: "right", cellWidth: 30 },
      },
    });

    // ===== Document Requirements & Payment Terms Section =====
    doc.setFontSize(10);
    doc.text(
      "DOCUMENT REQUIRED (Foreign Supplier Only)",
      15,
      //@ts-ignore
      doc.lastAutoTable.finalY + 5
    );

    const requiredDocs = [
      { item: "Original Invoice & C.O.O", required: true },
      { item: "Weight List/Packing List", required: true },
      { item: "Warranty Certificate", required: true },
      { item: "INSPECTIONS/TEST", required: true },
      { item: "Manuals/Products Catalogue", required: true },
      { item: "Attestation for Invoice & C.O.O", required: true },
      { item: "Legalization for Invoice & C.O.O", required: true },
      { item: "Original AWR / B/L", required: true },
      { item: "Marine insurance against all risks", required: true },
    ];

    autoTable(doc, {
      //@ts-ignore
      startY: doc.lastAutoTable.finalY + 8,
      body: [
        [
          {
            content: "DOCUMENT REQUIREMENTS",
            styles: {
              fontStyle: "bold",
              textColor: [255, 255, 255],
              fillColor: [51, 51, 51],
              fontSize: 8,
            },
            colSpan: 3,
          },
          {
            content: "PAYMENT TERMS",
            styles: {
              fontStyle: "bold",
              textColor: [255, 255, 255],
              fillColor: [51, 51, 51],
              fontSize: 8,
            },
            colSpan: 1,
          },
        ],
        //@ts-ignore
        ...requiredDocs.map((doc) => [
          doc.item,
          { content: "[YES]", styles: { fontStyle: "bold", fontSize: 8 } },
          { content: "[yes]", styles: { fontStyle: "bold", fontSize: 8 } },
          doc.item === "Original Invoice & C.O.O"
            ? {
                content: selectedVendor.terms,
                styles: { fontStyle: "normal", fontSize: 8 },
                rowSpan: requiredDocs.length,
              }
            : null,
        ]),
      ],
      theme: "grid",
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [51, 51, 51],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 8,
      },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 20 },
        2: { cellWidth: 20 },
        3: { cellWidth: 70 },
      },
    });

    // ===== Financial Summary =====
    autoTable(doc, {
      //@ts-ignore
      startY: doc.lastAutoTable.finalY + 8,
      body: [
        [
          {
            content: "PQ Gross Value",
            styles: { fontStyle: "bold", fontSize: 8 },
          },
          {
            content: `USD ${parseFloat(values.subtotal).toFixed(2)}`,
            styles: { halign: "right", fontSize: 8 },
          },
        ],
        [
          "Discount",
          {
            content: "USD 0.00",
            styles: { halign: "right", fontSize: 8 },
          },
        ],
        [
          "PQ Net Value",
          {
            content: `USD ${parseFloat(values.subtotal).toFixed(2)}`,
            styles: { halign: "right", fontSize: 8 },
          },
        ],
        [
          `Total VAT (${values.taxRate}%)`,
          {
            content: `USD ${parseFloat(values.taxAmount).toFixed(2)}`,
            styles: { halign: "right", fontSize: 8 },
          },
        ],
        [
          "Transportation in China",
          {
            content: "USD 0.00",
            styles: { halign: "right", fontSize: 8 },
          },
        ],
        [
          "Shipping to Iraq",
          {
            content: `USD ${parseFloat(values.shippingCost).toFixed(2)}`,
            styles: { halign: "right", fontSize: 8 },
          },
        ],
        [
          {
            content: "Total Value",
            styles: { fontStyle: "bold", fontSize: 8 },
          },
          {
            content: `USD ${parseFloat(values.total).toFixed(2)}`,
            styles: { fontStyle: "bold", halign: "right", fontSize: 8 },
          },
        ],
      ],
      theme: "grid",
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 110 },
        1: { cellWidth: 70 },
      },
    });

    // ===== Footer =====
    doc.setFontSize(7);
    doc.text(
      "THIS PURCHASE ORDER IS SUBJECT TO OILINDUSTRYSUPPLIESSERVICESLIMITED TERMS AND CONDITIONS AVAILABLE\n" +
        "https://www.OILINDUSTRYSUPPLIESSERVICESLIMITED.com.pdf. ACCEPTANCE OF THIS PURCHASE ORDER BY THE SUPPLIER SHALL BE\n" +
        "DEEMED ACCEPTANCE OF SUCH TERMS AND CONDITIONS AND WAIVER OF ANY OTHER PROVISIONS PROVIDED BY THE SUPPLIER,\n" +
        "UNLESS OTHERWISE AGREED IN A WRITING SIGNED BY THE DULY APPOINTED REPRESENTATIVE OF OILINDUSTRYSUPPLIESSERVICESLIMITED Iraq Branch.",
      15,
      //@ts-ignore
      doc.lastAutoTable.finalY + 10,
      { maxWidth: 180 }
    );

    doc.text(
      "Electronic Approved by _______________________",
      15,
      doc.internal.pageSize.height - 12
    );

    doc.save(`purchase-order-${values.prNumber}.pdf`);
};

  const generateExcel = (values: z.infer<typeof formSchema>) => {
    const wb = XLSX.utils.book_new();
    const wsData = [
      ["PO Number", poNumber],
      ["Date", currentDate],
      ["Vendor", vendors.find((v) => v.id === values.vendor)?.name],
      ["Payment Terms", values.paymentTerms],
      ["Delivery Date", values.deliveryDate],
      [],
      [
        "Material",
        "Description",
        "Quantity",
        "Unit",
        "Unit Cost",
        "Line Total",
      ],
      ...values.items.map((item) => [
        item.material,
        item.description,
        item.qty,
        item.unit,
        item.unitCost,
        item.lineTotal,
      ]),
      [],
      ["Subtotal", values.subtotal],
      ["Tax Rate", values.taxRate],
      ["Tax Amount", values.taxAmount],
      ["Shipping Cost", values.shippingCost],
      ["Total", values.total],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Purchase Order");
    XLSX.writeFile(wb, `purchase-order-${poNumber}.xlsx`);
  };

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    // setIsGenerating(true);

    // Simulate API call
    // await new Promise((resolve) => setTimeout(resolve, 2000));

    await generatePDF(values);
    setIsGenerating(false);
    setGenerateSuccess(true);

    // Reset success message after a delay
    setTimeout(() => {
      setGenerateSuccess(false);
    }, 3000);
  };

  return (
    <div className="container mx-auto py-10">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="mb-8">
            <CardHeader className="bg-muted/50">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                  <CardTitle className="text-2xl">Purchase Order</CardTitle>
                  <CardDescription>
                    Generate a new purchase order
                  </CardDescription>
                </div>
                <div className="mt-4 md:mt-0 space-y-1 text-sm">
                  <div className="flex items-center">
                    <span className="font-medium w-20">PO Number:</span>
                    <span className="font-bold">{poNumber}</span>
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
                {/* PR Reference */}
                <div className="bg-muted/30 p-4 rounded-lg">
                  <h3 className="font-medium mb-4">
                    Purchase Requisition Reference
                  </h3>
                  <FormField
                    control={form.control}
                    name="prNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PR Number</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            onPRChange(value);
                          }}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select PR number" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {prList.map((pr) => (
                              <SelectItem key={pr.id} value={pr.id}>
                                {pr.prNumber} - {pr.requester}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedPR && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div>
                        <Label>Requester</Label>
                        <Input value={selectedPR.requester} disabled />
                      </div>
                      <div>
                        <Label>Department</Label>
                        <Input value={selectedPR.department} disabled />
                      </div>
                      <div>
                        <Label>Location</Label>
                        <Input value={selectedPR.location} disabled />
                      </div>
                    </div>
                  )}
                </div>

                {/* Vendor Information */}
                <div className="bg-muted/30 p-4 rounded-lg">
                  <h3 className="font-medium mb-4">Vendor Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="vendor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendor</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              onVendorChange(value);
                            }}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select vendor" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {vendors.map((vendor) => (
                                <SelectItem key={vendor.id} value={vendor.id}>
                                  {vendor.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="paymentTerms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Terms</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Net 30" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="deliveryDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Delivery Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="shippingAddress"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Shipping Address</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Enter shipping address"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Items Table */}
                {selectedPR && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-medium">Order Items</h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => calculateTotals()}
                      >
                        <Calculator className="h-4 w-4 mr-2" />
                        Calculate Totals
                      </Button>
                    </div>

                    <div className="border rounded-md">
                      <ScrollArea className="w-full overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[150px]">
                                Material
                              </TableHead>
                              <TableHead className="w-[300px]">
                                Description
                              </TableHead>
                              <TableHead className="w-[100px]">
                                Quantity
                              </TableHead>
                              <TableHead className="w-[80px]">Unit</TableHead>
                              <TableHead className="w-[150px]">
                                Unit Cost
                              </TableHead>
                              <TableHead className="w-[150px]">
                                Line Total
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {form.watch("items").map((item, index) => (
                              <TableRow key={index}>
                                <TableCell>{item.material}</TableCell>
                                <TableCell>{item.description}</TableCell>
                                <TableCell>{item.qty}</TableCell>
                                <TableCell>{item.unit}</TableCell>
                                <TableCell>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.unitCost`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormControl>
                                          <Input
                                            {...field}
                                            placeholder="0.00"
                                            onChange={(e) => {
                                              field.onChange(e);
                                              calculateLineTotal(index);
                                            }}
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
                                    name={`items.${index}.lineTotal`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormControl>
                                          <Input {...field} disabled />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>
                  </div>
                )}

                {/* Totals */}
                {selectedPR && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="Additional notes or instructions..."
                                className="min-h-[100px]"
                              />
                            </FormControl>
                            <FormDescription>
                              <Button
                                type="button"
                                variant="link"
                                className="p-0 h-auto"
                                onClick={() => setTermsDialogOpen(true)}
                              >
                                <LinkIcon className="h-3 w-3 mr-1" />
                                View Terms & Conditions
                              </Button>
                            </FormDescription>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="bg-muted/30 p-4 rounded-lg">
                        <h3 className="font-medium mb-4">Order Summary</h3>
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <Label>Subtotal</Label>
                            <FormField
                              control={form.control}
                              name="subtotal"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input {...field} disabled />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-2">
                              <Label>Tax Rate (%)</Label>
                              <FormField
                                control={form.control}
                                name="taxRate"
                                render={({ field }) => (
                                  <FormItem className="w-20">
                                    <FormControl>
                                      <Input
                                        {...field}
                                        onChange={(e) => {
                                          field.onChange(e);
                                          calculateTotals();
                                        }}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                            <FormField
                              control={form.control}
                              name="taxAmount"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input {...field} disabled />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <Label>Shipping Cost</Label>
                            <FormField
                              control={form.control}
                              name="shippingCost"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      onChange={(e) => {
                                        field.onChange(e);
                                        calculateTotals();
                                      }}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                            <Label className="font-bold">Grand Total</Label>
                            <FormField
                              control={form.control}
                              name="total"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      disabled
                                      className="font-bold"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!selectedPR || isGenerating}
                  onClick={() => generateExcel(form.getValues())}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Excel
                </Button>
                <Button
                  onClick={() => generatePDF(form.getValues())}
                  // type='submit'
                  disabled={!selectedPR || isGenerating}
                >
                  {isGenerating && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  <Download className="mr-2 h-4 w-4" />
                  Generate PDF
                </Button>
              </div>
            </CardFooter>
          </Card>
        </form>
      </Form>

      {generateSuccess && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">
            Purchase order generated successfully! PO Number: {poNumber}
          </AlertDescription>
        </Alert>
      )}

      {/* Terms & Conditions Dialog */}
      <Dialog open={termsDialogOpen} onOpenChange={setTermsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Terms & Conditions</DialogTitle>
            <DialogDescription>
              Standard terms and conditions for purchase orders
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 p-2">
              <h3 className="font-medium">1. General</h3>
              <p className="text-sm text-muted-foreground">
                These terms and conditions apply to all purchase orders issued
                by the Company. By accepting this purchase order, the Supplier
                agrees to comply with these terms and conditions.
              </p>

              <h3 className="font-medium">2. Delivery</h3>
              <p className="text-sm text-muted-foreground">
                Time is of the essence in the performance of this purchase
                order. If delivery is not made by the date specified, the
                Company reserves the right to cancel this order without
                liability.
              </p>

              <h3 className="font-medium">3. Inspection</h3>
              <p className="text-sm text-muted-foreground">
                All goods are subject to inspection and approval by the Company
                after delivery. The Company reserves the right to reject and
                return at the Supplier's expense any goods that do not conform
                to the specifications or requirements of this purchase order.
              </p>

              <h3 className="font-medium">4. Warranty</h3>
              <p className="text-sm text-muted-foreground">
                The Supplier warrants that all goods supplied under this
                purchase order will be free from defects in materials and
                workmanship, will conform to applicable specifications, and will
                be fit for the purpose intended.
              </p>

              <h3 className="font-medium">5. Payment</h3>
              <p className="text-sm text-muted-foreground">
                Payment terms are as specified in this purchase order. The
                Company will not be liable for any charges not specifically
                stated in this purchase order.
              </p>

              <h3 className="font-medium">6. Confidentiality</h3>
              <p className="text-sm text-muted-foreground">
                The Supplier shall treat all information provided by the Company
                as confidential and shall not disclose such information to any
                third party without the prior written consent of the Company.
              </p>

              <h3 className="font-medium">7. Governing Law</h3>
              <p className="text-sm text-muted-foreground">
                This purchase order shall be governed by and construed in
                accordance with the laws of the state or country in which the
                Company is located, without regard to its conflict of law
                provisions.
              </p>

              <h3 className="font-medium">8. Termination</h3>
              <p className="text-sm text-muted-foreground">
                The Company may terminate this purchase order in whole or in
                part at any time for its convenience. In the event of such
                termination, the Supplier shall immediately stop all work and
                shall immediately cause any of its suppliers or subcontractors
                to cease work.
              </p>

              <h3 className="font-medium">9. Compliance with Laws</h3>
              <p className="text-sm text-muted-foreground">
                The Supplier warrants that all goods and services supplied under
                this purchase order will comply with all applicable laws,
                regulations, and standards.
              </p>

              <h3 className="font-medium">10. Force Majeure</h3>
              <p className="text-sm text-muted-foreground">
                Neither party shall be liable for any failure or delay in
                performance due to circumstances beyond its reasonable control,
                including but not limited to acts of God, natural disasters,
                pandemic, war, terrorism, riots, or government action.
              </p>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default withAuth(POGenerationPage, {
  requiredRole: USER_ROLES.VIEWER,
  requiredPermissions: [
    FIREBASE_RESOURCES.INVOICES + ":view",
    FIREBASE_RESOURCES.INVOICES + ":edit",
  ],
});
