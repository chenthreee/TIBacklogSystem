import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface AddComponentDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  handleAddComponent: (component: any) => void;
}

function AddComponentDialog({ isOpen, setIsOpen, handleAddComponent }: AddComponentDialogProps) {
  const [newComponent, setNewComponent] = useState({
    name: "",
    quantity: 0,
    unitPrice: 0,
  });

  const handleSubmit = () => {
    handleAddComponent(newComponent);
    setIsOpen(false);
    setNewComponent({ name: "", quantity: 0, unitPrice: 0 });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle>添加新组件</DialogTitle>
          <DialogDescription>
            请输入新组件的详细信息。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="component-name" className="text-right">
              元件名称
            </Label>
            <Input
              id="component-name"
              value={newComponent.name}
              onChange={(e) => setNewComponent({ ...newComponent, name: e.target.value })}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="component-quantity" className="text-right">
              年用量
            </Label>
            <Input
              id="component-quantity"
              type="number"
              value={newComponent.quantity}
              onChange={(e) => setNewComponent({ ...newComponent, quantity: parseInt(e.target.value) })}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="component-price" className="text-right">
              单价
            </Label>
            <Input
              id="component-price"
              type="number"
              step="0.01"
              value={newComponent.unitPrice}
              onChange={(e) => setNewComponent({ ...newComponent, unitPrice: parseFloat(e.target.value) })}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit}>添加组件</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AddComponentDialog;