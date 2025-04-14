"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Send, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useUser } from "@/hooks/use-user";

// Mock recipient groups
const recipientGroups = [
  { id: "management", name: "Management Team" },
  { id: "technicians", name: "Technicians" },
  { id: "vendors", name: "Vendors" },
  { id: "clients", name: "Clients" },
];

// Mock individual recipients
const individualRecipients = [
  {
    id: "user1",
    name: "John Doe",
    email: "john.doe@example.com",
    department: "Engineering",
  },
  {
    id: "user2",
    name: "Jane Smith",
    email: "jane.smith@example.com",
    department: "Operations",
  },
  {
    id: "user3",
    name: "Mike Johnson",
    email: "mike.johnson@example.com",
    department: "Maintenance",
  },
  {
    id: "user4",
    name: "Sarah Williams",
    email: "sarah.williams@example.com",
    department: "Administration",
  },
  {
    id: "user5",
    name: "David Brown",
    email: "david.brown@example.com",
    department: "Engineering",
  },
];

// Email templates
const emailTemplates = [
  {
    id: "maintenance",
    name: "Maintenance Notification",
    subject: "Scheduled Maintenance Notification",
    body: "Dear recipient,\n\nThis is to inform you that scheduled maintenance will be performed on [Equipment] on [Date]. Please ensure that the equipment is available during this time.\n\nThank you,\n[Your Name]",
  },
  {
    id: "report",
    name: "Monthly Report",
    subject: "Monthly Maintenance Report",
    body: "Dear recipient,\n\nAttached is the monthly maintenance report for [Month]. Please review and let me know if you have any questions.\n\nBest regards,\n[Your Name]",
  },
  {
    id: "alert",
    name: "Equipment Alert",
    subject: "URGENT: Equipment Issue Alert",
    body: "Dear recipient,\n\nThis is to alert you that [Equipment] has reported an issue that requires immediate attention. The issue details are as follows:\n\n[Issue Details]\n\nPlease address this as soon as possible.\n\nRegards,\n[Your Name]",
  },
];

// Form schema
const formSchema = z.object({
  subject: z.string().min(1, { message: "Subject is required" }),
  message: z
    .string()
    .min(10, { message: "Message must be at least 10 characters" }),
  template: z.string().optional(),
});

