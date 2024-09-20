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
    console.log('原始 orderData:', orderData);

    // 处理组件,将 tiPrice 作为 unitPrice
    const processedComponents = orderData.components.map((component: any) => ({
      ...component,
      unitPrice: component.tiPrice || component.unitPrice, // 优先使用 tiPrice,如果不存在则使用 unitPrice
    }));

    // 重新计算总金额
    const totalAmount = processedComponents.reduce((sum: number, comp: any) => {
      return sum + (comp.quantity * comp.unitPrice);
    }, 0);

    const newOrder = new Order({
      ...orderData,
      components: processedComponents,
      totalAmount: totalAmount,
      orderNumber: orderData.purchaseOrderNumber, // 使用采购订单号作为订单号
    })

    console.log('处理后的 newOrder:', newOrder);

    const savedOrder = await newOrder.save()

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