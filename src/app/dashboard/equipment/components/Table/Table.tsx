import { Equipment } from "@/interfaces/equipment";
import { TableHeader } from "./TableHeader";
import { TableRows } from "./TableRows";
import { Table, TableBody } from "@/components/ui/table";

interface EquipmentTableProps {
  currentEquipment: Equipment[];
  selectedItems: string[];
  currentPage: number;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onRefetch: () => void;
}

export function EquipmentTable({
  currentEquipment,
  selectedItems,
  currentPage,
  onToggleSelect,
  onToggleSelectAll,
  onRefetch,
}: EquipmentTableProps) {
  return (
    <Table>
      <TableHeader
        selectedItems={selectedItems}
        currentEquipment={currentEquipment}
        onToggleSelectAll={onToggleSelectAll}
      />
      <TableBody>
        <TableRows
          currentEquipment={currentEquipment}
          selectedItems={selectedItems}
          currentPage={currentPage}
          onToggleSelect={onToggleSelect}
          onRefetch={onRefetch}
        />
      </TableBody>
    </Table>
  );
}