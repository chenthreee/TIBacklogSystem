import React, { useRef, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface CreateOrderDialogProps {
  isCreateOrderDialogOpen: boolean;
  setIsCreateOrderDialogOpen: (isOpen: boolean) => void;
  newOrder: {
    customer: string;
    date: string;
    status: string;
    quoteNumber: string;
    purchaseOrderNumber: string;
  };
  setNewOrder: React.Dispatch<React.SetStateAction<any>>;
  handleCreateOrder: () => void;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const CreateOrderDialog: React.FC<CreateOrderDialogProps> = ({
  isCreateOrderDialogOpen,
  setIsCreateOrderDialogOpen,
  newOrder,
  setNewOrder,
  handleCreateOrder,
  handleFileUpload,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [year, setYear] = useState(newOrder.date.split('-')[0] || '');
  const [month, setMonth] = useState(newOrder.date.split('-')[1] || '');
  const [day, setDay] = useState(newOrder.date.split('-')[2] || '');

  useEffect(() => {
    setNewOrder({ ...newOrder, date: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}` });
  }, [year, month, day]);

  const isLeapYear = (year: number) => {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  };

  const getDaysInMonth = (year: number, month: number) => {
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (month === 2 && isLeapYear(year)) {
      return 29;
    }
    return daysInMonth[month - 1];
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newYear = e.target.value;
    setYear(newYear);
    if (month && day) {
      const daysInMonth = getDaysInMonth(Number(newYear), Number(month));
      if (Number(day) > daysInMonth) {
        setDay(String(daysInMonth));
      }
    }
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMonth = e.target.value;
    setMonth(newMonth);
    if (year && day) {
      const daysInMonth = getDaysInMonth(Number(year), Number(newMonth));
      if (Number(day) > daysInMonth) {
        setDay(String(daysInMonth));
      }
    }
  };

  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDay = e.target.value;
    if (year && month) {
      const daysInMonth = getDaysInMonth(Number(year), Number(month));
      if (Number(newDay) <= daysInMonth) {
        setDay(newDay);
      }
    } else {
      setDay(newDay);
    }
  };

  return (
    <Dialog open={isCreateOrderDialogOpen} onOpenChange={setIsCreateOrderDialogOpen}>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle>创建新订单</DialogTitle>
          <DialogDescription>填写订单信息并上传Excel文件。</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="customer" className="text-right">客户</Label>
            <Input
              id="customer"
              value={newOrder.customer}
              onChange={(e) => setNewOrder({ ...newOrder, customer: e.target.value })}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right">日期</Label>
            <div className="col-span-3 flex">
              <Input
                type="number"
                placeholder="年"
                value={year}
                onChange={handleYearChange}
                className="w-1/3 mr-2"
                min="1900"
                max="2100"
              />
              <Input
                type="number"
                placeholder="月"
                value={month}
                onChange={handleMonthChange}
                className="w-1/3 mr-2"
                min="1"
                max="12"
              />
              <Input
                type="number"
                placeholder="日"
                value={day}
                onChange={handleDayChange}
                className="w-1/3"
                min="1"
                max={year && month ? getDaysInMonth(Number(year), Number(month)) : 31}
              />
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">状态</Label>
            <Input
              id="status"
              value={newOrder.status}
              onChange={(e) => setNewOrder({ ...newOrder, status: e.target.value })}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quoteNumber" className="text-right">TI报价号</Label>
            <Input
              id="quoteNumber"
              value={newOrder.quoteNumber}
              onChange={(e) => setNewOrder({ ...newOrder, quoteNumber: e.target.value })}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="purchaseOrderNumber" className="text-right">采购订单号</Label>
            <Input
              id="purchaseOrderNumber"
              value={newOrder.purchaseOrderNumber}
              onChange={(e) => setNewOrder({ ...newOrder, purchaseOrderNumber: e.target.value })}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="excelUpload" className="text-right">上传Excel</Label>
            <Input
              id="excelUpload"
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
              ref={fileInputRef}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleCreateOrder}>创建订单</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateOrderDialog;
