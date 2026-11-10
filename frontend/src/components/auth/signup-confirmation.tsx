import Link from "next/link";
import type { AuthAccount } from "@/types/auth";
import {
  SIGNUP_CONFIRMATION,
  SIGNUP_CONFIRMATION_CTA,
  SIGNUP_CONFIRMATION_FIELDS,
} from "@/data/signup-confirmation";
import { buttonClass } from "@/shared/button";
import { MaterialIcon } from "@/shared/material-icon";
import { Pill } from "@/shared/pill";

interface SignupConfirmationProps {
  account: AuthAccount;
}

export function SignupConfirmation({ account }: SignupConfirmationProps) {
  return (
    <div className="w-full max-w-[440px] rounded-[24px] border border-ice/25 bg-panel/60 p-6 shadow-2xl shadow-basin/90 backdrop-blur-xl sm:p-10">
      <div className="relative mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-champagne/12 shadow-gold-glow">
        <MaterialIcon name="shield" className="text-[44px] text-champagne" />
        <span className="absolute inset-0 flex items-center justify-center">
          <MaterialIcon name="schedule" className="text-[18px] text-champagne" />
        </span>
      </div>
      <h2 className="text-center text-[32px] font-bold leading-tight text-foam">
        {SIGNUP_CONFIRMATION.heading}
      </h2>
      <p className="mt-2 text-center text-sm font-normal text-mist">
        {SIGNUP_CONFIRMATION.message}
      </p>
      <p className="mt-1 text-center text-sm font-normal text-mist/70">
        {SIGNUP_CONFIRMATION.mutedNote}
      </p>
      <div className="mt-6 space-y-3 rounded-[16px] bg-basin p-4">
        {SIGNUP_CONFIRMATION_FIELDS.map((field) => (
          <div key={field.id} className="flex items-center justify-between gap-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-mist">
              {field.label}
            </span>
            <span className="truncate text-sm font-medium text-foam">{account[field.id]}</span>
          </div>
        ))}
        <div className="flex items-center justify-end">
          <Pill tone="champagne" icon={<MaterialIcon name="schedule" className="text-[16px]" />}>
            {SIGNUP_CONFIRMATION.badge}
          </Pill>
        </div>
      </div>
      <Link
        href={SIGNUP_CONFIRMATION_CTA.href}
        className={buttonClass("primary", "mt-6 h-12 w-full gap-2 text-sm")}
      >
        {SIGNUP_CONFIRMATION_CTA.label}
      </Link>
      <p className="mt-4 text-center text-xs text-mist">{SIGNUP_CONFIRMATION.helpNote}</p>
    </div>
  );
}
