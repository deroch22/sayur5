export function Dialog({ open, children }) {
  if (!open) return null;
  return <>{children}</>;
}
export function DialogContent({ className = "", children }) {
  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/40" />
      <div className={["relative mx-auto mt-10 max-w-lg bg-white rounded-2xl shadow-lg", className].join(" ")}>
        {children}
      </div>
    </div>
  );
}
export function DialogHeader({ className = "", ...props }) {
  return <div className={["p-4", className].join(" ")} {...props} />;
}
export function DialogTitle({ className = "", ...props }) {
  return <div className={["text-lg font-semibold", className].join(" ")} {...props} />;
}
