import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Order from '@/models/Order'
import mongoose from 'mongoose'

export async function POST(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  await dbConnect()

  const { orderId } = params
  const newComponent = await req.json()

  try {
    const order = await Order.findById(orderId)

    if (!order) {
      return NextResponse.json({ error: '订单未找到' }, { status: 404 })
    }

    // 如果 newComponent 没有 id，或者 id 无效，生成一个新的 ObjectId
    if (!newComponent.id || !mongoose.Types.ObjectId.isValid(newComponent.id)) {
      newComponent.id = new mongoose.Types.ObjectId().toString()
    }

    order.components.push(newComponent)

    // 重新计算订单总金额
    order.totalAmount = order.components.reduce(
      (sum: number, comp: any) => sum + comp.quantity * comp.unitPrice,
      0
    )

    await order.save()

    return NextResponse.json(order, { status: 200 })
  } catch (error) {
    console.error('添加元件时出错:', error)
    return NextResponse.json({ error: '添加元件失败' }, { status: 500 })
  }
}