import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Quotation from '@/models/Quotation';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: { quotationId: string } }
) {
  try {
    await dbConnect();

    const { quotationId } = params;

    // 确保 quotationId 是有效的 ObjectId
    if (!mongoose.Types.ObjectId.isValid(quotationId)) {
      return NextResponse.json({ success: false, error: "无效的报价单 ID" }, { status: 400 });
    }

    // 查找报价单
    const quotation = await Quotation.findById(quotationId);

    if (!quotation) {
      return NextResponse.json({ success: false, error: "未找到报价单" }, { status: 404 });
    }

    return NextResponse.json({ success: true, quotation }, { status: 200 });
  } catch (error) {
    console.error("获取报价单时出错:", error);
    return NextResponse.json({ success: false, error: "内部服务器错误" }, { status: 500 });
  }
}

// 保留原有的 DELETE 方法
export async function DELETE(
  request: Request,
  { params }: { params: { quotationId: string } }
) {
  try {
    await dbConnect();

    const { quotationId } = params;

    // 确保 quotationId 是有效的 ObjectId
    if (!mongoose.Types.ObjectId.isValid(quotationId)) {
      return NextResponse.json({ error: "无效的报价单 ID" }, { status: 400 });
    }

    // 查找并删除报价单
    const deletedQuotation = await Quotation.findByIdAndDelete(quotationId);

    if (!deletedQuotation) {
      return NextResponse.json({ error: "未找到报价单" }, { status: 404 });
    }

    return NextResponse.json({ message: "报价单已成功删除" }, { status: 200 });
  } catch (error) {
    console.error("删除报价单时出错:", error);
    return NextResponse.json({ error: "内部服务器错误" }, { status: 500 });
  }
}