import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Order from '@/models/Order'

export async function PUT(
  req: NextRequest,
  { params }: { params: { orderId: string; componentId: string } }
) {
  await dbConnect()

  const { orderId, componentId } = params
  const updatedComponent = await req.json()

  try {
    const order = await Order.findById(orderId)

    if (!order) {
      return NextResponse.json({ error: '订单未找到' }, { status: 404 })
    }

    const componentIndex = order.components.findIndex(
      (comp: any) => comp.id === componentId
    )

    if (componentIndex === -1) {
      return NextResponse.json({ error: '组件未找到' }, { status: 404 })
    }

    // 更新组件信息
    order.components[componentIndex] = {
      ...order.components[componentIndex],
      ...updatedComponent,
    }

    // 重新计算订单总金额
    order.totalAmount = order.components.reduce(
      (sum: number, comp: any) => sum + comp.quantity * comp.unitPrice,
      0
    )

    await order.save()

    return NextResponse.json(order.components[componentIndex], { status: 200 })
  } catch (error) {
    console.error('更新组件时出错:', error)
    return NextResponse.json({ error: '更新组件失败' }, { status: 500 })
  }
}