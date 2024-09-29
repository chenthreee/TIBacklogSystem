import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';

interface Confirmation {
  estimatedShipDate: string;
  estimatedDeliveryDate: string;
  scheduledQuantity: number;
  estimatedDeliveryDateStatus: string;
  shippedQuantity: number;
  customerRequestedShipDate: string;
}

export async function POST(req: NextRequest) {
  await dbConnect();

  try {
    const { orderIds } = await req.json();

    const orders = await Order.find({ _id: { $in: orderIds } }).lean();

    const exportData = [];

    for (const order of orders) {
      for (const component of order.components) {
        const componentData: any = {
          订单号: order.orderNumber,
          TI订单号: order.tiOrderNumber,
          客户: order.customer,
          日期: order.date,
          总金额: order.totalAmount,
          状态: order.status,
          采购订单号: order.purchaseOrderNumber,
          报价单ID: order.quotationId,
          元件ID: component.id,
          元件名称: component.name,
          数量: component.quantity,
          单价: component.unitPrice,
          小计: component.quantity * component.unitPrice,
          元件状态: component.status,
          交期: component.deliveryDate,
          TI行项目号: component.tiLineItemNumber,
          报价号: component.quoteNumber,
          发货日期: component.shippingDate,
          预计到达日期: component.estimatedDateOfArrival,
          快递单号: component.carrier,  // 这里改为 "快递单号"
          K3编码: component.k3Code,
          类型: component.type,
          规格描述: component.description,
          MOQ: component.moq,
          NQ: component.nq,
        };

        // 处理确认信息
        if (component.confirmations && component.confirmations.length > 0) {
          componentData['确认信息'] = component.confirmations.map((confirmation: Confirmation, index: number) => 
            `确认信息 ${index + 1}:\n` +
            `预计发货日期: ${confirmation.estimatedShipDate}\n` +
            `预计交付日期: ${confirmation.estimatedDeliveryDate}\n` +
            `确认数量: ${confirmation.scheduledQuantity}\n` +
            `预计交付日期状态: ${confirmation.estimatedDeliveryDateStatus}\n` +
            `已发货数量: ${confirmation.shippedQuantity}\n` +
            `客户要求发货日期: ${confirmation.customerRequestedShipDate}`
          ).join('\n\n');
        } else {
          componentData['确认信息'] = '暂无确认信息';
        }

        exportData.push(componentData);
      }
    }

    return NextResponse.json(exportData);
  } catch (error) {
    console.error('导出订单时出错:', error);
    return NextResponse.json({ error: '导出失败' }, { status: 500 });
  }
}