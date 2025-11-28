import * as React from 'react'
import { cn } from './utils'

export function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return <label className={cn('block text-sm text-gray-600 mb-2', className)} {...props} />
}