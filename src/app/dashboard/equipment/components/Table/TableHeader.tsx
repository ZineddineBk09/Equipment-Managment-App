import { TableHead, TableHeader as UITableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Equipment } from "@/interfaces/equipment";

interface TableHeaderProps {
  selectedItems: string[];
  currentEquipment: Equipment[];
  onToggleSelectAll: () => void;
}

export function TableHeader({
  selectedItems,
  currentEquipment,
  onToggleSelectAll,
}: TableHeaderProps) {
  return (
    <UITableHeader>
      <TableRow>
        <TableHead className="w-12">
          <Checkbox
            checked={selectedItems.length === currentEquipment.length}
            onCheckedChange={onToggleSelectAll}
          />
        </TableHead>
        <TableHead>#</TableHead>
        <TableHead>Image</TableHead>
        <TableHead>Name</TableHead>
        <TableHead>Serial Number</TableHead>
        <TableHead>Location</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Maintenance Due Date</TableHead>
        <TableHead>Actions</TableHead>
      </TableRow>
    </UITableHeader>
  );
}