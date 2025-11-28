import * as React from 'react'
import { cn } from './utils'

export function Badge({ className, variant = 'secondary', ...props }: React.ComponentProps<'span'> & { variant?: 'secondary' | 'outline' }) {
  const styles =
    variant === 'outline'
      ? 'border border-gray-300 text-gray-700'
      : 'bg-gray-100 text-[#1F2937]'
  return <span className={cn('inline-flex items-center rounded-md px-2 py-1 text-xs', styles, className)} {...props} />
}