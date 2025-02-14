"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PlusCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Import Firestore
import Image from "next/image";
import { Equipment } from "@/interfaces/equipment";
import { EditDialog } from "./components/EditDialog";
import { DeleteDialog } from "./components/DeleteDialog";
import { LogHoursDialog } from "./components/LogHours";
import { ReportButton } from "./components/ReportButton";
import { cn } from "@/lib/utils";
import { calculateMaintenanceDate } from "@/utils";
import { FIREBASE_COLLECTIONS } from "@/enums/collections";
import { WorkingHoursHistoryDialog } from "./components/WorkingHoursHistoryDialog";

const statusBadge = (status: "active" | "maintenance" | "decommissioned") => {
  if (status === "active") {
    return (
      <Badge variant="default" className="bg-green-500">
        Active
      </Badge>
    );
  } else if (status === "maintenance") {
    return (
      <Badge variant="default" className="bg-amber-500">
        Maitenance
      </Badge>
    );
  } else if (status === "decommissioned") {
    return <Badge variant="destructive">Decommissioned</Badge>;
  }
};

export default function EquipmentPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const itemsPerPage = 10;

  // Fetch equipment data from Firestore
  const fetchEquipment = async () => {
    try {
      const querySnapshot = await getDocs(
        collection(db, FIREBASE_COLLECTIONS.EQUIPMENTS)
      );
      const equipmentData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Equipment[];
      setEquipment(equipmentData);
    } catch (error) {
      console.error("Error fetching equipment:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipment();
  }, []);

  // Filter equipment based on search term
  const filteredEquipment = equipment.filter((item) =>
    Object.values(item).some((value) =>
      value.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEquipment = filteredEquipment.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
  const totalPages = Math.ceil(filteredEquipment.length / itemsPerPage);

  if (loading) {
    return <div className="container mx-auto py-10">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Equipment List</h1>
        <div className="flex items-center space-x-2">
          <ReportButton equipment={filteredEquipment} />
          {/* Add ReportButton */}
          <Button asChild>
            <Link href="/dashboard/equipment/add">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Equipment
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex items-center mb-4">
        <Input
          placeholder="Search equipment..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Search className="ml-2 h-4 w-4 text-gray-500" />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Image</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Serial Number</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Maintenance Due Date</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {currentEquipment.map((item, index) => (
            <TableRow
              key={item.id}
              className={cn(
                calculateMaintenanceDate(item.createdAt, item.operatingHours)
                  .daysLeft < 1 && "bg-red-100"
              )}
            >
              <TableCell className="font-bold">
                {(currentPage - 1) * itemsPerPage + index + 1}
              </TableCell>
              <TableCell>
                <Image
                  src={item.imageUrl || "/placeholder-image.jpg"}
                  alt={item.name}
                  width={50}
                  height={50}
                  className="rounded-lg"
                />
              </TableCell>
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.serialNumber}</TableCell>
              <TableCell>{item.location}</TableCell>
              <TableCell>
                {statusBadge(
                  item.status as "active" | "maintenance" | "decommissioned"
                )}
              </TableCell>
              <TableCell
                className={cn(
                  calculateMaintenanceDate(item.createdAt, item.operatingHours)
                    .daysLeft < 1 && "rounded flex items-center "
                )}
              >
                {
                  calculateMaintenanceDate(item.createdAt, item.operatingHours)
                    .date
                }{" "}
                <span className="text-xs ml-1">
                  (
                  {
                    calculateMaintenanceDate(
                      item.createdAt,
                      item.operatingHours
                    ).daysLeft
                  }{" "}
                  days{" "}
                  {calculateMaintenanceDate(item.createdAt, item.operatingHours)
                    .daysLeft < 0
                    ? "overdue"
                    : "left"}
                  )
                </span>
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <EditDialog
                    equipment={item}
                    onUpdate={() => fetchEquipment()}
                  />

                  <DeleteDialog
                    equipment={item}
                    onDelete={() => fetchEquipment()}
                  />
                  <LogHoursDialog
                    equipment={item}
                    onUpdate={() => fetchEquipment()}
                  />
                  <WorkingHoursHistoryDialog equipmentId={item.id} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Pagination className="mt-4">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            />
          </PaginationItem>
          {[...Array(totalPages)].map((_, index) => (
            <PaginationItem key={index}>
              <PaginationLink
                onClick={() => setCurrentPage(index + 1)}
                isActive={currentPage === index + 1}
              >
                {index + 1}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
