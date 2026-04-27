"use client";

import React, { useState, useRef, useLayoutEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export type NavItem = {
  id: string;
  href: string;
  icon: React.ReactElement;
  label: string;
  exact?: boolean;
};

type LimelightNavProps = {
  items: NavItem[];
  className?: string;
  limelightClassName?: string;
};

export function LimelightNav({ items, className, limelightClassName }: LimelightNavProps) {
  const pathname = usePathname();

  const activeIndex = items.findIndex(({ href, exact }) =>
    exact ? pathname === href : pathname.startsWith(href)
  );
  const displayIndex = activeIndex >= 0 ? activeIndex : -1;

  const [isReady, setIsReady] = useState(false);
  // Ref on the wrapper div so offsetLeft is relative to the nav
  const wrapperRefs = useRef<(HTMLDivElement | null)[]>([]);
  const limelightRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const limelight = limelightRef.current;
    const activeWrapper = displayIndex >= 0 ? wrapperRefs.current[displayIndex] : null;
    if (limelight && activeWrapper) {
      const newLeft = activeWrapper.offsetLeft + activeWrapper.offsetWidth / 2 - limelight.offsetWidth / 2;
      limelight.style.left = `${newLeft}px`;
      if (!isReady) setTimeout(() => setIsReady(true), 50);
    } else if (limelight && displayIndex < 0) {
      // No active item — hide the bar off screen
      limelight.style.left = '-999px';
    }
  }, [displayIndex, isReady]);

  return (
    <nav className={cn(
      'relative inline-flex items-center h-14 rounded-2xl border border-white/10 bg-[#0d0d0d] px-2',
      className
    )}>
      {items.map(({ id, href, icon, label, exact }, index) => {
        const isActive = exact ? pathname === href : pathname.startsWith(href);
        return (
          <div
            key={id}
            ref={el => { wrapperRefs.current[index] = el; }}
            className="relative group/tip"
          >
            <Link
              href={href}
              aria-label={label}
              className={cn(
                'relative z-20 flex h-14 items-center justify-center px-5 transition-opacity duration-150',
                isActive ? 'opacity-100' : 'opacity-35 hover:opacity-60'
              )}
            >
              {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'w-[18px] h-[18px] shrink-0 text-white' })}
            </Link>

            {/* Tooltip */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2.5 py-1 rounded-md bg-[#1a1a1a] border border-white/10 text-xs text-white whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 pointer-events-none z-50 shadow-xl">
              {label}
            </div>
          </div>
        );
      })}

      {/* Limelight bar */}
      <div
        ref={limelightRef}
        className={cn(
          'absolute top-0 z-10 w-11 h-[3px] rounded-full bg-orange-400',
          isReady ? 'transition-[left] duration-300 ease-in-out' : '',
          limelightClassName
        )}
        style={{ left: '-999px', boxShadow: '0 0 12px rgba(251,146,60,0.8), 0 40px 20px rgba(251,146,60,0.15)' }}
      >
        <div className="absolute left-[-30%] top-[3px] w-[160%] h-12 [clip-path:polygon(5%_100%,25%_0,75%_0,95%_100%)] bg-gradient-to-b from-orange-400/20 to-transparent pointer-events-none" />
      </div>
    </nav>
  );
}
