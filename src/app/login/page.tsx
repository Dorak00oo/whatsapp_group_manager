import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-6 py-16 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] pb-[max(3rem,env(safe-area-inset-bottom,0px))] pt-[max(3rem,env(safe-area-inset-top,0px))] sm:px-4 sm:py-16 sm:pb-16 sm:pl-4 sm:pr-4 sm:pt-16">
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
