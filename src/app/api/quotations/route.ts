import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Quotation from '@/models/Quotation';
import { QuoteIcon } from 'lucide-react';

export async function GET(request: NextRequest) {
  await dbConnect();

  const searchParams = request.nextUrl.searchParams;
  const searchTerm = searchParams.get('search') || '';
  const quoteNumber = searchParams.get('quoteNumber');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const skip = (page - 1) * limit;

  let query = {};

  if (quoteNumber) {
    // 如果提供了 quoteNumber，优先处理这个查询
    query = { quoteNumber: quoteNumber };
  } else if (searchTerm) {
    // 如果没有 quoteNumber，但有 searchTerm，使用之前的搜索逻辑
    const numericSearchTerm = parseFloat(searchTerm);
    
    query = {
      $or: [
        { 'components.name': { $regex: searchTerm, $options: 'i' } },
        { customer: { $regex: searchTerm, $options: 'i' } },
        { quoteNumber: { $regex: searchTerm, $options: 'i' } },
        ...(isNaN(numericSearchTerm) ? [] : [{ quoteNumber: numericSearchTerm }])
      ]
    };
  }

  try {
    let quotations;
    let totalQuotations;

    if (quoteNumber) {
      // 如果是按 quoteNumber 查询，我们只需要返回一个报价单
      quotations = await Quotation.find(query).lean();
      totalQuotations = quotations.length;
    } else {
      // 否则，使用分页
      //这里用了sort({date:-1}),让最新的订单排在前面，省去一直下一页去找最新的日期的询价了
      quotations = await Quotation.find(query).sort({ date: -1 }).skip(skip).limit(limit).lean();
      //quotations = await Quotation.find(query).skip(skip).limit(limit).lean();
      totalQuotations = await Quotation.countDocuments(query);
    }

    const formattedQuotations = quotations.map((q) => ({
      id: q._id?.toString(),
      date: q.date || 'N/A',
      customer: q.customer || 'N/A',
      totalAmount: q.totalAmount ? Number(q.totalAmount) : 0,
      status: q.quoteStatus || 'N/A',
      quoteEndDate: q.quoteEndDate || 'N/A',
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

    return NextResponse.json({ 
      success: true, 
      quotations: formattedQuotations, 
      totalQuotations,
      ...(quoteNumber ? {} : { totalPages: Math.ceil(totalQuotations / limit) })
    });
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