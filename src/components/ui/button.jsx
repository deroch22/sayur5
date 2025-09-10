import * as React from "react";

const variants = {
  default: "bg-emerald-600 text-white hover:bg-emerald-700",
  outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
  ghost: "bg-transparent hover:bg-slate-100",
  secondary: "bg-slate-800 text-white hover:bg-slate-900",
};

const sizes = {
  default: "h-10 px-4",
  sm: "h-9 px-3 text-sm",
  lg: "h-11 px-5",
  icon: "h-10 w-10 p-0",
};

export function Button({
  className = "",
  variant = "default",
  size = "default",
  ...props
}) {
  return (
    <button
      className={[
        "inline-flex items-center justify-center rounded-md font-medium",
        "transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:pointer-events-none",
        variants[variant] || variants.default,
        sizes[size] || sizes.default,
        className,
      ].join(" ")}
      {...props}
    />
  );
}
