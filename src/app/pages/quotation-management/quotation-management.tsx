import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast"
import SearchAndImport from './components/SearchAndImport';
import QuotationTable from './components/QuotationTable';
import Pagination from './components/Pagination';
import EditComponentDialog from './components/EditComponentDialog';
import CustomerNameDialog from './components/CustomerNameDialog';
import AddComponentDialog from './components/AddComponentDialog';

// 定义Quotation类型
interface Quotation {
  id: string;
  date: string;
  customer: string;
  totalAmount: number;
  components: Component[];
  quoteNumber: string;
  status: string;
}

interface Component {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  tiPrice: number;
  status: string;
  deliveryDate: string; // 新增交期字段
  moq: number; // 新增 MOQ 字段
  nq: number; // 新增 NQ 字段
}

const fetchQuotations = async (page: number, componentName: string) => {
  try {
    const response = await fetch(`/api/quotations?componentName=${componentName}&page=${page}&limit=10`);
    const data = await response.json();

    if (!data.success) {
      console.error("Unexpected data format:", data);
      return { quotations: [], totalPages: 0 };
    }

    const pageSize = 10;
    const totalPages = Math.ceil(data.totalQuotations / pageSize);

    console.log("Paginated quotations:", JSON.stringify(data.quotations, null, 2));

    return {
      quotations: data.quotations,
      totalPages: totalPages,
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
  const { toast } = useToast()
  const [isAddComponentDialogOpen, setIsAddComponentDialogOpen] = useState(false);
  const [currentQuotationId, setCurrentQuotationId] = useState<string | null>(null);

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
      toast({
        title: '错误',
        description: `更新元件时出错，错误信息: ${(error as Error).message}`,
        variant: 'destructive',
      });
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
            deliveryDate: row["交期"] ? new Date((row["交期"] - 25569) * 86400 * 1000).toISOString().split('T')[0] : '',
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

      // 刷新数据
      await fetchData();

      toast({
        title: "报价已发送",
        description: "报价已成功发送到TI，页面已更新。",
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const rawData = await response.text();
      console.log("Raw response:", rawData);

      let data;
      try {
        data = JSON.parse(rawData);
      } catch (error) {
        console.error("Error parsing JSON:", error);
        toast({
          title: '错误',
          description: `解析JSON文件时出错，错误信息: ${(error as Error).message}`,
          variant: 'destructive',
        });
        throw new Error("Invalid JSON response");
      }

      console.log("Parsed data:", JSON.stringify(data, null, 2));

      // 检查 data 是否包含预期的结构
      if (!data || !data.quotation || !data.tiResponse) {
        console.error("Unexpected response structure:", data);
        throw new Error("Unexpected response structure");
      }

      const { quotation, tiResponse } = data;

      console.log('Received quotation:', JSON.stringify(quotation, null, 2));

      // 更新本地状态
      setQuotations(prevQuotations => 
        prevQuotations.map(q => 
          q.id === quotationId ? {
            ...q,
            ...quotation,
            components: quotation.components.map((comp: any) => ({
              ...comp,
              moq: comp.moq,
              nq: comp.nq
            }))
          } : q
        )
      );

      console.log('Updated quotations:', JSON.stringify(quotations, null, 2));

      // 显示成功消息
      toast({
        title: "查询成功",
        description: "报价信息已成功获取并更新。",
      });

    } catch (error) {
      console.error("查询报价时出错:", error);
      toast({
        title: "查询失败",
        description: error instanceof Error ? error.message : "查询报价时发生未知错误，请稍后重试。",
        variant: "destructive",
      });
    }
  };

  const handleCreateNewQuotation = async () => {
    try {
      const response = await fetch("/api/quotations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: new Date().toISOString().split("T")[0],
          customer: "新客户",
          totalAmount: 0,
          components: [],
        }),
      });

      if (!response.ok) {
        throw new Error("创建新报价失败");
      }

      const newQuotation = await response.json();
      setQuotations([...quotations, newQuotation]);
      await fetchData();
      toast({
        title: "新报价已创建",
        description: "新的报价单已成功添加到列表中。",
      });
    } catch (error) {
      console.error("创建新报价时出错:", error);
      toast({
        title: "创建失败",
        description: "创建新报价时发生错误，请稍后重试。",
        variant: "destructive",
      });
    }
  };

  const handleAddComponent = async (quotationId: string) => {
    console.log('handleAddComponent called with quotationId:', quotationId); // 添加这行
    setCurrentQuotationId(quotationId);
    setIsAddComponentDialogOpen(true);
  };

  const handleAddComponentSubmit = async (newComponent: any) => {
    if (!currentQuotationId) return;

    try {
      console.log('Sending request to:', `/api/quotations/${currentQuotationId}/newItem`); // 添加日志
      const response = await fetch(`/api/quotations/${currentQuotationId}/newItem`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newComponent),
      });

      if (!response.ok) {
        throw new Error("添加组件失败");
      }

      const updatedQuotation = await response.json();
      
      // 更新本地状态
      setQuotations(prevQuotations => 
        prevQuotations.map(q => 
          q.id === currentQuotationId ? updatedQuotation : q
        )
      );

      setIsAddComponentDialogOpen(false);  // 关闭对话框

      // 立即重新获取数据以确保显示最新信息
      await fetchData();

      toast({
        title: "组件已添加",
        description: "新的组件已成功添加到报价单中。",
      });
    } catch (error) {
      console.error("添加组件时出错:", error);
      toast({
        title: "添加失败",
        description: "添加组件时发生错误，请稍后重试。",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <SearchAndImport
        searchTerm={searchTerm}
        handleSearch={handleSearch}
        handleFileUpload={handleFileUpload}
        triggerFileInput={triggerFileInput}
        handleCreateNewQuotation={handleCreateNewQuotation}
      />

      {isLoading ? (
        <div>加载中...</div>
      ) : (
        <QuotationTable
          quotations={quotations}
          expandedQuotations={expandedQuotations}
          toggleExpand={toggleExpand}
          handleSendToTI={handleSendToTI}
          handleQuery={handleQuery}
          handleDeleteQuotation={handleDeleteQuotation}
          handleEditComponent={handleEditComponent}
          handleDeleteComponent={handleDeleteComponent}
          handleAddComponent={handleAddComponent}
        />
      )}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        setCurrentPage={setCurrentPage}
      />

      <EditComponentDialog
        editingComponent={editingComponent}
        setEditingComponent={setEditingComponent}
        handleSaveComponent={handleSaveComponent}
      />

      <CustomerNameDialog
        isOpen={isCustomerDialogOpen}
        setIsOpen={setIsCustomerDialogOpen}
        customerName={customerName}
        setCustomerName={setCustomerName}
        handleSubmit={handleCustomerDialogSubmit}
      />

      <AddComponentDialog
        isOpen={isAddComponentDialogOpen}
        setIsOpen={setIsAddComponentDialogOpen}
        handleAddComponent={handleAddComponentSubmit}
      />
    </div>
  );
}