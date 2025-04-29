"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  CheckCircle,
  XCircle,
  Clock,
  Trash,
  Eye,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOrderUpdates, useUpdateOrderStatus } from "@/hooks/useFirestore";
import { formatFirebaseTime } from "@/utils";
import { deleteDoc, doc } from "firebase/firestore";
import { db, fetchOneVendor } from "@/lib/firebase";
import withAuth from "@/lib/hocs/withAuth";
import { USER_ROLES, FIREBASE_RESOURCES } from "@/enums/resources";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useCountries } from "@/hooks/useCountries";

function OrderApprovalDashboard() {
  const { data: orders, loading } = useOrderUpdates();
  console.log(orders);
  const { updateStatus, loading: updatingStatus } = useUpdateOrderStatus();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(
    null
  );
  const [actionComment, setActionComment] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [vendors, setVendors] = useState<any[]>([]);
  const countries = useCountries();

  // Filter orders based on active tab and search term
  const filteredOrders = orders.filter((order) => {
    const matchesTab = activeTab === "all" || order.status === activeTab;
    const matchesSearch =
      order?.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order?.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(order?.vendorName)
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    return matchesTab && matchesSearch;
  });

  // Sort orders based on sort config
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (!sortConfig) return 0;

    const { key, direction } = sortConfig;

    //@ts-ignore
    if (a[key] < b[key]) {
      return direction === "asc" ? -1 : 1;
    }
    //@ts-ignore
    if (a[key] > b[key]) {
      return direction === "asc" ? 1 : -1;
    }
    return 0;
  });

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";

    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }

    setSortConfig({ key, direction });
  };

  const openDetailView = (order: any) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);
  };

  const openActionDialog = (order: any, action: "approve" | "reject") => {
    setSelectedOrder(order);
    setActionType(action);
    setActionComment("");
    setIsActionDialogOpen(true);
  };

  const handleAction = async () => {
    if (!selectedOrder || !actionType) return;
    setIsProcessing(true);
    try {
      await updateStatus(
        selectedOrder.id,
        actionType === "approve" ? "approved" : "rejected"
      );

      setActionSuccess(
        `Order ${selectedOrder.poNumber} has been ${
          actionType === "approve" ? "approved" : "rejected"
        }.`
      );
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
      setIsActionDialogOpen(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="border-amber-500 text-amber-500">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const openDeleteDialog = (id: string) => {
    setOrderToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!orderToDelete) return;
    await deleteDoc(doc(db, "orders", orderToDelete));
    setIsDeleteDialogOpen(false);
    setOrderToDelete(null);
  };

  const generatePDF = async (values: any) => {
    console.log(values);
    const doc = new jsPDF();
    const currentDate = format(new Date(), "yyyy-MM-dd");
    // fetch vendor in vendor collection
    const selectedVendorId = values.vendor;
    const selectedVendor: any = await fetchOneVendor(selectedVendorId);
    // Get country names from codes
    const originCountry =
      countries.find((c) => c.alpha3Code === values.originCountry)?.name ||
      values.originCountry;
    const destinationCountry =
      countries.find((c) => c.alpha3Code === values.destinationCountry)?.name ||
      values.destinationCountry;

    // ===== Document Setup =====
    doc.setProperties({
      title: `Purchase Order ${values.poNumber}`,
    });
    doc.setFont("helvetica", "normal");

    // ===== Generate QR Code =====
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=50x50&data=${values.poNumber}`;

    // ===== Header Section =====
    // Company Logo (Left Side)
    doc.addImage("/logo-removebg-new.png", "PNG", 15, 4, 30, 30);

    // QR Code (Right Side)
    doc.addImage(qrCodeUrl, "PNG", doc.internal.pageSize.width - 40, 9, 20, 20);
    // place the QR code in the center bottom of the page

    // Company details (Centered below logo and QR)
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(
      "OILINDUSTRYSUPPLIESSERVICESLIMITED",
      doc.internal.pageSize.width / 2,
      15,
      {
        align: "center",
      }
    );
    doc.text(
      "Aljizzer Street, Basra, 61002, Iraq",
      doc.internal.pageSize.width / 2,
      20,
      {
        align: "center",
      }
    );
    doc.text(
      "admin@oilindustrysuppliesandserviceslimited.com | +9647801552390",
      doc.internal.pageSize.width / 2,
      25,
      {
        align: "center",
      }
    );

    // Document Title (Below company info)
    doc.setFontSize(12);
    //@ts-ignore
    doc.setFont(undefined, "bold");
    doc.text("PURCHASE ORDER", doc.internal.pageSize.width / 2, 35, {
      align: "center",
    });

    // PO Number and Date (Below title)
    doc.setFontSize(8);
    //@ts-ignore
    doc.setFont(undefined, "normal");
    doc.text(`PO Number: #${values.poNumber}`, 15, 45);
    doc.text(`Date: ${currentDate}`, doc.internal.pageSize.width - 15, 45, {
      align: "right",
    });

    // Horizontal line separator
    doc.setDrawColor(200, 200, 200);
    doc.line(15, 50, doc.internal.pageSize.width - 15, 50);

    // ===== Vendor & Ship To Sections =====
    autoTable(doc, {
      startY: 55,
      body: [
        [
          { content: "VENDOR:", styles: { fontStyle: "bold", fontSize: 8 } },
          { content: "SHIP TO:", styles: { fontStyle: "bold", fontSize: 8 } },
        ],
        [
          selectedVendor
            ? `${selectedVendor.name}\n${selectedVendor.address}\n${selectedVendor.city}, ${selectedVendor.country}\n${selectedVendor.email}\n${selectedVendor.phone}`
            : "Vendor not selected",
          "OILINDUSTRYSUPPLIESSERVICESLIMITED\nAljizzer Street\nBasra, Basra, 61002\nIraq\nadmin@oilindustrysuppliesandserviceslimited.com\n+9647801552390",
        ],
        [
          {
            content: `Delivery date\nShipping method\nFreight Forwarding`,
            styles: { fontStyle: "bold", fontSize: 8 },
          },
          {
            content: `Shipping terms\nShipping from ${originCountry} to ${destinationCountry}`,
            styles: { fontStyle: "bold", fontSize: 8 },
          },
        ],
        [values.deliveryDate, values.shippingMethod || "Not specified"],
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
      body: values.items.map((item: any) => [
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
            colSpan: 1,
          },
          {
            content: "FROM SUPPLIER",
            styles: {
              fontStyle: "bold",
              textColor: [255, 255, 255],
              fillColor: [51, 51, 51],
              fontSize: 8,
            },
            colSpan: 1,
          },
          {
            content: "FROM FORWARDER",
            styles: {
              fontStyle: "bold",
              textColor: [255, 255, 255],
              fillColor: [51, 51, 51],
              fontSize: 8,
            },
            colSpan: 1,
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
        // ...requiredDocs.map((doc) => [
        //   doc.item,
        //   { content: "[YES]", styles: { fontStyle: "bold", fontSize: 8 } },
        //   { content: "[yes]", styles: { fontStyle: "bold", fontSize: 8 } },
        //   doc.item === "Original Invoice & C.O.O"
        //     ? {
        //         content: selectedVendor.paymentTerms,
        //         styles: { fontStyle: "normal", fontSize: 8 },
        //         rowSpan: requiredDocs.length,
        //       }
        //     : null,
        // ]),
        // replace hardcoded values with dynamic ones using documents state var
        ...values.requiredDocuments.map((doc, index) => [
          doc.name,
          {
            content: doc.requiredFromSupplier ? "[YES]" : "[NO]",
            styles: { fontStyle: "bold", fontSize: 8 },
          },
          {
            content: doc.requiredFromForwarder ? "[YES]" : "[NO]",
            styles: { fontStyle: "bold", fontSize: 8 },
          },
          index === 0
            ? {
                content: selectedVendor.terms,
                styles: { fontStyle: "normal", fontSize: 8 },
                rowSpan: values.requiredDocuments.length,
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
        0: { cellWidth: 65 },
        1: { cellWidth: 25 },
        2: { cellWidth: 25 },
        3: { cellWidth: 65 },
      },
    });

    // ===== Doccuments Requirements =====
    // autoTable(doc, {
    //   //@ts-ignore
    //   startY: doc.lastAutoTable.finalY + 8,
    //   head: [
    //     ["Document Name", "Required from Supplier", "Required from Forwarder"],
    //   ],
    //   body: documents.map((doc) => [
    //     doc.name,
    //     doc.requiredFromSupplier ? "YES" : "NO",
    //     doc.requiredFromForwarder ? "YES" : "NO",
    //   ]),
    //   theme: "grid",
    //   styles: {
    //     fontSize: 8,
    //     cellPadding: 2,
    //   },
    //   headStyles: {
    //     fillColor: [51, 51, 51],
    //     textColor: 255,
    //     fontStyle: "bold",
    //     fontSize: 8,
    //   },
    //   columnStyles: {
    //     0: { cellWidth: 110 },
    //     1: { cellWidth: 70 },
    //     2: { cellWidth: 70 },
    //   },
    // });
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
          `Transportation in ${originCountry}`,
          {
            content: "USD 0.00",
            styles: { halign: "right", fontSize: 8 },
          },
        ],
        [
          `Shipping to ${
            countries.find((c) => c.alpha3Code === values.destinationCountry)
              ?.name
          }`,
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

  const generateExcel = (order: any) => {
    const wb = XLSX.utils.book_new();
    const wsData = [
      ["Purchase Order", order.poNumber],
      ["Date", format(new Date(order.createdAt), "yyyy-MM-dd")],
      ["Vendor", order.vendorName || order.vendor],
      [],
      [
        "Material",
        "Description",
        "Quantity",
        "Unit",
        "Unit Cost",
        "Line Total",
      ],
      ...order.items.map((item: any) => [
        item.material,
        item.description,
        item.qty,
        item.unit,
        item.unitCost,
        item.lineTotal,
      ]),
      [],
      ["Total", order.total],
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Purchase Order");
    XLSX.writeFile(wb, `purchase-order-${order.poNumber}.xlsx`);
  };

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Order Approval</CardTitle>
          <CardDescription>Review and approve purchase orders</CardDescription>
        </CardHeader>
        <CardContent>
          {actionSuccess && (
            <Alert className="mb-6 bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">
                {actionSuccess}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <Tabs
              value={activeTab}
              className="w-full md:w-auto"
              onValueChange={setActiveTab}
            >
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative w-full md:w-auto">
              <Input
                placeholder="Search PO#, vendor..."
                className="pl-8 w-full md:w-[300px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="border rounded-md">
            <ScrollArea className="w-full overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="w-[150px] cursor-pointer"
                      onClick={() => handleSort("poNumber")}
                    >
                      <div className="flex items-center">
                        PO Number
                        {sortConfig?.key === "poNumber" &&
                          (sortConfig.direction === "asc" ? (
                            <ChevronUp className="ml-1 h-4 w-4" />
                          ) : (
                            <ChevronDown className="ml-1 h-4 w-4" />
                          ))}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => handleSort("vendor")}
                    >
                      <div className="flex items-center">
                        Vendor
                        {sortConfig?.key === "vendor" &&
                          (sortConfig.direction === "asc" ? (
                            <ChevronUp className="ml-1 h-4 w-4" />
                          ) : (
                            <ChevronDown className="ml-1 h-4 w-4" />
                          ))}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => handleSort("createdAt")}
                    >
                      <div className="flex items-center">
                        Date
                        {sortConfig?.key === "createdAt" &&
                          (sortConfig.direction === "asc" ? (
                            <ChevronUp className="ml-1 h-4 w-4" />
                          ) : (
                            <ChevronDown className="ml-1 h-4 w-4" />
                          ))}
                      </div>
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        No orders found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          {order.poNumber}
                        </TableCell>
                        <TableCell>
                          {order?.vendorName || order.vendor}
                        </TableCell>
                        <TableCell>
                          {order.createdAt
                            ? format(order.createdAt, "MMM dd, yyyy hh:mm a")
                            : "N/A"}
                        </TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDetailView(order)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>

                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => openDeleteDialog(order.id)}
                            >
                              <Trash className="h-4 w-4 mr-1" />
                              Delete
                            </Button>

                            {order.status === "pending" && (
                              <>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() =>
                                    openActionDialog(order, "approve")
                                  }
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() =>
                                    openActionDialog(order, "reject")
                                  }
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              {selectedOrder?.poNumber} - Submitted on{" "}
              {selectedOrder &&
                format(selectedOrder?.createdAt, "MMM dd, yyyy hh:mm a")}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold mb-1">Vendor</h4>
                  <p className="text-sm">
                    {selectedOrder?.vendorName || selectedOrder.vendor}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-1">Status</h4>
                  <div>{getStatusBadge(selectedOrder.status)}</div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-1">Total</h4>
                  <p className="text-sm">${selectedOrder.total}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Order Items</h4>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.items.map((item: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>{item.material}</TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>{item.qty}</TableCell>
                          <TableCell>{item.unit}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {selectedOrder?.status === "approved" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => generateExcel(selectedOrder)}
                >
                  Generate Excel
                </Button>
                <Button
                  variant="default"
                  onClick={() => generatePDF(selectedOrder)}
                >
                  Generate PDF
                </Button>
              </>
            )}
            {selectedOrder?.status === "pending" && (
              <>
                <Button
                  onClick={() => {
                    setIsDetailOpen(false);
                    openActionDialog(selectedOrder, "reject");
                  }}
                  variant="destructive"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => {
                    setIsDetailOpen(false);
                    openActionDialog(selectedOrder, "approve");
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve/Reject Dialog */}
      <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Approve" : "Reject"} Order
            </DialogTitle>
            <DialogDescription>
              {selectedOrder?.poNumber} -{" "}
              {actionType === "approve"
                ? "Confirm approval"
                : "Provide rejection reason"}
            </DialogDescription>
          </DialogHeader>

          {actionType === "reject" && (
            <div className="py-4">
              <label
                htmlFor="comment"
                className="text-sm font-medium mb-2 block"
              >
                Rejection Reason
              </label>
              <Input
                id="comment"
                placeholder="Provide a reason for rejection..."
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsActionDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={
                isProcessing || (actionType === "reject" && !actionComment)
              }
              variant={actionType === "approve" ? "default" : "destructive"}
            >
              {isProcessing && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {actionType === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this order? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default withAuth(OrderApprovalDashboard, {
  requiredRole: USER_ROLES.ADMIN,
  requiredPermissions: [
    FIREBASE_RESOURCES.INVOICES + ":view",
    FIREBASE_RESOURCES.INVOICES + ":edit",
  ],
});
