import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Quotation from '@/models/Quotation';
import mongoose from 'mongoose';

export async function PUT(request: Request, { params }: { params: { quotationId: string, componentId: string } }) {
  try {
    await dbConnect();

    const { quotationId, componentId } = params;
    const updatedComponent = await request.json();

    const quotation = await Quotation.findById(quotationId);
    if (!quotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    const componentIndex = quotation.components.findIndex((c: any) => c._id.toString() === componentId);
    if (componentIndex === -1) {
      return NextResponse.json({ error: 'Component not found' }, { status: 404 });
    }

    // 更新组件信息
    quotation.components[componentIndex] = {
      ...quotation.components[componentIndex],
      ...updatedComponent,
    };

    // 重新计算总金额
    quotation.totalAmount = quotation.components.reduce((sum: number, c: any) => sum + c.quantity * c.unitPrice, 0);

    await quotation.save();

    return NextResponse.json(quotation);
  } catch (error) {
    console.error('Error updating component:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { quotationId: string; componentId: string } }
) {
  try {
    await dbConnect();

    const { quotationId, componentId } = params;

    // 确保 quotationId 是有效的 ObjectId
    if (!mongoose.Types.ObjectId.isValid(quotationId)) {
      return NextResponse.json({ error: "无效的报价单 ID" }, { status: 400 });
    }

    // 查找并更新报价单，删除指定的组件
    const updatedQuotation = await Quotation.findOneAndUpdate(
      { _id: quotationId },
      { $pull: { components: { _id: componentId } } },
      { new: true } // 返回更新后的文档
    );

    if (!updatedQuotation) {
      return NextResponse.json({ error: "未找到报价单或组件" }, { status: 404 });
    }

    // 重新计算总金额
    const newTotalAmount = updatedQuotation.components.reduce(
      (sum: number, component: any) => sum + component.quantity * component.unitPrice,
      0
    );

    // 更新总金额
    updatedQuotation.totalAmount = newTotalAmount;
    await updatedQuotation.save();

    return NextResponse.json({ message: "组件已成功删除，总金额已更新", totalAmount: newTotalAmount }, { status: 200 });
  } catch (error) {
    console.error("删除组件时出错:", error);
    return NextResponse.json({ error: "内部服务器错误" }, { status: 500 });
  }
}