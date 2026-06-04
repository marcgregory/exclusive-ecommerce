import type { ReactNode } from "react";

type ButtonProps = {
  children: ReactNode;
  variant?: "primary" | "ghost";
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  className?: string;
  disabled?: boolean;
};

export function Button({
  children,
  variant = "primary",
  onClick,
  type = "button",
  className = "",
  disabled = false
}: ButtonProps) {
  return <button type={type} className={`button button--${variant} ${className}`} onClick={onClick} disabled={disabled}>{children}</button>;
}
