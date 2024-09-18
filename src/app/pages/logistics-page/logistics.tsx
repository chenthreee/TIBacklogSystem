import { useState, useEffect } from "react"
import { Search, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

interface LogisticsInfo {
  orderId: string
  customer: string
  shippingDate: string
  estimatedDeliveryDate: string
  status: string
  tiOrderNumber: string
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

  const handleRefresh = async (orderId: string) => {
    try {
      const response = await fetch(`/api/logistics/refresh/${orderId}`);
      if (!response.ok) {
        throw new Error('刷新物流信息失败');
      }
      const data = await response.json();
      console.log('TI ASN API 完整响应:', data.tiResponse);

      // 更新本地状态
      setLogisticsInfo(prevInfo => prevInfo.map(info => 
        info.orderId === orderId
          ? {
              ...info,
              shippingDate: data.shippingDate || info.shippingDate,
              estimatedDeliveryDate: data.estimatedDeliveryDate || info.estimatedDeliveryDate
            }
          : info
      ));

      toast({
        title: "刷新成功",
        description: `订单 ${orderId} 的物流信息已更新。`,
      });
    } catch (error) {
      console.error('刷新物流信息时出错:', error);
      toast({
        title: "错误",
        description: "刷新物流信息失败，请稍后重试。",
        variant: "destructive",
      });
    }
  }

  const handleReadAll = () => {
    toast({
      title: "读取成功",
      description: "所有物流信息已更新。",
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "运输中":
        return <Badge variant="secondary">{status}</Badge>
      case "已发货":
        return <Badge variant="default">{status}</Badge>
      case "已送达":
        return <Badge variant="secondary">{status}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
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
                <TableHead>TI订单号</TableHead>
                <TableHead>客户</TableHead>
                <TableHead>发货日期</TableHead>
                <TableHead>预计送达日期</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logisticsInfo.map((info) => (
                <TableRow key={info.orderId}>
                  <TableCell>{info.orderId}</TableCell>
                  <TableCell>{info.tiOrderNumber}</TableCell>
                  <TableCell>{info.customer}</TableCell>
                  <TableCell>{info.shippingDate || '未发货'}</TableCell>
                  <TableCell>{info.estimatedDeliveryDate || '未知'}</TableCell>
                  <TableCell>{getStatusBadge(info.status)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRefresh(info.orderId)}
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