export default function EmailPage() {
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const { user } = useUser();

  // Generate email reference number and date
  const emailRefNumber = `Message-${new Date().getFullYear()}-${Math.floor(
    1000 + Math.random() * 9000
  )}`;
  const currentDate = format(new Date(), "yyyy-MM-dd");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subject: "",
      message: "",
    },
  });

  // Handle template selection
  const onTemplateChange = (templateId: string) => {
    const template = emailTemplates.find((t) => t.id === templateId);
    if (template) {
      form.setValue("subject", template.subject);
      form.setValue("message", template.body);
    }
  };

  // Generate PDF report
  const generatePDF = async (values: z.infer<typeof formSchema>) => {
    setIsGeneratingPDF(true);

    // Simulate PDF generation delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const doc = new jsPDF();
    const currentDate = format(new Date(), "yyyy-MM-dd");

    // ===== Document Setup =====
    doc.setProperties({
      title: `Communication Report ${emailRefNumber}`,
    });
    doc.setFont("helvetica", "normal");

    // ===== Generate QR Code =====
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=50x50&data=${emailRefNumber}`;

    // ===== Header Section =====
    // Company Logo (Left Side)
    // doc.addImage("/logo-report.png", "PNG", 15, 5, 30, 15);
    doc.addImage("/logo-removebg.png", "PNG", 15, 4, 30, 30);

    // QR Code (Right Side)
    doc.addImage(qrCodeUrl, "PNG", doc.internal.pageSize.width - 40, 5, 30, 30);

    // Company details (Centered below logo and QR)
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(
      "EQUIPMENT MAINTENANCE MANAGEMENT SYSTEM",
      doc.internal.pageSize.width / 2,
      25,
      {
        align: "center",
      }
    );
    doc.text(
      "123 Maintenance Street, Industrial Zone, 12345",
      doc.internal.pageSize.width / 2,
      30,
      {
        align: "center",
      }
    );
    doc.text(
      "admin@maintenancesystem.com | +1-234-567-8900",
      doc.internal.pageSize.width / 2,
      35,
      {
        align: "center",
      }
    );

    // Document Title (Below company info)
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("COMMUNICATION REPORT", doc.internal.pageSize.width / 2, 45, {
      align: "center",
    });

    // Email Reference Number and Date (Below title)
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Reference: #${emailRefNumber}`, 15, 55);
    doc.text(`Date: ${currentDate}`, doc.internal.pageSize.width - 15, 55, {
      align: "right",
    });

    // Horizontal line separator
    doc.setDrawColor(200, 200, 200);
    doc.line(15, 60, doc.internal.pageSize.width - 15, 60);

    // ===== Email Details Section =====
    autoTable(doc, {
      startY: 65,
      head: [
        [
          {
            content: "MESSAGE DETAILS",
            colSpan: 2,
            styles: {
              halign: "center",
              fillColor: [51, 51, 51],
              textColor: 255,
              fontStyle: "bold",
            },
          },
        ],
      ],
      body: [
        [
          { content: "Subject:", styles: { fontStyle: "bold" } },
          values.subject,
        ],
        [
          { content: "Sent By:", styles: { fontStyle: "bold" } },
          user?.email || "N/A",
        ],
      ],
      theme: "grid",
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 140 },
      },
    });

    // ===== Message Content =====
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(
      "MESSAGE CONTENT",
      doc.internal.pageSize.width / 2,
      //@ts-ignore
      doc.autoTable.previous.finalY + 10,
      {
        align: "center",
      }
    );

    autoTable(doc, {
      //@ts-ignore
      startY: doc.autoTable.previous.finalY + 15,
      body: [[values.message]],
      theme: "plain",
      styles: {
        fontSize: 8,
        cellPadding: 5,
        overflow: "linebreak",
        minCellHeight: 50,
      },
    });

    // ===== Footer =====
    doc.setFontSize(7);
    doc.text(
      "THIS COMMUNICATION REPORT IS GENERATED BY THE EQUIPMENT MAINTENANCE MANAGEMENT SYSTEM. THIS IS AN AUTOMATED REPORT\n" +
        "AND SERVES AS A RECORD OF COMMUNICATION SENT THROUGH THE SYSTEM. IF YOU HAVE ANY QUESTIONS REGARDING THIS\n" +
        "COMMUNICATION, PLEASE CONTACT THE SYSTEM ADMINISTRATOR.",
      15,
      //@ts-ignore
      doc.autoTable.previous.finalY + 10,
      { maxWidth: 180 }
    );

    doc.text(
      "Generated by Equipment Maintenance Management System",
      15,
      doc.internal.pageSize.height - 12
    );

    doc.save(`communication-report-${emailRefNumber}.pdf`);

    setIsGeneratingPDF(false);
  };

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    // generate PDF
    await generatePDF(values);
    setIsSending(true);
    setSendSuccess(true);
    setTimeout(() => {
      setIsSending(false);
      setSendSuccess(false);
    }, 3000);

    // Simulate email sending delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    // Reset form
    form.reset();
  };

  return (
    <div className="container mx-auto py-10">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="mb-8">
            <CardHeader className="bg-muted/50">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                  <CardTitle className="text-2xl">
                    Message Communication
                  </CardTitle>
                  <CardDescription>
                    Send emails and generate communication reports
                  </CardDescription>
                </div>
                <div className="mt-4 md:mt-0 space-y-1 text-sm">
                  <div className="flex items-center">
                    <span className="font-medium w-20">Reference:</span>
                    <span className="font-bold">{emailRefNumber}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-medium w-20">Date:</span>
                    <span>{currentDate}</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-6">
                {/* Email Templates */}
                <div className="bg-muted/30 p-4 rounded-lg">
                  <h3 className="font-medium mb-4">Message Templates</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <FormField
                      control={form.control}
                      name="template"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Template</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                              onTemplateChange(value);
                            }}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a template or create from scratch" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="create_scratch">
                                Create from scratch
                              </SelectItem>
                              {emailTemplates.map((template) => (
                                <SelectItem
                                  key={template.id}
                                  value={template.id}
                                >
                                  {template.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Select a template or create your message from
                            scratch
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Email Content */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter your subject" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Enter your message here..."
                            className="min-h-[300px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-6">
              <div></div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => generatePDF(form.getValues())}
                  disabled={isGeneratingPDF || isSending}
                >
                  {isGeneratingPDF && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {!isGeneratingPDF && <FileText className="mr-2 h-4 w-4" />}
                  Generate PDF
                </Button>
              </div>
            </CardFooter>
          </Card>
        </form>
      </Form>

      {sendSuccess && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">
            Message sent successfully! Reference: {emailRefNumber}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
