import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

export const generatePDF = async (values: any, poNumber: string) => {
  const doc = new jsPDF();
  const currentDate = format(new Date(), "yyyy-MM-dd");
  // Add report header with logo and company info
  doc.setFillColor(244, 244, 244);
  doc.rect(0, 0, doc.internal.pageSize.width, 40, "F");
  doc.addImage("/logo-removebg.png", "PNG", 14, 10, 30, 20);
  doc.setFontSize(20);
  doc.setTextColor(51, 51, 51);
  doc.text("Purchase Order", doc.internal.pageSize.width / 2, 25, {
    align: "center",
  });
  doc.setFontSize(10);
  doc.text(
    `Generated on: ${format(new Date(), "PPP")}`,
    doc.internal.pageSize.width - 14,
    15,
    { align: "right" }
  );

  // PO Details
  autoTable(doc, {
    startY: 50,
    head: [["PO Number", "Date", "Vendor", "Payment Terms", "Delivery Date"]],
    body: [
      [
        poNumber,
        currentDate,
        values.vendor,
        values.paymentTerms,
        values.deliveryDate,
      ],
    ],
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: "bold",
    },
  });

  // Items Table
  autoTable(doc, {
    //@ts-ignore
    startY: doc.lastAutoTable.finalY + 10,
    head: [
      [
        "Material",
        "Description",
        "Quantity",
        "Unit",
        "Unit Cost",
        "Line Total",
      ],
    ],
    body: values.items.map((item:any) => [
      item.material,
      item.description,
      item.quantity,
      item.unit,
      item.unitCost,
      item.lineTotal,
    ]),
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: "bold",
    },
  });

  // Totals
  autoTable(doc, {
    //@ts-ignore
    startY: doc.lastAutoTable.finalY + 10,
    head: [["Subtotal", "Tax Rate", "Tax Amount", "Shipping Cost", "Total"]],
    body: [
      [
        values.subtotal,
        values.taxRate,
        values.taxAmount + "%",
        values.shippingCost,
        values.total,
      ],
    ],
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: "bold",
    },
  });

  doc.save(`purchase-order-${poNumber}.pdf`);
};
