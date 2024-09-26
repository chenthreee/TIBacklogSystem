import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import RemittanceNotification from '@/models/RemittanceNotification';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; itemIndex: string } }
) {
  await dbConnect();

  try {
    const { id, itemIndex } = params;
    if (!id || itemIndex === undefined) {
      console.log('No id or itemIndex provided for deletion');
      return NextResponse.json({ error: 'No id or itemIndex provided' }, { status: 400 });
    }

    console.log('Attempting to delete item at index:', itemIndex, 'from remittance with id:', id);

    const remittance = await RemittanceNotification.findById(id);
    if (!remittance) {
      console.log('Remittance not found for id:', id);
      return NextResponse.json({ error: 'Remittance not found' }, { status: 404 });
    }

    remittance.items.splice(Number(itemIndex), 1);
    await remittance.save();

    console.log('Successfully deleted item from remittance:', remittance);
    return NextResponse.json(remittance);
  } catch (error) {
    console.error('Error deleting item from remittance notification:', error as Error);
    return NextResponse.json({ error: 'Internal Server Error', details: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; itemIndex: string } }
) {
  await dbConnect();

  try {
    const { id, itemIndex } = params;
    const updatedItem = await request.json();

    if (!id || itemIndex === undefined) {
      console.log('No id or itemIndex provided for update');
      return NextResponse.json({ error: 'No id or itemIndex provided' }, { status: 400 });
    }

    console.log('Attempting to update item at index:', itemIndex, 'from remittance with id:', id);

    const remittance = await RemittanceNotification.findById(id);
    if (!remittance) {
      console.log('Remittance not found for id:', id);
      return NextResponse.json({ error: 'Remittance not found' }, { status: 404 });
    }

    remittance.items[Number(itemIndex)] = updatedItem;
    await remittance.save();

    console.log('Successfully updated item from remittance:', remittance);
    return NextResponse.json(remittance);
  } catch (error) {
    console.error('Error updating item from remittance notification:', error as Error);
    return NextResponse.json({ error: 'Internal Server Error', details: (error as Error).message }, { status: 500 });
  }
}