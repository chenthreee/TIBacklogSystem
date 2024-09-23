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
import { CheckCircle, Edit, Trash2, ChevronUp, ChevronDown, Pencil, Search } from "lucide-react";
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

  // 计算订单的实际总金额（排除已删除的元件）
  const calculateActualTotal = (order: Order) => {
    return order.components.reduce((sum, component) => {
      const localEdit = localEditedComponents[`${order._id}-${component.id}`];
      const displayComponent = localEdit || component;
      const isDeleted = displayComponent.isDeleted || displayComponent.status === 'deleted';
      return isDeleted ? sum : sum + (displayComponent.quantity * displayComponent.unitPrice);
    }, 0);
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>订单ID</TableHead>
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
                <TableCell>{order.date}</TableCell>
                <TableCell>{order.customer}</TableCell>
                <TableCell>${calculateActualTotal(order).toFixed(2)}</TableCell>
                <TableCell>{order.status}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSubmitOrder(order._id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      提交
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleModifyOrder(order._id)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      修改
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
                          const isDeleted = displayComponent.isDeleted || displayComponent.status === 'deleted';
                          return (
                            <TableRow key={component.id} className={isDeleted ? 'opacity-50' : ''}>
                              <TableCell>{displayComponent.name}</TableCell>
                              <TableCell>{displayComponent.quantity}</TableCell>
                              <TableCell>${displayComponent.unitPrice?.toFixed(2) ?? '0.00'}</TableCell>
                              <TableCell>
                                ${isDeleted ? '0.00' : (displayComponent.quantity * displayComponent.unitPrice).toFixed(2)}
                              </TableCell>
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
