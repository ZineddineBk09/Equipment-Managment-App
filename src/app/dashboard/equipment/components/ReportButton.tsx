"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Equipment } from "@/interfaces/equipment";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { calculateMaintenanceDate } from "@/utils";
import { FIREBASE_COLLECTIONS } from "@/enums/collections";
import { toast } from "@/hooks/use-toast";

interface ReportButtonProps {
  equipment: Equipment[];
}

export function ReportButton({ equipment }: ReportButtonProps) {
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

      return `${totalActiveHours.toFixed(2)} hours`;
    } catch (error) {
      console.error("Error fetching usage data:", error);
      return "N/A";
    }
  };

  /**
   * Generates a PDF report including equipment details
   * and their total active hours.
   */
  const generateReport = async () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Equipment Report", 14, 22);

    // Prepare table data asynchronously
    const tableBody = await Promise.all(
      equipment.map(async (item, index) => {
        const maintenanceInfo = calculateMaintenanceDate(
          item.createdAt,
          item.operatingHours
        );
        const nextMaintenanceText = `${maintenanceInfo.date} (${
          maintenanceInfo.daysLeft
        } days ${maintenanceInfo.daysLeft < 0 ? "overdue" : "left"})`;

        return [
          index + 1,
          item.name,
          item.serialNumber,
          item.location,
          item.status,
          nextMaintenanceText,
          await getEquipmentCumulativeHours(item.id), // Fetch cumulative active hours
        ];
      })
    );

    autoTable(doc, {
      startY: 30,
      head: [
        [
          "#",
          "Name",
          "Serial Number",
          "Location",
          "Status",
          "Next Maintenance Date",
          "Active Hours",
        ],
      ],
      body: tableBody,
      didParseCell: function (data) {
        if (
          data.column.index === 4 &&
          data?.cell?.raw?.toString().includes("overdue")
        ) {
          data.cell.styles.textColor = [255, 0, 0]; // Red color for overdue maintenance
        }
      },
    });

    // Notes Section
    const notes = [
      "This report includes cumulative hours for each equipment.",
      "Active hours represent the total time the equipment was in use.",
      "Maintenance hours represent the total time the equipment was under maintenance.",
      "Decommissioned hours represent the total time the equipment was out of service.",
      "All times are calculated based on recorded usage history.",
    ];

    // Set font size for notes
    doc.setFontSize(12);
    doc.text("Notes:", 14, (doc as any).lastAutoTable.finalY + 20);

    // Add bullet points for notes
    notes.forEach((note, index) => {
      doc.text(
        `• ${note}`,
        20,
        (doc as any).lastAutoTable.finalY + 30 + index * 10
      );
    });

    // Save the PDF
    doc.save("equipment-report.pdf");

    toast({
      title: "Report Generated",
      description:
        "Equipment report has been successfully generated. Please check your downloads.",
    });
  };

  return (
    <Button onClick={generateReport}>
      <Download className="mr-2 h-4 w-4" /> Generate Report
    </Button>
  );
}
