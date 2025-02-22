export interface Report {
    id: string;
    fileName: string;
    fileUrl: string;
    type: 'general' | 'equipment';
    equipmentId?: string;
    equipmentName?: string;
    generatedAt: string;
    generatedBy: string;
    fileSize: number;
  }