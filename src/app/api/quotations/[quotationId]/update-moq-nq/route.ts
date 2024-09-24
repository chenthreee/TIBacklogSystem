import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Quotation from '@/models/Quotation';
import mongoose from 'mongoose';

export async function POST(
  request: NextRequest,
  { params }: { params: { quotationId: string } }
) {
  try {
    await dbConnect();

    const { quotationId } = params;
    const { components, quoteNumber, quoteStartDate, quoteEndDate } = await request.json();

    if (!mongoose.Types.ObjectId.isValid(quotationId)) {
      return NextResponse.json({ success: false, error: "无效的报价单 ID" }, { status: 400 });
    }

    const quotation = await Quotation.findById(quotationId);

    if (!quotation) {
      return NextResponse.json({ success: false, error: "未找到报价单" }, { status: 404 });
    }

    // 更新报价单信息
    quotation.quoteNumber = quoteNumber;
    quotation.quoteStartDate = quoteStartDate;
    quotation.quoteEndDate = quoteEndDate;

    // 更新组件信息
    quotation.components = components.map((updatedComponent: any) => ({
      ...updatedComponent,
      moq: updatedComponent.moq,
      nq: updatedComponent.nq,
      tiPrice: updatedComponent.tiPrice,
      status: updatedComponent.status
    }));

    await quotation.save();

    return NextResponse.json({ success: true, message: "报价信息已更新" }, { status: 200 });
  } catch (error) {
    console.error("更新报价信息时出错:", error);
    return NextResponse.json({ success: false, error: "内部服务器错误" }, { status: 500 });
  }
}