import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface FarmPaymentData {
  userId: string;        // Discord user ID
  userName: string;      // Player name
  payment: number;       // Payment amount
  serviceType: 'animal' | 'plant';
  itemType: string;      // Animal type or plant name
  quantity: number;
  receiptId: string;
  approvedBy?: string;
  paidBy?: string;
  timestamp: string;
  description?: string;
}

// Store payments in memory (will be replaced with proper storage)
let paymentQueue: FarmPaymentData[] = [];

export async function POST(request: NextRequest) {
  try {
    const data: FarmPaymentData = await request.json();
    
    console.log('📥 Received farm payment data:', data);
    
    // Validate required fields
    if (!data.userId || !data.userName || !data.payment || !data.receiptId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Add to payment queue
    paymentQueue.push({
      ...data,
      timestamp: data.timestamp || new Date().toISOString()
    });
    
    // Keep only last 100 payments in memory
    if (paymentQueue.length > 100) {
      paymentQueue = paymentQueue.slice(-100);
    }
    
    console.log(`✅ Payment queued for ${data.userName}: $${data.payment}`);
    
    return NextResponse.json({
      success: true,
      message: 'Payment data received',
      receiptId: data.receiptId
    });
    
  } catch (error) {
    console.error('❌ Error processing farm payment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process payment data' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve pending payments
export async function GET(request: NextRequest) {
  try {
    // Return all pending payments
    return NextResponse.json({
      success: true,
      payments: paymentQueue,
      count: paymentQueue.length
    });
    
  } catch (error) {
    console.error('❌ Error retrieving payments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve payments' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to clear processed payments
export async function DELETE(request: NextRequest) {
  try {
    const { receiptIds } = await request.json();
    
    if (receiptIds && Array.isArray(receiptIds)) {
      // Remove specific payments
      paymentQueue = paymentQueue.filter(p => !receiptIds.includes(p.receiptId));
      console.log(`🗑️ Cleared ${receiptIds.length} processed payments`);
    } else {
      // Clear all payments
      paymentQueue = [];
      console.log('🗑️ Cleared all payment queue');
    }
    
    return NextResponse.json({
      success: true,
      message: 'Payments cleared',
      remaining: paymentQueue.length
    });
    
  } catch (error) {
    console.error('❌ Error clearing payments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear payments' },
      { status: 500 }
    );
  }
}