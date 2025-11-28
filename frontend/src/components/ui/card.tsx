import * as React from 'react'
import { cn } from './utils'

export function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('bg-white border border-gray-200 rounded-xl', className)}
      {...props}
    />
  )
}