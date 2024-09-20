import { useState, useEffect, useRef } from "react"
import { Plus} from "lucide-react"
import * as XLSX from 'xlsx'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import CreateOrderDialog from './createOrderDialog';
import OrderTable from './orderTable';

// Define Order and Component interfaces
interface Order {
  _id: string
  date: string
  customer: string
  totalAmount: number
  status: string
  orderNumber: string
  tiOrderNumber: string
  quotationId: string
  purchaseOrderNumber: string
  components: Component[]
}

interface Component {
  id: string
  name: string
  quantity: number
  unitPrice: number
  status: string
  deliveryDate: string
  quoteNumber: string
  tiLineItemNumber?: string
  shippingDate?: string
  estimatedDateOfArrival?: string
  //carrierShipmentMasterTrackingNumber?: string
  carrier?: string
  k3Code: string
  type: string
  description: string
}

export default function OrderManagement() {
  const [orders, setOrders] = useState<Order[]>([])
  const [expandedOrders, setExpandedOrders] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [editingComponent, setEditingComponent] = useState<any>(null)
  const [isCreateOrderDialogOpen, setIsCreateOrderDialogOpen] = useState(false)
  const [newOrder, setNewOrder] = useState<Partial<Order>>({
    date: new Date().toISOString().split('T')[0],
    customer: "",
    status: "处理中",
    tiOrderNumber: "",
    orderNumber: "",
    quotationId: "",
    purchaseOrderNumber: "",
    components: [],
    totalAmount: 0,
  })
  const [excelData, setExcelData] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
  }, [currentPage, searchTerm])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/orders?page=${currentPage}&searchTerm=${searchTerm}`)
      if (!response.ok) {
        throw new Error('获取订单失败')
      }
      const data = await response.json()
      setOrders(data.orders)
      setTotalPages(data.totalPages)
    } catch (error) {
      console.error('获取订单时出错:', error)
      toast({
        title: "错误",
        description: "获取订单失败，请稍后重试。",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedOrders(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1)
  }

  const handleEditComponent = (orderId: string, component: Component) => {
    setEditingComponent({ ...component, orderId })
  }

  const handleDeleteOrder = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders?id=${orderId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('删除订单失败');
      }

      const data = await response.json();

      if (data.success) {
        toast({
          title: "订单已删除",
          description: "订单已成功从系统中删除。",
        });
        await fetchData(); // 重新获取订单列表
      } else {
        throw new Error(data.error || '删除订单失败');
      }
    } catch (error) {
      console.error('删除订单时出错:', error);
      toast({
        title: "错误",
        description: "删除订单失败，请稍后重试。",
        variant: "destructive",
      });
    }
  }

  const handleSaveComponent = async (editedComponent: any) => {
    try {
      const response = await fetch(`/api/orders/${editedComponent.orderId}/components/${editedComponent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editedComponent),
      });

      if (!response.ok) {
        throw new Error('更新组件失败');
      }

      const updatedComponent = await response.json();
      
      // 更新本地状态
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order._id === editedComponent.orderId
            ? {
                ...order,
                components: order.components.map(comp => 
                  comp.id === editedComponent.id ? updatedComponent : comp
                )
              }
            : order
        )
      );

      toast({
        title: "组件已更新",
        description: "组件信息已成功更新。",
      });

      setEditingComponent(null);
    } catch (error) {
      console.error('更新组件时出错:', error);
      toast({
        title: "错误",
        description: "更新组件失败，请稍后重试。",
        variant: "destructive",
      });
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const json = XLSX.utils.sheet_to_json(worksheet)
        setExcelData(json);
      }
      reader.readAsArrayBuffer(file)
    }
  }

  const handleCreateOrder = async () => {
    try {
      // 首先获取报价单信息
      const quotationResponse = await fetch(`/api/quotations/${newOrder.quotationId}`);
      const quotationData = await quotationResponse.json();

      if (!quotationData.success) {
        throw new Error('获取报价单失败');
      }

      // 将报价单中的组件与Excel数据进行匹配,只保留能在Excel中找到的组件
      const matchedComponents = quotationData.quotation.components
        .map((component: any) => {
          const excelMatch = excelData.find((row: any) => row['规格描述'].includes(component.name));
          if (excelMatch) {
            return {
              ...component,
              k3Code: excelMatch['K3编码'],
              type: excelMatch['类型'],
              description: excelMatch['规格描述'],
              quoteNumber: quotationData.quotation.quoteNumber // 添加报价单号
            };
          }
          return null; // 如果没有匹配,返回null
        })
        .filter((component: any) => component !== null); // 过滤掉所有null值

      // 如果没有匹配的组件,抛出错误
      if (matchedComponents.length === 0) {
        throw new Error('没有找到匹配的组件');
      }

      const orderData = {
        ...newOrder,
        components: matchedComponents,
        totalAmount: matchedComponents.reduce((sum: number, comp: any) => sum + (comp.quantity * comp.unitPrice), 0),
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        throw new Error('创建订单失败');
      }

      await fetchData();
      setIsCreateOrderDialogOpen(false);
      setNewOrder({
        date: new Date().toISOString().split('T')[0],
        customer: "",
        status: "处理中",
        quotationId: "",
        purchaseOrderNumber: "",
        components: [],
        totalAmount: 0,
      });
      setExcelData([]);

      toast({
        title: "订单已创建",
        description: "新订单已成功添加到系统中。",
      });
    } catch (error) {
      console.error('创建订单时出错:', error);
      toast({
        title: "错误",
        description: "创建订单失败，请稍后重试。",
        variant: "destructive",
      });
    }
  }

  const handleSubmitOrder = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/submit`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('提交订单失败');
      }

      const data = await response.json();
      console.log('TI API 完整响应:', data.tiResponse);

      // 更新本地订单状态
      const updatedOrders = orders.map(o => 
        o._id === orderId ? { 
          ...o, 
          status: data.tiResponse.orders[0].orderStatus,
          tiOrderNumber: data.tiResponse.orders[0].orderNumber,
          components: o.components.map(comp => {
            const tiLineItem = data.tiResponse.orders[0].lineItems.find((li: any) => li.tiPartNumber === comp.name);
            return tiLineItem ? { ...comp, status: tiLineItem.status, tiLineItemNumber: tiLineItem.tiLineItemNumber } : comp;
          })
        } : o
      );
      setOrders(updatedOrders);

      toast({
        title: "订单已提交",
        description: `订单 ${orderId} 已成功提交到 TI。TI 订单号: ${data.tiResponse.orders[0].orderNumber}`,
      });
    } catch (error) {
      console.error('提交订单时出错:', error);
      toast({
        title: "错误",
        description: "提交订单失败，请稍后重试。",
        variant: "destructive",
      });
    }
  };

  const handleModifyOrder = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/modify`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('修改订单失败');
      }

      const data = await response.json();
      console.log('TI API 修改订单完整响应:', data.tiResponse);

      // 更新本地订单状态
      const updatedOrders = orders.map(o => 
        o._id === orderId ? { 
          ...o, 
          status: data.order.status,
          components: data.order.components
        } : o
      );
      setOrders(updatedOrders);

      toast({
        title: "订单已修改",
        description: `订单 ${orderId} 已成功修改并更新。`,
      });
    } catch (error) {
      console.error('修改订单时出错:', error);
      toast({
        title: "错误",
        description: "修改订单失败，请稍后重试。",
        variant: "destructive",
      });
    }
  }

  const handleQueryOrder = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/query`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('查询订单失败');
      }

      const data = await response.json();
      console.log('TI 订单查询响应:', data.tiResponse);

      // 更新本地订单状态
      const updatedOrders = orders.map(o => 
        o._id === orderId ? { 
          ...o, 
          status: data.order.status,  
          components: data.order.components
        } : o
      );
      setOrders(updatedOrders);

      toast({
        title: "订单已查询",
        description: `订单 ${orderId} 的最新状态已更新。`,
      });

      // 这里可以添加显示详细订单信息的逻辑，例如打开一个模态框
    } catch (error) {
      console.error('查询订单时出错:', error);
      toast({
        title: "错误",
        description: "查询订单失败，请稍后重试。",
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
        <Button onClick={() => setIsCreateOrderDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> 创建订单
        </Button>
      </div>

      <CreateOrderDialog
        isCreateOrderDialogOpen={isCreateOrderDialogOpen}
        setIsCreateOrderDialogOpen={setIsCreateOrderDialogOpen}
        newOrder={newOrder as Order}
        setNewOrder={setNewOrder}
        handleCreateOrder={handleCreateOrder}
        handleFileUpload={handleFileUpload}
      />

      {isLoading ? (
        <div>加载中...</div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <OrderTable
            orders={orders}
            handleSubmitOrder={handleSubmitOrder}
            handleModifyOrder={handleModifyOrder}
            handleDeleteOrder={handleDeleteOrder}
            handleQueryOrder={handleQueryOrder} // 新增的查询函数
            toggleExpand={toggleExpand}
            expandedOrders={expandedOrders}
            handleEditComponent={handleEditComponent}
          />
        </div>
      )}

      <div className="flex justify-between items-center mt-4">
        <Button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
        >
          上一页
        </Button>
        <span>第 {currentPage} 页，共 {totalPages} 页</span>
        <Button
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
        >
          下一页
        </Button>
      </div>

      {editingComponent && (
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
                  数量
                </Label>
                <Input
                  id="edit-quantity"
                  type="number"
                  value={editingComponent.quantity}
                  onChange={(e) => setEditingComponent({...editingComponent, quantity: parseInt(e.target.value)})}
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
                  onChange={(e) => setEditingComponent({...editingComponent, unitPrice: parseFloat(e.target.value)})}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-deliveryDate" className="text-right">
                  交期
                </Label>
                <Input
                  id="edit-deliveryDate"
                  type="date"
                  value={editingComponent.deliveryDate}
                  onChange={(e) => setEditingComponent({...editingComponent, deliveryDate: e.target.value})}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => handleSaveComponent(editingComponent)}>保存更改</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}