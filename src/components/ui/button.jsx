import React from 'react'
const base = "inline-flex items-center justify-center px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring disabled:opacity-50 disabled:pointer-events-none rounded-md"
const variants = { default: "bg-emerald-600 text-white hover:bg-emerald-700", secondary: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200", outline: "border border-slate-300 hover:bg-slate-50", ghost: "hover:bg-slate-100" }
const sizes = { default: "h-10", icon: "h-10 w-10 p-0", sm: "h-9", lg: "h-11 text-base" }
export const Button = React.forwardRef(({ className="", variant="default", size="default", ...props }, ref) => (
  <button ref={ref} className={`${base} ${variants[variant]||variants.default} ${sizes[size]||sizes.default} ${className}`} {...props} />
))