import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface EditComponentDialogProps {
  editingComponent: any;
  setEditingComponent: (component: any) => void;
  handleSaveComponent: (component: any) => void;
}

function EditComponentDialog({ editingComponent, setEditingComponent, handleSaveComponent }: EditComponentDialogProps) {
  if (!editingComponent) return null;

  return (
    <Dialog open={!!editingComponent} onOpenChange={() => setEditingComponent(null)}>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle>编辑元件</DialogTitle>
          <DialogDescription>
            修改元件的详细信息。完成后点击保存。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-quantity" className="text-right">
              年用量
            </Label>
            <Input
              id="edit-quantity"
              type="number"
              value={editingComponent.quantity}
              onChange={(e) =>
                setEditingComponent({
                  ...editingComponent,
                  quantity: parseInt(e.target.value),
                })
              }
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-unitPrice" className="text-right">
              单价
            </Label>
            <Input
              id="edit-unitPrice"
              type="number"
              step="0.01"
              value={editingComponent.unitPrice}
              onChange={(e) =>
                setEditingComponent({
                  ...editingComponent,
                  unitPrice: parseFloat(e.target.value),
                })
              }
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => handleSaveComponent(editingComponent)}>
            保存更改
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default EditComponentDialog;