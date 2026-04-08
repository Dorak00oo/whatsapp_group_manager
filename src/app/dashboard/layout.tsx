import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardMainHeader } from "@/components/dashboard-main-header";
import { DashboardMobileChrome } from "@/components/dashboard-mobile-chrome";
import { DashboardSidebarColumn } from "@/components/dashboard-sidebar-column";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const defaultThemeDark = cookieStore.get("theme")?.value === "dark";

  const user = {
    email: session.user?.email,
    name: session.user?.name,
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="sticky top-0 z-40 border-b border-zinc-200/80 bg-background/95 px-5 py-3 backdrop-blur-md dark:border-zinc-800/90 md:hidden sm:px-6">
        <DashboardMobileChrome
          user={user}
          defaultThemeDark={defaultThemeDark}
        />
      </div>

      <div className="mx-auto flex w-full max-w-[1680px] gap-6 px-5 py-6 sm:px-6 md:gap-10 md:px-8 md:py-8 lg:gap-12 lg:px-12 lg:py-10">
        <aside className="hidden w-fit shrink-0 md:block md:pl-1">
          <DashboardSidebarColumn
            user={user}
            defaultThemeDark={defaultThemeDark}
          />
        </aside>

        <main className="min-w-0 flex-1">
          <DashboardMainHeader />
          {children}
        </main>
      </div>
    </div>
  );
}
