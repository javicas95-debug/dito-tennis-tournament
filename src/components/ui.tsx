import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';

export function Card({ className = '', children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-md border border-line bg-white/60 backdrop-blur-sm ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}

export function Button({ variant = 'primary', className = '', ...rest }: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-sm px-4 py-2 text-xs font-semibold uppercase tracking-widest-plus transition-colors disabled:cursor-not-allowed disabled:opacity-40';
  const variants: Record<string, string> = {
    primary: 'bg-forest text-white hover:bg-forest-dark',
    secondary: 'border border-forest text-forest hover:bg-forest-light',
    ghost: 'text-ink hover:bg-forest-light',
    danger: 'border border-accent text-accent hover:bg-accent hover:text-white',
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...rest} />;
}

export function SectionTitle({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
      <div>
        {eyebrow && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest-plus text-forest">{eyebrow}</p>
        )}
        <h1 className="font-serif text-3xl text-ink">{title}</h1>
      </div>
      {action}
    </div>
  );
}

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'forest' | 'accent'; children: ReactNode }) {
  const tones: Record<string, string> = {
    neutral: 'bg-black/5 text-ink/70',
    forest: 'bg-forest-light text-forest',
    accent: 'bg-accent/10 text-accent',
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest-plus ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-line bg-white/40 p-10 text-center text-sm text-ink/50">
      {children}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest-plus text-ink/60">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  'w-full rounded-sm border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-forest';
