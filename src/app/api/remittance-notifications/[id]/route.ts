import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import RemittanceNotification from '@/models/RemittanceNotification';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  await dbConnect();

  try {
    const { id } = params;
    if (!id) {
      console.log('No id provided for deletion');
      return NextResponse.json({ error: 'No id provided' }, { status: 400 });
    }

    console.log('Attempting to delete remittance with id:', id);

    const deletedNotification = await RemittanceNotification.findByIdAndDelete(id);
    
    if (!deletedNotification) {
      console.log('Notification not found for id:', id);
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    console.log('Successfully deleted notification:', deletedNotification);
    return NextResponse.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting remittance notification:', error as Error);
    return NextResponse.json({ error: 'Internal Server Error', details: (error as Error).message }, { status: 500 });
  }
}