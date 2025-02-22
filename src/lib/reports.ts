import { supabase } from "@/lib/supabase";
import { format } from "date-fns";

export async function uploadReport(
  pdfBlob: Blob,
  metadata: {
    type: "general" | "equipment";
    equipmentId?: string;
    equipmentName?: string;
    generatedBy: string;
  }
) {
  try {
    // Generate unique filename
    const timestamp = format(new Date(), "yyyy-MM-dd-HHmmss");
    const fileName =
      metadata.type === "general"
        ? `equipments-report-${timestamp}.pdf`
        : `${metadata?.equipmentName}-${metadata?.equipmentId}-report-${timestamp}.pdf`;

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from("ResenixPro")
      .upload(`public/reports/${fileName}`, pdfBlob, {
        cacheControl: "3600",
        contentType: "application/pdf",
        metadata: metadata,
      });

    if (error) {
      console.log("Error uploading report:", error);
      throw error;
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("reports").getPublicUrl(`reports/${fileName}`);

    return {
      publicUrl,
      fileName,
    };
  } catch (error) {
    console.error("Error uploading report:", error);
    throw error;
  }
}

export async function deleteReport(fileName: string, reportId: string) {
  try {
    // Delete file from Supabase Storage
    const { error: storageError } = await supabase.storage
      .from("ResenixPro")
      .remove([`public/reports/${fileName}`]);

    if (storageError) throw storageError;
  } catch (error) {
    console.error("Error deleting report:", error);
    throw error;
  }
}
