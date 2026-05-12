'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function ActionFooter({ onReserve, disabled, price = 0 }: { onReserve: () => void, disabled: boolean, price?: number }) {
  return (
    <button
      onClick={onReserve}
      disabled={disabled}
      className="btn-forest disabled:opacity-50 disabled:cursor-not-allowed w-full lg:w-auto flex justify-center items-center py-4 px-8"
    >
      {price > 0 && !disabled ? `Agendar • $${price.toLocaleString('es-CL')}` : 'Agendar'}
    </button>
  );
}
