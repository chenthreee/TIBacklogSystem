import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Order from '@/models/Order'

export async function GET(req: NextRequest) {
  await dbConnect()

  const searchParams = req.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1', 10)
  const searchTerm = searchParams.get('searchTerm') || ''
  const orderStatus = searchParams.get('orderStatus') || ''
  const componentStatus = searchParams.get('componentStatus') || ''
  const limit = 10
  const skip = (page - 1) * limit

  let query: any = {}

  if (searchTerm) {
    query.$or = [
      { purchaseOrderNumber: { $regex: searchTerm, $options: 'i' } },
      { tiOrderNumber: { $regex: searchTerm, $options: 'i' } },
      { customer: { $regex: searchTerm, $options: 'i' } }
    ]
  }

  if (orderStatus) {
    query.status = orderStatus
  }

  if (componentStatus) {
    query['components.status'] = componentStatus
  }

  try {
    const orders = await Order.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const totalOrders = await Order.countDocuments(query)
    const totalPages = Math.ceil(totalOrders / limit)

    const formattedOrders = orders.map(order => ({
      _id: order._id,
      date: order.date,
      customer: order.customer,
      totalAmount: order.totalAmount,
      status: order.status,
      orderNumber: order.orderNumber,
      tiOrderNumber: order.tiOrderNumber,
      purchaseOrderNumber: order.purchaseOrderNumber,
      components: order.components,
      quoteNumber: order.quoteNumber,
      apiLogs: order.apiLogs,
    }))

    return NextResponse.json({ orders: formattedOrders, totalPages })
  } catch (error) {
    console.error('Error in GET /api/orders:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const data = await request.json();
    
    // 获取报价ID和组件
    const { quotationId, components: orderComponents } = data;

    // 使用传入的 tiPrice 作为 unitPrice
    const updatedComponents = orderComponents.map((component: any) => ({
      ...component,
      unitPrice: component.tiPrice // 使用传入的 tiPrice 作为 unitPrice
    }));

    console.error('更新后components:', JSON.stringify(updatedComponents, null, 2));

    // 创建新订单
    const newOrder = new Order({
      ...data,
      orderNumber: data.purchaseOrderNumber,
      components: updatedComponents, // 使用更新后的组件
    });

    // 保存订单
    const savedOrder = await newOrder.save();

    // 更新 quotationId 为当前订单的 ObjectId
    savedOrder.quotationId = savedOrder._id;
    await savedOrder.save();

    return NextResponse.json(savedOrder, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/orders:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
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