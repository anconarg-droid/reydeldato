'use client'

import * as React from 'react'
import * as SwitchPrimitive from '@radix-ui/react-switch'

import { cn } from '@/lib/utils'

type SwitchProps = React.ComponentProps<typeof SwitchPrimitive.Root> & {
  thumbClassName?: string
}

function Switch({ className, thumbClassName, style, ...props }: SwitchProps) {
  const mergedStyle: React.CSSProperties = {
    containerType: 'inline-size',
    // % en translate() es respecto al thumb; usamos cqw + esta var para alinear al borde del track.
    ['--switch-thumb-size' as string]: '1rem',
    ['--switch-pad-end' as string]: '4px',
    ...(typeof style === 'object' && style !== null && !Array.isArray(style) ? style : {}),
  }

  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      style={mergedStyle}
      className={cn(
        'peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block size-[var(--switch-thumb-size)] shrink-0 rounded-full ring-0 transition-transform',
          'data-[state=unchecked]:translate-x-0.5',
          'data-[state=checked]:translate-x-[calc(100cqw-var(--switch-thumb-size)-var(--switch-pad-end))]',
          thumbClassName,
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
