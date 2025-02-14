"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PlusCircle, Search } from "lucide-react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
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
import dayjs from "dayjs";
import { FIREBASE_COLLECTIONS } from "@/enums/collections";
import { DeleteDialog } from "./components/DeleteDialog";
import { CompleteTaskDialog } from "./components/ComplateTaskDialog";
import { Badge } from "@/components/ui/badge";

const statusBadge = (status: "scheduled" | "completed") => {
  if (status === "completed") {
    return (
      <Badge variant="default" className="bg-green-500">
        Completed
      </Badge>
    );
  } else if (status === "scheduled") {
    return (
      <Badge variant="default" className="bg-amber-500">
        Scheduled
      </Badge>
    );
  } else {
    return <Badge variant="destructive">Unknows</Badge>;
  }
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchTasks = async () => {
    try {
      const querySnapshot = await getDocs(
        collection(db, FIREBASE_COLLECTIONS.TASKS)
      );
      const tasksData = await Promise.all(
        querySnapshot.docs.map(async (docSnapshot) => {
          const task: any = { id: docSnapshot.id, ...docSnapshot.data() };
          // Fetch the corresponding equipment details
          if (task.equipmentId) {
            const equipmentDoc = await getDoc(
              doc(db, FIREBASE_COLLECTIONS.EQUIPMENTS, task.equipmentId)
            );
            if (equipmentDoc.exists()) {
              task.equipment = {
                id: equipmentDoc.id,
                ...equipmentDoc.data(),
              };
            } else {
              task.equipment = null; // Handle missing equipment
            }
          }

          return task;
        })
      );

      setTasks(tasksData);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const filteredTasks = tasks.filter((task) =>
    Object.values(task).some((value) =>
      value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTasks = filteredTasks.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);

  const isCloseToDueDate = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const differenceInDays = Math.ceil(
      (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return differenceInDays <= 7;
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Maintenance Tasks</h1>
        <Button asChild>
          <Link href="/dashboard/tasks/add">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Task
          </Link>
        </Button>
      </div>

      <div className="flex items-center mb-4">
        <Input
          placeholder="Search tasks..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {loading ? (
        <p className="text-center text-gray-500">Loading tasks...</p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipment</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentTasks.map((task) => (
                <TableRow
                  key={task.id}
                  className={
                    isCloseToDueDate(task.dueDate) &&
                    task.status !== "completed"
                      ? "bg-red-100"
                      : ""
                  }
                >
                  <TableCell>
                    {task.equipment ? (
                      <div className="flex items-center space-x-3">
                        <img
                          src={task.equipment.imageUrl}
                          alt={task.equipment.name}
                          className="w-10 h-10 rounded bg-transparent"
                        />
                        <div>
                          <p className="font-semibold">{task.equipment.name}</p>
                          <p className="text-gray-500 text-sm">
                            {task.equipment.assetNumber}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-red-500">No Equipment</span>
                    )}
                  </TableCell>
                  <TableCell>{task.maintenanceType}</TableCell>
                  <TableCell>
                    {dayjs(task.dueDate).format("MMM D, YYYY")}{" "}
                  </TableCell>
                  <TableCell>{statusBadge(task.status)}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {task.notes}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {/* <EditDialog
                                      equipment={item}
                                      onUpdate={() => fetchEquipment()}
                                    /> */}

                      <DeleteDialog task={task} onDelete={() => fetchTasks()} />
                      {task.status !== "completed" && (
                        <CompleteTaskDialog
                          task={task}
                          onUpdate={() => fetchTasks()}
                        />
                      )}
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
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
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
        </>
      )}
    </div>
  );
}
