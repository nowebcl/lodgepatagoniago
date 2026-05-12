'use client';

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { ChevronLeft, Calendar as CalendarIcon, Users, Power, Clock, Lock } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import AdminCalendar from '@/components/AdminCalendar';

type Booking = {
  id: string;
  cabinId: string;
  startDate?: string;
  endDate?: string;
  date?: string; // For old bookings
  dates?: string[]; // For new multi-date bookings
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  totalPrice?: number;
  status: string;
  createdAt: string;
};

type Cabin = {
  id: string;
  name: string;
  available: boolean;
  price: number;
};

const CABINS_INITIAL = [
  { id: 'c8', name: 'Cabaña Superior (8)', price: 100000, available: true },
  { id: 'c5', name: 'Cabaña Familiar (5)', price: 80000, available: true },
  { id: 'c4', name: 'Cabaña Bosque (4)', price: 75000, available: true },
  { id: 'c2', name: 'Cabaña Refugio (2)', price: 70000, available: true },
];

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedFilterDate, setSelectedFilterDate] = useState<Date | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState(false);
  const [db, setDb] = useState<any>(null);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cabins, setCabins] = useState<Cabin[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const auth = sessionStorage.getItem('lodge_admin_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
    
    // Dynamic import to avoid hydration errors
    import('@/lib/firebase').then((firebase) => {
      setDb(firebase.db);
    });
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'contacto@lodgepatagonia.cl' && password === 'LodgePatagonia2026!') {
      setIsAuthenticated(true);
      sessionStorage.setItem('lodge_admin_auth', 'true');
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !db) {
      if (db === null && isAuthenticated) {
        // Still loading db
      } else {
        setLoading(false);
      }
      return;
    }

    // Sync Bookings
    console.log("Iniciando sincronización de reservas...");
    const qBookings = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
    const unsubscribeBookings = onSnapshot(qBookings, (snapshot) => {
      console.log("Reservas recibidas:", snapshot.docs.length);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Booking[];
      setBookings(data);
    }, (error) => {
      console.error("Error fetching bookings:", error);
    });

    // Sync/Seed Cabins
    const syncCabins = async () => {
      console.log("Iniciando sincronización de cabañas...");
      const qCabins = collection(db, 'cabins');
      
      const unsubscribeCabins = onSnapshot(qCabins, async (snap) => {
        console.log("Cabañas recibidas:", snap.docs.length);
        if (snap.empty) {
          console.log("No hay cabañas, creando iniciales...");
          for (const cabin of CABINS_INITIAL) {
            await setDoc(doc(db, 'cabins', cabin.id), cabin);
          }
        } else {
          const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Cabin[];
          setCabins(data);
        }
        setLoading(false);
      }, (error) => {
        console.error("Error fetching cabins:", error);
        setLoading(false);
      });
      
      return unsubscribeCabins;
    };

    let unsubscribeCabins: (() => void) | undefined;
    syncCabins().then(unsub => {
      if (unsub) unsubscribeCabins = unsub;
    });

    return () => {
      unsubscribeBookings();
      if (unsubscribeCabins) unsubscribeCabins();
    };
  }, [isAuthenticated, db]);

  const toggleCabinAvailability = (id: string, currentStatus: boolean) => {
    if (!db) return;
    // UI instantánea: Firebase onSnapshot se encargará del resto
    updateDoc(doc(db, 'cabins', id), {
      available: !currentStatus
    }).catch(err => console.error("Error updating cabin:", err));
  };

  const deleteBooking = (id: string) => {
    if (!db) return;
    // Eliminamos confirm() para máxima velocidad según pedido del usuario
    deleteDoc(doc(db, 'bookings', id)).catch(err => console.error("Error deleting booking:", err));
  };

  const markAsPaid = (id: string) => {
    if (!db) return;
    updateDoc(doc(db, 'bookings', id), {
      status: 'pagado'
    }).catch(err => console.error("Error updating booking status:", err));
  };

  if (!isClient) return null; // Avoid hydration mismatch on initial render

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-5">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border border-slate-100"
        >
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-6 text-slate-400 mx-auto">
            <Lock size={20} strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-black text-center text-slate-800 tracking-tight mb-8">Admin Login</h1>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Usuario</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-50 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 outline-none border border-slate-200 focus:border-[var(--forest-green)] transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Contraseña</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 outline-none border border-slate-200 focus:border-[var(--forest-green)] transition-colors"
                required
              />
            </div>
            
            {authError && (
              <p className="text-red-500 text-xs font-bold text-center mt-2">Credenciales incorrectas.</p>
            )}

            <button type="submit" className="w-full btn-forest py-3 mt-4 text-sm tracking-wide">
              Ingresar
            </button>
          </form>
        </motion.div>
      </main>
    );
  }

  return (
    <AdminDashboardContent 
      bookings={bookings} 
      cabins={cabins} 
      deleteBooking={deleteBooking} 
      markAsPaid={markAsPaid}
      toggleCabinAvailability={toggleCabinAvailability}
    />
  );
}

