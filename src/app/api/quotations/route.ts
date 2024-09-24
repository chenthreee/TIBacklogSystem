import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Quotation from '@/models/Quotation';

export async function GET(request: NextRequest) {
  await dbConnect();

  const searchParams = request.nextUrl.searchParams;
  const quoteNumber = searchParams.get('quoteNumber');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const skip = (page - 1) * limit;

  const query = quoteNumber ? { quoteNumber: { $regex: quoteNumber, $options: 'i' } } : {};

  try {
    const quotations = await Quotation.find(query).skip(skip).limit(limit).lean();
    const totalQuotations = await Quotation.countDocuments(query);

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

    return NextResponse.json({ success: true, quotations: formattedQuotations, totalQuotations });
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