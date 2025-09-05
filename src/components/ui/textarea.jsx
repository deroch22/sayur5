import React from 'react'
export const Textarea = React.forwardRef(({ className='', ...props }, ref) => (
  <textarea ref={ref} className={`flex min-h-[80px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder-slate-400 focus:outline-none focus:ring focus:ring-emerald-200 ${className}`} {...props} />
))