import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'utama' | 'sekunder' | 'hantu' | 'ai';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'utama',
      size = 'md',
      loading = false,
      icon,
      disabled,
      className = '',
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-2xl transition-all duration-200 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D7262E] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]';

    const sizeStyles = {
      sm: 'h-9 px-3.5 text-sm gap-1.5 min-w-[36px]',
      md: 'h-11 px-5 text-base gap-2 min-h-[44px]',
      lg: 'h-13 px-7 text-lg gap-2.5 min-h-[48px]',
    };

    const variantStyles = {
      utama:
        'bg-[#D7262E] hover:bg-[#B91C23] text-white shadow-sm hover:shadow active:bg-[#9B1319]',
      sekunder:
        'border-2 border-[#D7262E] text-[#D7262E] bg-transparent hover:bg-red-50 dark:hover:bg-red-950/30 active:bg-red-100',
      hantu:
        'text-slate-700 dark:text-slate-200 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/80 active:bg-slate-200',
      ai:
        'bg-[#F5B700] hover:bg-[#D9A200] text-slate-900 font-semibold shadow-sm hover:shadow active:bg-[#BF8E00]',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
            <span>Memuat...</span>
          </>
        ) : (
          <>
            {icon && <span className="inline-flex shrink-0">{icon}</span>}
            {children}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

