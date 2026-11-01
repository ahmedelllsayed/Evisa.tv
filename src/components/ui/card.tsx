import type { ComponentProps } from "react";

export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return (
    <div
      className={`rounded-xl border border-[#2A2F3C] bg-[#0F131C] ${className}`}
      {...props}
    />
  );
}

export function CardHeader({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`flex flex-col gap-1.5 p-6 ${className}`} {...props} />;
}

export function CardTitle({ className = "", ...props }: ComponentProps<"h3">) {
  return <h3 className={`text-lg font-semibold leading-none tracking-tight ${className}`} {...props} />;
}

export function CardDescription({ className = "", ...props }: ComponentProps<"p">) {
  return <p className={`text-sm text-[#8B92A4] ${className}`} {...props} />;
}

export function CardContent({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`p-6 pt-0 ${className}`} {...props} />;
}

export function CardFooter({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`flex items-center p-6 pt-0 ${className}`} {...props} />;
}
