"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface PortalDropdownProps<T> {
  value: T;
  onChange: (value: T) => void;
  options: T[];
  displayValue: (value: T) => string;
  className?: string;
  children: (option: T, index: number) => React.ReactNode;
  variant?: 'default' | 'subtle';
}

export default function PortalDropdown<T>({ 
  value, 
  onChange, 
  options, 
  displayValue,
  className = "",
  children,
  variant = 'default'
}: PortalDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, bottom: 0, direction: 'down' as 'down' | 'up' });
  const [mounted, setMounted] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState<number>(-1);
  const [typeahead, setTypeahead] = useState("");
  const typeTimerRef = useRef<number | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const gap = 4;
      const spaceBelow = window.innerHeight - rect.bottom - gap;
      const spaceAbove = rect.top - gap;
      const direction = spaceBelow >= 200 || spaceBelow >= spaceAbove ? 'down' : 'up';
      setPosition({
        top: rect.bottom + gap,
        bottom: window.innerHeight - rect.top + gap,
        left: rect.left,
        width: rect.width,
        direction,
      });
    }
  };
  
  const handleOpen = () => {
    updatePosition();
    // Nastav počáteční zvýraznění na aktuální hodnotu
    const currentIndex = options.findIndex((o) => displayValue(o) === displayValue(value));
    setHighlightIndex(currentIndex >= 0 ? currentIndex : 0);
    setIsOpen(true);
  };
  
  // Update position on scroll/resize
  useEffect(() => {
    if (isOpen) {
      const handleUpdate = () => updatePosition();
      window.addEventListener('scroll', handleUpdate);
      window.addEventListener('resize', handleUpdate);
      const handleKey = (e: KeyboardEvent) => {
        if (!isOpen) return;
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setHighlightIndex((idx) => {
            const next = Math.min(options.length - 1, (idx < 0 ? 0 : idx + 1));
            // scroll
            requestAnimationFrame(() => {
              const el = listRef.current?.querySelector(`[data-idx="${next}"]`) as HTMLElement | null;
              el?.scrollIntoView({ block: 'nearest' });
            });
            return next;
          });
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setHighlightIndex((idx) => {
            const next = Math.max(0, (idx < 0 ? 0 : idx - 1));
            requestAnimationFrame(() => {
              const el = listRef.current?.querySelector(`[data-idx="${next}"]`) as HTMLElement | null;
              el?.scrollIntoView({ block: 'nearest' });
            });
            return next;
          });
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          const idx = highlightIndex >= 0 ? highlightIndex : options.findIndex((o) => displayValue(o) === displayValue(value));
          const opt = options[idx];
          if (opt !== undefined) {
            onChange(opt);
            setIsOpen(false);
          }
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setIsOpen(false);
          return;
        }
        // Typeahead (písmena/číslice, bez modifikátorů)
        if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
          const nextTerm = (typeahead + e.key).toLowerCase();
          setTypeahead(nextTerm);
          if (typeTimerRef.current) window.clearTimeout(typeTimerRef.current);
          typeTimerRef.current = window.setTimeout(() => setTypeahead(""), 700) as unknown as number;
          const idx = options.findIndex((o) => displayValue(o).toLowerCase().includes(nextTerm));
          if (idx >= 0) {
            setHighlightIndex(idx);
            requestAnimationFrame(() => {
              const el = listRef.current?.querySelector(`[data-idx="${idx}"]`) as HTMLElement | null;
              el?.scrollIntoView({ block: 'nearest' });
            });
          }
        }
      };
      window.addEventListener('keydown', handleKey);
      return () => {
        window.removeEventListener('scroll', handleUpdate);
        window.removeEventListener('resize', handleUpdate);
        window.removeEventListener('keydown', handleKey);
      };
    }
  }, [isOpen]);
  
  const dropdownContent = isOpen && mounted ? (
    <>
      <div 
        className="fixed inset-0"
        style={{ zIndex: 999998 }}
        onClick={() => setIsOpen(false)}
      />
      <div 
        ref={listRef}
        className="fixed dropdown-panel shadow-xl overflow-y-auto max-h-60"
        style={
          position.direction === 'down'
            ? {
                top: position.top,
                left: position.left,
                width: position.width,
                zIndex: 999999,
                minWidth: '100px',
                maxWidth: '240px'
              }
            : {
                bottom: position.bottom,
                left: position.left,
                width: position.width,
                zIndex: 999999,
                minWidth: '100px',
                maxWidth: '240px'
              }
        }
      >
        {options.map((option, index) => {
          const isActive = index === highlightIndex;
          return (
            <div
              key={index}
              data-idx={index}
              onMouseEnter={() => setHighlightIndex(index)}
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
              className={`px-2 py-1 cursor-pointer select-none flex items-center justify-between text-sm ${isActive ? 'bg-[var(--accent)]/10' : 'hover:bg-black/5'}`}
            >
              {children(option, index)}
            </div>
          );
        })}
      </div>
    </>
  ) : null;
  
  return (
    <div className={className}>
      <button
        ref={buttonRef}
        onClick={handleOpen}
        className={
          variant === 'subtle' 
            ? "w-full px-1 py-0.5 text-xs text-left text-[var(--text)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30"
            : "glass w-full px-3 py-2 rounded-xl text-sm text-left focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        }
      >
        {displayValue(value)}
      </button>
      
      {mounted && dropdownContent && createPortal(dropdownContent, document.body)}
    </div>
  );
}
