import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/utils/class-names";

const BUTTON_BASE =
  "inline-flex cursor-pointer items-center justify-center rounded-full transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ice/40";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-ice font-bold text-navy shadow-lg shadow-ice/20 hover:bg-ice-bright",
  champagne: "border border-champagne font-medium text-champagne hover:bg-champagne/10",
  teal: "border border-teal bg-transparent font-medium text-foam hover:bg-teal/10",
};

export type ButtonVariant = "primary" | "champagne" | "teal";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function buttonClass(variant: ButtonVariant = "primary", className?: string): string {
  return cn(BUTTON_BASE, BUTTON_VARIANTS[variant], className);
}

export function Button({ variant = "primary", className, type = "button", ...rest }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, className)} {...rest} />;
}
