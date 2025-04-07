"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Equipment } from "@/interfaces/equipment";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  calculateMaintenanceDate,
  calculateRemainingHours,
  formatHours,
} from "@/utils";
import { FIREBASE_COLLECTIONS } from "@/enums/collections";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Task } from "@/interfaces/task";
import { uploadReport } from "@/lib/reports";
import { getUnitByAssetType } from "./EquipmentReport";
import { useUser } from "@/hooks/use-user";

export const getStatusColor = (status: string): number[] => {
  switch (status.toLowerCase()) {
    case "active":
      return [34, 197, 94]; // #22c55e in RGB
    case "maintenance":
      return [245, 158, 11]; // #f59e0b in RGB
    case "decommissioned":
      return [239, 68, 68]; // #ef4444 in RGB
    default:
      return [156, 163, 175]; // Default gray
  }
};

export function ReportButton({ equipment }: { equipment: Equipment[] }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { user } = useUser();
  /**
   * Fetches and calculates the total active hours for a given equipment
   * by summing up `hoursWorked` from the `usage` array in Firestore.
   */
  const getEquipmentCumulativeHours = async (equipmentId: string) => {
    try {
      // Query equipment usage collection for the specific equipmentId
      const equipmentUsageQuery = query(
        collection(db, FIREBASE_COLLECTIONS.EQUIPMENT_USAGE),
        where("equipmentId", "==", equipmentId)
      );

      const querySnapshot = await getDocs(equipmentUsageQuery);

      if (querySnapshot.empty) {
        return "0 hours"; // No data found
      }

      // Get the first document (assuming one document per equipment)
      const usageData = querySnapshot.docs[0].data();

      const usageRecords = usageData?.usage || [];

      // Sum all `hoursWorked`
      const totalActiveHours = usageRecords.reduce(
        (sum: number, record: any) => sum + (record.hoursWorked || 0),
        0
      );

      return `${totalActiveHours.toFixed(2)} ${getUnitByAssetType(
        equipment.filter((eq) => eq.id === equipmentId)[0].assetType
      )}`;
    } catch (error) {
      console.error("Error fetching usage data:", error);
      return "N/A";
    }
  };

  // Fetch maintenance history for specific equipment
  const getEquipmentMaintenanceHistory = async (equipmentId: string) => {
    try {
      const maintenanceQuery = query(
        collection(db, FIREBASE_COLLECTIONS.TASKS),
        where("equipmentId", "==", equipmentId)
        // where("status", "==", "completed"),
        // orderBy("completedAt", "desc")
        // limit(5) // Get last 5 maintenance records
      );

      const querySnapshot = await getDocs(maintenanceQuery);
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Task[];
    } catch (error) {
      console.error("Error fetching maintenance history:", error);
      return [];
    }
  };

  // ... existing getEquipmentCumulativeHours function ...

  const generateReport = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();

      // Add report header with logo and company info
      doc.setFillColor(244, 244, 244);
      doc.rect(0, 0, doc.internal.pageSize.width, 40, "F");

      // Company logo (assuming you have a logo.png in public folder)
      doc.addImage("/logo-report.png", "PNG", 14, 10, 30, 20);

      // Report title and date
      doc.setFontSize(20);
      doc.setTextColor(51, 51, 51);
      doc.text("Equipment Status Report", doc.internal.pageSize.width / 2, 25, {
        align: "center",
      });
      doc.setFontSize(10);
      doc.text(
        `Generated on: ${format(new Date(), "PPP")}`,
        doc.internal.pageSize.width - 14,
        15,
        { align: "right" }
      );

      // Equipment Summary Table
      const tableBody = await Promise.all(
        equipment.map(async (item, index) => {
          // const maintenanceInfo = calculateMaintenanceDate(
          //   item.createdAt,
          //   item.operatingHours
          // );
          const maintenanceInfo = await calculateRemainingHours(item);
          return [
            index + 1,
            {
              content: item.name,
              styles: { cellWidth: 25 },
            },
            item.serialNumber,
            {
              content: item.status.toUpperCase(),
              styles: {
                fillColor: getStatusColor(item.status),
                textColor: 255,
                fontStyle: "bold",
                halign: "center",
              },
            },
            item.location,
            await getEquipmentCumulativeHours(item.id),
            formatHours(maintenanceInfo.hoursLeft, item.assetType),
          ];
        })
      );

      autoTable(doc, {
        startY: 50,
        head: [
          [
            "#",
            "Name",
            "Serial Number",
            "Status",
            "Location",
            "Active Hours",
            "Next Maintenance",
          ],
        ],
        body: tableBody as any,
        theme: "grid",
        styles: {
          fontSize: 9,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: "bold",
        },
      });

      // Generate detailed maintenance history for each equipment
      for (const item of equipment) {
        doc.addPage();

        // Simple header with equipment name and serial
        doc.setFontSize(14);
        doc.setTextColor(44, 62, 80);
        doc.text(
          `${item.name} - ${item.serialNumber}`,
          doc.internal.pageSize.width / 2,
          20,
          { align: "center" }
        );

        // Equipment Details Table
        const remainingHours = await calculateRemainingHours(item);
        const cumulativeHours = await getEquipmentCumulativeHours(item.id);
        const unit = item.assetType?.toLowerCase() || "hours";

        autoTable(doc, {
          startY: 30,
          head: [["Equipment Details", "Value"]],
          body: [
            ["Asset Number", item.assetNumber || "N/A"],
            ["Location", item.location || "N/A"],
            ["Type", item.assetType?.toUpperCase() || "N/A"],
            [
              "Status",
              {
                content: item.status.toUpperCase(),
                styles: {
                  fillColor: getStatusColor(item.status),
                  textColor: 255,
                  fontStyle: "bold",
                  halign: "center",
                },
              } as any,
            ],
            [
              getUnitByAssetType(item.assetType),
              `${item.operatingHours} ${unit}`,
            ],
            ["Cumulative Usage", cumulativeHours],
            [
              "Next Maintenance",
              formatHours(remainingHours.hoursLeft, item.assetType),
            ],
          ],
          theme: "grid",
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            fontStyle: "bold",
          },
        });

        // Maintenance History Table
        const maintenanceHistory = await getEquipmentMaintenanceHistory(
          item.id
        );

        if (maintenanceHistory.length > 0) {
          autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 5,
            head: [["Date", "Type", "Status", "Notes"]],
            body: maintenanceHistory.map((record) => [
              format(new Date(record.dueDate), "PP"),
              record.maintenanceType || "N/A",
              {
                content: record.status.toUpperCase(),
                styles: {
                  fillColor: getStatusColor(record.status),
                  textColor: 255,
                  fontStyle: "bold",
                  halign: "center",
                },
              },
              record.notes || "N/A",
            ]) as any,
            theme: "striped",
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: {
              fillColor: [41, 128, 185],
              textColor: 255,
            },
          });

          // Add maintenance statistics
          doc.setFontSize(8);
          doc.text(
            `Total Maintenance Tasks: ${maintenanceHistory.length}`,
            14,
            (doc as any).lastAutoTable.finalY + 5
          );
        } else {
          doc.setFontSize(10);
          doc.text(
            "No maintenance history available",
            14,
            (doc as any).lastAutoTable.finalY + 10
          );
        }
      }

      // Add page numbers
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Page ${i} of ${pageCount}`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 10,
          { align: "center" }
        );
      }

      // Save and upload
      const fileName = `equipment-report-${format(new Date(), "yyyy-MM-dd")}`;
      doc.save(`${fileName}.pdf`);

      const pdfBlob = doc.output("blob");
      await uploadReport(pdfBlob, {
        type: "general",
        generatedBy: user.email,
      });

      toast({
        title: "Report Generated & Saved in Archive",
        description: "Equipment report has been successfully generated.",
      });
    } catch (error) {
      console.error("Error generating report:", error);
      // toast({
      //   title: "Error",
      //   description: "Failed to generate report. Please try again.",
      //   variant: "destructive",
      // });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button onClick={generateReport} disabled={isGenerating}>
      {isGenerating ? (
        "Generating Report..."
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" /> Generate Report
        </>
      )}
    </Button>
  );
}
