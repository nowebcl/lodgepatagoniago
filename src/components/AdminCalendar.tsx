'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';

type Booking = {
  id: string;
  cabinId: string;
  startDate?: string;
  endDate?: string;
  date?: string; 
  dates?: string[];
  status: string;
};

type Cabin = {
  id: string;
  name: string;
};

export type AdminCalendarProps = {
  bookings: Booking[];
  cabins: Cabin[];
  selectedFilterDate: Date | null;
  onDaySelect: (day: Date) => void;
};

export default function AdminCalendar({ bookings, cabins, selectedFilterDate, onDaySelect }: AdminCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const today = startOfToday();

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const getBookingsForDay = (day: Date) => {
    return bookings.filter((booking: any) => {
      if (booking.dates && booking.dates.length > 0) {
        return booking.dates.some((d: string) => isSameDay(new Date(d), day));
      } else if (booking.startDate && booking.endDate) {
        const start = new Date(booking.startDate);
        const end = new Date(booking.endDate);
        start.setHours(0,0,0,0);
        end.setHours(0,0,0,0);
        return day.getTime() >= start.getTime() && day.getTime() <= end.getTime();
      } else if (booking.date) {
        return isSameDay(new Date(booking.date), day);
      }
      return false;
    });
  };

  const getCabinName = (cabinId: string) => {
    const name = cabins.find((c: any) => c.id === cabinId)?.name || 'Cabaña';
    if (name.includes('Superior')) return 'SUP';
    if (name.includes('Familiar')) return 'FAM';
    if (name.includes('Bosque')) return 'BSQ';
    if (name.includes('Refugio')) return 'REF';
    return name.substring(0, 3).toUpperCase();
  };

  const monthName = format(currentMonth, 'MMMM yyyy', { locale: es });
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  return (
    <div className="w-full h-full bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-black text-slate-900 tracking-tight">
          {capitalizedMonth}
        </h2>
        <div className="flex gap-1">
          <button 
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="text-slate-500 hover:text-slate-900 transition-colors p-1.5 bg-slate-50 rounded-lg border border-slate-100"
          >
            <ChevronLeft size={16} strokeWidth={2.5} />
          </button>
          <button 
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="text-slate-500 hover:text-slate-900 transition-colors p-1.5 bg-slate-50 rounded-lg border border-slate-100"
          >
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((dayName: string) => (
          <div key={dayName} className="text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
            {dayName}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 flex-1">
        {Array.from({ length: (startOfMonth(currentMonth).getDay() + 6) % 7 }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[60px] lg:min-h-[85px] rounded-xl bg-slate-50/30" />
        ))}
        
        {days.map((day) => {
          const dayBookings = getBookingsForDay(day);
          const isPast = isBefore(day, today);
          const isSelected = selectedFilterDate && isSameDay(selectedFilterDate, day);
          const hasBookings = dayBookings.length > 0;

          return (
            <div
              key={day.toString()}
              onClick={() => onDaySelect(day)}
              className={`min-h-[60px] lg:min-h-[85px] border-2 rounded-xl p-1 flex flex-col transition-all relative cursor-pointer hover:border-slate-400 ${
                isPast ? 'bg-slate-50/50 border-slate-50 opacity-60' : 'bg-white border-slate-100'
              } ${
                isSelected 
                  ? 'border-[var(--forest-green)] bg-green-50/50 shadow-sm' 
                  : ''
              }`}
            >
              <div className={`text-[10px] font-black text-center mb-1 ${
                isSameDay(day, today) 
                  ? 'text-white bg-[var(--forest-green)] rounded-full w-5 h-5 flex items-center justify-center mx-auto' 
                  : 'text-slate-400'
              }`}>
                {format(day, 'd')}
              </div>
              
              <div className="flex flex-col gap-0.5 overflow-hidden flex-1">
                {dayBookings.map((b: any) => (
                  <div 
                    key={b.id} 
                    className={`text-[7px] lg:text-[8px] font-black uppercase tracking-tighter px-1 py-0.5 text-center rounded shadow-sm border truncate ${
                      b.status === 'pagado' 
                        ? 'bg-[var(--forest-green)] text-white border-green-600' 
                        : 'bg-orange-500 text-white border-orange-600'
                    }`}
                  >
                    {getCabinName(b.cabinId)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 flex items-center justify-center gap-6 py-2 bg-slate-50 rounded-xl border border-slate-100">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded bg-[var(--forest-green)]"></div>
          <span className="text-[9px] font-black text-slate-600 uppercase">Pagado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded bg-orange-500"></div>
          <span className="text-[9px] font-black text-slate-600 uppercase">Pendiente</span>
        </div>
      </div>
    </div>
  );
}
