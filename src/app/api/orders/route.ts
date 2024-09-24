import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Order from '@/models/Order'
import Quotation from '@/models/Quotation' // 引入 Quotation 模型

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

export async function POST(request: Request) {
  try {
    await dbConnect();
    const data = await request.json();
    
    // 获取报价ID
    const { quotationId, components: orderComponents } = data;

    // 查找对应的报价单
    const quotation = await Quotation.findById(quotationId);

    if (!quotation) {
      return NextResponse.json({ error: '未找到对应的报价单' }, { status: 404 });
    }

    // 从报价单中获取组件信息
    const components = orderComponents.map((orderComponent: any) => {
      const quoteComponent = quotation.components.find((qc: any) => qc.id === orderComponent.id);
      if (quoteComponent) {
        return {
          ...orderComponent,
          unitPrice: quoteComponent.unitPrice,
          moq: quoteComponent.moq,
          nq: quoteComponent.nq,
        };
      }
      return orderComponent;
    });

    const newOrder = new Order({
      ...data,
      components,
    });

    const savedOrder = await newOrder.save();
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