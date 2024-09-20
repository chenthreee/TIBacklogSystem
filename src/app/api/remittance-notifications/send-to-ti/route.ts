import { NextRequest, NextResponse } from 'next/server';
import { TIBacklogRemittance } from "@/lib/external/TIBacklogAPI";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { remittanceNumber, invoiceNumber, amount, currency } = data;

    console.log('Sending remittance to TI:', { remittanceNumber, invoiceNumber, amount, currency });

    const remittanceAPI = new TIBacklogRemittance(
      process.env.CLIENT_ID || '',
      process.env.CLIENT_SECRET || '',
      process.env.SERVER_URL || ''
    );

    const lineItems = [{
      paymentAmount: amount.toString(),
      financialDocumentNumber: invoiceNumber
    }];

    const response = await remittanceAPI.postRemittance(
      remittanceNumber,
      lineItems,
      currency
    );

    console.log('TI API Response:', response);

    return NextResponse.json({ success: true, response });
  } catch (error) {
    console.error('Error sending TI:', error);
    return NextResponse.json({ success: false, error: 'Failed to send TI' }, { status: 500 });
  }
}