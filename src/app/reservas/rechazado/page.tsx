'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { motion } from 'framer-motion';

export default function RejectedPage() {
  const router = useRouter();

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col">
      <Header />
      <main className="app-container flex-1 flex items-center justify-center py-10 px-4">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 15 }}
          className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-2xl text-center space-y-8 relative overflow-hidden max-w-md w-full"
        >
          {/* Banner Rojo Decorativo */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-red-500"></div>

          {/* Círculo del Ícono de Error */}
          <div className="w-20 h-20 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>

          {/* Encabezado */}
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-[#1E293B]">Pago no Procesado</h2>
            <p className="text-sm text-slate-500 px-4">
              La transacción fue rechazada, cancelada o no pudo completarse. No se ha realizado ningún cobro en tu cuenta.
            </p>
          </div>

          {/* Caja Informativa de Ayuda */}
          <div className="bg-slate-50 rounded-2xl p-5 text-left space-y-3 border border-slate-100 text-xs text-slate-600">
            <h4 className="font-bold text-[#1E293B] text-sm">Posibles razones:</h4>
            <ul className="list-disc list-inside space-y-1 ml-1 text-slate-500">
              <li>Fondos insuficientes en la tarjeta seleccionada.</li>
              <li>Cancelación del pago voluntaria en la pasarela.</li>
              <li>Rechazo de seguridad del emisor de tu tarjeta de crédito o débito.</li>
              <li>Expiración del tiempo límite de la sesión de pago.</li>
            </ul>
          </div>

          {/* Acciones */}
          <div className="space-y-3 pt-4">
            <button 
              onClick={() => router.push('/')}
              className="w-full btn-forest text-sm py-4 rounded-2xl !bg-slate-900 hover:!bg-slate-800"
            >
              Volver a Intentar
            </button>
            <a 
              href="mailto:contacto@lodgepatagonia.cl?subject=Problema%20con%20Pago%20Flow"
              className="block w-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-extrabold py-3.5 px-6 rounded-2xl transition-all text-sm border border-slate-200"
            >
              Contactar Soporte
            </a>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
