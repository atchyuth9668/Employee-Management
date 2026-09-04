import type { ReactNode, ButtonHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md';
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  iconOnly?: boolean;
}

export const Button = ({
  variant = 'secondary',
  size = 'md',
  loading,
  leftIcon,
  rightIcon,
  iconOnly,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) => {
  const base = iconOnly ? 'btn btn-icon' : 'btn';
  return (
    <button
      className={cn(base, `btn-${variant}`, size === 'sm' ? 'btn-sm' : '', className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <span className="spinner" aria-hidden="true" /> : leftIcon}
      {!iconOnly && children}
      {!loading && rightIcon && !iconOnly ? <span aria-hidden="true">{rightIcon}</span> : null}
    </button>
  );
};