import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Order from '@/models/Order'

export async function PUT(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  await dbConnect()

  const { orderId } = params
  const { purchaseOrderNumber } = await req.json()

  try {
    const order = await Order.findById(orderId)

    if (!order) {
      return NextResponse.json({ error: '订单未找到' }, { status: 404 })
    }

    if (order.tiOrderNumber) {
      return NextResponse.json({ error: '订单已提交到 TI，无法修改采购订单号' }, { status: 400 })
    }

    order.purchaseOrderNumber = purchaseOrderNumber
    order.orderNumber = purchaseOrderNumber // 同时更新 orderNumber

    await order.save()

    return NextResponse.json(order, { status: 200 })
  } catch (error) {
    console.error('更新采购订单号时出错:', error)
    return NextResponse.json({ error: '更新采购订单号失败' }, { status: 500 })
  }
}