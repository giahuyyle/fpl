import type { ButtonHTMLAttributes, ReactNode } from 'react'

const variants = {
  acid: 'bg-pl-green text-pl-purple-dark shadow-[0_13px_35px_#00ff8533]',
  dark: 'bg-pl-purple text-white',
  light: 'min-h-[42px] bg-white text-pl-purple',
}

type PillButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: keyof typeof variants
}

export function PillButton({ children, className = '', variant = 'acid', type = 'button', ...props }: PillButtonProps) {
  return <button type={type} className={`inline-flex min-h-12 items-center justify-center gap-4 rounded-full border border-transparent px-[23px] text-xs font-extrabold transition duration-200 hover:-translate-y-0.5 ${variants[variant]} ${className}`} {...props}>{children}</button>
}
