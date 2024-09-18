import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Upload, Plus } from "lucide-react";

interface CreateOrderDialogProps {
  isCreateOrderDialogOpen: boolean;
  setIsCreateOrderDialogOpen: (isOpen: boolean) => void;
  newOrder: {
    customer: string;
    date: string;
    status: string;
    components: any[];
    totalAmount?: number;
  };
  setNewOrder: React.Dispatch<React.SetStateAction<any>>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleCreateOrder: () => void;
}

const CreateOrderDialog: React.FC<CreateOrderDialogProps> = ({
  isCreateOrderDialogOpen,
  setIsCreateOrderDialogOpen,
  newOrder,
  setNewOrder,
  fileInputRef,
  handleFileUpload,
  handleCreateOrder,
}) => {
  return (
    <Dialog open={isCreateOrderDialogOpen} onOpenChange={setIsCreateOrderDialogOpen}>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle>创建新订单</DialogTitle>
          <DialogDescription>填写订单信息并上传Excel文件以添加元件。</DialogDescription>
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
            <Label className="text-right">元件</Label>
            <div className="col-span-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept=".xlsx,.xls"
              />
              <Button onClick={() => fileInputRef.current?.click()} variant="outline">
                <Upload className="mr-2 h-4 w-4" /> 上传Excel
              </Button>
            </div>
          </div>
          {newOrder.components && newOrder.components.length > 0 && (
            <div className="col-span-4">
              <p>已上传 {newOrder.components.length} 个元件</p>
              <p>总金额: ¥{newOrder.totalAmount?.toFixed(2)}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleCreateOrder}>创建订单</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateOrderDialog;
