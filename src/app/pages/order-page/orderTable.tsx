import React from 'react';
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

interface Order {
  _id: string;
  orderNumber: string;
  date: string;
  customer: string;
  totalAmount: number;
  status: string;
  components: Component[];
  tiOrderNumber: string;
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
}

const OrderTable: React.FC<OrderTableProps> = ({
  orders,
  handleSubmitOrder,
  handleModifyOrder,
  handleDeleteOrder,
  handleQueryOrder,
  toggleExpand,
  expandedOrders,
  handleEditComponent
}) => {
  return (
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
              <TableCell>{order._id}</TableCell>
              <TableCell>{order.date}</TableCell>
              <TableCell>{order.customer}</TableCell>
              <TableCell>¥{order.totalAmount.toFixed(2)}</TableCell>
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteOrder(order._id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    删除
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
                </div>
              </TableCell>
            </TableRow>
            {expandedOrders.includes(order._id) && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>元件名称</TableHead>
                        <TableHead>数量</TableHead>
                        <TableHead>单价</TableHead>
                        <TableHead>小计</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>交期</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.components.map((component) => (
                        <TableRow key={component.id}>
                          <TableCell>{component.name}</TableCell>
                          <TableCell>{component.quantity}</TableCell>
                          <TableCell>¥{component.unitPrice.toFixed(2)}</TableCell>
                          <TableCell>
                            ¥{(component.quantity * component.unitPrice).toFixed(2)}
                          </TableCell>
                          <TableCell>{component.status}</TableCell>
                          <TableCell>{component.deliveryDate}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditComponent(order._id, component)}
                            >
                              <Pencil className="h-4 w-4" />
                              编辑
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableCell>
              </TableRow>
            )}
          </React.Fragment>
        ))}
      </TableBody>
    </Table>
  );
};

export default OrderTable;
