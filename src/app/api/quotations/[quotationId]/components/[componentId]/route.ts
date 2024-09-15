import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Quotation from '@/models/Quotation';

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