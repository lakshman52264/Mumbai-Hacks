import * as React from 'react'
import { cn } from './utils'

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn('w-full rounded-xl border border-gray-200 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-[#4F46E5]', className)}
      {...props}
    />
  )
}