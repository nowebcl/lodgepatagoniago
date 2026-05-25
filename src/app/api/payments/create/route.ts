import { NextRequest, NextResponse } from 'next/server';
import { FlowService } from '@/lib/flow';

export async function POST(req: NextRequest) {
  console.log("[API/payments/create] Iniciando petición POST...");
  try {
    const body = await req.json();
    console.log("[API/payments/create] Datos recibidos:", body);
    
    const { bookingId, customerEmail, totalPrice, cabinName } = body;

    if (!bookingId || !customerEmail || !totalPrice) {
      console.warn("[API/payments/create] Advertencia: Faltan parámetros requeridos");
      return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 });
    }

    // Determinar dinámicamente las URLs de retorno y confirmación
    const origin = req.nextUrl.origin;
    const urlReturn = `${origin}/reservas/exito`;
    const urlConfirmation = `${origin}/api/payments/webhook`;
    console.log("[API/payments/create] URLs configuradas:", { urlReturn, urlConfirmation });

    // Crear el intento de pago en Flow pasándole el ID de la reserva como orden de comercio
    console.log("[API/payments/create] Llamando a Flow API para crear transacción...");
    const payment = await FlowService.createPayment({
      amount: totalPrice,
      email: customerEmail,
      subject: `Reserva ${cabinName || 'Cabaña'} - Lodge Patagonia Go`,
      commerceOrder: bookingId,
      urlConfirmation,
      urlReturn,
    });
    console.log("[API/payments/create] Respuesta de Flow exitosa:", payment);

    return NextResponse.json({
      url: payment.url,
      token: payment.token,
      bookingId: bookingId,
    });
  } catch (error: any) {
    console.error('[API/payments/create] ERROR CRÍTICO al procesar intento de pago:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
