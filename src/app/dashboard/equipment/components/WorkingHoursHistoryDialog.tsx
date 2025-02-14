"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FIREBASE_COLLECTIONS } from "@/enums/collections";
import { History } from "lucide-react";

export function WorkingHoursHistoryDialog({
  equipmentId,
}: {
  equipmentId: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<
    { timestamp: string; hours: number }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const usageQuery = query(
          collection(db, FIREBASE_COLLECTIONS.EQUIPMENT_USAGE),
          where("equipmentId", "==", equipmentId)
        );
        const querySnapshot = await getDocs(usageQuery);

        if (!querySnapshot.empty) {
          const usageData = querySnapshot.docs
            .map((doc) => doc.data().usage)
            .flat();
          setHistory(
            usageData.sort(
              (a, b) =>
                new Date(b.timestamp).getTime() -
                new Date(a.timestamp).getTime()
            )
          );
        }
      } catch (error) {
        console.error("Error fetching usage history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [isOpen, equipmentId]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" title="Set Working Hours">
          <History className="text-amber-500 text-xl" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Equipment Usage History</DialogTitle>
          <DialogDescription>Daily logged operating hours.</DialogDescription>
        </DialogHeader>
        <div className="max-h-80 overflow-auto">
          {loading ? (
            <p>Loading...</p>
          ) : history.length === 0 ? (
            <p>No history found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Hours Worked</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((entry: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell>
                      {new Date(entry.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{entry.hoursWorked} hrs</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
