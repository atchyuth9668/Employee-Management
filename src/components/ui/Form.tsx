import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface FieldProps {
  label?: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  help?: string;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const Field = ({ label, htmlFor, required, error, help, children, className, style }: FieldProps) => {
  return (
    <div className={cn('form-group', className)} style={style}>
      {label && (
        <label htmlFor={htmlFor} className="form-label">
          {label}
          {required && <span aria-hidden="true" style={{ color: 'var(--danger)', marginLeft: 4 }}>*</span>}
        </label>
      )}
      {children}
      {error ? (
        <div className="form-error" role="alert">{error}</div>
      ) : help ? (
        <div className="form-help">{help}</div>
      ) : null}
    </div>
  );
};

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}
export const Input = ({ className, leftIcon, rightIcon, ...rest }: InputProps) => {
  if (leftIcon || rightIcon) {
    return (
      <div style={{ position: 'relative' }}>
        {leftIcon && (
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)', pointerEvents: 'none' }}>
            {leftIcon}
          </span>
        )}
        <input className={cn('input', className)} style={leftIcon ? { paddingLeft: 32 } : rightIcon ? { paddingRight: 32 } : undefined} {...rest} />
        {rightIcon && (
          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-subtle)', pointerEvents: 'none' }}>
            {rightIcon}
          </span>
        )}
      </div>
    );
  }
  return <input className={cn('input', className)} {...rest} />;
};

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options?: Array<{ value: string; label: string }>;
}
export const Select = ({ className, options, children, ...rest }: SelectProps) => (
  <select className={cn('select', className)} {...rest}>
    {options ? options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>) : children}
  </select>
);

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;
export const Textarea = ({ className, ...rest }: TextareaProps) => (
  <textarea className={cn('textarea', className)} {...rest} />
);