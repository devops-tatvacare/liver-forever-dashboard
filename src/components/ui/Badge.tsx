import { type ReactNode } from 'react';
import { cn } from '@/utils/cn';

type BadgeVariant = 'neutral' | 'primary' | 'success' | 'error' | 'warning' | 'info';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  neutral: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]',
  primary: 'bg-[var(--color-brand-accent)]/20 text-[var(--text-brand)]',
  success: 'bg-[var(--color-success-light)] text-[var(--color-success-dark)]',
  error: 'bg-[var(--color-error-light)] text-[var(--color-error-dark)]',
  warning: 'bg-[var(--color-warning-light)] text-[var(--color-warning-dark)]',
  info: 'bg-[var(--color-info-light)] text-[var(--color-info-dark)]',
};

const sizeStyles: Record<'sm' | 'md', string> = {
  sm: 'h-5 px-2 text-[11px]',
  md: 'h-6 px-2.5 text-[12px]',
};

export function Badge({ children, variant = 'neutral', size = 'sm', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[4px] font-medium',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  );
}
