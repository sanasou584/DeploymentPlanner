import type { Metadata } from "next";
import { SignupPage } from "@/components/auth/signup-page";

export const metadata: Metadata = {
  title: "Sign up",
};

export default function Signup() {
  return <SignupPage />;
}
