import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import { basicAuthMiddleware } from '@/lib/auth';

async function handleTIOrderUpdate(req: NextRequest) {
  await dbConnect();

  try {
    const tiOrderData = await req.json();
    console.log('Received TI order update:', JSON.stringify(tiOrderData, null, 2));

    // 验证 TI 订单数据
    if (!tiOrderData.orders || !tiOrderData.orders.length) {
      return NextResponse.json({ error: '缺少订单数据' }, { status: 400 });
    }

    const tiOrder = tiOrderData.orders[0]; // 假设我们只处理第一个订单

    // 查找对应的订单
    const order = await Order.findOne({ tiOrderNumber: tiOrder.orderNumber });

    if (!order) {
      return NextResponse.json({ error: '未找到对应的订单' }, { status: 404 });
    }

    // 更新订单状态
    order.status = tiOrder.orderStatus || order.status;
    order.customerPurchaseOrderNumber = tiOrder.customerPurchaseOrderNumber || order.customerPurchaseOrderNumber;
    order.endCustomerCompanyName = tiOrder.endCustomerCompanyName || order.endCustomerCompanyName;

    // 更新组件信息
    if (Array.isArray(tiOrder.lineItems)) {
      tiOrder.lineItems.forEach((lineItem: any) => {
        const component = order.components.find((c: any) => c.name === lineItem.tiPartNumber);
        if (component) {
          component.status = lineItem.status || component.status;
          component.tiLineItemNumber = lineItem.tiLineItemNumber || component.tiLineItemNumber;
          
          // 更新调度信息
          if (lineItem.schedules && lineItem.schedules.length > 0) {
            const schedule = lineItem.schedules[0]; // 假设我们只处理第一个调度
            if (schedule.confirmations && schedule.confirmations.length > 0) {
              const confirmation = schedule.confirmations[0];
              component.scheduledQuantity = confirmation.scheduledQuantity || component.scheduledQuantity;
              component.estimatedShipDate = confirmation.estimatedShipDate || component.estimatedShipDate;
              component.estimatedDeliveryDate = confirmation.estimatedDeliveryDate || component.estimatedDeliveryDate;
              component.shippedQuantity = confirmation.shippedQuantity || component.shippedQuantity;
              component.unshippedQuantity = confirmation.unshippedQuantity || component.unshippedQuantity;
            }
          }
        }
      });
    }

    // 保存更新后的订单
    await order.save();

    console.log('Updated order:', JSON.stringify(order.toObject(), null, 2));

    return NextResponse.json({ success: true, message: '订单已成功更新' }, { status: 200 });
  } catch (error) {
    console.error('处理 TI 订单更新时出错:', error);
    return NextResponse.json({ error: '处理订单更新失败' }, { status: 500 });
  }
}

export const POST = basicAuthMiddleware(handleTIOrderUpdate);