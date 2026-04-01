import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

const Dialog = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 flex items-center justify-center",
      className
    )}
    {...props}
  />
))
Dialog.displayName = "Dialog"

const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("fixed inset-0 bg-black/50", className)}
    {...props}
  />
))
DialogOverlay.displayName = "DialogOverlay"

const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative w-full max-w-md rounded-lg bg-white p-6 shadow-lg",
      className
    )}
    {...props}
  >
    {children}
  </div>
))
DialogContent.displayName = "DialogContent"

const DialogHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
    {...props}
  />
))
DialogHeader.displayName = "DialogHeader"

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
DialogTitle.displayName = "DialogTitle"

const DialogFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4", className)}
    {...props}
  />
))
DialogFooter.displayName = "DialogFooter"

export { Dialog, DialogOverlay, DialogContent, DialogHeader, DialogTitle, DialogFooter }
