export function Sheet({ children }) { return <>{children}</>; }
export function SheetContent({ className = "", ...props }) {
  return <div className={["fixed right-0 top-0 h-full w-full max-w-md bg-white border-l p-4 shadow-2xl", className].join(" ")} {...props} />;
}
export function SheetHeader({ className = "", ...props }) { return <div className={["mb-2", className].join(" ")} {...props} />; }
export function SheetTitle({ className = "", ...props }) { return <div className={["text-lg font-semibold", className].join(" ")} {...props} />; }
export function SheetTrigger(props) { return <button {...props} />; }
