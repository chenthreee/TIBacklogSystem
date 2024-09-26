import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import RemittanceDialog from "./components/RemittanceDialog"
import RemittanceTable from "./components/RemittanceTable"

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

export default function RemittanceNotification() {
  const [remittances, setRemittances] = useState<RemittanceInfo[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchRemittances();
  }, [searchTerm]);

  const fetchRemittances = async () => {
    try {
      const response = await fetch(`/api/remittance-notifications?search=${searchTerm}`);
      if (!response.ok) throw new Error('Failed to fetch remittances');
      const data = await response.json();
      setRemittances(data);
    } catch (error) {
      console.error('Error fetching remittances:', error);
      toast({
        title: "获取汇款通知失败",
        description: "请稍后重试。",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (newRemittance: any) => {
    try {
      const response = await fetch('/api/remittance-notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newRemittance),
      });
      if (!response.ok) {
        throw new Error('Failed to add remittance');
      }
      const savedRemittance = await response.json();
      setRemittances([...remittances, savedRemittance]);
      setIsDialogOpen(false);
      toast({
        title: "汇款通知已添加",
        description: "新的汇款通知已成功添加到列表中。",
      });
      fetchRemittances();
    } catch (error) {
      console.error('Error adding remittance:', error);
      toast({
        title: "添加汇款通知失败",
        description: "请稍后重试。",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!id) {
      console.error('Attempted to delete with undefined id');
      toast({
        title: "删除失败",
        description: "无效的汇款通知 ID",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Attempting to delete remittance with id:', id);
      const response = await fetch(`/api/remittance-notifications/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        throw new Error(errorData.error || 'Failed to delete remittance');
      }
      setRemittances(remittances.filter(remittance => remittance.id !== id));
      toast({
        title: "汇款通知已删除",
        description: "选定的汇款通知已成功从数据库中移除。",
        variant: "default",
      });
    } catch (error) {
      console.error('Error deleting remittance:', error);
      toast({
        title: "删除失败",
        description: "删除汇款通知时发生错误，请稍后重试。",
        variant: "destructive",
      });
    }
  };

  const handleSendTI = async (remittance: RemittanceInfo) => {
    try {
      console.log('Sending remittance to TI:', remittance);

      const response = await fetch('/api/remittance-notifications/send-to-ti', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          remittanceNumber: remittance.remittanceNumber,
          items: remittance.items,
          currency: remittance.currency
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send TI');
      }

      const data = await response.json();
      console.log('TI API Response (Frontend):', data);

      toast({
        title: "TI已发送",
        description: `汇款编号 ${remittance.remittanceNumber} 的TI已成功发送。`,
      });
    } catch (error) {
      console.error('Error sending TI:', error);
      toast({
        title: "发送TI失败",
        description: "发送TI时发生错误，请稍后重试。",
        variant: "destructive",
      });
    }
  }

  const handleDeleteItem = async (remittanceId: string, itemIndex: number) => {
    try {
      const response = await fetch(`/api/remittance-notifications/${remittanceId}/items/${itemIndex}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete item');
      }
      const updatedRemittance = await response.json();
      setRemittances(remittances.map(remittance => remittance.id === remittanceId ? updatedRemittance : remittance));
      toast({
        title: "发票已删除",
        description: "选定的发票已成功从汇款通知中移除。",
        variant: "default",
      });
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: "删除失败",
        description: "删除发票时发生错误，请稍后重试。",
        variant: "destructive",
      });
    }
  };

  const handleUpdateItem = async (remittanceId: string, itemIndex: number, updatedItem: RemittanceItem) => {
    try {
      const response = await fetch(`/api/remittance-notifications/${remittanceId}/items/${itemIndex}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedItem),
      });
      if (!response.ok) {
        throw new Error('Failed to update item');
      }
      const updatedRemittance = await response.json();
      setRemittances(remittances.map(remittance => remittance.id === remittanceId ? updatedRemittance : remittance));
      toast({
        title: "发票已更新",
        description: "选定的发票已成功更新。",
        variant: "default",
      });
    } catch (error) {
      console.error('Error updating item:', error);
      toast({
        title: "更新失败",
        description: "更新发票时发生错误，请稍后重试。",
        variant: "destructive",
      });
    }
  };

  const toggleRowExpansion = (id: string) => {
    setExpandedRows(prevExpandedRows => {
      const newExpandedRows = new Set(prevExpandedRows);
      if (newExpandedRows.has(id)) {
        newExpandedRows.delete(id);
      } else {
        newExpandedRows.add(id);
      }
      return newExpandedRows;
    });
  };

  const filteredRemittances = remittances.filter(
    (remittance) =>
      remittance.remittanceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      remittance.items.some(item => item.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Input
          type="text"
          placeholder="搜索汇款编号或发票号..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <RemittanceDialog
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onSubmit={handleSubmit}
        />
      </div>

      <RemittanceTable
        remittances={filteredRemittances}
        expandedRows={expandedRows}
        toggleRowExpansion={toggleRowExpansion}
        handleSendTI={handleSendTI}
        handleDelete={handleDelete}
        handleDeleteItem={handleDeleteItem}
        handleUpdateItem={handleUpdateItem}
      />
    </div>
  )
}