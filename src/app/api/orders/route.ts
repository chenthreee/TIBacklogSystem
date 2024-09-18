import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Order from '@/models/Order'
import Quotation from '@/models/Quotation' // 假设你有一个Quotation模型

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
          { customer: { $regex: searchTerm, $options: 'i' } },
          { date: { $regex: searchTerm, $options: 'i' } },
        ],
      }
    : {}

  try {
    const orders = await Order.find(query).skip(skip).limit(limit)
    const totalOrders = await Order.countDocuments(query)
    const totalPages = Math.ceil(totalOrders / limit)

    return NextResponse.json({ orders, totalPages }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: '获取订单失败' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  await dbConnect()

  try {
    const orderData = await req.json()

    // 根据报价ID获取报价信息
    const quotation = await Quotation.findById(orderData.quotationId)
    if (!quotation) {
      return NextResponse.json({ success: false, error: '未找到对应的报价' }, { status: 404 })
    }

    // 使用 tiPrice 作为订单中 component 的 unitPrice，并确保所有值都是有效的数字
    const components = quotation.components.map((comp: any) => ({
      ...comp,
      quantity: Number(comp.quantity) || 0,
      unitPrice: Number(comp.tiPrice) || Number(comp.unitPrice) || 0,
      quoteNumber: quotation.quoteNumber, // 添加报价单号
    }))

    // 重新计算总金额，确保不会出现 NaN
    const totalAmount = components.reduce((sum: number, comp: any) => {
      const itemTotal = comp.quantity * comp.unitPrice
      return sum + (isNaN(itemTotal) ? 0 : itemTotal)
    }, 0)

    const newOrder = new Order({
      ...orderData,
      components,
      totalAmount,
      estimatedDeliveryDate: '',
      shippingDate: '',
    })
    const savedOrder = await newOrder.save()

    // 使用保存后的 ID 更新 orderNumber
    savedOrder.orderNumber = savedOrder._id.toString()
    await savedOrder.save()

    return NextResponse.json({ success: true, order: savedOrder }, { status: 201 })
  } catch (error) {
    console.error('创建订单时出错:', error)
    return NextResponse.json({ success: false, error: '创建订单失败' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    await dbConnect();

    // 从 URL 中获取订单 ID
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '缺少订单ID' }, { status: 400 });
    }

    // 在数据库中查找并删除订单
    const deletedOrder = await Order.findByIdAndDelete(id);

    if (!deletedOrder) {
      return NextResponse.json({ error: '未找到该订单' }, { status: 404 });
    }

    return NextResponse.json({ message: '订单已成功删除' }, { status: 200 });
  } catch (error) {
    console.error('删除订单时出错:', error);
    return NextResponse.json({ error: '删除订单失败' }, { status: 500 });
  }
}