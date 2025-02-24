"use client";

import { useEffect, useState } from "react";
import { format, isToday, isThisWeek, isThisMonth, isWithinInterval } from "date-fns";
import { supabase } from "@/lib/supabase";
import { Report } from "@/interfaces/report";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, Search, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { deleteReport } from "@/lib/reports";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { DeleteDialog } from "./components/DeleteDialog";
import { DateRange } from "react-day-picker";
import { DateRangePicker } from "./components/DateRangePicker";

export default function ReportsArchivePage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    try {
      // Get all reports from Supabase storage
      const { data: files, error } = await supabase.storage
        .from("ResenixPro")
        .list("public/reports");

      if (error) throw error;
      console.log("Files:", files);
      // Map files to our Report interface
      const mappedReports = files.map((file) => ({
        id: file.id,
        fileName: file.name,
        type: file.name.includes("equipments-report") ? "general" : "equipment",
        equipmentName: file.name.split("-")[0],
        generatedAt: file.created_at,
        fileSize: file.metadata?.size || 0,
        fileUrl: supabase.storage
          .from("ResenixPro")
          .getPublicUrl(`public/reports/${file.name}`).data.publicUrl,
      }));

      setReports(mappedReports as any);
    } catch (error) {
      console.error("Error loading reports:", error);
      toast({
        title: "Error",
        description: "Failed to load reports.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (report: Report) => {
    try {
      await deleteReport(report.fileName, report.id);
      await loadReports();
      toast({
        title: "Success",
        description: "Report deleted successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete report.",
        variant: "destructive",
      });
    }
  };

  // Filter and group reports
  const filterReports = (reports: Report[]) => {
    return reports.filter((report) => {
      const searchTerms = searchQuery.toLowerCase().split(" ");
      const reportText =
        `${report.fileName} ${report.type} ${report.equipmentName}`.toLowerCase();
      const matchesSearch = searchTerms.every((term) =>
        reportText.includes(term)
      );

      // Date range filter
      const isInDateRange =
        dateRange?.from && dateRange?.to
          ? isWithinInterval(new Date(report.generatedAt), {
              start: dateRange.from,
              end: dateRange.to,
            })
          : true;

      return matchesSearch && isInDateRange;
    });
  };

  const groupReports = (reports: Report[]) => {
    const filteredReports = filterReports(reports);
    return {
      today: filteredReports.filter((r) => isToday(new Date(r.generatedAt))),
      thisWeek: filteredReports.filter(
        (r) =>
          !isToday(new Date(r.generatedAt)) &&
          isThisWeek(new Date(r.generatedAt))
      ),
      thisMonth: filteredReports.filter(
        (r) =>
          !isToday(new Date(r.generatedAt)) &&
          !isThisWeek(new Date(r.generatedAt)) &&
          isThisMonth(new Date(r.generatedAt))
      ),
      older: filteredReports.filter(
        (r) => !isThisMonth(new Date(r.generatedAt))
      ),
    };
  };

  const getTotalStorageSize = () => {
    return (
      reports.reduce((acc, report) => acc + report.fileSize, 0) / 1024 / 1024
    );
  };

  const resetFilters = () => {
    setSearchQuery("");
    setDateRange(undefined);
  };

  const groupedReports = groupReports(reports);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="container mx-auto py-10 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-x-3">
          <h1 className="text-2xl font-bold">Reports Archive</h1>
          <Badge
            variant="default"
            className={cn(
              "bg-blue-100 text-blue-700",
              getTotalStorageSize() > 950 && "bg-red-100 text-red-700"
            )}
          >
            {getTotalStorageSize() > 950
              ? "Total Storage Exceeded"
              : "Total Storage"}
            : {getTotalStorageSize().toFixed(2)} MB
          </Badge>
          {getTotalStorageSize() > 950 && (
            <Badge variant="default" className={cn("bg-red-100 text-red-700")}>
              Please delete old reports to free up space.
            </Badge>
          )}
        </div>
        <div className="relative w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <DateRangePicker date={dateRange} onDateChange={setDateRange} />
        {(searchQuery || dateRange) && (
          <Button
            variant="ghost"
            onClick={resetFilters}
            className="text-sm text-muted-foreground"
          >
            Reset Filters
          </Button>
        )}
      </div>

      <Accordion type="single" collapsible className="w-full space-y-4">
        {Object.entries(groupedReports).map(([period, reports]) => {
          if (reports.length === 0) return null;

          return (
            <AccordionItem
              key={period}
              value={period}
              className="border rounded-lg p-4"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <span className="capitalize">
                    {period.replace(/([A-Z])/g, " $1").trim()}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ({reports.length} reports)
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Generated At</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>
                          <span
                            className={cn(
                              "px-2 py-1 rounded-full text-xs font-medium",
                              report.type === "equipment"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-green-100 text-green-700"
                            )}
                          >
                            {report.type}
                          </span>
                        </TableCell>
                        <TableCell>
                          {report.fileName || "All Equipment"}
                        </TableCell>
                        <TableCell>
                          {format(new Date(report.generatedAt), "PPp")}
                        </TableCell>
                        <TableCell>
                          {(report.fileSize / 1024 / 1024).toFixed(2)} MB
                        </TableCell>
                        <TableCell className="space-x-2">
                          <Button asChild variant="ghost" size="sm">
                            <a
                              href={report.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                          {/* <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(report)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button> */}
                          <DeleteDialog
                            report={report}
                            onDelete={() => loadReports()}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
