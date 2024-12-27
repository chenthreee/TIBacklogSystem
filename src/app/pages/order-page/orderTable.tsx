import React, { useState } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, Edit, Trash2, ChevronUp, ChevronDown, Pencil, Search, AlertCircle, FileText, Check, X, Plus, Download } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Info } from "lucide-react";
import { CANCELLED } from 'dns';

interface Order {
  _id: string;
  orderNumber: string;
  date: string;
  customer: string;
  totalAmount: number;
  status: string;
  components: Component[];
  tiOrderNumber: string;
  purchaseOrderNumber: string;
  apiLogs: {
    operationType: 'submit' | 'modify';
    timestamp: string;
    username: string;
    changes: ChangeLogEntry[];
  }[];
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

interface Component {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  status: string;
  deliveryDate: string;
  quoteNumber: string
  tiLineItemNumber?: string // 将 tiLineItemNumber 设为可选属性
  k3Code: string;
  type: string;
  description: string;
  confirmations?: Confirmation[];
  moq: number; // 添加 moq 字段
  nq: number; // 添加 nq 字段
}

interface OrderTableProps {
  orders: Order[];
  handleSubmitOrder: (orderId: string) => void;
  handleModifyOrder: (orderId: string) => void;
  handleDeleteOrder: (orderId: string) => void;
  handleQueryOrder: (orderId: string) => void;
  toggleExpand: (orderId: string) => void;
  expandedOrders: string[];
  handleEditComponent: (orderId: string, component: Component) => void;
  localEditedComponents: {[key: string]: Component}
  handleDeleteComponent: (orderId: string, componentId: string) => void;
  handleUpdatePurchaseOrderNumber: (orderId: string, newPurchaseOrderNumber: string) => Promise<void>;
  handleAddComponent: (orderId: string, newComponent: Partial<Component>) => Promise<void>;
  handleExportOrders: (orderIds: string[]) => void;
  handleBatchQuery: () => Promise<void>;
  isRefreshing: boolean;
}

interface ChangeLogEntry {
  componentName: string;
  changes: string[];
}

const OrderTable: React.FC<OrderTableProps> = ({
  orders,
  handleSubmitOrder,
  handleModifyOrder,
  handleDeleteOrder,
  handleQueryOrder,
  toggleExpand,
  expandedOrders,
  handleEditComponent,
  localEditedComponents,
  handleDeleteComponent,
  handleUpdatePurchaseOrderNumber,
  handleAddComponent,
  handleExportOrders,
  handleBatchQuery,
  isRefreshing
}) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [componentToDelete, setComponentToDelete] = useState<{ orderId: string, componentId: string } | null>(null);
  const [quantityCheckResults, setQuantityCheckResults] = useState<{ [key: string]: { [key: string]: boolean } }>({});
  const [isCheckingQuantities, setIsCheckingQuantities] = useState(false);
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  const [currentLogs, setCurrentLogs] = useState<Order['apiLogs']>([]);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editingPurchaseOrderNumber, setEditingPurchaseOrderNumber] = useState<string>('');
  const [isAddComponentDialogOpen, setIsAddComponentDialogOpen] = useState(false);
  const [addingComponentOrderId, setAddingComponentOrderId] = useState<string | null>(null);
  const [newComponent, setNewComponent] = useState<Partial<Component>>({
    name: '',
    quantity: 0,
    quoteNumber: '',
    deliveryDate: '',
    k3Code: '',
    type: '',
    description: '',
  });
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [isChangeDetailsDialogOpen, setIsChangeDetailsDialogOpen] = useState(false);
  const [currentChangeDetails, setCurrentChangeDetails] = useState<ChangeLogEntry[]>([]);

  const openDeleteDialog = (orderId: string, componentId: string) => {
    setComponentToDelete({ orderId, componentId });
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (componentToDelete) {
      handleDeleteComponent(componentToDelete.orderId, componentToDelete.componentId);
    }
    setIsDeleteDialogOpen(false);
  };

  // 修改计算订单实际总金额的函数
  const calculateActualTotal = (order: Order) => {
    return order.components.reduce((sum, component) => {
      const localEdit = localEditedComponents[`${order._id}-${component.id}`];
      const displayComponent = localEdit || component;
      const isDeleted = displayComponent.status === 'deleted';
      const quantity = displayComponent.quantity || 0;
      const unitPrice = displayComponent.unitPrice || 0;
      return isDeleted ? sum : sum + (quantity * unitPrice);
    }, 0).toFixed(3); // 保留三位小数
  };

  const checkQuantities = (order: Order) => {
    setIsCheckingQuantities(true);
    const results: { [key: string]: boolean } = {};
    order.components.forEach((component) => {
      const localEdit = localEditedComponents[`${order._id}-${component.id}`];
      const displayComponent = localEdit || component;
      
      const quantity = displayComponent.quantity;
      const moq = displayComponent.moq;
      const nq = displayComponent.nq;
      
      if (moq === undefined || nq === undefined) {
        results[component.id] = false;
        return;
      }

      if (quantity < moq) {
        results[component.id] = false;
      } else {
        const remainder = (quantity - moq) % nq;
        results[component.id] = remainder === 0;
      }
    });
    setQuantityCheckResults({ ...quantityCheckResults, [order._id]: results });
    setIsCheckingQuantities(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const handleOpenLogDialog = (logs: Order['apiLogs']) => {
    setCurrentLogs(logs);
    setIsLogDialogOpen(true);
  };

  const handleEditPurchaseOrderNumber = (orderId: string, currentPurchaseOrderNumber: string) => {
    setEditingOrderId(orderId);
    setEditingPurchaseOrderNumber(currentPurchaseOrderNumber);
  };

  const handleSavePurchaseOrderNumber = async () => {
    if (editingOrderId) {
      await handleUpdatePurchaseOrderNumber(editingOrderId, editingPurchaseOrderNumber);
      setEditingOrderId(null);
    }
  };

  const handleOpenAddComponentDialog = (orderId: string) => {
    setAddingComponentOrderId(orderId);
    setIsAddComponentDialogOpen(true);
  };

  const handleAddComponentSubmit = async () => {
    if (addingComponentOrderId) {
      await handleAddComponent(addingComponentOrderId, newComponent);
      setIsAddComponentDialogOpen(false);
      setAddingComponentOrderId(null);
      setNewComponent({
        name: '',
        quantity: 0,
        quoteNumber: '',
        deliveryDate: '',
        k3Code: '',
        type: '',
        description: '',
      });
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map(order => order._id));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleExport = () => {
    handleExportOrders(selectedOrders);
  };

  const handleOpenChangeDetailsDialog = (changes: ChangeLogEntry[]) => {
    setCurrentChangeDetails(changes);
    setIsChangeDetailsDialogOpen(true);
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <Checkbox
              checked={selectAll}
              onCheckedChange={handleSelectAll}
              id="select-all"
            />
            <label htmlFor="select-all" className="ml-2">全选</label>
          </div>
          <Button 
            onClick={handleBatchQuery} 
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
        <Button onClick={handleExport} disabled={selectedOrders.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          导出选中订单
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]"></TableHead>
            <TableHead>PO号</TableHead>
            <TableHead>TI订单号</TableHead>
            <TableHead>日期</TableHead>
            <TableHead>客户</TableHead>
            <TableHead>总金额</TableHead>
            <TableHead>状态</TableHead>
            <TableHead className="text-center">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <React.Fragment key={order._id}>
              <TableRow>
                <TableCell>
                  <Checkbox
                    checked={selectedOrders.includes(order._id)}
                    onCheckedChange={() => handleSelectOrder(order._id)}
                  />
                </TableCell>
                <TableCell>
                  {editingOrderId === order._id ? (
                    <div className="flex items-center space-x-2">
                      <Input
                        value={editingPurchaseOrderNumber}
                        onChange={(e) => setEditingPurchaseOrderNumber(e.target.value)}
                        className="w-40"
                      />
                      <Button size="sm" onClick={handleSavePurchaseOrderNumber}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingOrderId(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <span 
                      className="cursor-pointer hover:underline"
                      onClick={() => !order.tiOrderNumber && handleEditPurchaseOrderNumber(order._id, order.purchaseOrderNumber)}
                    >
                      {order.purchaseOrderNumber}
                    </span>
                  )}
                </TableCell>
                <TableCell>{order.tiOrderNumber || '未提交'}</TableCell>
                <TableCell>{order.date}</TableCell>
                <TableCell>{order.customer}</TableCell>
                <TableCell>${calculateActualTotal(order)}</TableCell>
                <TableCell>{order.status}</TableCell>
                <TableCell>
                  <div className="flex justify-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSubmitOrder(order._id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      创建提交
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleModifyOrder(order._id)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      变更提交
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleQueryOrder(order._id)}
                    >
                      <Search className="h-4 w-4 mr-1" />
                      查询
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpand(order._id)}
                    >
                      {expandedOrders.includes(order._id) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      {expandedOrders.includes(order._id) ? "收起" : "展开"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => checkQuantities(order)}
                      disabled={isCheckingQuantities}
                    >
                      {isCheckingQuantities ? (
                        <span className="animate-spin mr-1">⌛</span>
                      ) : (
                        <AlertCircle className="h-4 w-4 mr-1" />
                      )}
                      {isCheckingQuantities ? "检查中..." : "检查数量"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenLogDialog(order.apiLogs)}
                      disabled={!order.apiLogs || order.apiLogs.length === 0}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      查看日志
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenAddComponentDialog(order._id)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      添加元件
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              {expandedOrders.includes(order._id) && (
                <TableRow>
                  <TableCell colSpan={8}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>序号</TableHead>
                          <TableHead>元件名称</TableHead>
                          <TableHead>下单数量</TableHead>
                          <TableHead>MOQ</TableHead>
                          <TableHead>NQ</TableHead>
                          <TableHead>单价</TableHead>
                          <TableHead>小计</TableHead>
                          <TableHead>状态</TableHead>
                          <TableHead>交期</TableHead>
                          <TableHead>确认信息</TableHead>
                          <TableHead>操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {order.components.map((component, index) => {
                          const localEdit = localEditedComponents[`${order._id}-${component.id}`];
                          const displayComponent = localEdit || component;
                          const isDeleted = displayComponent.status === 'deleted';
                          const quantity = displayComponent.quantity || 0;
                          const unitPrice = displayComponent.unitPrice || 0;
                          const componentTotal = isDeleted ? '0.000' : (quantity * unitPrice).toFixed(3);
                          return (
                            <TableRow key={component.id} className={isDeleted ? 'opacity-50' : ''}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell>{displayComponent.name}</TableCell>
                              <TableCell>
                                {quantityCheckResults[order._id]?.[component.id] !== undefined && (
                                  <span className={quantityCheckResults[order._id][component.id] ? "text-green-500" : "text-red-500"}>
                                    {quantityCheckResults[order._id][component.id] ? "✓" : "✗"}
                                  </span>
                                )}
                                {displayComponent.quantity}
                              </TableCell>
                              <TableCell>{displayComponent.moq}</TableCell>
                              <TableCell>{displayComponent.nq}</TableCell>
                              <TableCell>${unitPrice.toFixed(3)}</TableCell>
                              <TableCell>${componentTotal}</TableCell>
                              <TableCell>{isDeleted ? 'Cancelled' : displayComponent.status}</TableCell>
                              <TableCell>{displayComponent.deliveryDate}</TableCell>
                              <TableCell>
                                {displayComponent.confirmations && displayComponent.confirmations.length > 0 ? (
                                  <details>
                                    <summary>查看确认信息</summary>
                                    <ul>
                                      {displayComponent.confirmations.map((conf, index) => (
                                        <li key={index}>
                                          <p>预计发货日期: {conf.estimatedShipDate}</p>
                                          <p>预计交付日期: {conf.estimatedDeliveryDate}</p>
                                          <p>确认数量: {conf.scheduledQuantity}</p>
                                        </li>
                                      ))}
                                    </ul>
                                  </details>
                                ) : (
                                  '无确认信息'
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex space-x-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditComponent(order._id, displayComponent)}
                                    disabled={isDeleted}
                                  >
                                    <Pencil className="h-4 w-4" />
                                    编辑
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openDeleteDialog(order._id, component.id)}
                                    disabled={isDeleted}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    删除
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>

      <Dialog open={isLogDialogOpen} onOpenChange={setIsLogDialogOpen}>
        <DialogContent className="sm:max-w-[700px] bg-white">
          <DialogHeader>
            <DialogTitle>操作日志</DialogTitle>
          </DialogHeader>
          <div className="py-4 max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/5">操作类型</TableHead>
                  <TableHead className="w-2/5">时间</TableHead>
                  <TableHead className="w-2/5">变更人</TableHead>
                  <TableHead className="w-1/5">变更详情</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentLogs.map((log, index) => (
                  <TableRow key={index}>
                    <TableCell>{log.operationType === 'submit' ? '提交' : '修改'}</TableCell>
                    <TableCell>{formatDate(log.timestamp)}</TableCell>
                    <TableCell>{log.username}</TableCell>
                    <TableCell>
                      {log.changes && log.changes.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenChangeDetailsDialog(log.changes)}
                        >
                          <Info className="h-4 w-4 mr-1" />
                          查看详情
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsLogDialogOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isChangeDetailsDialogOpen} onOpenChange={setIsChangeDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[700px] bg-white">
          <DialogHeader>
            <DialogTitle>变更详情</DialogTitle>
          </DialogHeader>
          <div className="py-4 max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/2">变更的元件</TableHead>
                  <TableHead className="w-1/2">变更的具体操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentChangeDetails.map((detail, index) => (
                  <TableRow key={index}>
                    <TableCell>{detail.componentName}</TableCell>
                    <TableCell>
                      <ul className="list-disc list-inside">
                        {detail.changes.map((change, changeIndex) => (
                          <li key={changeIndex}>{change}</li>
                        ))}
                      </ul>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsChangeDetailsDialogOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-white shadow-lg rounded-xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除元件</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除这个元件吗？这个操作将在下次提交修改时生效。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isAddComponentDialogOpen} onOpenChange={setIsAddComponentDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white">
          <DialogHeader>
            <DialogTitle>添加新元件</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">元件名</Label>
              <Input
                id="name"
                value={newComponent.name}
                onChange={(e) => setNewComponent({...newComponent, name: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantity" className="text-right">数量</Label>
              <Input
                id="quantity"
                type="number"
                value={newComponent.quantity}
                onChange={(e) => setNewComponent({...newComponent, quantity: Number(e.target.value)})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quoteNumber" className="text-right">报价号</Label>
              <Input
                id="quoteNumber"
                value={newComponent.quoteNumber}
                onChange={(e) => setNewComponent({...newComponent, quoteNumber: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="deliveryDate" className="text-right">期望交货日期</Label>
              <Input
                id="deliveryDate"
                type="date"
                value={newComponent.deliveryDate}
                onChange={(e) => setNewComponent({...newComponent, deliveryDate: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="k3Code" className="text-right">K3编码</Label>
              <Input
                id="k3Code"
                value={newComponent.k3Code}
                onChange={(e) => setNewComponent({...newComponent, k3Code: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">类型</Label>
              <Input
                id="type"
                value={newComponent.type}
                onChange={(e) => setNewComponent({...newComponent, type: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">规格描述</Label>
              <Input
                id="description"
                value={newComponent.description}
                onChange={(e) => setNewComponent({...newComponent, description: e.target.value})}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddComponentSubmit}>添加元件</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default OrderTable;