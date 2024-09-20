import React, { useRef } from 'react';
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
    quotationId: string;
    purchaseOrderNumber: string; // 新增字段
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
            <Input
              id="date"
              type="date"
              value={newOrder.date}
              onChange={(e) => setNewOrder({ ...newOrder, date: e.target.value })}
              className="col-span-3"
            />
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
            <Label htmlFor="quotationId" className="text-right">报价ID</Label>
            <Input
              id="quotationId"
              value={newOrder.quotationId}
              onChange={(e) => setNewOrder({ ...newOrder, quotationId: e.target.value })}
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
