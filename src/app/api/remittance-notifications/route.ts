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
      { invoiceNumber: { $regex: searchTerm, $options: 'i' } }
    ]
  };

  try {
    const notifications = await RemittanceNotification.find(query);
    const formattedNotifications = notifications.map(notification => ({
      id: notification._id.toString(),
      remittanceNumber: notification.remittanceNumber,
      currency: notification.currency,
      invoiceNumber: notification.invoiceNumber,
      amount: notification.amount,
      paymentDate: notification.paymentDate
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
    console.log('Received data:', data); // 添加日志
    const newNotification = new RemittanceNotification(data);
    const savedNotification = await newNotification.save();
    console.log('Saved notification:', savedNotification); // 添加日志
    return NextResponse.json(savedNotification, { status: 201 });
  } catch (error) {
    console.error('Error creating remittance notification:', error as Error);
    return NextResponse.json({ error: 'Internal Server Error', details: (error as Error).message }, { status: 500 });
  }
}