import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search, Calendar, Trash2, Send, ChevronDown, ChevronUp } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface RemittanceItem {
  invoiceNumber: string;
  amount: number;
}

interface RemittanceFormProps {
  onSubmit: (remittance: any) => void;
  onCancel: () => void;
}

export default function RemittanceForm({ onSubmit, onCancel }: RemittanceFormProps) {
  const [remittanceNumber, setRemittanceNumber] = useState("");
  const [currency, setCurrency] = useState("");
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [items, setItems] = useState<RemittanceItem[]>([{ invoiceNumber: '', amount: 0 }]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newRemittance = {
      remittanceNumber,
      currency,
      paymentDate: paymentDate.toISOString(),
      items: items.filter(item => item.invoiceNumber && item.amount > 0),
    };
    onSubmit(newRemittance);
  };

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

  return (
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
        <div className="max-h-96 overflow-y-auto">
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
        </div>
        <Button type="button" variant="outline" onClick={addItem}>
          添加发票
        </Button>
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" onClick={onCancel}>取消</Button>
        <Button type="submit">确定</Button>
      </div>
    </form>
  );
}