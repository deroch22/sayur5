export function Card({ className = "", ...props }) {
  return <div className={["rounded-2xl border bg-white", className].join(" ")} {...props} />;
}
export function CardHeader({ className = "", ...props }) {
  return <div className={["p-4", className].join(" ")} {...props} />;
}
export function CardContent({ className = "", ...props }) {
  return <div className={["p-4", className].join(" ")} {...props} />;
}
export function CardTitle({ className = "", ...props }) {
  return <h3 className={["text-base font-semibold", className].join(" ")} {...props} />;
}
