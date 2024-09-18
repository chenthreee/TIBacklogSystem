import { NextRequest, NextResponse } from 'next/server';
import { basicAuthMiddleware } from '@/lib/auth';

async function handleTIInvoiceUpdate(req: NextRequest) {
  try {
    const invoiceData = await req.json();
    console.log('Received TI invoice update:', JSON.stringify(invoiceData, null, 2));

    // 在这里，我们只打印接收到的数据，不对数据库进行任何修改
    // 如果将来需要处理数据，可以在这里添加相关逻辑

    return NextResponse.json({ success: true, message: '发票更新信息已接收' }, { status: 200 });
  } catch (error) {
    console.error('处理 TI 发票更新时出错:', error);
    return NextResponse.json({ error: '处理发票更新失败' }, { status: 500 });
  }
}

export const POST = basicAuthMiddleware(handleTIInvoiceUpdate);