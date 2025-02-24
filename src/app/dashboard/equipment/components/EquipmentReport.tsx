"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { calculateRemainingHours, formatHours } from "@/utils";
import { FIREBASE_COLLECTIONS } from "@/enums/collections";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Task } from "@/interfaces/task";
import { Equipment } from "@/interfaces/equipment";
import { Chart, registerables } from "chart.js";
import { Bar } from "react-chartjs-2";
import { toPng } from "html-to-image";
import { uploadReport } from "@/lib/reports";

const getStatusColor = (status: string): number[] => {
  switch (status.toLowerCase()) {
    case "completed":
      return [34, 197, 94]; // #22c55e in RGB
    case "scheduled":
      return [245, 158, 11]; // #f59e0b in RGB
    default:
      return [156, 163, 175]; // Default gray
  }
};

export const getUnitByAssetType = (assetType: string) => {
  switch (assetType?.toLowerCase()) {
    case "km":
      return "Kilometers";
    case "dav":
      return "Dav";
    case "hr":
      return "Hours";
    default:
      return "Hours";
  }
};

const filterTasksStatusCount = (tasks: Task[], status: string) => {
  return tasks.filter((task) => task.status === status).length;
};

export function EquipmentReportButton({ equipment }: { equipment: Equipment }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [chartData, setChartData] = useState<any>(null);

  const getEquipmentUsage = async (equipmentId: string) => {
    try {
      const usageQuery = query(
        collection(db, FIREBASE_COLLECTIONS.EQUIPMENT_USAGE),
        where("equipmentId", "==", equipmentId)
      );
      const snapshot = await getDocs(usageQuery);

      if (snapshot.empty) return { usage: [], maintenances: [] };

      return snapshot.docs[0].data();
    } catch (error) {
      console.error("Error fetching usage data:", error);
      return { usage: [], maintenances: [] };
    }
  };

  const fetchEquipmentUsage = async () => {
    try {
      const usageQuery = query(
        collection(db, FIREBASE_COLLECTIONS.EQUIPMENT_USAGE),
        where("equipmentId", "==", equipment.id)
      );
      const snapshot = await getDocs(usageQuery);

      if (!snapshot.empty) {
        const usageRecords = snapshot.docs[0].data().usage || [];
        const last7Days = getLast7DaysUsage(usageRecords);
        setChartData(last7Days);
      }
    } catch (error) {
      console.error("Error fetching usage data:", error);
    }
  };

  const getLast7DaysUsage = (usageRecords: any[]) => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(today.getDate() - i);
      const formattedDate = format(date, "yyyy-MM-dd");

      const hoursWorked =
        usageRecords.find((record: any) => record.date === formattedDate)
          ?.hoursWorked || 0;

      return { date: formattedDate, hoursWorked };
    }).reverse();
  };

  const getMaintenanceTasks = async (equipmentId: string) => {
    try {
      const tasksQuery = query(
        collection(db, FIREBASE_COLLECTIONS.TASKS),
        where("equipmentId", "==", equipmentId)
      );
      const snapshot = await getDocs(tasksQuery);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Task[];
    } catch (error) {
      console.error("Error fetching tasks:", error);
      return [];
    }
  };

  const generateReport = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const usageData = await getEquipmentUsage(equipment.id);
      const tasks = await getMaintenanceTasks(equipment.id);
      const remainingHours = await calculateRemainingHours(equipment);

      // Header section with logo and company info
      doc.setFillColor(244, 244, 244);
      doc.rect(0, 0, doc.internal.pageSize.width, 30, "F");
      doc.addImage("/logo-removebg.png", "PNG", 14, 5, 30, 20);

      // Report title and metadata
      doc.setFontSize(16);
      doc.setTextColor(51, 51, 51);
      doc.text("Working Order", doc.internal.pageSize.width / 2, 20, {
        align: "center",
      });
      doc.setFontSize(8);
      doc.text(
        `Generated on: ${format(new Date(), "PPP")}`,
        doc.internal.pageSize.width - 14,
        10,
        { align: "right" }
      );

      // Equipment Information Table
      const previousHours =
        usageData.maintenances?.[0]?.previousHours || equipment.operatingHours;
      const cumulativeHours =
        usageData.usage?.reduce(
          (sum: any, record: any) => sum + (record.hoursWorked || 0),
          0
        ) || 0;
      const unit = getUnitByAssetType(equipment.assetType);

      autoTable(doc, {
        startY: 35,
        head: [["Equipment Details", "Value"]],
        body: [
          ["Name", equipment.name || "N/A"],
          ["Serial Number", equipment.serialNumber || "N/A"],
          ["Asset Number", equipment.assetNumber || "N/A"],
          ["Type", getUnitByAssetType(equipment.assetType) || "N/A"],
          ["Location", equipment.location || "N/A"],
          ["Status", equipment.status.toUpperCase() || "N/A"],
          ["Previous Reading", `${previousHours} ${unit}` || "N/A"],
          [`Cumulative ${unit}`, `${cumulativeHours} ${unit}` || "N/A"],
          [
            "Next Reading for PMP",
            `${equipment.operatingHours} ${unit}` || "N/A",
          ],
          [`Remaining ${unit}`, `${remainingHours.hoursLeft} ${unit}` || "N/A"],
        ],
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: "bold",
        },
      });

      // Tasks History Table
      if (tasks.length > 0) {
        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY + 5,
          head: [
            ["Due Date", "Materials used", "Qty", "Unit", "Status", "Notes"],
          ],
          body: tasks.map((task) => [
            format(new Date(task.dueDate), "PP"),
            task.resources || "N/A",
            task.quantity || "N/A",
            task.unit || "N/A",
            {
              content: task.status.toUpperCase(),
              styles: {
                fillColor: getStatusColor(task.status),
                textColor: 255,
                fontStyle: "bold",
                halign: "center",
              },
            },
            task.notes || "N/A",
          ]) as any,
          theme: "striped",
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
          },
        });

        // Add statistics
        doc.setFontSize(8);
        doc.text(
          `Total Maintenance Tasks: ${
            tasks.length
          } (Completed: ${filterTasksStatusCount(
            tasks,
            "completed"
          )}, Scheduled: ${filterTasksStatusCount(tasks, "scheduled")})`,
          14,
          (doc as any).lastAutoTable.finalY + 5
        );
      }

      // Working Hours History Table
      if (usageData.usage?.length > 0) {
        const sortedUsage = [...usageData.usage].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY + 15,
          head: [["Date", `Usage (${unit})`, `Cumulative (${unit})`]],
          body: sortedUsage.map((entry: any, index) => {
            const cumulativeToDate = sortedUsage
              .slice(index)
              .reduce((sum, record) => sum + record.hoursWorked, 0);
            return [
              format(new Date(entry.date), "PP"),
              `${entry.hoursWorked} ${unit}`,
              `${cumulativeToDate} ${unit}`,
            ];
          }),
          theme: "striped",
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
          },
        });
      }

      // Add footer
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Page 1 of 1`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: "center" }
      );

      // Save and upload
      const fileName = `${equipment.name}-report-${format(
        new Date(),
        "yyyy-MM-dd"
      )}`;
      doc.save(`${fileName}.pdf`);

      const pdfBlob = doc.output("blob");
      await uploadReport(pdfBlob, {
        type: "equipment",
        equipmentId: equipment.serialNumber,
        equipmentName: equipment.name,
        generatedBy: "admin",
      });

      toast({
        title: "Report Generated",
        description: "Equipment report has been generated successfully.",
      });
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      variant={"ghost"}
      onClick={generateReport}
      disabled={isGenerating}
      title="Generate Report"
    >
      {isGenerating ? (
        "Generating Details..."
      ) : (
        <>
          <FileText className="text-xl" />
        </>
      )}
    </Button>
  );
}
