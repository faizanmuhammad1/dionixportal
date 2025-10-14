"use client"

import * as React from "react"
import { CheckCircle2, XCircle, AlertCircle, Info, X } from "lucide-react"
import { cn } from "@/lib/utils"

export type ToastType = "success" | "error" | "warning" | "info"

interface EnhancedToastProps {
  title?: string
  description: string
  type?: ToastType
  duration?: number
  onClose?: () => void
}

const toastConfig = {
  success: {
    icon: CheckCircle2,
    className: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800",
    iconClassName: "text-green-600 dark:text-green-400",
    titleClassName: "text-green-900 dark:text-green-100",
    descClassName: "text-green-700 dark:text-green-300"
  },
  error: {
    icon: XCircle,
    className: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
    iconClassName: "text-red-600 dark:text-red-400",
    titleClassName: "text-red-900 dark:text-red-100",
    descClassName: "text-red-700 dark:text-red-300"
  },
  warning: {
    icon: AlertCircle,
    className: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
    iconClassName: "text-amber-600 dark:text-amber-400",
    titleClassName: "text-amber-900 dark:text-amber-100",
    descClassName: "text-amber-700 dark:text-amber-300"
  },
  info: {
    icon: Info,
    className: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
    iconClassName: "text-blue-600 dark:text-blue-400",
    titleClassName: "text-blue-900 dark:text-blue-100",
    descClassName: "text-blue-700 dark:text-blue-300"
  }
}

export function EnhancedToast({ 
  title, 
  description, 
  type = "info", 
  duration = 5000,
  onClose 
}: EnhancedToastProps) {
  const [isVisible, setIsVisible] = React.useState(true)
  const config = toastConfig[type]
  const Icon = config.icon

  React.useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(() => onClose?.(), 300) // Wait for animation
      }, duration)
      
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  if (!isVisible) {
    return null
  }

  return (
    <div
      className={cn(
        "pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg border shadow-lg",
        "animate-slide-in-down transition-all duration-300",
        config.className,
        !isVisible && "animate-slide-out-up opacity-0"
      )}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <Icon className={cn("h-5 w-5", config.iconClassName)} />
          </div>
          
          <div className="flex-1 pt-0.5">
            {title && (
              <p className={cn("text-sm font-semibold mb-1", config.titleClassName)}>
                {title}
              </p>
            )}
            <p className={cn("text-sm", config.descClassName)}>
              {description}
            </p>
          </div>
          
          {onClose && (
            <button
              type="button"
              onClick={() => {
                setIsVisible(false)
                setTimeout(() => onClose(), 300)
              }}
              className={cn(
                "flex-shrink-0 inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2",
                "hover:bg-black/5 dark:hover:bg-white/5 transition-colors",
                config.iconClassName
              )}
              aria-label="Close notification"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      
      {/* Progress bar */}
      {duration > 0 && (
        <div className="h-1 w-full bg-black/10 dark:bg-white/10">
          <div
            className={cn("h-full", config.iconClassName.replace('text-', 'bg-'))}
            style={{
              animation: `shrink ${duration}ms linear forwards`
            }}
          />
        </div>
      )}
    </div>
  )
}

// Add shrink animation
const style = document.createElement('style')
style.innerHTML = `
  @keyframes shrink {
    from {
      width: 100%;
    }
    to {
      width: 0%;
    }
  }
  
  @keyframes slide-out-up {
    from {
      opacity: 1;
      transform: translateY(0);
    }
    to {
      opacity: 0;
      transform: translateY(-10px);
    }
  }
  
  .animate-slide-out-up {
    animation: slide-out-up 0.3s ease-out;
  }
`
if (typeof document !== 'undefined') {
  document.head.appendChild(style)
}
