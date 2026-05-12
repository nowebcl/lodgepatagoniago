'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isBefore, isAfter, startOfToday, isWithinInterval, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type CalendarProps = {
  selectedDates: Date[];
  onDateToggle: (dates: Date[]) => void;
  blockedDates?: Date[];
};

export default function Calendar({ selectedDates, onDateToggle, blockedDates = [] }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const today = startOfToday();

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const isBlocked = (day: Date) => {
    return blockedDates.some(blockedDate => isSameDay(blockedDate, day));
  };

  const handleDayClick = (day: Date) => {
    if (isBefore(day, today) || isBlocked(day)) return;

    const isAlreadySelected = selectedDates.some(d => isSameDay(d, day));
    if (isAlreadySelected) {
      onDateToggle(selectedDates.filter(d => !isSameDay(d, day)));
    } else {
      onDateToggle([...selectedDates, day]);
    }
  };

  const monthName = format(currentMonth, 'MMMM yyyy', { locale: es });
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        <button 
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="text-slate-300 hover:text-black transition-colors p-2"
        >
          <ChevronLeft size={20} strokeWidth={1.5} />
        </button>
        <h2 className="text-xl font-extrabold text-[#1E293B] tracking-tight">
          {capitalizedMonth}
        </h2>
        <button 
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="text-slate-300 hover:text-black transition-colors p-2"
        >
          <ChevronRight size={20} strokeWidth={1.5} />
        </button>
      </div>

      <p className="text-center text-[10px] text-slate-400 font-medium mb-3 lg:mb-6">Puedes seleccionar varios días</p>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-300 mb-2 lg:mb-4">
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => <div key={day}>{day}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-y-1.5 lg:gap-y-3">
        {Array.from({ length: (startOfMonth(currentMonth).getDay() + 6) % 7 }).map((_, i) => (
          <div key={`empty-${i}`} className="h-8 lg:h-10" />
        ))}
        
        {days.map((day) => {
          const past = isBefore(day, today);
          const blocked = isBlocked(day);
          const isUnavailable = past || blocked;
          
          const isSelected = selectedDates.some(d => isSameDay(d, day));

          return (
            <button
              key={day.toString()}
              disabled={isUnavailable}
              onClick={() => handleDayClick(day)}
              className={cn(
                "h-8 w-8 lg:h-10 lg:w-10 flex flex-col items-center justify-center rounded-lg lg:rounded-xl transition-all relative text-[11px] lg:text-xs font-bold mx-auto",
                isSelected ? "bg-[var(--forest-green)] text-white shadow-md shadow-green-900/10 z-10" : "",
                !isSelected && !isUnavailable ? "text-slate-500 hover:bg-slate-50" : "",
                isUnavailable ? "text-slate-200 cursor-not-allowed" : "",
                blocked && !past ? "line-through text-red-300" : "",
                isToday(day) && !isSelected ? "text-[var(--forest-green)] ring-1 ring-[var(--forest-green)]/20" : ""
              )}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
}
