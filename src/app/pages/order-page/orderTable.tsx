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
import { CheckCircle, Edit, Trash2, ChevronUp, ChevronDown, Pencil, Search, AlertCircle } from "lucide-react";
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
  handleDeleteComponent
}) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [componentToDelete, setComponentToDelete] = useState<{ orderId: string, componentId: string } | null>(null);
  const [quantityCheckResults, setQuantityCheckResults] = useState<{ [key: string]: { [key: string]: boolean } }>({});

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
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>订单ID</TableHead>
            <TableHead>TI订单号</TableHead>
            <TableHead>日期</TableHead>
            <TableHead>客户</TableHead>
            <TableHead>总金额</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <React.Fragment key={order._id}>
              <TableRow>
                <TableCell>{order.purchaseOrderNumber}</TableCell>
                <TableCell>{order.tiOrderNumber || '未提交'}</TableCell>
                <TableCell>{order.date}</TableCell>
                <TableCell>{order.customer}</TableCell>
                <TableCell>${calculateActualTotal(order)}</TableCell>
                <TableCell>{order.status}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
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
                    {/* 删除按钮已被注释掉
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteOrder(order._id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      删除
                    </Button>
                    */}
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
                    >
                      <AlertCircle className="h-4 w-4 mr-1" />
                      检查数量
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              {expandedOrders.includes(order._id) && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>元件名称</TableHead>
                          <TableHead>数量</TableHead>
                          <TableHead>MOQ</TableHead> {/* 新增 MOQ 列 */}
                          <TableHead>NQ</TableHead> {/* 新增 NQ 列 */}
                          <TableHead>单价</TableHead>
                          <TableHead>小计</TableHead>
                          <TableHead>状态</TableHead>
                          <TableHead>交期</TableHead>
                          <TableHead>确认信息</TableHead>
                          <TableHead>操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {order.components.map((component) => {
                          const localEdit = localEditedComponents[`${order._id}-${component.id}`];
                          const displayComponent = localEdit || component;
                          const isDeleted = displayComponent.status === 'deleted';
                          const quantity = displayComponent.quantity || 0;
                          const unitPrice = displayComponent.unitPrice || 0;
                          const componentTotal = isDeleted ? '0.000' : (quantity * unitPrice).toFixed(3);
                          return (
                            <TableRow key={component.id} className={isDeleted ? 'opacity-50' : ''}>
                              <TableCell>{displayComponent.name}</TableCell>
                              <TableCell>{quantity}</TableCell>
                              <TableCell>{displayComponent.moq}</TableCell> {/* 显示 MOQ */}
                              <TableCell>{displayComponent.nq}</TableCell> {/* 显示 NQ */}
                              <TableCell>${unitPrice.toFixed(3)}</TableCell>
                              <TableCell>${componentTotal}</TableCell>
                              <TableCell>{isDeleted ? '已删除' : displayComponent.status}</TableCell>
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
                              <TableCell>
                                {quantityCheckResults[order._id]?.[component.id] === false && (
                                  <span className="text-red-500">数量不符合规则</span>
                                )}
                                {quantityCheckResults[order._id]?.[component.id] === true && (
                                  <span className="text-green-500">数量符合规则</span>
                                )}
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
    </>
  );
};

export default OrderTable;
