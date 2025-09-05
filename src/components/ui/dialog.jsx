import React, { useEffect } from 'react'
export const Dialog = ({ open, onOpenChange, children }) => {
  useEffect(() => {
    const onEsc = (e)=>{ if(e.key==='Escape' && open){ onOpenChange?.(false) } }
    window.addEventListener('keydown', onEsc); return ()=>window.removeEventListener('keydown', onEsc);
  }, [open, onOpenChange])
  if(!open) return null
  return (
    <div className="fixed inset-0 z-50 ui-overlay flex items-center justify-center p-4" onMouseDown={()=>onOpenChange?.(false)}>
      <div className="relative" onMouseDown={(e)=>e.stopPropagation()}>{children}</div>
    </div>
  )
}
export const DialogContent = ({ className='', style, children }) => (
  <div className={`bg-white rounded-xl shadow-xl border ${className}`} style={style}>{children}</div>
)
export const DialogHeader = ({ children }) => <div className="p-4 border-b">{children}</div>
export const DialogTitle = ({ children, className='' }) => <div className={`text-lg font-semibold ${className}`}>{children}</div>