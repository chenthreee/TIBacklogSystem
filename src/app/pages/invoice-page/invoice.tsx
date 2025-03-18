import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight, RefreshCw, Info, FileText } from "lucide-react"
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
  orderId: string  // 这里的 orderId 实际上是 purchaseOrderNumber
  customer: string
  components: InvoiceComponent[]
  pdfUrl?: string
}

interface InvoiceComponent {
  name: string
  quantity: number
  unitPrice: number
  invoiceNumber: string
  invoiceDate: string
}

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
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { toast } = useToast()

  const createBlobUrl = useCallback((base64Data: string) => {
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], {type: 'application/pdf'});
    return URL.createObjectURL(blob);
  }, []);

  useEffect(() => {
    fetchData()
  }, [currentPage, searchTerm])

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchInvoiceInfo(currentPage, searchTerm);
      setInvoiceInfo(data.invoiceInfo.map(info => ({
        ...info,
        pdfUrl: info.pdfUrl ? createBlobUrl(info.pdfUrl.split(',')[1]) : undefined
      })));
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

  const handleBatchRefresh = async () => {
    setIsRefreshing(true);
    try {
      let progress = 0;
      const total = invoiceInfo.length;

      await Promise.all(
        invoiceInfo.map(async (info) => {
          try {
            const response = await fetch(`/api/invoices/query?orderNumber=${info.orderId}`);
            if (!response.ok) {
              throw new Error(`订单 ${info.orderId} 查询失败`);
            }
            const data = await response.json();
            
            setInvoiceInfo(prevInfo => prevInfo.map(item => 
              item.orderId === info.orderId
                ? { 
                    ...item, 
                    pdfUrl: data.pdfUrl ? createBlobUrl(data.pdfUrl.split(',')[1]) : undefined
                  }
                : item
            ));

            progress++;
            console.log(`进度: ${progress}/${total}`);
          } catch (error) {
            console.error(`查询订单 ${info.orderId} 时出错:`, error);
          }
        })
      );

      toast({
        title: "刷新完成",
        description: "所有发票信息已更新",
      });
    } catch (error) {
      console.error('批量查询发票信息时出错:', error);
      toast({
        title: "刷新失败",
        description: "批量查询发票信息时出错",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleReadAll = () => {
    toast({
      title: "读取成功",
      description: "所有发票信息已更新。",
    })
  }

  useEffect(() => {
    return () => {
      // 清理所有创建的 Blob URLs
      invoiceInfo.forEach(info => {
        if (info.pdfUrl) {
          URL.revokeObjectURL(info.pdfUrl);
        }
      });
    };
  }, [invoiceInfo]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4 w-auto">
          <Input
            type="text"
            placeholder="搜索PO号或客户名称..."
            value={searchTerm}
            onChange={handleSearch}
            //className="max-w-sm"
            className="flex-grow w-auto min-w-[250px] max-w-[450px] px-4 py-2"
          />
          <Button 
            onClick={handleBatchRefresh} 
            disabled={isRefreshing}
            variant="outline"
          >
            {isRefreshing ? (
              <>
                <span className="animate-spin mr-2">⌛</span>
                刷新中...
              </>
            ) : (
              <>
                <svg
                  className="mr-2 h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                一键刷新
              </>
            )}
          </Button>
        </div>
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
                    {info.pdfUrl && (
                      <a
                        href={info.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-blue-600 hover:text-blue-800"
                      >
                        <FileText className="h-4 w-4 mr-1" />
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