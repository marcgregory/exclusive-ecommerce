import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & {
  children: ReactNode;
  variant?: "primary" | "ghost";
  className?: string;
};

export function Button({
  children,
  variant = "primary",
  type = "button",
  className = "",
  disabled = false,
  ...buttonProps
}: ButtonProps) {
  return <button {...buttonProps} type={type} className={`button button--${variant} ${className}`} disabled={disabled}>{children}</button>;
}
