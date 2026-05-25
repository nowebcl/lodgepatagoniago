import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { FlowService } from '@/lib/flow';

export async function POST(req: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 500 });
    }

    const body = await req.json();
    const { cabinId, dates, customerName, customerPhone, customerEmail, totalPrice, cabinName } = body;

    if (!cabinId || !dates || !dates.length || !customerName || !customerEmail || !totalPrice) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 });
    }

    const sortedDates = [...dates].sort((a: string, b: string) => new Date(a).getTime() - new Date(b).getTime());

    // 1. Guardar la reserva como 'pending_payment' en Firebase Firestore
    const docRef = await addDoc(collection(db, 'bookings'), {
      cabinId,
      startDate: sortedDates[0],
      endDate: sortedDates[sortedDates.length - 1],
      dates: sortedDates,
      customerName,
      customerPhone,
      customerEmail,
      totalPrice,
      status: 'pending_payment',
      createdAt: new Date().toISOString(),
    });

    // 2. Determinar dinámicamente las URLs de retorno y confirmación
    const origin = req.nextUrl.origin;
    const urlReturn = `${origin}/reservas/exito`;
    const urlConfirmation = `${origin}/api/payments/webhook`;

    // 3. Crear el intento de pago en Flow pasándole el ID de la reserva como orden de comercio
    const payment = await FlowService.createPayment({
      amount: totalPrice,
      email: customerEmail,
      subject: `Reserva ${cabinName || 'Cabaña'} - Lodge Patagonia Go`,
      commerceOrder: docRef.id,
      urlConfirmation,
      urlReturn,
    });

    // 4. Actualizar la reserva en Firestore con el token de Flow para poder verificarlo después
    await updateDoc(doc(db, 'bookings', docRef.id), {
      flowToken: payment.token,
    });

    // 5. Retornar los datos para redirigir al cliente
    return NextResponse.json({
      url: payment.url,
      token: payment.token,
      bookingId: docRef.id,
    });
  } catch (error: any) {
    console.error('Error al procesar intento de pago:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
