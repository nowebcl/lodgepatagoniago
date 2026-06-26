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
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CABINS = [
  { id: 'c8', name: 'Cabaña Superior (8)', price: 100000 },
  { id: 'c5', name: 'Cabaña Familiar (5)', price: 80000 },
  { id: 'c4', name: 'Cabaña Bosque (4)', price: 75000 },
  { id: 'c2', name: 'Cabaña Refugio (2)', price: 70000 },
];

const PROMOTIONS = [
  {
    id: 'temporada_baja',
    name: 'Oferta Temporada Baja',
    tagline: 'Escápate entre semana (Lun/Jue -25%)',
    description: 'Válido para estadías de 1 noche de Lunes a Jueves. Incluye vista al mar.',
    cabinPrices: {
      c2: { original: 70000, promo: 53000 },
      c5: { original: 80000, promo: 60000 },
      c8: { original: 100000, promo: 75000 },
      c4: { original: 75000, promo: 56000 },
    },
    isValid: (dates: Date[]) => {
      if (dates.length !== 1) return false;
      const day = dates[0].getDay();
      return day >= 1 && day <= 4; // Lunes a Jueves
    },
    requirementText: 'Selecciona 1 noche de Lunes a Jueves.'
  },
  {
    id: 'dos_noches',
    name: '2 Noches Frente al Mar',
    tagline: 'Tarifa especial para estadías de 2 noches',
    description: 'Disfruta de una tarifa rebajada para estadías de exactamente 2 noches.',
    cabinPrices: {
      c2: { original: 155000, promo: 130000 },
      c5: { original: 165000, promo: 140000 },
      c8: { original: 183000, promo: 160000 },
      c4: { original: 170000, promo: 150000 },
    },
    isValid: (dates: Date[]) => {
      return dates.length === 2;
    },
    requirementText: 'Selecciona exactamente 2 noches.'
  },
  {
    id: 'tinaja_privada',
    name: 'Promo Tinaja Privada',
    tagline: '1 Noche + Tinaja de agua caliente privada',
    description: 'Estadía de 1 noche con servicio de tinaja privada incluido.',
    cabinPrices: {
      c2: { original: 120000, promo: 110000 },
      c5: { original: 130000, promo: 120000 },
      c8: { original: 150000, promo: 135000 },
      c4: { original: 140000, promo: 128000 },
    },
    isValid: (dates: Date[]) => {
      return dates.length === 1;
    },
    requirementText: 'Selecciona exactamente 1 noche.'
  }
];


