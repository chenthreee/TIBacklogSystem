import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Order from '@/models/Order'
import { TIBacklogASN } from '@/lib/external/TIBacklogAPI'

export async function GET(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  await dbConnect()

  const { orderId } = params

  try {
    const order = await Order.findOne({ orderNumber: orderId })

    if (!order) {
      return NextResponse.json({ error: '订单未找到' }, { status: 404 })
    }

    if (!order.tiOrderNumber) {
      return NextResponse.json({ error: '该订单尚未提交到 TI' }, { status: 400 })
    }

    // 初始化 TIBacklogASN
    const asnAPI = new TIBacklogASN(process.env.CLIENT_ID!, process.env.CLIENT_SECRET!, process.env.SERVER_URL!)

    // 查询 TI ASN
    const tiResponse = await asnAPI.retrieveByCustomerOrderNumber(order.orderNumber)

    // 打印完整的响应，包括嵌套内容
    console.log('TI ASN API 响应:', JSON.stringify(tiResponse, null, 2))

    // 提取预计到达日期和发货日期
    const consolidatedInfo = tiResponse.data.consolidatedInformation[0]
    const estimatedDeliveryDate = consolidatedInfo.estimatedDateOfArrival
    const shippingDate = consolidatedInfo.shippingDate

    // 更新本地订单信息
    order.estimatedDeliveryDate = estimatedDeliveryDate
    order.shippingDate = shippingDate
    await order.save()

    return NextResponse.json({ 
      success: true, 
      estimatedDeliveryDate, 
      shippingDate,
      tiResponse 
    }, { status: 200 })
  } catch (error) {
    console.error('刷新物流信息时出错:', error)
    return NextResponse.json({ error: '刷新物流信息失败' }, { status: 500 })
  }
}