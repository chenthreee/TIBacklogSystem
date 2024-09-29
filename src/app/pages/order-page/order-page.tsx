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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  components: Component[],
  quoteNumber: string,
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
  confirmations?: Confirmation[];
  isDeleted?: boolean; // Added this line
  moq: number;
  nq: number;
}

interface Confirmation {
  tiScheduleLineNumber: string;
  scheduledQuantity: number;
  estimatedShipDate: string;
  estimatedDeliveryDate: string;
  estimatedDeliveryDateStatus: string;
  shippedQuantity: number;
  customerRequestedShipDate: string;
}
export default function OrderManagement() {
  const [orders, setOrders] = useState<Order[]>([])
  const [expandedOrders, setExpandedOrders] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [editingComponent, setEditingComponent] = useState<any>(null)
  const [tiPrice, setTiPrice] = useState<number | null>(null)
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
  const [localEditedComponents, setLocalEditedComponents] = useState<{[key: string]: Component}>({})
  const [orderStatus, setOrderStatus] = useState<string>("all")
  const [componentStatus, setComponentStatus] = useState<string>("all")

  useEffect(() => {
    fetchData()
  }, [currentPage, searchTerm, orderStatus, componentStatus])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/orders?page=${currentPage}&searchTerm=${searchTerm}&orderStatus=${orderStatus === 'all' ? '' : orderStatus}&componentStatus=${componentStatus === 'all' ? '' : componentStatus}`)
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
    const order = orders.find(o => o._id === orderId);
    setEditingComponent({ ...component, orderId, orderStatus: order?.status });
    fetchTiPriceAndQuantities(component.quoteNumber, component.name);
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
    const updatedComponent = {
      ...editedComponent,
      unitPrice: tiPrice || editedComponent.unitPrice,
      moq: editedComponent.moq,
      nq: editedComponent.nq
    };

    if (editedComponent.orderStatus === "处理中") {
      // 直接更新数据库
      await updateComponentInDatabase(editedComponent.orderId, updatedComponent);
      // 更新本地状态
      setOrders(orders.map(order => 
        order._id === editedComponent.orderId
          ? {
              ...order,
              components: order.components.map(comp => 
                comp.id === updatedComponent.id ? updatedComponent : comp
              )
            }
          : order
      ));
      toast({
        title: "组件已更新",
        description: "组件信息已直接更新到数据库。",
      });
    } else {
      // 原有的本地更新逻辑
      setLocalEditedComponents(prev => ({
        ...prev,
        [`${editedComponent.orderId}-${editedComponent.id}`]: updatedComponent
      }));
      toast({
        title: "组件已临时更新",
        description: "组件信息已在页面上更新。请点击'修改'按钮以提交到TI。",
      });
    }
    setEditingComponent(null);
    setTiPrice(null);
  }

  const updateComponentInDatabase = async (orderId: string, updatedComponent: Component) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/components/${updatedComponent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedComponent),
      });

      if (!response.ok) {
        throw new Error('更新组件失败');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('更新组件时出错:', error);
      toast({
        title: "错误",
        description: "更新组件失败，请稍后重试。",
        variant: "destructive",
      });
    }
  }

  const handleModifyOrder = async (orderId: string) => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      console.log("开始执行修改订单");
      const orderToModify = orders.find(o => o._id === orderId)
      if (!orderToModify) {
        throw new Error('未找到要修改的订单')
      }

      // 查询订单状态
      const queryResponse = await fetch(`/api/orders/${orderId}/query`, {
        method: 'GET',
      });

      if (!queryResponse.ok) {
        throw new Error('查询订单状态失败');
      }

      const queryData = await queryResponse.json();
      console.log('订单查询响应:', queryData);

      // 合并本地编辑和原始组件，并添加修改标记
      const componentsToSend = orderToModify.components.map(comp => {
        const localEdit = localEditedComponents[`${orderId}-${comp.id}`];
        const updatedComp = localEdit ? { ...comp, ...localEdit } : comp;
        
        const tiLineItem = queryData.tiResponse.orders[0].lineItems.find(
          (li: any) => li.tiPartNumber === updatedComp.name
        );

        const canModify = tiLineItem && !tiLineItem.nonCancellableNonReturnable;

        return {
          ...updatedComp,
          lineItemChangeIndicator: updatedComp.isDeleted ? 'X' : 'U'
        };
      });

      const unmodifiableComponents = componentsToSend
        .filter(comp => !queryData.tiResponse.orders[0].lineItems.find((li: any) => li.tiPartNumber === comp.name) || 
                        queryData.tiResponse.orders[0].lineItems.find((li: any) => li.tiPartNumber === comp.name).nonCancellableNonReturnable)
        .map(comp => comp.name);

      // 如果有不可修改的组件，提示用户
      if (unmodifiableComponents.length > 0) {
        toast({
          title: "部分组件无法修改",
          description: `以下组件已过修改窗口期：${unmodifiableComponents.join(', ')}`,
          variant: "destructive",
        });
      }

      const requestBody = { 
        components: componentsToSend,
        username: user.username,
        localEdits: localEditedComponents
      };
      console.log("发送到服务器的请求体:", JSON.stringify(requestBody, null, 2));

      // 发送修改请求
      const response = await fetch(`/api/orders/${orderId}/modify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        throw new Error('修改订单失败')
      }

      const data = await response.json()

      // 更新本地订单状态
      const updatedOrders = orders.map(o => 
        o._id === orderId ? { 
          ...o, 
          status: data.order.status,
          totalAmount: data.order.totalAmount,
          components: data.order.components
        } : o
      )
      setOrders(updatedOrders)

      // 清除本地编辑状态
      setLocalEditedComponents(prev => {
        const newState = { ...prev }
        componentsToSend.forEach(comp => {
          delete newState[`${orderId}-${comp.id}`]
        })
        return newState
      })
      
      await fetchData(); // 重新获取订单列表

      toast({
        title: "订单已修改",
        description: `订单 ${orderId} 已成功修改并更新。`,
      })
    } catch (error) {
      console.error('修改订单时出错:', error)
      toast({
        title: "错误",
        description: "修改订单失败，请稍后重试。",
        variant: "destructive",
      })
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
      let orderData;

      if (excelData.length > 0) {
        // 如果有 Excel 数据，使用现有的逻辑
        const quotationResponse = await fetch(`/api/quotations?quoteNumber=${newOrder.quoteNumber}`);
        const quotationData = await quotationResponse.json();

        if (!quotationData.success) {
          throw new Error('获取报价单失败');
        }

        const quotation = quotationData.quotations[0];

        const matchedComponents = quotation.components
          .map((component: any) => {
            const excelMatch = excelData.find((row: any) => row['规格型号'].includes(component.name));
            if (excelMatch) {
              // 转换 Excel 日期
              const excelDate = excelMatch['交货日期'];
              let deliveryDate;
              if (typeof excelDate === 'number') {
                // Excel 日期是从 1900 年 1 月 1 日开始的天数
                const date = new Date((excelDate - 25569) * 86400 * 1000);
                deliveryDate = date.toISOString().split('T')[0]; // 格式化为 YYYY-MM-DD
              } else {
                deliveryDate = excelDate; // 如果不是数字，保持原样
              }

              // 解析 Excel 中的数量
              const excelQuantity = parseInt(excelMatch['数量']);

              return {
                ...component,
                k3Code: excelMatch['物料长代码'],
                type: excelMatch['物料名称'],
                description: excelMatch['规格型号'],
                quantity: isNaN(excelQuantity) ? component.quantity : excelQuantity, // 使用 Excel 中的数量，如果无效则保留原始数量
                deliveryDate: deliveryDate,
                quoteNumber: quotation.quoteNumber // 添加报价单号
              };
            }
            return null; // 如果没有匹配,返回null
          })
          .filter((component: any) => component !== null); // 过滤掉所有null值

        if (matchedComponents.length === 0) {
          throw new Error('没有找到匹配的组件');
        }

        console.log('Matched components:', matchedComponents); // 添加这行来检查匹配的组件

        orderData = {
          ...newOrder,
          quotationId: quotation.id, // 设置 quotationId
          orderNumber: newOrder.purchaseOrderNumber, // 设置 orderNumber
          components: matchedComponents,
          totalAmount: matchedComponents.reduce((sum: number, comp: any) => sum + (comp.quantity * comp.tiPrice), 0),
        };
      } else {
        // 如果没有 Excel 数据，创建一个空订单
        orderData = {
          ...newOrder,
          orderNumber: newOrder.purchaseOrderNumber,
          components: [],
          totalAmount: 0,
        };
      }
      
      console.log('Order data to be sent:', orderData); // 添加这行来检查发送的订单数据

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '创建订单失败');
      }

      await fetchData();
      setIsCreateOrderDialogOpen(false);
      setNewOrder({
        date: new Date().toISOString().split('T')[0],
        customer: "",
        status: "处理中",
        quoteNumber: "",
        purchaseOrderNumber: "",
        components: [],
        totalAmount: 0,
      });
      setExcelData([]);

      toast({
        title: "订单已创建",
        description: excelData.length > 0 ? "新订单已成功添加到系统中。" : "空订单已成功创建。",
      });
    } catch (error) {
      console.error('创建订单时出错:', error);
      toast({
        title: "错误",
        description: `创建订单失败，请稍后重试。错误信息: ${(error as Error).message}`,
        variant: "destructive",
      });
    }
  }

  const handleSubmitOrder = async (orderId: string) => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await fetch(`/api/orders/${orderId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: user.username }),
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
      await fetchData();

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

  const handleDeleteComponent = (orderId: string, componentId: string) => {
    setLocalEditedComponents(prev => ({
      ...prev,
      [`${orderId}-${componentId}`]: { ...prev[`${orderId}-${componentId}`], isDeleted: true }
    }));
    toast({
      title: "元件已标记为删除",
      description: "元件已标记为删除，将在下次提交修改时生效。",
    });
  };

  const handleUpdatePurchaseOrderNumber = async (orderId: string, newPurchaseOrderNumber: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/update-purchase-order-number`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ purchaseOrderNumber: newPurchaseOrderNumber }),
      });

      if (!response.ok) {
        throw new Error('更新采购订单号失败');
      }

      const updatedOrder = await response.json();

      // 更新本地订单状态
      setOrders(orders.map(order => 
        order._id === orderId ? { ...order, purchaseOrderNumber: updatedOrder.purchaseOrderNumber, orderNumber: updatedOrder.orderNumber } : order
      ));

      toast({
        title: "采购订单号已更新",
        description: `订单 ${orderId} 的采购订单号已成功更新。`,
      });
    } catch (error) {
      console.error('更新采购订单号时出错:', error);
      toast({
        title: "错误",
        description: "更新采购订单号失败，请稍后重试。",
        variant: "destructive",
      });
    }
  };

  const handleAddComponent = async (orderId: string, newComponent: Partial<Component>) => {
    try {
      // 获取报价单信息
      const quotationResponse = await fetch(`/api/quotations?quoteNumber=${newComponent.quoteNumber}`);
      const quotationData = await quotationResponse.json();

      if (!quotationData.success) {
        throw new Error('获取报价单失败');
      }

      const quotation = quotationData.quotations[0];
      const matchedComponent = quotation.components.find((c: any) => c.name === newComponent.name);

      if (!matchedComponent) {
        throw new Error('在报价单中未找到匹配的元件');
      }

      const completeComponent = {
        ...newComponent,
        id: matchedComponent._id ? matchedComponent._id.toString() : undefined, // 添加空值检查
        unitPrice: matchedComponent.tiPrice,
        moq: matchedComponent.moq,
        nq: matchedComponent.nq,
        status: matchedComponent.status,
      };

      // 如果 id 为 undefined，我们可以在这里生成一个新的 id
      if (!completeComponent.id) {
        completeComponent.id = new Date().getTime().toString(); // 使用时间戳作为临时 ID
      }

      const response = await fetch(`/api/orders/${orderId}/components`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(completeComponent),
      });

      if (!response.ok) {
        throw new Error('添加元件失败');
      }

      const updatedOrder = await response.json();

      // 更新本地订单状态
      setOrders(orders.map(order => 
        order._id === orderId ? updatedOrder : order
      ));
      await fetchData();
      toast({
        title: "元件已添加",
        description: `新元件已成功添加到订单中。`,
      });
    } catch (error) {
      console.error('添加元件时出错:', error);
      toast({
        title: "错误",
        description: `添加元件失败：${(error as Error).message}`,
        variant: "destructive",
      });
    }
  };

  const fetchTiPriceAndQuantities = async (quoteNumber: string, componentName: string) => {
    try {
      const response = await fetch(`/api/quotations?quoteNumber=${quoteNumber}`);
      const data = await response.json();
      if (data.success && data.quotations.length > 0) {
        const quotation = data.quotations[0];
        const matchedComponent = quotation.components.find((c: any) => c.name === componentName);
        if (matchedComponent) {
          setTiPrice(matchedComponent.tiPrice);
          setEditingComponent((prev: Component | null) => {
            if (prev) {
              return {
                ...prev,
                moq: matchedComponent.moq,
                nq: matchedComponent.nq
              };
            }
            return prev;
          });
        } else {
          setTiPrice(null);
        }
      } else {
        setTiPrice(null);
      }
    } catch (error) {
      console.error('获取 TI 价格和数量失败:', error);
      setTiPrice(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Input
          type="text"
          placeholder="搜索PO号、TI订单号或客户名称..."
          value={searchTerm}
          onChange={handleSearch}
          className="max-w-sm"
        />
        <div className="flex space-x-2">
          <Select onValueChange={(value) => setOrderStatus(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="订单状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="处理中">处理中</SelectItem>
              <SelectItem value="REJECT">REJECT</SelectItem>
              <SelectItem value="PENDING">PENDING</SelectItem>
              <SelectItem value="OPEN">OPEN</SelectItem>
              <SelectItem value="BEING PROCESSED">BEING PROCESSED</SelectItem>
              <SelectItem value="COMPLETED">COMPLETED</SelectItem>
              {/* 根据实际情况添加更多状态 */}
            </SelectContent>
          </Select>
          <Select onValueChange={(value) => setComponentStatus(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="元件状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="Bid">Bid</SelectItem>
              <SelectItem value="Not Delivered">Not Delivered</SelectItem>
              <SelectItem value="Partially Delivered">Partially Delivered</SelectItem>
              <SelectItem value="Fully delivered">Fully delivered</SelectItem>
              <SelectItem value="Partially delivered,balance cancelled">balance cancelled</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>

              {/* 根据实际情况添加更多状态 */}
            </SelectContent>
          </Select>
        </div>
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
            orders={orders as any} // 更改了报错
            handleSubmitOrder={handleSubmitOrder}
            handleModifyOrder={handleModifyOrder}
            handleDeleteOrder={handleDeleteOrder}
            handleQueryOrder={handleQueryOrder} // 新增的查询函数
            toggleExpand={toggleExpand}
            expandedOrders={expandedOrders}
            handleEditComponent={handleEditComponent}
            localEditedComponents={localEditedComponents as any} //更改了报错
            handleDeleteComponent={handleDeleteComponent} 
            handleUpdatePurchaseOrderNumber={handleUpdatePurchaseOrderNumber}
            handleAddComponent={handleAddComponent}
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
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-quoteNumber" className="text-right">
                  TI报价号
                </Label>
                <Input
                  id="edit-quoteNumber"
                  type="text"
                  value={editingComponent.quoteNumber}
                  onChange={(e) => {
                    setEditingComponent({...editingComponent, quoteNumber: e.target.value});
                    fetchTiPriceAndQuantities(e.target.value, editingComponent.name);
                  }}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-tiPrice" className="text-right">
                  TI价格
                </Label>
                <Input
                  id="edit-tiPrice"
                  type="number"
                  value={tiPrice !== null ? tiPrice : ''}
                  readOnly
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-moq" className="text-right">
                  MOQ
                </Label>
                <Input
                  id="edit-moq"
                  type="number"
                  value={editingComponent.moq || ''}
                  readOnly
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-nq" className="text-right">
                  NQ
                </Label>
                <Input
                  id="edit-nq"
                  type="number"
                  value={editingComponent.nq || ''}
                  readOnly
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