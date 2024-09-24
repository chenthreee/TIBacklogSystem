import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import RemittanceNotification from '@/models/RemittanceNotification';

export async function GET(request: NextRequest) {
  await dbConnect();

  const searchParams = request.nextUrl.searchParams;
  const searchTerm = searchParams.get('search') || '';

  const query = {
    $or: [
      { remittanceNumber: { $regex: searchTerm, $options: 'i' } },
      { 'items.invoiceNumber': { $regex: searchTerm, $options: 'i' } }
    ]
  };

  try {
    const notifications = await RemittanceNotification.find(query);
    const formattedNotifications = notifications.map(notification => ({
      id: notification._id.toString(),
      remittanceNumber: notification.remittanceNumber,
      currency: notification.currency,
      paymentDate: notification.paymentDate,
      items: notification.items
    }));
    return NextResponse.json(formattedNotifications);
  } catch (error) {
    console.error('Error fetching remittance notifications:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  await dbConnect();

  try {
    const data = await request.json();
    console.log('Received data:', JSON.stringify(data, null, 2));

    // 直接创建新的通知，不进行验证
    const savedNotification = await RemittanceNotification.create(data);

    console.log('Saved notification:', JSON.stringify(savedNotification.toObject(), null, 2));

    return NextResponse.json(savedNotification, { status: 201 });
  } catch (error) {
    console.error('Error creating remittance notification:', error);
    if (error instanceof Error) {
      return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    } else {
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  }
}