import React, { createContext, useContext, useState } from 'react'
const Ctx = createContext(null)

export const Sheet = ({ children }) => {
  const state = useState(false) // [open, setOpen]
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>
}
export const SheetTrigger = ({ asChild=false, children }) => {
  const [open, setOpen] = useContext(Ctx)
  if (asChild && React.isValidElement(children)) return React.cloneElement(children, { onClick: ()=>setOpen(true) })
  return <button onClick={()=>setOpen(true)}>{children}</button>
}
export const SheetContent = ({ className='', side='right', children }) => {
  const [open, setOpen] = useContext(Ctx)
  if(!open) return null
  const sideClass = side==='left' ? 'left-0' : (side==='top' ? 'top-0' : (side==='bottom' ? 'bottom-0' : 'right-0'))
  return (
    <div className="fixed inset-0 z-50 ui-overlay" onMouseDown={()=>setOpen(false)}>
      <div className={`fixed ${sideClass} h-screen w-full sm:max-w-md bg-white shadow-xl border p-4`} onMouseDown={(e)=>e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}
export const SheetHeader = ({ children }) => <div className="border-b pb-2">{children}</div>
export const SheetTitle = ({ children }) => <div className="text-lg font-semibold">{children}</div>