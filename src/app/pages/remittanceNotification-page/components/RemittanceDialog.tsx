import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import RemittanceForm from "./RemittanceForm";

interface RemittanceDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (remittance: any) => void;
}

export default function RemittanceDialog({ isOpen, onOpenChange, onSubmit }: RemittanceDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> 添加汇款通知
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle>添加新汇款通知</DialogTitle>
          <DialogDescription>
            请填写新汇款通知的详细信息。完成后点击确定。
          </DialogDescription>
        </DialogHeader>
        <RemittanceForm onSubmit={onSubmit} onCancel={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}