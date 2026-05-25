import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { FlowService } from '@/lib/flow';

export async function POST(req: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 500 });
    }

    // Flow envía la notificación mediante una petición POST urlencoded con el campo 'token'
    const formData = await req.formData();
    const token = formData.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Falta token de notificación' }, { status: 400 });
    }

    // 1. Consultar el estado real del pago en Flow usando el token recibido
    const flowStatus = await FlowService.getPaymentStatus(token.toString());
    const bookingId = flowStatus.commerceOrder;

    if (!bookingId) {
      return NextResponse.json({ error: 'Orden de comercio no encontrada en respuesta de Flow' }, { status: 400 });
    }

    const bookingRef = doc(db, 'bookings', bookingId);
    const bookingSnap = await getDoc(bookingRef);

    if (!bookingSnap.exists()) {
      return NextResponse.json({ error: 'Reserva no encontrada en Firebase' }, { status: 404 });
    }

    // 2. Si el estado de Flow es 2 (Pagado), actualizar la reserva a 'confirmed'
    if (flowStatus.status === 2) {
      await updateDoc(bookingRef, {
        status: 'confirmed',
        flowStatus: 2,
        paymentDate: flowStatus.paymentData?.date || new Date().toISOString(),
      });
      console.log(`[Flow Webhook] Reserva ${bookingId} pagada y confirmada exitosamente.`);
    } else if (flowStatus.status === 3) {
      await updateDoc(bookingRef, {
        status: 'rejected',
        flowStatus: 3,
      });
      console.log(`[Flow Webhook] Reserva ${bookingId} rechazada o anulada.`);
    }

    // Retornar 200 OK para confirmar recepción a Flow
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error al procesar webhook de Flow:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
