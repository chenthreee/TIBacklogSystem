import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Order from '@/models/Order'
import { TIBacklogOrders } from '@/lib/external/TIBacklogAPI'

export async function POST(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  await dbConnect()

  const { orderId } = params

  try {
    const order = await Order.findById(orderId)

    if (!order) {
      return NextResponse.json({ error: '订单未找到' }, { status: 404 })
    }

    if (!order.tiOrderNumber) {
      return NextResponse.json({ error: '该订单尚未提交到 TI' }, { status: 400 })
    }

    // 初始化 TIBacklogOrders
    const ordersAPI = new TIBacklogOrders(process.env.CLIENT_ID!, process.env.CLIENT_SECRET!, process.env.SERVER_URL!)

    // 准备修改订单的数据
    const lineItems = order.components.map((component: any, index: number) => ({
      customerLineItemNumber: index + 1,
      lineItemChangeIndicator: 'U', // 'U' for update
      tiPartNumber: component.name,
      customerAnticipatedUnitPrice: component.unitPrice,
      customerCurrencyCode: 'USD', // 假设使用美元，您可能需要根据实际情况调整
      schedules: [
        {
          requestedQuantity: component.quantity,
          requestedDeliveryDate: component.deliveryDate,
        },
      ],
    }))

    // 发送修改订单请求
    const response = await ordersAPI.changeOrder(
      order.customer,
      order.orderNumber,
      process.env.SHIP_TO!, // 确保在环境变量中设置了 SHIP_TO
      lineItems
    )

    console.log('TI API 修改订单响应:', JSON.stringify(response, null, 2))

    // 更新本地订单信息
    order.status = response.orders[0].orderStatus
    order.components = order.components.map((comp: any) => {
      const tiLineItem = response.orders[0].lineItems.find((li: any) => li.tiPartNumber === comp.name)
      if (tiLineItem) {
        comp.status = tiLineItem.status
        comp.tiLineItemNumber = tiLineItem.tiLineItemNumber
      }
      return comp
    })

    await order.save()

    return NextResponse.json({ success: true, order, tiResponse: response }, { status: 200 })
  } catch (error) {
    console.error('修改订单时出错:', error)
    return NextResponse.json({ error: '修改订单失败' }, { status: 500 })
  }
}