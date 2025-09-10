import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface SpinnerProps {
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-6 h-6", 
  lg: "w-8 h-8",
  xl: "w-12 h-12"
}

export function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <Loader2 
      className={cn(
        "animate-spin text-muted-foreground",
        sizeClasses[size],
        className
      )}
    />
  )
}

export function LoadingSpinner({ size = "lg", className }: SpinnerProps) {
  return (
    <div className="flex items-center justify-center p-4">
      <div className="flex flex-col items-center space-y-2">
        <Spinner size={size} className={cn("text-primary", className)} />
        <p className="text-sm text-muted-foreground">로딩 중...</p>
      </div>
    </div>
  )
} 