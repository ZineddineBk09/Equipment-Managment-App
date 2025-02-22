import { TableCell, TableRow } from "@/components/ui/table";
import { Equipment } from "@/interfaces/equipment";
import { Checkbox } from "@/components/ui/checkbox";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { formatHours } from "@/utils";
import { Badge } from "@/components/ui/badge";
// import { ActionsCell } from "./ActionsCell";

interface TableRowsProps {
  currentEquipment: Equipment[];
  selectedItems: string[];
  currentPage: number;
  onToggleSelect: (id: string) => void;
  onRefetch: () => void;
}

const statusBadge = (status: "active" | "maintenance" | "decommissioned") => {
  if (status.toLocaleLowerCase() === "active") {
    return (
      <Badge variant="default" className="bg-green-500">
        Active
      </Badge>
    );
  } else if (status.toLocaleLowerCase() === "maintenance") {
    return (
      <Badge variant="default" className="bg-amber-500">
        Maitenance
      </Badge>
    );
  } else if (status.toLocaleLowerCase() === "decommissioned") {
    return <Badge variant="destructive">Decommissioned</Badge>;
  } else {
    return <Badge variant="destructive">Unknown</Badge>;
  }
};

export function TableRows({
  currentEquipment,
  selectedItems,
  currentPage,
  onToggleSelect,
  onRefetch,
}: TableRowsProps) {
  const ITEMS_PER_PAGE = 10;

  return (
    <>
      {currentEquipment.map((item, index) => (
        <TableRow
          key={item.id}
          className={cn(
            Number(item?.remainingHours) < 1 && "bg-red-100 hover:bg-red-100"
          )}
        >
          <TableCell>
            <Checkbox
              checked={selectedItems.includes(item.id)}
              onCheckedChange={() => onToggleSelect(item.id)}
            />
          </TableCell>
          <TableCell className="font-bold">
            {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
          </TableCell>
          <TableCell>
            <Image
              src={item.imageUrl || "/placeholder-image.jpg"}
              alt={item.name}
              width={50}
              height={50}
              className="rounded-lg"
            />
          </TableCell>
          <TableCell>{item.name}</TableCell>
          <TableCell>{item.serialNumber}</TableCell>
          <TableCell>{item.location}</TableCell>
          <TableCell>
            {statusBadge(
              item.status as "active" | "maintenance" | "decommissioned"
            )}
          </TableCell>
          <TableCell>
            {formatHours(item?.remainingHours || 0)} Remaining
          </TableCell>
          <TableCell>
            {/* <ActionsCell equipment={item} onRefetch={onRefetch} /> */}
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}
