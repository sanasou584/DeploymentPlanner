import type { Metadata } from "next";
import { LoginPage as LoginPageView } from "@/components/auth/login-page";

export const metadata: Metadata = {
  title: "Log in",
};

export default function LoginPage() {
  return <LoginPageView />;
}
