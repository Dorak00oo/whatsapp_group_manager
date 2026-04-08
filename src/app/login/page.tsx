import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-6 px-4 py-16">
      <LoginForm />
      <Link
        href="/"
        className="text-sm text-zinc-500 underline-offset-4 hover:text-zinc-700 hover:underline dark:hover:text-zinc-300"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
