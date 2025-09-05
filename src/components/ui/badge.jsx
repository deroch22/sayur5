import React from 'react'
export const Badge = ({ children, variant='default', className='' }) => {
  const map = { default: "bg-emerald-600 text-white", secondary: "bg-emerald-100 text-emerald-800", outline: "border border-slate-300 text-slate-700" }
  return <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${map[variant]||map.default} ${className}`}>{children}</span>
}