function AdminDashboardContent({ bookings, cabins, deleteBooking, markAsPaid, toggleCabinAvailability }: any) {
  const [selectedFilterDate, setSelectedFilterDate] = useState<Date | null>(null);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  // Reset selected booking when day changes
  useEffect(() => {
    setSelectedBookingId(null);
  }, [selectedFilterDate]);

  const filteredBookings = selectedFilterDate 
    ? bookings.filter((booking: any) => {
        if (booking.dates && booking.dates.length > 0) {
          return booking.dates.some((d: string) => {
            const dDate = new Date(d);
            return dDate.getFullYear() === selectedFilterDate.getFullYear() && 
                   dDate.getMonth() === selectedFilterDate.getMonth() && 
                   dDate.getDate() === selectedFilterDate.getDate();
          });
        }
        return false;
      })
    : bookings;

  const selectedBooking = bookings.find((b: any) => b.id === selectedBookingId);

  const isCabinOccupiedToday = (cabinId: string) => {
    const today = new Date();
    return bookings.some(b => {
      if (b.cabinId === cabinId && b.dates) {
        return b.dates.some(d => {
          const dDate = new Date(d);
          return dDate.getFullYear() === today.getFullYear() && 
                 dDate.getMonth() === today.getMonth() && 
                 dDate.getDate() === today.getDate();
        });
      }
      return false;
    });
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <header className="px-6 py-6 flex items-center justify-between max-w-[1400px] mx-auto">
        <div className="flex items-center gap-4">
          <Link href="/" className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all active:scale-95 group">
            <ChevronLeft size={18} strokeWidth={2.5} />
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">Sistema de reservas lodge go</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Admin Control Panel</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Online</span>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-6 pb-12">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          
          {/* Lado Izquierdo: Calendario */}
          <div className="xl:col-span-7">
            <section className="bg-white p-1 rounded-[1.5rem] shadow-lg shadow-slate-200/40 border border-slate-100">
              <AdminCalendar 
                bookings={bookings} 
                cabins={cabins} 
                selectedFilterDate={selectedFilterDate}
                onDaySelect={setSelectedFilterDate}
              />
            </section>
          </div>

          {/* Lado Derecho: Detalles */}
          <div className="xl:col-span-5 flex flex-col gap-6">
            
            <section className="bg-white rounded-[1.5rem] p-6 shadow-md border border-slate-100 min-h-[450px]">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-50">
                <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                  {selectedFilterDate ? (
                    <>
                      <CalendarIcon className="text-[var(--forest-green)]" size={16} />
                      {format(selectedFilterDate, 'dd/MM/yyyy')}
                    </>
                  ) : (
                    <>
                      <Clock className="text-slate-400" size={16} />
                      Actividad Reciente
                    </>
                  )}
                </h3>
                {selectedFilterDate && (
                  <button 
                    onClick={() => setSelectedFilterDate(null)}
                    className="text-[9px] font-black text-slate-400 hover:text-slate-900 uppercase"
                  >
                    Ver Todas
                  </button>
                )}
              </div>

              {!selectedFilterDate ? (
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-slate-300 uppercase mb-2">Últimas 5 Agendas</p>
                  {bookings.slice(0, 5).map((b: any) => (
                    <div 
                      key={b.id}
                      onClick={() => {
                        setSelectedFilterDate(b.dates ? new Date(b.dates[0]) : null);
                        setSelectedBookingId(b.id);
                      }}
                      className="flex items-center justify-between p-3 bg-slate-50/50 rounded-xl cursor-pointer hover:bg-slate-100 transition-all border border-slate-100"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${b.status === 'pagado' ? 'bg-emerald-500' : 'bg-orange-500'}`}></div>
                        <span className="text-[11px] font-black text-slate-700">{CABINS_INITIAL.find(c => c.id === b.cabinId)?.name.split(' ')[1]}</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">{b.customerName?.split(' ')[0]}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {filteredBookings.length === 0 ? (
                    <div className="py-20 text-center flex flex-col items-center gap-3">
                      <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                        <CalendarIcon size={20} />
                      </div>
                      <p className="text-[10px] font-black text-slate-300 italic uppercase">Sin datos de agenda</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-[10px] font-black text-[var(--forest-green)] uppercase tracking-[0.1em]">reservas activas ({filteredBookings.length})</p>
                      
                      <div className="flex flex-wrap gap-1.5">
                        {filteredBookings.map((b: any) => (
                          <button
                            key={b.id}
                            onClick={() => setSelectedBookingId(b.id)}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all border ${
                              selectedBookingId === b.id
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {CABINS_INITIAL.find(c => c.id === b.cabinId)?.name.replace('Cabaña ', '')}
                          </button>
                        ))}
                      </div>

                      <AnimatePresence mode="wait">
                        {selectedBooking ? (
                          <motion.div
                            key={selectedBooking.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="mt-2 p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-3"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="text-xs font-black text-slate-900 uppercase">{selectedBooking.customerName}</h4>
                                <div className="flex flex-col gap-0.5 mt-1">
                                  <p className="text-[9px] font-bold text-slate-600 flex items-center gap-1">
                                    <span className="text-slate-300">TEL:</span> {selectedBooking.customerPhone || 'N/A'}
                                  </p>
                                  <p className="text-[9px] font-bold text-slate-600 flex items-center gap-1">
                                    <span className="text-slate-300">EML:</span> {selectedBooking.customerEmail || 'N/A'}
                                  </p>
                                </div>
                              </div>
                              <div className={`text-[8px] px-2 py-0.5 rounded font-black uppercase border ${
                                selectedBooking.status === 'pagado' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-orange-50 text-orange-700 border-orange-100'
                              }`}>
                                {selectedBooking.status === 'pagado' ? 'Pagado' : 'Agendada'}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 bg-white p-3 rounded-lg border border-slate-100">
                              <div>
                                <p className="text-[8px] font-black text-slate-300 uppercase">Cabaña</p>
                                <p className="text-[10px] font-black text-slate-700">{CABINS_INITIAL.find(c => c.id === selectedBooking.cabinId)?.name.replace('Cabaña ', '')}</p>
                              </div>
                              <div>
                                <p className="text-[8px] font-black text-slate-300 uppercase">Total</p>
                                <p className="text-[10px] font-black text-[var(--forest-green)]">${selectedBooking.totalPrice?.toLocaleString('es-CL')}</p>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              {selectedBooking.status !== 'pagado' && (
                                <button 
                                  onClick={() => markAsPaid(selectedBooking.id)}
                                  className="flex-1 bg-emerald-600 text-white font-black py-2.5 rounded-lg hover:bg-emerald-700 transition-all text-[9px] uppercase tracking-wider"
                                >
                                  Confirmar Pago
                                </button>
                              )}
                              <button 
                                onClick={() => deleteBooking(selectedBooking.id)}
                                className="flex-1 bg-white text-red-600 border border-red-100 font-black py-2.5 rounded-lg hover:bg-red-50 transition-all text-[9px] uppercase tracking-wider"
                              >
                                Liberar Cabaña
                              </button>
                            </div>
                          </motion.div>
                        ) : (
                          <div className="mt-6 text-center py-8 border-2 border-dashed border-slate-100 rounded-xl">
                            <p className="text-[9px] font-black text-slate-300 uppercase italic">Selecciona una para ver detalles</p>
                          </div>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </div>
              )}
            </section>

            <section className="bg-slate-900 rounded-[1.5rem] p-5 text-white shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <Power size={14} className="text-white/40" />
                <h3 className="text-xs font-black tracking-tight uppercase">Disponibilidad Hoy</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {cabins.map((cabin: any) => {
                  const occupied = isCabinOccupiedToday(cabin.id);
                  const isAvailable = cabin.available && !occupied;

                  return (
                    <div key={cabin.id} className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${
                      occupied ? 'bg-orange-500/10 border-orange-500/20' : 'bg-white/5 border-white/5'
                    }`}>
                      <div className="flex flex-col min-w-0">
                        <span className="font-black text-[9px] truncate">{cabin.name.replace('Cabaña ', '')}</span>
                        {occupied && <span className="text-[7px] font-black uppercase text-orange-400">Ocupada</span>}
                      </div>
                      <button 
                        onClick={() => toggleCabinAvailability(cabin.id, cabin.available)}
                        disabled={occupied}
                        className={`relative w-8 h-4.5 rounded-full transition-all duration-300 flex-shrink-0 ${
                          occupied ? 'bg-orange-600 opacity-50 cursor-not-allowed' : (cabin.available ? 'bg-emerald-500' : 'bg-slate-700')
                        }`}
                      >
                        <div className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-all duration-300 ${
                          (occupied || cabin.available) ? 'left-4' : 'left-0.5'
                        }`}></div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

          </div>
        </div>
      </div>
    </main>
  );
}
