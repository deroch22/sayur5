import * as React from "react";
export function Textarea({ className = "", ...props }) {
  return (
    <textarea
      className={[
        "w-full min-h-[90px] rounded-md border border-slate-300 bg-white px-3 py-2 text-sm",
        "placeholder:text-slate-400",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      ].join(" ")}
      {...props}
    />
  );
}

