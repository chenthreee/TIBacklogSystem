import { NextResponse } from 'next/server';
import { TIBacklogInvoice } from '@/lib/external/TIBacklogAPI';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderNumber = searchParams.get('orderNumber');

  if (!orderNumber) {
    return NextResponse.json({ error: '订单号是必需的' }, { status: 400 });
  }

  try {
    const invoiceAPI = new TIBacklogInvoice(
      process.env.CLIENT_ID || '',
      process.env.CLIENT_SECRET || '',
      process.env.SERVER_URL || ''
    );

    const invoiceData = await invoiceAPI.retrieveByCustomerOrderNumber(orderNumber, true);

    // 如果存在 documentPDF，创建一个临时 URL
    if (invoiceData.documents[0].documentPDF) {
      const pdfUrl = `data:application/pdf;base64,${invoiceData.documents[0].documentPDF}`;
      invoiceData.pdfUrl = pdfUrl;
    }
    console.log('发票数据:', JSON.stringify(invoiceData, null, 2));

    return NextResponse.json(invoiceData);
  } catch (error) {
    console.error('发票查询错误:', error);
    return NextResponse.json({ error: '发票查询失败' }, { status: 500 });
  }
}