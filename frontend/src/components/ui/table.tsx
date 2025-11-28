import * as React from 'react'
import { cn } from './utils'

export function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return <table className={cn('w-full text-sm', className)} {...props} />
}
export function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return <thead className={cn('', className)} {...props} />
}
export function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return <tbody className={cn('', className)} {...props} />
}
export function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return <tr className={cn('border-b border-gray-200', className)} {...props} />
}
export function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return <th className={cn('text-left p-3 font-medium text-gray-600', className)} {...props} />
}
export function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return <td className={cn('p-3', className)} {...props} />
}