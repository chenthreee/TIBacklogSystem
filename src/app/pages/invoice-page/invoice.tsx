import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, RefreshCw, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

interface InvoiceInfo {
  orderId: string
  customer: string
  components: InvoiceComponent[]
  pdfUrl?: string  // 添加这个字段
}

interface InvoiceComponent {
  name: string
  quantity: number
  unitPrice: number
  invoiceNumber: string
  invoiceDate: string
}

// Mock function to fetch invoice information (replace with actual API call)
const fetchInvoiceInfo = async (page: number, searchTerm: string): Promise<{ invoiceInfo: InvoiceInfo[], totalPages: number }> => {
  const response = await fetch(`/api/invoices?page=${page}&searchTerm=${encodeURIComponent(searchTerm)}`);
  if (!response.ok) {
    throw new Error('Failed to fetch invoice information');
  }
  return response.json();
};

export default function FinancialInvoice() {
  const [invoiceInfo, setInvoiceInfo] = useState<InvoiceInfo[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
  }, [currentPage, searchTerm])

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchInvoiceInfo(currentPage, searchTerm);
      setInvoiceInfo(data.invoiceInfo);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('Error fetching invoice data:', error);
      toast({
        title: "错误",
        description: "获取发票信息失败，请稍后重试。",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1)
  }

  const handleRefresh = async (orderId: string) => {
    try {
      const response = await fetch(`/api/invoices/query?orderNumber=${orderId}`);
      if (!response.ok) {
        throw new Error('发票刷新失败');
      }
      const data = await response.json();

      // 更新特定订单的信息
      setInvoiceInfo(prevInfo => prevInfo.map(info => 
        info.orderId === orderId 
          ? { ...info, pdfUrl: data.pdfUrl }  // 添加 pdfUrl 到订单信息中
          : info
      ));

      toast({
        title: "刷新成功",
        description: `订单 ${orderId} 的发票信息已更新。`,
      });
    } catch (error) {
      console.error('刷新发票时出错:', error);
      toast({
        title: "刷新失败",
        description: `无法更新订单 ${orderId} 的发票信息。`,
        variant: "destructive",
      });
    }
  };

  const handleReadAll = () => {
    toast({
      title: "读取成功",
      description: "所有发票信息已更新。",
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Input
          type="text"
          placeholder="搜索订单ID或客户..."
          value={searchTerm}
          onChange={handleSearch}
          className="max-w-sm"
        />
        <Button onClick={handleReadAll}>
          读取
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center">加载中...</div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>订单ID</TableHead>
                <TableHead>客户</TableHead>
                <TableHead>详情</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoiceInfo.map((info) => (
                <TableRow key={info.orderId}>
                  <TableCell>{info.orderId}</TableCell>
                  <TableCell>{info.customer}</TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Info className="h-4 w-4 mr-2" />
                          详情
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px] bg-white">
                        <DialogHeader>
                          <DialogTitle>发票详情 - {info.orderId}</DialogTitle>
                          <DialogDescription>
                            订单 {info.orderId} 的发票详细信息
                          </DialogDescription>
                        </DialogHeader>
                        <div className="mt-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>元件名称</TableHead>
                                <TableHead>数量</TableHead>
                                <TableHead>单价</TableHead>
                                <TableHead>发票号</TableHead>
                                <TableHead>发票日期</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {info.components.map((component, index) => (
                                <TableRow key={index}>
                                  <TableCell>{component.name}</TableCell>
                                  <TableCell>{component.quantity}</TableCell>
                                  <TableCell>¥{component.unitPrice.toFixed(2)}</TableCell>
                                  <TableCell>{component.invoiceNumber}</TableCell>
                                  <TableCell>{component.invoiceDate}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRefresh(info.orderId)}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      刷新
                    </Button>
                    {info.pdfUrl && (
                      <a
                        href={info.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-blue-600 hover:underline"
                      >
                        查看 PDF
                      </a>
                    )}
                  </TableCell>
                </TableRow>
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
          <ChevronLeft className="h-4 w-4 mr-2" />
          上一页
        </Button>
        <span>第 {currentPage} 页，共 {totalPages} 页</span>
        <Button
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
        >
          下一页
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}