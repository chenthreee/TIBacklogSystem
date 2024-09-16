import { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  Upload,
  Send,
  Search,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

// 定义Quotation类型
interface Quotation {
  //id: string;
  date: string;
  customer: string;
  totalAmount: number;
  components: Component[];
  status: string;
}

interface Component {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  tiPrice: number;
  status: string;
}

const fetchQuotations = async (page: number, searchTerm: string) => {
  // 这里应该是实际的API调用
  try {
    const response = await fetch("/api/quotations");
    const data = await response.json();
    console.log("Fetched data:", JSON.stringify(data, null, 2));

    if (!Array.isArray(data)) {
      console.error("Unexpected data format:", data);
      return { quotations: [], totalPages: 0 };
    }

    const filteredQuotations = data.filter(
      (q: Quotation) =>
        (typeof q.customer === "string" &&
          q.customer.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (typeof q.date === "string" && q.date.includes(searchTerm))
    );


    const pageSize = 10;
    const startIndex = (page - 1) * pageSize;

    const paginatedQuotations = filteredQuotations.slice(
      startIndex,
      startIndex + pageSize
    );

    return {
      quotations: paginatedQuotations,
      //totalPages: Math.ceil(filteredQuotations.length / pageSize)
      totalPages: Math.ceil(data.length / pageSize),
    };
  } catch (error) {
    console.error("Error fetching quotations:", error);
    return { quotations: [], totalPages: 0 };
  }
};

export default function QuotationManagement() {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [expandedQuotations, setExpandedQuotations] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [editingComponent, setEditingComponent] = useState<any>(null);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [isQuotationUpdated, setIsQuotationUpdated] = useState(false);

  useEffect(() => {
    fetchData();
  }, [currentPage, searchTerm]);

  useEffect(() => {
    // 这里可以添加一些逻辑来处理状态变化后的操作
    console.log("Quotations updated:", quotations);
  }, [quotations]);

  const fetchData = async () => {
    setIsLoading(true);
    const data = await fetchQuotations(currentPage, searchTerm);
    setQuotations(data.quotations);
    setTotalPages(data.totalPages);
    setIsLoading(false);
  };

  const toggleExpand = (id: number) => {
    setExpandedQuotations((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleEditComponent = (quotationId: number, component: any) => {
    setEditingComponent({ ...component, quotationId });
  };

  const handleDeleteComponent = async (
    quotationId: string,
    componentId: string
  ) => {
    try {
      const response = await fetch(
        `/api/quotations/${quotationId}/components/${componentId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("删除组件失败");
      }

      // 删除成功后重新获取数据
      await fetchData();
      toast({
        title: "组件已删除",
        description: "元件已成功从报价中删除。",
      });
    } catch (error) {
      console.error("删除组件时出错:", error);
      // 这里可以添加一些用户友好的错误提示
      toast({
        title: "删除失败",
        description: "删除元件时发生错误，请稍后重试。",
        variant: "destructive",
      });
    }
  };

  const handleSaveComponent = async (editedComponent: any) => {
    console.log("handleSaveComponent called with:", editedComponent);
    try {
      const response = await fetch(
        `/api/quotations/${editedComponent.quotationId}/components/${editedComponent.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(editedComponent),
        }
      );

      console.log("Response status:", response.status);
      if (!response.ok) {
        throw new Error("Failed to update component");
      }

      const updatedQuotation = await response.json();
      console.log("Updated quotation:", updatedQuotation);

      // 更新前端状态
      setQuotations((prevQuotations) =>
        prevQuotations.map((q) => {
          if (q.id === updatedQuotation.id) {
            return {
              ...q,
              components: updatedQuotation.components,
              totalAmount: updatedQuotation.totalAmount, // 更新总金额
            };
          }
          return q;
        })
      );

      setEditingComponent(null); // 关闭编辑对话框

      // 重新获取数据
      fetchData();
    } catch (error) {
      console.error("Error updating component:", error);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        // 处理Excel数据并创建新的报价
        const newQuotation = {
          id: quotations.length + 1,
          date: new Date().toISOString().split("T")[0],
          customer: customerName, // 使用输入的客户名称
          components: json.map((row: any, index) => ({
            id: index + 1,
            name: row["元件名称"],
            quantity: row["数量"],
            unitPrice: row["单价"],
            status: "",
          })),
          totalAmount: json.reduce(
            (sum: number, row: any) => sum + row["数量"] * row["单价"],
            0
          ),
          status: "",
        };
        //newQuotation.totalAmount = newQuotation.components.reduce((sum, c) => sum + c.quantity * c.unitPrice, 0)

        setQuotations([...quotations, newQuotation]);
        fetch("/api/quotations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newQuotation),
        })
          .then((response) => response.json())
          .then((data) => {
            console.log("报价已成功保存到数据库:", data);
            fetchData(); // 重新获取数据
          })
          .catch((error) => {
            console.error("保存报价时出错:", error);
          });
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const triggerFileInput = () => {
    setIsCustomerDialogOpen(true);
  };

  const handleCustomerDialogSubmit = () => {
    setIsCustomerDialogOpen(false);
    document.getElementById("excel-upload")?.click();
  };
  const handleSendToTI = async (quotationId: string) => {
    try {
      const response = await fetch(
        `/api/quotations/${quotationId}/send-to-ti`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("发送到TI失败");
      }

      const result = await response.json();
      console.log("TI响应:", result);

      toast({
        title: "报价已发送",
        description: "报价已成功发送到TI。",
      });
    } catch (error) {
      console.error("发送报价到TI时出错:", error);
      toast({
        title: "发送失败",
        description: "发送报价到TI时发生错误，请稍后重试。",
        variant: "destructive",
      });
    }
  };

  const handleDeleteQuotation = async (quotationId: string) => {
    try {
      const response = await fetch(`/api/quotations/${quotationId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "删除报价失败");
      }

      await fetchData(); // 重新获取数据以更新列表
      toast({
        title: "报价已删除",
        description: "报价已成功从数据库中删除。",
      });
    } catch (error) {
      console.error("删除报价时出错:", error);
      toast({
        title: "删除失败",
        description:
          error instanceof Error
            ? error.message
            : "删除报价时发生错误，请稍后重试。",
        variant: "destructive",
      });
    }
  };
  const handleQuery = async (quotationId: string) => {
    try {
      const response = await fetch(`/api/quotations/${quotationId}/query`);
      if (!response.ok) {
        throw new Error("查询报价失败");
      }
      const data = await response.json();
      console.log("查询结果:", data);

      // 显示查询结果给用户
      toast({
        title: "查询成功",
        description: "报价信息已成功获取，请查看控制台输出。",
      });
    } catch (error) {
      console.error("查询报价时出错:", error);
      toast({
        title: "查询失败",
        description: "查询报价时发生错误，请稍后重试。",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Input
          type="text"
          placeholder="搜索客户或日期..."
          value={searchTerm}
          onChange={handleSearch}
          className="max-w-sm"
        />
        <div>
          <input
            type="file"
            id="excel-upload"
            className="hidden"
            accept=".xlsx, .xls"
            onChange={handleFileUpload}
          />
          <label htmlFor="excel-upload">
            <Button variant="outline" onClick={triggerFileInput}>
              <Upload className="mr-2 h-4 w-4" /> 从Excel导入报价
            </Button>
          </label>
        </div>
      </div>

      {isLoading ? (
        <div>加载中...</div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>报价ID</TableHead>
                <TableHead>日期</TableHead>
                <TableHead>客户</TableHead>
                <TableHead>总金额</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotations.map((quotation) => (
                <>
                  <TableRow key={quotation.id}>
                    <TableCell>{quotation.id}</TableCell>
                    <TableCell>{quotation.date}</TableCell>
                    <TableCell>{quotation.customer}</TableCell>
                    <TableCell>${quotation.totalAmount.toFixed(2)}</TableCell>
                    <TableCell>{quotation.status}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpand(quotation.id)}
                        >
                          {expandedQuotations.includes(quotation.id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                          {expandedQuotations.includes(quotation.id)
                            ? "收起"
                            : "展开"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSendToTI(quotation.id)}
                        >
                          <Send className="h-4 w-4 mr-2" />
                          向TI发送报价
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleQuery(quotation.id)}
                        >
                          <Search className="h-4 w-4 mr-2" />
                          查询
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteQuotation(quotation.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          删除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedQuotations.includes(quotation.id) && (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>元件名称</TableHead>
                              <TableHead>数量</TableHead>
                              <TableHead>报价</TableHead>
                              <TableHead>TI返回价格</TableHead>
                              <TableHead>小计</TableHead>
                              <TableHead>状态</TableHead>
                              <TableHead>操作</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {quotation.components.map(
                              (component: Component) => (
                                <TableRow key={component.id}>
                                  <TableCell>{component.name}</TableCell>
                                  <TableCell>{component.quantity}</TableCell>
                                  <TableCell>
                                    ${component.unitPrice.toFixed(2)}
                                  </TableCell>
                                  <TableCell>
                                    ${component.tiPrice}
                                  </TableCell>
                                  <TableCell>
                                    $
                                    {(
                                      component.quantity * component.unitPrice
                                    ).toFixed(2)}
                                  </TableCell>
                                  <TableCell>{component.status}</TableCell>
                                  <TableCell>
                                    <div className="flex space-x-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          handleEditComponent(
                                            quotation.id,
                                            component
                                          )
                                        }
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          handleDeleteComponent(
                                            quotation.id,
                                            component.id
                                          )
                                        }
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )
                            )}
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
      )}

      <div className="flex justify-between items-center mt-4">
        <Button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
        >
          上一页
        </Button>
        <span>
          第 {currentPage} 页，共 {totalPages} 页
        </span>
        <Button
          onClick={() =>
            setCurrentPage((prev) => Math.min(prev + 1, totalPages))
          }
          disabled={currentPage === totalPages}
        >
          下一页
        </Button>
      </div>

      {editingComponent && (
        <Dialog
          open={!!editingComponent}
          onOpenChange={() => setEditingComponent(null)}
        >
          <DialogContent className="sm:max-w-[425px] bg-white">
            {" "}
            {/* 添加背景颜色 */}
            <DialogHeader>
              <DialogTitle>编辑元件</DialogTitle>
              <DialogDescription>
                修改元件的详细信息。完成后点击保存。
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-quantity" className="text-right">
                  数量
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
      )}
      {isCustomerDialogOpen && (
        <Dialog
          open={isCustomerDialogOpen}
          onOpenChange={() => setIsCustomerDialogOpen(false)}
        >
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
              <Button onClick={handleCustomerDialogSubmit}>确认</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
