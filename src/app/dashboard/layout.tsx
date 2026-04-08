import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardNav } from "@/components/dashboard-nav";
import { SignOutButton } from "@/components/sign-out-button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Panel
          </h1>
          <p className="text-sm text-zinc-500">
            {session.user?.email}
            {session.user?.name ? ` · ${session.user.name}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SignOutButton />
        </div>
      </header>

      <DashboardNav />

      {children}
    </div>
  );
}
