'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Settings } from 'lucide-react';

export default function Header() {
  return (
    <header className="w-full border-b border-slate-50">
      <div className="max-w-[1000px] mx-auto px-5 lg:px-8 py-6 lg:py-8 flex justify-center lg:justify-start items-center relative">
        <div className="flex items-center gap-4">
          <Link href="/" className="relative w-[140px] h-[45px]">
            <Image 
              src="/assets/logo.png" 
              alt="Lodge Patagonia Go" 
              fill
              className="object-contain object-center lg:object-left"
              priority
            />
          </Link>
        </div>
      </div>
    </header>
  );
}
