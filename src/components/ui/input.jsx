import React from 'react'
export const Input = React.forwardRef(({ className='', ...props }, ref) => (
  <input ref={ref} className={`flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder-slate-400 focus:outline-none focus:ring focus:ring-emerald-200 ${className}`} {...props} />
))