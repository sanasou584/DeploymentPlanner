import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils/class-names";

const FIELD_WRAPPER =
  "flex h-12 w-full items-center gap-3 rounded-full border border-steel bg-basin px-4 transition-all duration-200 focus-within:ring-2 focus-within:ring-ice/30";

const FIELD_INPUT =
  "w-full border-none bg-transparent p-0 text-sm text-foam placeholder-mist/60 outline-none focus:ring-0";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  icon: ReactNode;
  trailing?: ReactNode;
  error?: string | null;
  invalid?: boolean;
  labelAside?: ReactNode;
  labelClass?: string;
  below?: ReactNode;
}

export function TextField({
  id,
  label,
  icon,
  trailing,
  error,
  invalid,
  labelAside,
  labelClass = "mb-2",
  below,
  disabled,
  className,
  ...rest
}: TextFieldProps) {
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div>
      <div className={cn("flex items-center justify-between", labelClass)}>
        <label
          className="block text-xs font-semibold uppercase tracking-wider text-mist"
          htmlFor={id}
        >
          {label}
        </label>
        {labelAside ? (
          <span aria-hidden="true" className="text-[10px] text-mist/70">
            {labelAside}
          </span>
        ) : null}
      </div>
      <div
        data-disabled={Boolean(disabled) || undefined}
        data-invalid={Boolean(error || invalid) || undefined}
        className={cn(
          FIELD_WRAPPER,
          "focus-within:border-ice",
          (error || invalid) && "border-crimson/70 focus-within:border-crimson",
          disabled && "opacity-60",
        )}
      >
        {icon}
        <input
          id={id}
          name={id}
          disabled={disabled}
          aria-invalid={Boolean(error || invalid) || undefined}
          aria-describedby={errorId}
          className={cn(FIELD_INPUT, className)}
          {...rest}
        />
        {trailing}
      </div>
      {below}
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="mt-2 flex items-center gap-1.5 text-xs font-medium text-crimson"
        >
          <span aria-hidden="true" className="material-symbols-outlined select-none text-[14px]">
            error
          </span>
          {error}
        </p>
      ) : null}
    </div>
  );
}
