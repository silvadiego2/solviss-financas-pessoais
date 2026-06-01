import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // h-10 e appearance-none garantem altura uniforme em qualquer type,
          // incluindo type="date" no iOS/Android que injetam UI de calendário.
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2",
          "text-base ring-offset-background",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          // ── date picker fix ──────────────────────────────────────────────
          // appearance-none remove o padding extra que o browser injeta em
          // type="date" / type="datetime-local" / type="time".
          // A altura fica idêntica a qualquer outro Input da UI.
          type === 'date' || type === 'datetime-local' || type === 'time' || type === 'month'
            ? 'appearance-none [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:cursor-pointer'
            : '',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
