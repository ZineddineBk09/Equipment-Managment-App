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
import {
  addDoc,
  collection,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase"; // Import Firestore
import { deleteDoc, doc } from "firebase/firestore";
import Image from "next/image";
import { Equipment } from "@/interfaces/equipment";
import { EditDialog } from "./components/EditDialog";
import { DeleteDialog } from "./components/DeleteDialog";
import { LogHoursDialog } from "./components/LogHours";
import { ReportButton } from "./components/ReportButton";
import { cn } from "@/lib/utils";
import { calculateRemainingHours, formatHours } from "@/utils";
import { FIREBASE_COLLECTIONS } from "@/enums/collections";
import { WorkingHoursHistoryDialog } from "./components/WorkingHoursHistoryDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { EquipmentReportButton } from "./components/EquipmentReport";
import { useSearchParams } from "next/navigation";
import withAuth from "@/lib/hocs/withAuth";
import { FIREBASE_RESOURCES, USER_ROLES } from "@/enums/resources";

const statusBadge = (status: "active" | "maintenance" | "decommissioned") => {
  if (status.toLocaleLowerCase() === "active") {
    return (
      <Badge variant="default" className="bg-green-500">
        Active
      </Badge>
    );
  } else if (status.toLocaleLowerCase() === "maintenance") {
    return (
      <Badge variant="default" className="bg-amber-500">
        Maitenance
      </Badge>
    );
  } else if (status.toLocaleLowerCase() === "decommissioned") {
    return <Badge variant="destructive">Decommissioned</Badge>;
  } else {
    return <Badge variant="destructive">Unknown</Badge>;
  }
};

const ITEMS_PER_PAGE = 10;

function EquipmentPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [lockCreateTask, setLockCreateTask] = useState(false);
  // read search from url query params
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";

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

  // Add handler for batch deletion
  const handleBatchDelete = async () => {
    try {
      await Promise.all(
        selectedItems.map(async (id) =>
          // deleteDoc(doc(db, FIREBASE_COLLECTIONS.EQUIPMENTS, id))
          {
            // Delete the associated equipment usage records
            const equipmentUsageQuery = query(
              collection(db, FIREBASE_COLLECTIONS.EQUIPMENT_USAGE),
              where("equipmentId", "==", id)
            );
            const equipmentUsageSnap = await getDocs(equipmentUsageQuery);
            equipmentUsageSnap.forEach(async (doc) => {
              await deleteDoc(doc.ref);
            });

            // Delete the associated maintenance tasks
            const taskQuery = query(
              collection(db, FIREBASE_COLLECTIONS.TASKS),
              where("equipmentId", "==", id)
            );
            const taskSnap = await getDocs(taskQuery);
            taskSnap.forEach(async (doc) => {
              await deleteDoc(doc.ref);
            });

            await deleteDoc(doc(db, FIREBASE_COLLECTIONS.EQUIPMENTS, id));
          }
        )
      );

      toast({
        title: "Success",
        description: `Successfully deleted ${selectedItems.length} items`,
      });

      setSelectedItems([]); // Clear selection
      fetchEquipment(); // Refresh list
    } catch (error) {
      console.error("Error batch deleting:", error);
      toast({
        title: "Error",
        description: "Failed to delete selected items",
        variant: "destructive",
      });
    }
  };

  // Add selection handlers
  const toggleSelectAll = () => {
    if (selectedItems.length === currentEquipment.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(currentEquipment.map((item) => item.id));
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    fetchEquipment();
  }, []);

  useEffect(() => {
    // get remaining hours and add to equipment
    if (equipment.length > 0) {
      const getRemainingHours = async () => {
        const equipmentWithRemainingHours = await Promise.all(
          equipment.map(async (item) => {
            const remainingHours = await calculateRemainingHours(item);
            return {
              ...item,
              remainingHours: remainingHours.hoursLeft,
            };
          })
        );
        setEquipment(equipmentWithRemainingHours);
      };
      getRemainingHours();
    }
  }, [equipment]);

  useEffect(() => {
    setSearchTerm(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const createMaintenanceTasks = async () => {
      if (equipment.length > 0) {
        // Get equipment that needs maintenance and doesn't have an active maintenance task
        const equipmentToMaintain = equipment.filter(
          (item) =>
            Number(item?.remainingHours) < 1 && item.status !== "maintenance" // Only create tasks for non-maintenance equipment
        );

        if (equipmentToMaintain.length > 0) {
          try {
            setLockCreateTask(true);
            // Create maintenance tasks in a single batch
            const batch = equipmentToMaintain.map(async (item) => {
              // Check if there's already a pending maintenance task
              const existingTaskQuery = query(
                collection(db, FIREBASE_COLLECTIONS.TASKS),
                where("equipmentId", "==", item.id),
                where("status", "==", "Scheduled")
              );
              const existingTasks = await getDocs(existingTaskQuery);

              if (existingTasks.empty) {
                // Only create new task if none exists
                const taskData = {
                  maintenanceType: "Automated",
                  dueDate: new Date().toISOString(),
                  notes: `Perform maintenance for ${item.name}`,
                  status: "Scheduled",
                  equipmentId: item.id,
                  createdAt: new Date().toISOString(),
                  resources: [],
                };

                await Promise.all([
                  addDoc(collection(db, FIREBASE_COLLECTIONS.TASKS), taskData),
                  updateDoc(doc(db, FIREBASE_COLLECTIONS.EQUIPMENTS, item.id), {
                    status: "maintenance",
                  }),
                ]);
              }
            });

            await Promise.all(batch);

            toast({
              title: "Maintenance Required",
              description: `Maintenance tasks created for ${equipmentToMaintain.length} equipment`,
            });

            // Use a flag to prevent infinite loops
            if (!equipment.some((item) => item.status === "maintenance")) {
              fetchEquipment();
            }
          } catch (error) {
            console.error("Error creating maintenance tasks:", error);
            toast({
              title: "Error",
              description: "Failed to create maintenance tasks",
              variant: "destructive",
            });
          }
        }
      }
      // setLockCreateTask(false);
    };

    // createMaintenanceTasks();
    if (!lockCreateTask) {
      createMaintenanceTasks();
    }
  }, [equipment]);

  // Filter equipment based on search term
  const filteredEquipment = equipment.filter((item) =>
    Object.values(item).some((value) =>
      value.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Pagination logic
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentEquipment = filteredEquipment.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
  const totalPages = Math.ceil(filteredEquipment.length / ITEMS_PER_PAGE);

  if (loading) {
    return <div className="container mx-auto py-10">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Equipment List</h1>
        <div className="flex items-center space-x-2">
          {selectedItems.length > 0 && (
            <Button variant="destructive" onClick={handleBatchDelete}>
              Delete Selected ({selectedItems.length})
            </Button>
          )}
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
            <TableHead className="w-12">
              <Checkbox
                checked={selectedItems.length === currentEquipment.length}
                onCheckedChange={toggleSelectAll}
              />
            </TableHead>
            <TableHead>#</TableHead>
            <TableHead>Image</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Serial Number</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Maintenance Schedule</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {currentEquipment.map((item, index) => (
            <TableRow
              key={item.id}
              className={cn(
                Number(item?.remainingHours) < 1 &&
                  "bg-red-100 hover:bg-red-100"
              )}
            >
              {" "}
              <TableCell>
                <Checkbox
                  checked={selectedItems.includes(item.id)}
                  onCheckedChange={() => toggleSelectItem(item.id)}
                />
              </TableCell>
              <TableCell className="font-bold">
                {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
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
              <TableCell>
                {item?.remainingHours} {item.assetType}
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
                  <WorkingHoursHistoryDialog
                    equipment={item}
                    onUpdate={() => fetchEquipment()}
                  />
                  <EquipmentReportButton equipment={item} />
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

export default withAuth(EquipmentPage, {
  requiredRole: USER_ROLES.VIEWER,
  requiredPermissions: [
    FIREBASE_RESOURCES.EQUIPMENTS + ":view",
    FIREBASE_RESOURCES.EQUIPMENTS + ":edit",
  ],
});
