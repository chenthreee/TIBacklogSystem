import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';

export async function GET(request: Request) {
  await dbConnect();

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const searchTerm = searchParams.get('searchTerm') || '';

  const pageSize = 10;
  const skip = (page - 1) * pageSize;

  const query = searchTerm
    ? {
        $or: [
          { purchaseOrderNumber: { $regex: searchTerm, $options: 'i' } },
          { customer: { $regex: searchTerm, $options: 'i' } }
        ]
      }
    : {};

  const totalOrders = await Order.countDocuments(query);
  const totalPages = Math.ceil(totalOrders / pageSize);

  const orders = await Order.find(query)
    .skip(skip)
    .limit(pageSize)
    .lean();

  const invoiceInfo = orders.map(order => ({
    orderId: order.purchaseOrderNumber,
    customer: order.customer,
    components: order.components.map((component: any) => ({
      name: component.name,
      quantity: component.quantity,
      unitPrice: component.unitPrice,
      invoiceNumber: component.invoiceNumber || '',
      invoiceDate: component.invoiceDate || '',
    })),
  }));

  return NextResponse.json({ invoiceInfo, totalPages });
}