import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Order from '@/models/Order'

export async function GET(req: NextRequest) {
  await dbConnect()

  const searchParams = req.nextUrl.searchParams
  const page = searchParams.get('page') || '1'
  const searchTerm = searchParams.get('searchTerm') || ''
  const limit = 10
  const skip = (Number(page) - 1) * limit

  const query = searchTerm
    ? {
        $or: [
          { orderNumber: { $regex: searchTerm, $options: 'i' } },
          { customer: { $regex: searchTerm, $options: 'i' } },
        ],
      }
    : {}

  try {
    const orders = await Order.find(query)
      .select('orderNumber customer status tiOrderNumber')
      .skip(skip)
      .limit(limit)

    const totalOrders = await Order.countDocuments(query)
    const totalPages = Math.ceil(totalOrders / limit)

    const logisticsInfo = orders.map(order => ({
      orderId: order.orderNumber,
      customer: order.customer,
      shippingDate: '', // 暂时留空
      estimatedDeliveryDate: '', // 暂时留空
      status: order.status,
      tiOrderNumber: order.tiOrderNumber
    }))

    return NextResponse.json({ logisticsInfo, totalPages }, { status: 200 })
  } catch (error) {
    console.error('获取物流信息失败:', error)
    return NextResponse.json({ error: '获取物流信息失败' }, { status: 500 })
  }
}