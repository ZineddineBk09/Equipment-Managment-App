"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  CheckCircle,
  XCircle,
  Clock,
  Archive,
  Eye,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Loader2,
  Trash,
  Download,
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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePRUpdates, useUpdatePRStatus } from "@/hooks/useFirestore";
import { formatFirebaseTime } from "@/utils";
import { deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import withAuth from "@/lib/hocs/withAuth";
import { USER_ROLES, FIREBASE_RESOURCES } from "@/enums/resources";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function PRApprovalDashboard() {
  const { data: prs, loading } = usePRUpdates();
  const { updateStatus, loading: updatingStatus } = useUpdatePRStatus();
  const [selectedPR, setSelectedPR] = useState<any>(null);
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
  const [prToDelete, setPrToDelete] = useState<string | null>(null);

  // Filter PRs based on active tab and search term
  const filteredPRs = prs.filter((pr) => {
    const matchesTab = activeTab === "all" || pr.status === activeTab;
    const matchesSearch =
      pr.prNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pr.requester.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pr.department.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesTab && matchesSearch;
  });

  // Sort PRs based on sort config
  const sortedPRs = [...filteredPRs].sort((a, b) => {
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

  const openDetailView = (pr: any) => {
    setSelectedPR(pr);
    setIsDetailOpen(true);
  };

  const openActionDialog = (pr: any, action: "approve" | "reject") => {
    setSelectedPR(pr);
    setActionType(action);
    setActionComment("");
    setIsActionDialogOpen(true);
  };

  const handleAction = async () => {
    if (!selectedPR || !actionType) return;
    setIsProcessing(true);
    try {
      await updateStatus(
        selectedPR.id,
        actionType === "approve" ? "approved" : "rejected"
      );

      // Add rejection reason to document if rejcted
      if (actionType === "reject") {
        await updateDoc(doc(db, "materials", selectedPR.id), {
          status: "rejected",
          rejectionReason: actionComment,
        });
      }

      setActionSuccess(
        `Purchase requisition ${selectedPR.prNumber} has been ${
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
    setPrToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!prToDelete) return;
    await deleteDoc(doc(db, "materials", prToDelete));
    setIsDeleteDialogOpen(false);
    setPrToDelete(null);
  };

  const generatePRPDF = (pr: any) => {
    const doc = new jsPDF();
    const currentDate = format(new Date(), "yyyy-MM-dd");

    // ===== Document Setup =====
    doc.setProperties({
      title: `Purchase Requisition ${pr.prNumber}`,
    });
    doc.setFont("helvetica", "normal");

    // ===== Generate QR Code =====
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=50x50&data=${pr.prNumber}`;

    // ===== Header Section =====
    // Company Logo (Left Side)
    doc.addImage("/logo-removebg-new.png", "PNG", 15, 4, 30, 30);

    // QR Code (Right Side)
    doc.addImage(qrCodeUrl, "PNG", doc.internal.pageSize.width - 40, 9, 20, 20);

    // Company details (Centered below logo and QR)
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(
      "OILINDUSTRYSUPPLIESSERVICESLIMITED",
      doc.internal.pageSize.width / 2,
      15,
      { align: "center" }
    );
    doc.text(
      "Aljizzer Street, Basra, 61002, Iraq",
      doc.internal.pageSize.width / 2,
      20,
      { align: "center" }
    );
    doc.text(
      "admin@oilindustrysuppliesandserviceslimited.com | +9647801552390",
      doc.internal.pageSize.width / 2,
      25,
      { align: "center" }
    );

    // Document Title (Below company info)
    doc.setFontSize(12);
    //@ts-ignore
    doc.setFont(undefined, "bold");
    doc.text("PURCHASE REQUISITION", doc.internal.pageSize.width / 2, 35, {
      align: "center",
    });

    // PR Number and Date (Below title)
    doc.setFontSize(8);
    //@ts-ignore
    doc.setFont(undefined, "normal");
    doc.text(`PR Number: #${pr.prNumber}`, 15, 45);
    doc.text(`Date: ${currentDate}`, doc.internal.pageSize.width - 15, 45, {
      align: "right",
    });

    // Horizontal line separator
    doc.setDrawColor(200, 200, 200);
    doc.line(15, 50, doc.internal.pageSize.width - 15, 50);

    // ===== PR Details Section =====
    autoTable(doc, {
      startY: 55,
      body: [
        [
          { content: "Requester", styles: { fontStyle: "bold", fontSize: 8 } },
          pr.requester,
        ],
        [
          { content: "Department", styles: { fontStyle: "bold", fontSize: 8 } },
          pr.department,
        ],
        [
          { content: "Location", styles: { fontStyle: "bold", fontSize: 8 } },
          pr.location,
        ],
        [
          { content: "Status", styles: { fontStyle: "bold", fontSize: 8 } },
          pr.status,
        ],
      ],
      theme: "plain",
      styles: {
        fontSize: 8,
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
        cellPadding: 1.5,
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 140 },
      },
    });

    // ===== Justification Section =====
    doc.setFontSize(10);
    //@ts-ignore
    doc.text("Justification:", 15, doc.lastAutoTable.finalY + 10);
    doc.setFontSize(9);
    //@ts-ignore
    doc.text(pr.justification || "N/A", 15, doc.lastAutoTable.finalY + 15, {
      maxWidth: 180,
    });

    // ===== Items Table =====
    autoTable(doc, {
      //@ts-ignore
      startY: doc.lastAutoTable.finalY + 25,
      head: [["Material", "Description", "Quantity", "Unit"]],
      body: pr.items.map((item: any) => [
        item.material,
        item.description,
        item.qty,
        item.unit,
      ]),
      theme: "grid",
      styles: {
        fontSize: 9,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [51, 51, 51],
        textColor: 255,
        fontStyle: "bold",
      },
    });

    // ===== Footer Section =====
    doc.setFontSize(8);
    doc.text(
      "This document is auto-generated and is valid only for approved requisitions.",
      15,
      doc.internal.pageSize.height - 10
    );

    // Save the PDF
    doc.save(`purchase-requisition-${pr.prNumber}.pdf`);
  };
  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            Purchase Requisition Approval
          </CardTitle>
          <CardDescription>
            Review and approve purchase requisitions
          </CardDescription>
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
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search PR#, requester, department..."
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
                      onClick={() => handleSort("id")}
                    >
                      <div className="flex items-center">
                        PR Number
                        {sortConfig?.key === "id" &&
                          (sortConfig.direction === "asc" ? (
                            <ChevronUp className="ml-1 h-4 w-4" />
                          ) : (
                            <ChevronDown className="ml-1 h-4 w-4" />
                          ))}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => handleSort("requester")}
                    >
                      <div className="flex items-center">
                        Requester
                        {sortConfig?.key === "requester" &&
                          (sortConfig.direction === "asc" ? (
                            <ChevronUp className="ml-1 h-4 w-4" />
                          ) : (
                            <ChevronDown className="ml-1 h-4 w-4" />
                          ))}
                      </div>
                    </TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => handleSort("date")}
                    >
                      <div className="flex items-center">
                        Date
                        {sortConfig?.key === "date" &&
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
                  {sortedPRs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No purchase requisitions found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedPRs.map((pr, index) => (
                      <TableRow key={pr.id}>
                        <TableCell className="font-medium">
                          {pr.prNumber}
                        </TableCell>
                        <TableCell>{pr.requester}</TableCell>
                        <TableCell>{pr.department}</TableCell>
                        <TableCell>
                          {format(
                            formatFirebaseTime(pr?.date),
                            "MMM dd, yyyy hh:mm a"
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(pr.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDetailView(pr)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>

                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => openDeleteDialog(pr.id)}
                            >
                              <Trash className="h-4 w-4 mr-1" />
                              Delete
                            </Button>

                            {pr.status === "pending" && (
                              <>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() =>
                                    openActionDialog(pr, "approve")
                                  }
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => openActionDialog(pr, "reject")}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </>
                            )}

                            {/* <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Filter className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Archive className="h-4 w-4 mr-2" />
                                  Archive
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu> */}
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

      {/* PR Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Purchase Requisition Details</DialogTitle>
            <DialogDescription>
              {selectedPR?.prNumber} - Submitted on{" "}
              {selectedPR &&
                format(
                  formatFirebaseTime(selectedPR?.date),
                  "MMM dd, yyyy hh:mm a"
                )}
            </DialogDescription>
          </DialogHeader>

          {selectedPR && (
            <div className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold mb-1">Requester</h4>
                  <p className="text-sm">{selectedPR.requester}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-1">Status</h4>
                  <div>{getStatusBadge(selectedPR.status)}</div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-1">Department</h4>
                  <p className="text-sm">{selectedPR.department}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-1">Location</h4>
                  <p className="text-sm">{selectedPR.location}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-1">Justification</h4>
                <p className="text-sm p-3 bg-muted rounded-md">
                  {selectedPR.justification}
                </p>
              </div>

              {selectedPR.status === "rejected" &&
                selectedPR.rejectionReason && (
                  <div>
                    <h4 className="text-sm font-medium mb-1 text-destructive">
                      Rejection Reason
                    </h4>
                    <p className="text-sm p-3 bg-destructive/10 rounded-md text-destructive">
                      {selectedPR.rejectionReason}
                    </p>
                  </div>
                )}

              <div>
                <h4 className="text-sm font-semibold mb-2">Requested Items</h4>
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
                      {selectedPR.items.map((item: any, index: number) => (
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
            {selectedPR?.status === "pending" && (
              <>
                <Button
                  onClick={() => {
                    setIsDetailOpen(false);
                    openActionDialog(selectedPR, "reject");
                  }}
                  variant="destructive"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => {
                    setIsDetailOpen(false);
                    openActionDialog(selectedPR, "approve");
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </>
            )}
            {selectedPR?.status === "approved" && (
              <Button
                onClick={() => generatePRPDF(selectedPR)}
                variant="default"
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve/Reject Dialog */}
      <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Approve" : "Reject"} Purchase
              Requisition
            </DialogTitle>
            <DialogDescription>
              {selectedPR?.prNumber} -{" "}
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
              <Textarea
                id="comment"
                placeholder="Provide a reason for rejection..."
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                className="min-h-[100px]"
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
              Are you sure you want to delete this purchase requisition? This
              action cannot be undone.
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

export default withAuth(PRApprovalDashboard, {
  requiredRole: USER_ROLES.ADMIN + "ds",
  requiredPermissions: [
    FIREBASE_RESOURCES.INVOICES + ":view",
    FIREBASE_RESOURCES.INVOICES + ":edit",
  ],
});
