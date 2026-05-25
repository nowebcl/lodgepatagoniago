'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { motion } from 'framer-motion';

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingData, setBookingData] = useState<any>(null);
  const [flowInfo, setFlowInfo] = useState<any>(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!token) {
      setError('No se proporcionó un token de pago válido.');
      setLoading(false);
      return;
    }

    const checkPaymentStatus = async () => {
      try {
        const response = await fetch(`/api/payments/status?token=${token}`);
        const data = await response.json();

        if (!response.ok || data.error) {
          throw new Error(data.error || 'Error al validar el pago');
        }

        if (data.status === 'confirmed') {
          setBookingData(data.booking);
          setFlowInfo(data.flowStatus);
          setLoading(false);
          
          // Lanzar confeti premium
          import('canvas-confetti').then((confetti) => {
            confetti.default({
              particleCount: 180,
              spread: 100,
              origin: { y: 0.4 },
              colors: ['#2D5A40', '#81C784', '#1E293B', '#F59E0B', '#FFFFFF']
            });
          });
        } else if (data.status === 'rejected') {
          router.push('/reservas/rechazado');
        } else {
          // Si sigue pendiente, reintentamos hasta 4 veces separados por 2 segundos
          if (attempts < 4) {
            setTimeout(() => {
              setAttempts(prev => prev + 1);
            }, 2000);
          } else {
            // Mostrar estado como en proceso si supera los intentos
            setBookingData(data.booking);
            setFlowInfo(data.flowStatus);
            setLoading(false);
          }
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Ocurrió un error inesperado al conectar con el servidor.');
        setLoading(false);
      }
    };

    checkPaymentStatus();
  }, [token, attempts, router]);

  const handleDownloadReceipt = () => {
    if (!bookingData) return;

    const datesList = bookingData.dates
      ? bookingData.dates.map((d: string) => new Date(d).toLocaleDateString('es-CL')).join(', ')
      : `${new Date(bookingData.startDate).toLocaleDateString('es-CL')} - ${new Date(bookingData.endDate).toLocaleDateString('es-CL')}`;

    const receiptContent = `
=========================================
      RESERVA CONFIRMADA - FLOW
      LODGE PATAGONIA GO
=========================================
ID TRANSACCIÓN: ${flowInfo?.flowOrder || 'N/A'}
ID RESERVA FIRESTORE: ${bookingData.id || 'N/A'}
FECHA DE PAGO: ${new Date(bookingData.paymentDate || bookingData.createdAt).toLocaleString('es-CL')}
MEDIO DE PAGO: ${flowInfo?.paymentData?.media || 'Flow Payments'}

DETALLES DE LA ESTANCIA:
-----------------------------------------
CABAÑA: ${bookingData.cabinId === 'c8' ? 'Cabaña Superior (8)' : 
         bookingData.cabinId === 'c5' ? 'Cabaña Familiar (5)' : 
         bookingData.cabinId === 'c4' ? 'Cabaña Bosque (4)' : 'Cabaña Refugio (2)'}
FECHAS CONTRATADAS: ${datesList}
TOTAL NOCHES: ${bookingData.dates ? bookingData.dates.length : 0}
VALOR TOTAL PAGADO: CLP $${bookingData.totalPrice?.toLocaleString('es-CL')}

DATOS DEL HUÉSPED:
-----------------------------------------
NOMBRE: ${bookingData.customerName}
TELÉFONO: ${bookingData.customerPhone}
EMAIL: ${bookingData.customerEmail}

ESTADO DEL PAGO: TRANSACCIÓN APROBADA
-----------------------------------------
Su estadía ha quedado agendada y las fechas están 
bloqueadas automáticamente en el calendario local.

¡Muchas gracias por su preferencia!
Lodge Patagonia
=========================================
`;

    const blob = new Blob([receiptContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Comprobante_LodgePatagonia_${bookingData.customerName.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 space-y-6 text-center">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-slate-100 border-t-[var(--forest-green)] rounded-full animate-spin"></div>
          <div className="absolute w-8 h-8 bg-green-50 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-[var(--forest-green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4"></path>
            </svg>
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-slate-800">Verificando tu pago</h3>
          <p className="text-sm text-slate-500 max-w-xs mx-auto">
            Estamos contactando a Flow y confirmando tu reserva en nuestro sistema. Por favor, no cierres esta ventana.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 space-y-6 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-slate-800">Ups, hubo un problema</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">{error}</p>
        </div>
        <button 
          onClick={() => router.push('/')}
          className="btn-forest text-sm py-3 px-8"
        >
          Volver al Inicio
        </button>
      </div>
    );
  }

  const isConfirmed = bookingData?.status === 'confirmed';

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 15 }}
        className="bg-white rounded-[32px] border border-slate-100 p-6 lg:p-8 shadow-2xl text-center space-y-8 relative overflow-hidden"
      >
        {/* Banner Decorativo Premium */}
        <div className={`absolute top-0 left-0 right-0 h-2 ${isConfirmed ? 'bg-[var(--forest-green)]' : 'bg-amber-400'}`}></div>

        {/* Círculo del Ícono */}
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${isConfirmed ? 'bg-green-50 text-[var(--forest-green)]' : 'bg-amber-50 text-amber-500'}`}>
          {isConfirmed ? (
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4"></path>
            </svg>
          ) : (
            <svg className="w-10 h-10 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          )}
        </div>

        {/* Encabezado */}
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-[#1E293B]">
            {isConfirmed ? '¡Reserva Confirmada!' : 'Pago en Proceso'}
          </h2>
          <p className="text-sm text-slate-500 px-4">
            {isConfirmed 
              ? 'Tu pago se ha acreditado correctamente y tus fechas ya están reservadas.' 
              : 'El pago está tardando en procesarse. ¡No te preocupes! Tu cupo está pre-reservado y te confirmaremos vía WhatsApp.'}
          </p>
        </div>

        {/* Tarjeta de Detalles (Bento-Voucher) */}
        <div className="bg-slate-50 rounded-2xl p-5 text-left space-y-4 border border-slate-100 text-xs">
          <div className="flex justify-between items-center pb-3 border-b border-slate-200/60">
            <span className="font-bold text-slate-400 uppercase tracking-wider">Detalle del Comprobante</span>
            <span className="bg-[#2D5A40]/10 text-[#2D5A40] font-black px-2 py-0.5 rounded-md">
              {isConfirmed ? 'PAGADO' : 'PENDIENTE'}
            </span>
          </div>

          <div className="space-y-2.5 text-slate-700">
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">Huésped:</span>
              <span className="font-bold text-[#1E293B]">{bookingData?.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">Cabaña:</span>
              <span className="font-bold text-[#1E293B]">
                {bookingData?.cabinId === 'c8' ? 'Cabaña Superior (8)' : 
                 bookingData?.cabinId === 'c5' ? 'Cabaña Familiar (5)' : 
                 bookingData?.cabinId === 'c4' ? 'Cabaña Bosque (4)' : 'Cabaña Refugio (2)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-medium">Fechas:</span>
              <span className="font-bold text-[#1E293B] text-right max-w-[200px] truncate">
                {bookingData?.dates 
                  ? bookingData.dates.map((d: string) => new Date(d).toLocaleDateString('es-CL')).join(', ')
                  : `${new Date(bookingData?.startDate).toLocaleDateString('es-CL')} - ${new Date(bookingData?.endDate).toLocaleDateString('es-CL')}`}
              </span>
            </div>
            {flowInfo?.paymentData?.media && (
              <div className="flex justify-between">
                <span className="text-slate-400 font-medium">Medio de Pago:</span>
                <span className="font-bold text-[#1E293B]">{flowInfo.paymentData.media}</span>
              </div>
            )}
            <div className="flex justify-between pt-3 border-t border-slate-200/60 text-sm">
              <span className="text-[#1E293B] font-extrabold">Total Pagado:</span>
              <span className="font-black text-[var(--forest-green)] text-base">
                CLP ${bookingData?.totalPrice?.toLocaleString('es-CL')}
              </span>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="space-y-3 pt-4">
          {isConfirmed && (
            <button 
              onClick={handleDownloadReceipt}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold py-3.5 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 text-sm border border-slate-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
              </svg>
              Descargar Comprobante Digital
            </button>
          )}

          <button 
            onClick={() => router.push('/')}
            className="w-full btn-forest text-sm py-4 rounded-2xl"
          >
            Volver al Sitio Principal
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <div className="bg-slate-50 min-h-screen flex flex-col">
      <Header />
      <main className="app-container flex-1 flex items-center justify-center py-10">
        <Suspense fallback={
          <div className="text-center text-slate-500 font-medium py-10">
            Cargando entorno de confirmación...
          </div>
        }>
          <SuccessContent />
        </Suspense>
      </main>
    </div>
  );
}
