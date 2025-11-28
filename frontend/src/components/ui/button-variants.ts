import { cva, type VariantProps } from 'class-variance-authority'

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5]',
  {
    variants: {
      variant: {
        default: 'bg-[#4F46E5] text-white hover:bg-[#4338CA]',
        destructive:
          'bg-red-500 text-white hover:bg-red-500/90 focus-visible:ring-red-500/20',
        outline:
          'border bg-white text-[#1F2937] hover:bg-gray-50',
        secondary:
          'bg-gray-100 text-[#1F2937] hover:bg-gray-200',
        ghost: 'hover:bg-gray-50 text-[#1F2937]',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9 rounded-md',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export type ButtonVariantProps = VariantProps<typeof buttonVariants>