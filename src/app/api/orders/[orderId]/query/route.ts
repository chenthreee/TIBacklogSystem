import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Order from '@/models/Order'
import { TIBacklogOrders } from '@/lib/external/TIBacklogAPI'

export async function GET(
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

    // 查询 TI 订单
    const tiResponse = await ordersAPI.retrieveOrderByCustomerNumber(order.orderNumber)
    console.log('TI API 响应:', JSON.stringify(tiResponse, null, 2))

    // 更新本地订单信息
    order.status = tiResponse.orders[0].orderStatus
    order.components = order.components.map((comp: any) => {
      const tiLineItem = tiResponse.orders[0].lineItems.find((li: any) => li.tiPartNumber === comp.name)
      if (tiLineItem) {
        comp.status = tiLineItem.status
        comp.quantity = tiLineItem.tiTotalOrderItemQuantity
        comp.unitPrice = tiLineItem.customerAnticipatedUnitPrice
        comp.tiLineItemNumber = tiLineItem.tiLineItemNumber
      }
      return comp
    })

    await order.save()

    return NextResponse.json({ success: true, order, tiResponse }, { status: 200 })
  } catch (error) {
    console.error('查询订单时出错:', error)
    return NextResponse.json({ error: '查询订单失败' }, { status: 500 })
  }
}