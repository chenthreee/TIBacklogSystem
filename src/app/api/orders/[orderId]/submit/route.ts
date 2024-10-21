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
  const { username } = await req.json()

  try {
    const order = await Order.findById(orderId)

    if (!order) {
      return NextResponse.json({ error: '订单未找到' }, { status: 404 })
    }

    const ordersAPI = new TIBacklogOrders(process.env.CLIENT_ID!, process.env.CLIENT_SECRET!, process.env.SERVER_URL!)

    order.components.forEach((component: any) => {
      const deliveryDate = new Date(component.deliveryDate)
      ordersAPI.addItemToCart(component.name.trim(), component.quantity, deliveryDate, component.unitPrice, component.quoteNumber, component.k3Code)
    })

    const response = await ordersAPI.postOrder(
      order.customer,
      order.orderNumber,
      process.env.SHIP_TO!
    )

    console.log('TI API 响应:', JSON.stringify(response, null, 2))

    order.status = response.orders[0].orderStatus
    order.tiOrderNumber = response.orders[0].orderNumber

    response.orders[0].lineItems.forEach((lineItem: any) => {
      const component = order.components.find((c: any) => c.name.trim().toLowerCase() === lineItem.tiPartNumber.trim().toLowerCase())
      if (component) {
        component.status = lineItem.status
        component.tiLineItemNumber = lineItem.tiLineItemNumber
        component.name = lineItem.tiPartNumber.trim() // 更新组件名称，去除多余的空格
      }
    })

    console.log('提交订单的用户名:', username);
    order.apiLogs.push({
      operationType: 'submit',
      timestamp: new Date(),
      username: username
    });

    await order.save()

    return NextResponse.json({ success: true, tiResponse: response }, { status: 200 })
  } catch (error) {
    console.error('提交订单时出错:', error)
    return NextResponse.json({ error: '提交订单失败' }, { status: 500 })
  }
}
