'use client';

import React from 'react';
import { Home as HomeIcon, Trees, Waves, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type Cabin = {
  id: string;
  name: string;
  capacity: number;
  price: number;
  available: boolean;
  description: string;
};

const CABINS: Cabin[] = [
  { id: 'c8', name: 'Cabaña Superior', capacity: 8, price: 100000, available: true, description: 'Relajo asegurado' },
  { id: 'c5', name: 'Cabaña Familiar', capacity: 5, price: 80000, available: true, description: 'Tranquilidad absoluta' },
  { id: 'c4', name: 'Cabaña Bosque', capacity: 4, price: 75000, available: true, description: 'Desconexión total' },
  { id: 'c2', name: 'Cabaña Refugio', capacity: 2, price: 70000, available: true, description: 'Paz en la naturaleza' },
];

export default function CabinSelector({ selectedCabinId, onSelect }: { selectedCabinId: string | null, onSelect: (id: string | null) => void }) {
  return (
    <div className="relative">
      <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10 lg:hidden text-slate-300 pointer-events-none">
        <ChevronLeft size={24} strokeWidth={1.5} />
      </div>
      <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10 lg:hidden text-[var(--forest-green)] pointer-events-none">
        <ChevronRight size={24} strokeWidth={2.5} />
      </div>

      <div className="flex flex-row overflow-x-auto snap-x snap-mandatory gap-4 pb-6 lg:flex-col lg:overflow-visible lg:snap-none lg:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] px-8 lg:px-0">
        {CABINS.map((cabin) => (
          <button
            key={cabin.id}
            onClick={() => onSelect(selectedCabinId === cabin.id ? null : cabin.id)}
            className={cn(
              "card-reference w-[70vw] md:w-[60vw] lg:w-full text-left flex flex-row items-center gap-4 shrink-0 h-full snap-center py-5 px-6",
              selectedCabinId === cabin.id && "selected"
            )}
          >
            <div className="flex-shrink-0">
              <div className={cn(
                "w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 border border-slate-100",
                selectedCabinId === cabin.id ? "text-[var(--forest-green)] bg-[var(--forest-green)]/10 border-[var(--forest-green)]/20" : "text-slate-500"
              )}>
                {cabin.id === 'c8' ? <HomeIcon size={20} strokeWidth={1.5} /> : 
                 cabin.id === 'c4' ? <Trees size={20} strokeWidth={1.5} /> :
                 <Waves size={20} strokeWidth={1.5} />}
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-0.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-[15px] font-extrabold text-[#1E293B] tracking-tight truncate">{cabin.name}</h4>
                  <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200">
                    <Users size={10} className="text-slate-500" />
                    <span className="text-[9px] font-bold text-slate-600">{cabin.capacity}</span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mb-1.5 font-medium truncate">
                {cabin.description}
              </p>
              <p className="text-sm font-black text-[#1E293B]">
                CLP ${cabin.price.toLocaleString('es-CL')} <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-0.5">/ noche</span>
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
