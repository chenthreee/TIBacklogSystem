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
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface LogisticsInfo {
  orderId: string  // 这里的 orderId 实际上是 purchaseOrderNumber
  customer: string
  tiOrderNumber: string
  components: LogisticsComponent[]
}

interface LogisticsComponent {
  name: string
  shippingDate: string
  estimatedDateOfArrival: string
  carrier: string
  commercialInvoicePDF?: string
}

const fetchLogisticsInfo = async (page: number, searchTerm: string): Promise<{ logisticsInfo: LogisticsInfo[], totalPages: number }> => {
  try {
    const response = await fetch(`/api/logistics?page=${page}&searchTerm=${searchTerm}`);
    if (!response.ok) {
      throw new Error('获取物流信息失败');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('获取物流信息时出错:', error);
    throw error;
  }
}

export default function LogisticsInformation() {
  const [logisticsInfo, setLogisticsInfo] = useState<LogisticsInfo[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
  }, [currentPage, searchTerm])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const data = await fetchLogisticsInfo(currentPage, searchTerm)
      setLogisticsInfo(data.logisticsInfo)
      setTotalPages(data.totalPages)
    } catch (error) {
      toast({
        title: "错误",
        description: "获取物流信息失败，请稍后重试。",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1)
  }

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

  const handleBatchRefresh = async () => {
    setIsRefreshing(true);
    try {
      let progress = 0;
      const total = logisticsInfo.length;

      await Promise.all(
        logisticsInfo.map(async (info) => {
          try {
            const response = await fetch(`/api/logistics/refresh/${info.orderId}`);
            if (!response.ok) {
              throw new Error(`订单 ${info.orderId} 查询失败`);
            }
            const data = await response.json();
            
            setLogisticsInfo(prevInfo => prevInfo.map(item => 
              item.orderId === info.orderId
                ? {
                    ...item,
                    components: data.components.map((component: LogisticsComponent) => ({
                      ...component,
                      commercialInvoicePDF: component.commercialInvoicePDF 
                        ? createBlobUrl(component.commercialInvoicePDF)
                        : undefined
                    }))
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
        description: "所有物流信息已更新",
      });
    } catch (error) {
      console.error('批量查询物流信息时出错:', error);
      toast({
        title: "刷新失败",
        description: "批量查询物流信息时出错",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleReadAll = () => {
    toast({
      title: "读取成功",
      description: "所有物流信息已更新。",
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Input
            type="text"
            placeholder="搜索PO号、TI订单号或客户名称..."
            value={searchTerm}
            onChange={handleSearch}
            //className="max-w-sm"
            className="flex-grow w-full max-w-lg px-4 py-2"
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
                <TableHead>TI订单号</TableHead>
                <TableHead>客户</TableHead>
                <TableHead>详情</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logisticsInfo.map((info) => (
                <TableRow key={info.orderId}>
                  <TableCell>{info.orderId}</TableCell>
                  <TableCell>{info.tiOrderNumber}</TableCell>
                  <TableCell>{info.customer}</TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                        >
                          <Info className="h-4 w-4 mr-2" />
                          详情
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[725px] bg-white">
                        <DialogHeader>
                          <DialogTitle>物流详情 - {info.orderId}</DialogTitle>
                          <DialogDescription>
                            订单 {info.orderId} 的物流详细信息
                          </DialogDescription>
                        </DialogHeader>
                        <div className="mt-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>元件名称</TableHead>
                                <TableHead>发货日期</TableHead>
                                <TableHead>预计到达日期</TableHead>
                                <TableHead>物流单号</TableHead>
                                <TableHead>商业发票</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {info.components.map((component, index) => (
                                <TableRow key={index}>
                                  <TableCell>{component.name || '未知'}</TableCell>
                                  <TableCell>{component.shippingDate || '未发货'}</TableCell>
                                  <TableCell>{component.estimatedDateOfArrival || '未知'}</TableCell>
                                  <TableCell>{component.carrier || '无'}</TableCell>
                                  <TableCell>
                                    {component.commercialInvoicePDF ? (
                                      <a 
                                        href={component.commercialInvoicePDF} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center text-blue-600 hover:text-blue-800"
                                      >
                                        <FileText className="h-4 w-4 mr-1" />
                                        查看发票
                                      </a>
                                    ) : '无'}
                                  </TableCell>
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
                      onClick={() => handleBatchRefresh()}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      刷新
                    </Button>
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