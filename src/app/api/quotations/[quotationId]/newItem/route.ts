import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Quotation from '@/models/Quotation';

export async function POST(request: Request, { params }: { params: { quotationId: string } }) {
  try {
    await dbConnect();

    const quotationId = params.quotationId;
    const newComponent = await request.json();

    // 首先找到对应的报价单
    const quotation = await Quotation.findById(quotationId);
    console.error('test number:', quotationId);
    if (!quotation) {
      console.log('Quotation not found');
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 });
    }

    // 计算新组件的ID
    const newComponentId = (quotation.components.length + 1).toString();

    // 更新报价单，添加新组件
    const updatedQuotation = await Quotation.findByIdAndUpdate(
      quotationId,
      { 
        $push: { 
          components: { 
            ...newComponent, 
            id: newComponentId  // 使用计算得到的新ID
          } 
        }, 
        $inc: { totalAmount: newComponent.quantity * newComponent.unitPrice } 
      },
      { new: true, runValidators: true }
    );

    console.log('Updated quotation:', updatedQuotation);
    return NextResponse.json(updatedQuotation);
  } catch (error) {
    console.error('Error in POST /api/quotations/[id]/newItem:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal Server Error', details: errorMessage }, { status: 500 });
  }
}