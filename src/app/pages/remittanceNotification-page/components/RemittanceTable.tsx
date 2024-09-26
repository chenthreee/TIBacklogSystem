import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronUp, Send, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface RemittanceItem {
  invoiceNumber: string;
  amount: number;
}

interface RemittanceInfo {
  id: string;
  remittanceNumber: string;
  currency: string;
  paymentDate: Date;
  items: RemittanceItem[];
}

interface RemittanceTableProps {
  remittances: RemittanceInfo[];
  expandedRows: Set<string>;
  toggleRowExpansion: (id: string) => void;
  handleSendTI: (remittance: RemittanceInfo) => void;
  handleDelete: (id: string) => void;
}

export default function RemittanceTable({
  remittances,
  expandedRows,
  toggleRowExpansion,
  handleSendTI,
  handleDelete,
}: RemittanceTableProps) {
  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead></TableHead>
            <TableHead>内部汇款编号</TableHead>
            <TableHead>货币类型</TableHead>
            <TableHead>付款日期</TableHead>
            <TableHead>发票数量</TableHead>
            <TableHead>总金额</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {remittances.map((remittance) => (
            <>
              <TableRow key={remittance.id}>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleRowExpansion(remittance.id)}
                  >
                    {expandedRows.has(remittance.id) ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
                <TableCell>{remittance.remittanceNumber}</TableCell>
                <TableCell>{remittance.currency}</TableCell>
                <TableCell>{format(new Date(remittance.paymentDate), "yyyy-MM-dd")}</TableCell>
                <TableCell>{remittance.items.length}</TableCell>
                <TableCell>
                  {remittance.items.reduce((sum, item) => sum + (item.amount || 0), 0).toFixed(2)}
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSendTI(remittance)}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(remittance.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              {expandedRows.has(remittance.id) && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>发票号码</TableHead>
                          <TableHead>金额</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {remittance.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.invoiceNumber}</TableCell>
                            <TableCell>{item.amount.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableCell>
                </TableRow>
              )}
            </>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}