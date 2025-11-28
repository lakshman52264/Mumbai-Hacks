import * as React from 'react'
import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu'
import { cn } from './utils'

function DropdownMenu(props: React.ComponentProps<typeof DropdownPrimitive.Root>) {
  return <DropdownPrimitive.Root {...props} />
}

function DropdownMenuTrigger(
  props: React.ComponentProps<typeof DropdownPrimitive.Trigger>
) {
  return <DropdownPrimitive.Trigger {...props} />
}

function DropdownMenuContent(
  { className, ...props }: React.ComponentProps<typeof DropdownPrimitive.Content>
) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        className={cn(
          'z-50 min-w-56 overflow-hidden rounded-md border bg-white p-1 shadow-md',
          className
        )}
        {...props}
      />
    </DropdownPrimitive.Portal>
  )
}

function DropdownMenuLabel(
  { className, ...props }: React.ComponentProps<typeof DropdownPrimitive.Label>
) {
  return (
    <DropdownPrimitive.Label className={cn('px-2 py-1.5 text-sm text-[#1F2937]', className)} {...props} />
  )
}

function DropdownMenuItem(
  { className, ...props }: React.ComponentProps<typeof DropdownPrimitive.Item>
) {
  return (
    <DropdownPrimitive.Item
      className={cn('relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-gray-50', className)}
      {...props}
    />
  )
}

function DropdownMenuSeparator(
  props: React.ComponentProps<typeof DropdownPrimitive.Separator>
) {
  return <DropdownPrimitive.Separator className="-mx-1 my-1 h-px bg-gray-200" {...props} />
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
}