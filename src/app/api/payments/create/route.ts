import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { FlowService } from '@/lib/flow';

export async function POST(req: NextRequest) {
  console.log("[API/payments/create] Iniciando petición POST...");
  try {
    if (!db) {
      console.error("[API/payments/create] Error: Firebase Firestore no inicializado");
      return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 500 });
    }

    const body = await req.json();
    console.log("[API/payments/create] Datos recibidos en el cuerpo:", body);
    
    const { cabinId, dates, customerName, customerPhone, customerEmail, totalPrice, cabinName } = body;

    if (!cabinId || !dates || !dates.length || !customerName || !customerEmail || !totalPrice) {
      console.warn("[API/payments/create] Advertencia: Faltan parámetros requeridos");
      return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 });
    }

    const sortedDates = [...dates].sort((a: string, b: string) => new Date(a).getTime() - new Date(b).getTime());

    // 1. Guardar la reserva como 'pending_payment' en Firebase Firestore
    console.log("[API/payments/create] Guardando reserva en Firebase Firestore...");
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
    console.log("[API/payments/create] Reserva guardada con éxito en Firestore. ID del documento:", docRef.id);

    // 2. Determinar dinámicamente las URLs de retorno y confirmación
    const origin = req.nextUrl.origin;
    const urlReturn = `${origin}/reservas/exito`;
    const urlConfirmation = `${origin}/api/payments/webhook`;
    console.log("[API/payments/create] URLs configuradas:", { urlReturn, urlConfirmation });

    // 3. Crear el intento de pago en Flow pasándole el ID de la reserva como orden de comercio
    console.log("[API/payments/create] Llamando a Flow API para crear transacción...");
    const payment = await FlowService.createPayment({
      amount: totalPrice,
      email: customerEmail,
      subject: `Reserva ${cabinName || 'Cabaña'} - Lodge Patagonia Go`,
      commerceOrder: docRef.id,
      urlConfirmation,
      urlReturn,
    });
    console.log("[API/payments/create] Respuesta de Flow exitosa:", payment);

    // 4. Actualizar la reserva en Firestore con el token de Flow para poder verificarlo después
    console.log("[API/payments/create] Actualizando token de Flow en Firebase...");
    await updateDoc(doc(db, 'bookings', docRef.id), {
      flowToken: payment.token,
    });
    console.log("[API/payments/create] Token actualizado con éxito.");

    // 5. Retornar los datos para redirigir al cliente
    return NextResponse.json({
      url: payment.url,
      token: payment.token,
      bookingId: docRef.id,
    });
  } catch (error: any) {
    console.error('[API/payments/create] ERROR CRÍTICO al procesar intento de pago:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
