import { cn } from './utils'

export function Progress({ value = 0, className }: { value?: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className={cn('h-2 w-full rounded-full bg-gray-200', className)}>
      <div
        className="h-full rounded-full bg-[#4F46E5]"
        style={{ width: pct + '%' }}
      />
    </div>
  )
}