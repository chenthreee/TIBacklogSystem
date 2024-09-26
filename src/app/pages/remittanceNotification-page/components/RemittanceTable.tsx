import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronUp, Send, Trash2, Edit3 } from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";

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
  handleDeleteItem: (remittanceId: string, itemIndex: number) => void;
  handleUpdateItem: (remittanceId: string, itemIndex: number, updatedItem: RemittanceItem) => void;
}

export default function RemittanceTable({
  remittances,
  expandedRows,
  toggleRowExpansion,
  handleSendTI,
  handleDelete,
  handleDeleteItem,
  handleUpdateItem,
}: RemittanceTableProps) {
  const [confirmDelete, setConfirmDelete] = useState<{ remittanceId: string; itemIndex: number } | null>(null);
  const [editItem, setEditItem] = useState<{ remittanceId: string; itemIndex: number; invoiceNumber: string; amount: number } | null>(null);

  const confirmDeleteItem = (remittanceId: string, itemIndex: number) => {
    setConfirmDelete({ remittanceId, itemIndex });
  };

  const handleConfirmDelete = () => {
    if (confirmDelete) {
      handleDeleteItem(confirmDelete.remittanceId, confirmDelete.itemIndex);
      setConfirmDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setConfirmDelete(null);
  };

  const confirmEditItem = (remittanceId: string, itemIndex: number, invoiceNumber: string, amount: number) => {
    setEditItem({ remittanceId, itemIndex, invoiceNumber, amount });
  };

  const handleConfirmEdit = () => {
    if (editItem) {
      handleUpdateItem(editItem.remittanceId, editItem.itemIndex, { invoiceNumber: editItem.invoiceNumber, amount: editItem.amount });
      setEditItem(null);
    }
  };

  const handleCancelEdit = () => {
    setEditItem(null);
  };

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
                          <TableHead>操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {remittance.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.invoiceNumber}</TableCell>
                            <TableCell>{item.amount.toFixed(2)}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => confirmEditItem(remittance.id, index, item.invoiceNumber, item.amount)}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => confirmDeleteItem(remittance.id, index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
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

      {confirmDelete && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-4 rounded shadow-md">
            <p>确定要删除这条发票信息吗？</p>
            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={handleCancelDelete}>取消</Button>
              <Button variant="destructive" onClick={handleConfirmDelete}>删除</Button>
            </div>
          </div>
        </div>
      )}

      {editItem && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-4 rounded shadow-md">
            <p>修改发票信息</p>
            <div className="mt-4">
              <Input
                type="text"
                placeholder="发票号"
                value={editItem.invoiceNumber}
                onChange={(e) => setEditItem({ ...editItem, invoiceNumber: e.target.value })}
              />
              <Input
                type="number"
                placeholder="金额"
                value={editItem.amount}
                onChange={(e) => setEditItem({ ...editItem, amount: parseFloat(e.target.value) })}
                className="mt-2"
              />
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={handleCancelEdit}>取消</Button>
              <Button variant="primary" onClick={handleConfirmEdit}>确认</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}