'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Header from '@/components/Header';
import Calendar from '@/components/Calendar';
import CabinSelector from '@/components/CabinSelector';
import ActionFooter from '@/components/ActionFooter';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { startOfToday, eachDayOfInterval, differenceInDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const CABINS = [
  { id: 'c8', name: 'Cabaña Superior (8)', price: 100000 },
  { id: 'c5', name: 'Cabaña Familiar (5)', price: 80000 },
  { id: 'c4', name: 'Cabaña Bosque (4)', price: 75000 },
  { id: 'c2', name: 'Cabaña Refugio (2)', price: 70000 },
];

export default function Home() {
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [selectedCabinId, setSelectedCabinId] = useState<string | null>(null);
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const selectedCabin = useMemo(() => 
    CABINS.find((c: any) => c.id === selectedCabinId), 
  [selectedCabinId]);

  const numberOfDays = selectedDates.length;
  const totalPrice = selectedCabin ? selectedCabin.price * numberOfDays : 0;

  // Fetch blocked dates when a cabin is selected
  useEffect(() => {
    if (!db || !selectedCabinId) {
      setBlockedDates([]);
      return;
    }

    const q = query(collection(db, 'bookings'), where('cabinId', '==', selectedCabinId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let dates: Date[] = [];
      snapshot.forEach((doc: any) => {
        const data = doc.data();
        // New logic: check for 'dates' array first
        if (data.dates && Array.isArray(data.dates)) {
          data.dates.forEach((dStr: string) => {
            const d = new Date(dStr);
            if (!isNaN(d.getTime())) dates.push(d);
          });
        } else if (data.startDate && data.endDate) {
          const start = new Date(data.startDate);
          const end = new Date(data.endDate);
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            const interval = eachDayOfInterval({ start, end });
            dates = [...dates, ...interval];
          }
        } else if (data.date) { // old bookings
          const d = new Date(data.date);
          if (!isNaN(d.getTime())) dates.push(d);
        }
      });
      setBlockedDates(dates);
    });

    return () => unsubscribe();
  }, [selectedCabinId]);

  const handleReserveClick = () => {
    if (!selectedCabinId || selectedDates.length === 0) return;
    setShowForm(true);
  };

  const submitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCabinId || selectedDates.length === 0 || !db) return;

    setIsSubmitting(true);
    try {
      const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
      
      // Optimizamos la UI para que sea instantánea (sin await)
      addDoc(collection(db, 'bookings'), {
        cabinId: selectedCabinId,
        startDate: sortedDates[0].toISOString(),
        endDate: sortedDates[sortedDates.length - 1].toISOString(),
        dates: sortedDates.map((d: Date) => d.toISOString()),
        customerName: formData.name,
        customerPhone: formData.phone,
        customerEmail: formData.email,
        totalPrice: totalPrice,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
      }).catch((error: any) => {
        console.error("Error en background al sincronizar con Firebase:", error);
      });
      
      setShowForm(false);
      setSuccess(true);
      
      // Lanzar confeti
      import('canvas-confetti').then((confetti) => {
        confetti.default({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#2E7D32', '#4CAF50', '#81C784', '#1E293B', '#FFFFFF']
        });
      });

      // Generar Comprobante para descargar automáticamente
      const receiptContent = `
=========================================
      RESERVA - LODGE PATAGONIA GO
=========================================
ID RESERVA: ${Math.random().toString(36).substring(2, 9).toUpperCase()}
FECHA DE SOLICITUD: ${new Date().toLocaleDateString('es-CL')}

DETALLES DE LA ESTANCIA:
-----------------------------------------
CABAÑA: ${selectedCabin?.name}
FECHAS: ${sortedDates.map(d => d.toLocaleDateString('es-CL')).join(', ')}
TOTAL NOCHES: ${sortedDates.length}
VALOR TOTAL: CLP $${totalPrice.toLocaleString('es-CL')}

DATOS DEL HUÉSPED:
-----------------------------------------
NOMBRE: ${formData.name}
TELÉFONO: ${formData.phone}
EMAIL: ${formData.email}

PRÓXIMOS PASOS:
-----------------------------------------
Para confirmar su estadía, realice la transferencia 
en las próximas 2 horas y envíe el comprobante 
a contacto@lodgepatagonia.cl

¡Gracias por elegir Lodge Patagonia!
=========================================
`;
      const blob = new Blob([receiptContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Reserva_LodgePatagonia_${formData.name.replace(/\s+/g, '_')}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSelectedDates([]);
      setFormData({ name: '', phone: '', email: '' });
    } catch (error) {
      console.error("Error al procesar reserva:", error);
      alert("Hubo un problema. Por favor intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white min-h-screen flex flex-col">
      <Header />
      
      <main className="app-container flex-1 overflow-y-auto overflow-x-hidden lg:overflow-hidden">
        <div className="min-h-full flex flex-col lg:flex-row gap-4 lg:gap-12 px-0 lg:px-10 pb-32 pt-0 w-full max-w-[100vw] justify-center">
          {/* Lado Izquierdo: Calendario */}
          <section className="w-full lg:w-[350px] flex-shrink-0 px-5 lg:px-0">
            <h2 className="section-title-ref mb-3 hidden lg:block text-center lg:text-left">Selecciona fecha</h2>
            <div className="bg-white">
              <Calendar 
                selectedDates={selectedDates} 
                onDateToggle={setSelectedDates} 
                blockedDates={blockedDates}
              />
            </div>
          </section>

          {/* Lado Derecho: Selector de Cabañas */}
          <section className="flex-1 w-full max-w-lg min-w-0 lg:overflow-y-auto lg:pr-2 custom-scrollbar pl-5 lg:pl-0">
            <div className="text-center lg:text-left mb-3 lg:mb-8">
              <h2 className="section-title-ref">Selecciona cabaña</h2>
              <p className="text-[10px] text-orange-500 font-black uppercase tracking-widest mt-1">
                * Primero debes seleccionar tu cabaña
              </p>
            </div>
            <CabinSelector 
              selectedCabinId={selectedCabinId} 
              onSelect={setSelectedCabinId} 
            />
          </section>
        </div>

        {/* Footer */}
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-100 p-5 pt-4 pb-16 lg:p-8">
          <div className="max-w-[1000px] mx-auto flex items-center justify-between lg:justify-center lg:gap-10">
            <div className="hidden lg:block text-right">
              <p className="text-xs text-slate-400 font-medium mb-1">Total Reserva ({numberOfDays} noche{numberOfDays !== 1 && 's'}):</p>
              <p className="text-2xl font-extrabold text-[#1E293B]">
                CLP ${totalPrice.toLocaleString('es-CL')}
              </p>
            </div>
            <div className="w-full lg:w-auto">
              <ActionFooter 
                onReserve={handleReserveClick} 
                disabled={!selectedCabinId || selectedDates.length === 0 || isSubmitting}
                price={totalPrice}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Pop-up de Formulario */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-[#1E293B]/40 backdrop-blur-sm p-4 lg:p-0"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white w-full max-w-md rounded-[32px] lg:rounded-[24px] p-8 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowForm(false)}
                className="absolute top-6 right-6 text-slate-400 hover:text-black"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
              
              <div className="mb-8">
                <h3 className="text-2xl font-extrabold text-[#1E293B] mb-2">Tus datos</h3>
                <p className="text-sm text-slate-500">Completa la información para finalizar la reserva de {selectedCabin?.name}.</p>
              </div>

              <form onSubmit={submitBooking} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-[#1E293B] mb-1.5 ml-1">Nombre Completo</label>
                  <input 
                    required
                    type="text" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--forest-green)]/20 focus:border-[var(--forest-green)] transition-all"
                    placeholder="Ej. Juan Pérez"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1E293B] mb-1.5 ml-1">Teléfono</label>
                  <input 
                    required
                    type="tel" 
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--forest-green)]/20 focus:border-[var(--forest-green)] transition-all"
                    placeholder="+56 9 1234 5678"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1E293B] mb-1.5 ml-1">Correo Electrónico</label>
                  <input 
                    required
                    type="email" 
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--forest-green)]/20 focus:border-[var(--forest-green)] transition-all"
                    placeholder="correo@ejemplo.com"
                  />
                </div>
                
                <div className="pt-4">
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full btn-forest text-base py-4 flex justify-center items-center disabled:opacity-50"
                  >
                    {isSubmitting ? 'Procesando...' : `Confirmar Reserva • $${totalPrice.toLocaleString('es-CL')}`}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pop-up de Éxito */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-white/95 backdrop-blur-sm"
          >
            <div className="bg-white border-2 border-[var(--forest-green)] rounded-[32px] max-w-xs w-full text-center py-10 space-y-6 shadow-2xl">
              <div className="w-12 h-12 bg-[var(--forest-green)] rounded-full flex items-center justify-center mx-auto text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-extrabold text-[#1E293B]">¡Confirmado!</h3>
                <p className="text-slate-500 text-sm font-medium px-2">¡Listo! Se comunicarán por WhatsApp contigo.</p>
              </div>
              <button 
                onClick={() => setSuccess(false)}
                className="text-[9px] uppercase tracking-[0.3em] font-bold text-[var(--forest-green)] pt-4 hover:opacity-70 transition-opacity"
              >
                Volver al inicio
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
