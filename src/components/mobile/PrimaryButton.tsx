import { ReactNode, ButtonHTMLAttributes } from 'react'
import { clsx } from 'clsx'

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'outline'
  fullWidth?: boolean
}

export default function PrimaryButton({ 
  children, 
  variant = 'primary',
  fullWidth = false,
  className,
  ...props 
}: PrimaryButtonProps) {
  return (
    <button
      className={clsx(
        'w-full py-4 px-6 rounded-2xl font-semibold text-base transition-all active:scale-[0.98]',
        {
          'bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white shadow-lg shadow-blue-500/25':
            variant === 'primary',
          'bg-[#102544] text-white hover:bg-[#143660]':
            variant === 'secondary',
          'bg-transparent border border-white/25 text-white hover:bg-white/5':
            variant === 'outline',
        },
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}