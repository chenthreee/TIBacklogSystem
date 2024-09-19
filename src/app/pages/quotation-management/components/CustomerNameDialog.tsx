import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface CustomerNameDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  customerName: string;
  setCustomerName: (name: string) => void;
  handleSubmit: () => void;
}

function CustomerNameDialog({ isOpen, setIsOpen, customerName, setCustomerName, handleSubmit }: CustomerNameDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle>输入客户名称</DialogTitle>
          <DialogDescription>
            请输入客户名称，然后点击确认继续上传文件。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="customer-name" className="text-right">
              客户名称
            </Label>
            <Input
              id="customer-name"
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>确认</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CustomerNameDialog;