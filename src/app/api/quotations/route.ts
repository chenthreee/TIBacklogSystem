import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Quotation from '@/models/Quotation';

// 模拟数据库中的报价数据
export async function GET() {
  try {
    await dbConnect();
    const quotations = await Quotation.find({}).lean();
    
    const formattedQuotations = quotations.map((q) => ({
      id: q._id?.toString(),
      date: q.date || 'N/A',
      customer: q.customer || 'N/A',
      totalAmount: q.totalAmount ? Number(q.totalAmount) : 0,
      status: q.quoteStatus || 'N/A',
      quoteNumber: q.quoteNumber || 'N/A',
      components: Array.isArray(q.components) ? q.components.map((c: any) => ({
        id: c._id?.toString(),
        name: c.name || 'N/A',
        quantity: Number(c.quantity) || 0,
        unitPrice: Number(c.unitPrice) || 0,
        tiPrice: Number(c.tiPrice) || 0,
        deliveryDate: c.deliveryDate || 'N/A',
        status: c.status || 'N/A',
        moq: Number(c.moq) || 0,
        nq: Number(c.nq) || 0
      })) : []
    }));

    return NextResponse.json(formattedQuotations);
  } catch (error) {
    console.error('Error in GET /api/quotations:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();

    const data = await request.json();
    console.log('接收到的报价数据:', JSON.stringify(data, null, 2));

    const newQuotation = new Quotation(data);
    const savedQuotation = await newQuotation.save();

    console.log('保存到数据库的报价:', JSON.stringify(savedQuotation.toObject(), null, 2));

    return NextResponse.json(savedQuotation, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/quotations:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal Server Error', details: errorMessage }, { status: 500 });
  }
}