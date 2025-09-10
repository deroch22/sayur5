export function Badge({ className = "", variant = "default", ...props }) {
  const variants = {
    default: "bg-emerald-100 text-emerald-700",
    secondary: "bg-slate-200 text-slate-800",
    outline: "border border-slate-300 text-slate-700",
  };
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        variants[variant] || variants.default,
        className,
      ].join(" ")}
      {...props}
    />
  );
}
