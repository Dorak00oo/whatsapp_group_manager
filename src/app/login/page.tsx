import Link from "next/link";
import { CenteredScreen } from "@/components/centered-screen";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <CenteredScreen className="gap-6">
      <LoginForm />
      <Link
        href="/"
        className="text-sm text-zinc-500 underline-offset-4 hover:text-zinc-700 hover:underline dark:hover:text-zinc-300"
      >
        Volver al inicio
      </Link>
    </CenteredScreen>
  );
}
