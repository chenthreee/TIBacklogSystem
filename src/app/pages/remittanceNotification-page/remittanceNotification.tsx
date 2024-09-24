import { useState, useEffect } from "react"
import { Plus, Search, Calendar, Trash2, Send, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

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
  const [remittanceNumber, setRemittanceNumber] = useState("")
  const [currency, setCurrency] = useState("")
  const [paymentDate, setPaymentDate] = useState<Date>(new Date())
  const [searchTerm, setSearchTerm] = useState("")
  const [items, setItems] = useState<RemittanceItem[]>([{ invoiceNumber: '', amount: 0 }]);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newRemittance = {
      remittanceNumber,
      currency,
      paymentDate: paymentDate.toISOString(),
      items: items.filter(item => item.invoiceNumber && item.amount > 0),
    };
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
      resetForm();
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

  const resetForm = () => {
    setRemittanceNumber("");
    setCurrency("");
    setPaymentDate(new Date());
    setItems([{ invoiceNumber: '', amount: 0 }]);
  }

  const addItem = () => {
    setItems([...items, { invoiceNumber: '', amount: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof RemittanceItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
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
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> 添加汇款通知
            </Button>
          </DialogTrigger>
          <DialogContent className={cn("sm:max-w-[425px]", "bg-white")}>
            <DialogHeader>
              <DialogTitle>添加新汇款通知</DialogTitle>
              <DialogDescription>
                请填写新汇款通知的详细信息。完成后点击确定。
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="remittanceNumber" className="text-right">
                    内部汇款编号
                  </Label>
                  <Input
                    id="remittanceNumber"
                    value={remittanceNumber}
                    onChange={(e) => setRemittanceNumber(e.target.value)}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="currency" className="text-right">
                    货币类型
                  </Label>
                  <Select value={currency} onValueChange={setCurrency} required>
                    <SelectTrigger id="currency" className="col-span-3">
                      <SelectValue placeholder="选择货币" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD (美元)</SelectItem>
                      <SelectItem value="RMB">RMB (人民币)</SelectItem>
                      <SelectItem value="EUR">EUR (欧元)</SelectItem>
                      <SelectItem value="JPY">JPY (日元)</SelectItem>
                      <SelectItem value="GBP">GBP (英镑)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="paymentDate" className="text-right">
                    付款日期
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "col-span-3 justify-start text-left font-normal",
                          !paymentDate && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {paymentDate ? format(paymentDate, "PPP") : <span>选择日期</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={paymentDate}
                        onSelect={(date: Date | undefined) => setPaymentDate(date ?? new Date())}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                {items.map((item, index) => (
                  <div key={index} className="grid gap-2">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor={`invoiceNumber-${index}`} className="text-right">
                        发票号
                      </Label>
                      <Input
                        id={`invoiceNumber-${index}`}
                        value={item.invoiceNumber}
                        onChange={(e) => updateItem(index, 'invoiceNumber', e.target.value)}
                        className="col-span-3"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor={`amount-${index}`} className="text-right">
                        付款金额
                      </Label>
                      <Input
                        id={`amount-${index}`}
                        type="number"
                        step="0.01"
                        value={item.amount}
                        onChange={(e) => updateItem(index, 'amount', parseFloat(e.target.value))}
                        className="col-span-3"
                        required
                      />
                    </div>
                    {index > 0 && (
                      <Button type="button" variant="outline" onClick={() => removeItem(index)}>
                        删除
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addItem}>
                  添加发票
                </Button>
              </div>
              <DialogFooter>
                <Button type="submit">确定</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

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
            {filteredRemittances.map((remittance) => (
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
                  <TableCell>{remittance.items && Array.isArray(remittance.items) ? remittance.items.length : 0}</TableCell>
                  <TableCell>
                    {remittance.items && Array.isArray(remittance.items) 
                      ? remittance.items.reduce((sum, item) => sum + (item.amount || 0), 0).toFixed(2)
                      : '0.00'}
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
    </div>
  )
}