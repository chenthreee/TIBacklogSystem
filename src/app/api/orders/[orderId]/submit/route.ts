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

    // 初始化 TIBacklogOrders
    const ordersAPI = new TIBacklogOrders(process.env.CLIENT_ID!, process.env.CLIENT_SECRET!, process.env.SERVER_URL!)

    // 将所有元件加入购物车
    order.components.forEach((component: any) => {
      const deliveryDate = new Date(component.deliveryDate)
      ordersAPI.addItemToCart(component.name, component.quantity, deliveryDate, component.unitPrice, component.quoteNumber,component.k3Code)
    })

    // 发送创建订单请求
    const response = await ordersAPI.postOrder(
      order.customer,
      order.orderNumber,
      process.env.SHIP_TO! // 确保在环境变量中设置了 SHIP_TO
    )

    // 打印完整的响应，包括 lineItems
    console.error('TI API 响应:', JSON.stringify(response, null, 2))

    // 更新订单状态和 TI 订单号
    order.status = response.orders[0].orderStatus
    order.tiOrderNumber = response.orders[0].orderNumber

    // 更新组件状态
    response.orders[0].lineItems.forEach((lineItem: any) => {
      const component = order.components.find((c: any) => c.name === lineItem.tiPartNumber)
      if (component) {
        component.status = lineItem.status
        component.tiLineItemNumber = lineItem.tiLineItemNumber
      }
    })

    // 添加 API 调用日志
    order.apiLogs.push({
      operationType: 'submit',
      timestamp: new Date()
    });

    await order.save()

    // 返回完整的响应给客户端
    return NextResponse.json({ success: true, tiResponse: response }, { status: 200 })
  } catch (error) {
    console.error('提交订单时出错:', error)
    return NextResponse.json({ error: '提交订单失败' }, { status: 500 })
  }
}