import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'merah' | 'kuning' | 'biru' | 'slate' | 'hijau';
  size?: 'sm' | 'md';
}

export function Badge({
  children,
  variant = 'merah',
  size = 'md',
  className = '',
  ...props
}: BadgeProps) {
  const sizeStyles = {
    sm: 'text-xs px-2.5 py-0.5',
    md: 'text-sm px-3 py-1',
  };

  const variantStyles = {
    merah:
      'bg-red-100 text-[#D7262E] dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-900/50',
    kuning:
      'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50',
    biru:
      'bg-blue-100 text-[#1E2A5A] dark:bg-blue-950/60 dark:text-blue-200 border border-blue-200 dark:border-blue-900/50',
    slate:
      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
    hijau:
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50',
  };

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full select-none ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