export default function Home() {
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [selectedCabinId, setSelectedCabinId] = useState<string | null>(null);
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);
  const [selectedPromoId, setSelectedPromoId] = useState<string | null>(null);
  
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const selectedCabin = useMemo(() => 
    CABINS.find((c: any) => c.id === selectedCabinId), 
  [selectedCabinId]);

  const numberOfDays = selectedDates.length;

  const activePromo = useMemo(() => 
    PROMOTIONS.find((p) => p.id === selectedPromoId),
  [selectedPromoId]);

  const isPromoApplied = useMemo(() => {
    if (!activePromo || !selectedCabinId) return false;
    return activePromo.isValid(selectedDates);
  }, [activePromo, selectedCabinId, selectedDates]);

  const totalPrice = useMemo(() => {
    if (!selectedCabin) return 0;
    if (isPromoApplied && activePromo && selectedCabinId) {
      const prices = (activePromo.cabinPrices as any)[selectedCabinId];
      return prices ? prices.promo : selectedCabin.price * numberOfDays;
    }
    return selectedCabin.price * numberOfDays;
  }, [selectedCabin, isPromoApplied, activePromo, selectedCabinId, numberOfDays]);

  const originalPrice = useMemo(() => {
    if (!selectedCabin) return 0;
    if (isPromoApplied && activePromo && selectedCabinId) {
      const prices = (activePromo.cabinPrices as any)[selectedCabinId];
      return prices ? prices.original : selectedCabin.price * numberOfDays;
    }
    return selectedCabin.price * numberOfDays;
  }, [selectedCabin, isPromoApplied, activePromo, selectedCabinId, numberOfDays]);

  const halfPrice = Math.round(totalPrice / 2);

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
        
        // Solo bloqueamos fechas de reservas confirmadas o pagadas
        if (data.status !== 'confirmed' && data.status !== 'pagado') {
          return;
        }

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
      
      // 1. Guardar la reserva en Firestore desde el cliente (instantáneo, estable y sin cuelgues)
      console.log("[Client] Creando reserva pendiente en Firestore...");
      const docRef = await addDoc(collection(db, 'bookings'), {
        cabinId: selectedCabinId,
        startDate: sortedDates[0].toISOString(),
        endDate: sortedDates[sortedDates.length - 1].toISOString(),
        dates: sortedDates.map((d: Date) => d.toISOString()),
        customerName: formData.name,
        customerPhone: formData.phone,
        customerEmail: formData.email,
        totalPrice: totalPrice,
        paidAmount: halfPrice, // 50% a pagar
        status: 'pending_payment',
        createdAt: new Date().toISOString(),
        appliedPromo: isPromoApplied && activePromo ? activePromo.name : null,
      });
      console.log("[Client] Reserva creada con éxito. ID:", docRef.id);

      // 2. Enviar el ID de reserva al servidor para generar el checkout en Flow por el 50%
      console.log("[Client] Solicitando link de Flow para la reserva (50% abono)...");
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: docRef.id,
          customerEmail: formData.email,
          totalPrice: halfPrice, // Enviamos el 50% a cobrar
          cabinName: selectedCabin?.name,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'No se pudo iniciar el proceso de pago');
      }

      // 3. Redirigir al portal seguro de Flow
      if (data.url) {
        // Meta Pixel InitiateCheckout tracking
        if (typeof window !== 'undefined' && (window as any).fbq) {
          (window as any).fbq('track', 'InitiateCheckout', {
            value: halfPrice,
            currency: 'CLP',
            content_name: selectedCabin?.name,
            content_ids: [selectedCabinId],
            content_type: 'product',
          });
        }

        console.log("[Client] Redirigiendo a Flow:", data.url);
        window.location.href = data.url;
      } else {
        throw new Error('No se recibió la URL de pago de Flow');
      }
    } catch (error: any) {
      console.error("Error al procesar reserva con Flow:", error);
      alert(`Hubo un problema al conectar con la pasarela de pagos: ${error.message || 'Inténtalo de nuevo.'}`);
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

            {/* Promociones Especiales */}
            <div className="mt-8 mb-4 text-center lg:text-left">
              <h2 className="section-title-ref">Tarifas Especiales</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                Selecciona una promoción para tu estadía
              </p>
            </div>
            
            <div className="space-y-2.5 px-5 lg:px-0">
              {PROMOTIONS.map((promo) => {
                const isSelected = selectedPromoId === promo.id;
                const prices = selectedCabinId ? (promo.cabinPrices as any)[selectedCabinId] : null;
                const isValid = promo.isValid(selectedDates);

                return (
                  <div
                    key={promo.id}
                    className={cn(
                      "border rounded-xl transition-all overflow-hidden bg-white",
                      isSelected 
                        ? "border-[var(--forest-green)] ring-1 ring-[var(--forest-green)]/10 shadow-sm" 
                        : "border-slate-100 hover:border-slate-200"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedPromoId(isSelected ? null : promo.id)}
                      className="w-full text-left p-3.5 flex items-center justify-between gap-4"
                    >
                      {/* Left: Radio and Title */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all",
                          isSelected 
                            ? "border-[var(--forest-green)] bg-[var(--forest-green)]" 
                            : "border-slate-300 bg-white"
                        )}>
                          {isSelected && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-800 tracking-tight truncate">{promo.name}</h4>
                          <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider truncate mt-0.5">{promo.tagline}</p>
                        </div>
                      </div>

                      {/* Right: Price Preview */}
                      {selectedCabinId && prices && (
                        <div className="text-right shrink-0">
                          <div className="text-[9px] text-slate-400 line-through font-semibold">
                            CLP ${prices.original.toLocaleString('es-CL')}
                          </div>
                          <div className="text-xs font-black text-slate-800">
                            CLP ${prices.promo.toLocaleString('es-CL')}
                          </div>
                        </div>
                      )}
                    </button>

                    {/* Expandable details */}
                    {isSelected && (
                      <div className="px-3.5 pb-3.5 pt-1.5 border-t border-slate-50 flex flex-col gap-1 bg-slate-50/30">
                        <p className="text-[10px] text-slate-500 leading-normal font-medium">
                          {promo.description}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            isValid ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
                          )} />
                          <span className={cn(
                            "text-[8px] font-black uppercase tracking-wider",
                            isValid ? "text-emerald-600" : "text-amber-600"
                          )}>
                            {isValid ? "Promoción activada y aplicada" : promo.requirementText}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-100 p-5 pt-4 pb-16 lg:p-8">
          <div className="max-w-[1000px] mx-auto flex items-center justify-between lg:justify-center lg:gap-10">
            <div className="hidden lg:block text-right">
              <p className="text-xs text-slate-400 font-medium mb-1">Total Reserva ({numberOfDays} noche{numberOfDays !== 1 && 's'}):</p>
              <p className="text-2xl font-extrabold text-[#1E293B]">
                {isPromoApplied && originalPrice > totalPrice && (
                  <span className="text-sm text-slate-400 line-through mr-2 font-bold">
                    CLP ${originalPrice.toLocaleString('es-CL')}
                  </span>
                )}
                CLP ${totalPrice.toLocaleString('es-CL')}
              </p>
              <p className="text-[10px] text-[var(--forest-green)] font-extrabold mt-0.5">
                (Abono 50% para confirmar: CLP ${halfPrice.toLocaleString('es-CL')})
              </p>
            </div>
            <div className="w-full lg:w-auto">
              <ActionFooter 
                onReserve={handleReserveClick} 
                disabled={!selectedCabinId || selectedDates.length === 0 || isSubmitting}
                price={halfPrice}
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
              
              <div className="mb-6">
                <h3 className="text-2xl font-extrabold text-[#1E293B] mb-2">Tus datos</h3>
                <p className="text-xs text-slate-500 mb-4">Completa la información para finalizar la reserva de {selectedCabin?.name}.</p>
                
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-xs space-y-2">
                  <div className="flex justify-between text-slate-500">
                    <span>Valor Total de Estancia:</span>
                    <span className="font-bold text-[#1E293B]">
                      {isPromoApplied && originalPrice > totalPrice && (
                        <span className="text-xs text-slate-400 line-through mr-2 font-bold">
                          CLP ${originalPrice.toLocaleString('es-CL')}
                        </span>
                      )}
                      CLP ${totalPrice.toLocaleString('es-CL')}
                    </span>
                  </div>
                  {isPromoApplied && activePromo && (
                    <div className="flex justify-between text-rose-500 font-bold">
                      <span>Promoción Aplicada:</span>
                      <span>{activePromo.name}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[var(--forest-green)] font-extrabold text-sm">
                    <span>Abonar Ahora (50% Garantía):</span>
                    <span>CLP ${halfPrice.toLocaleString('es-CL')}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 font-medium pt-1.5 border-t border-slate-200/50">
                    <span>Saldo al llegar al Lodge:</span>
                    <span>CLP ${halfPrice.toLocaleString('es-CL')}</span>
                  </div>
                </div>
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
                    {isSubmitting ? 'Redirigiendo a Flow...' : `Pagar 50% Garantía • $${halfPrice.toLocaleString('es-CL')}`}
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
