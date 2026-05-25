import { NextRequest, NextResponse } from 'next/server';
import { getBookingREST, updateBookingStatusREST } from '@/lib/firebaseRest';
import { FlowService } from '@/lib/flow';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Falta token de pago' }, { status: 400 });
    }

    // 1. Consultar estado en Flow
    const flowStatus = await FlowService.getPaymentStatus(token);
    const bookingId = flowStatus.commerceOrder;

    if (!bookingId) {
      return NextResponse.json({ error: 'Orden de comercio vacía' }, { status: 400 });
    }

    const bookingData = await getBookingREST(bookingId);
    if (!bookingData) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 });
    }

    // 2. Si ya está pagado en Flow pero no se ha guardado en la base de datos (ej: webhook lento o local)
    let updatedStatus = bookingData.status;
    if (flowStatus.status === 2 && bookingData.status !== 'confirmed') {
      updatedStatus = 'confirmed';
      await updateBookingStatusREST(
        bookingId,
        'confirmed',
        2,
        flowStatus.paymentData?.date || new Date().toISOString()
      );
      console.log(`[Flow Status Check] Sincronización en tiempo real exitosa para reserva ${bookingId}`);
    } else if (flowStatus.status === 3 && bookingData.status !== 'rejected') {
      updatedStatus = 'rejected';
      await updateBookingStatusREST(bookingId, 'rejected', 3);
    }

    return NextResponse.json({
      status: updatedStatus,
      booking: {
        id: bookingId,
        ...bookingData,
        status: updatedStatus,
      },
      flowStatus,
    });
  } catch (error: any) {
    console.error('Error al consultar estado en tiempo real:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
