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
      <DashboardMobileChrome defaultThemeDark={defaultThemeDark} />

      <div className="relative mx-auto flex w-full max-w-[1680px] gap-6 py-6 pl-[max(1.25rem,env(safe-area-inset-left,0px))] pr-[max(1.25rem,env(safe-area-inset-right,0px))] max-md:pt-[calc(3.625rem+max(0.5rem,env(safe-area-inset-top,0px))+0.75rem)] pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] sm:pl-[max(1.5rem,env(safe-area-inset-left,0px))] sm:pr-[max(1.5rem,env(safe-area-inset-right,0px))] md:gap-10 md:py-8 md:pb-[max(2rem,env(safe-area-inset-bottom,0px))] md:pl-[max(2rem,env(safe-area-inset-left,0px))] md:pr-[max(2rem,env(safe-area-inset-right,0px))] md:pt-8 lg:gap-12 lg:py-10 lg:pb-[max(2.5rem,env(safe-area-inset-bottom,0px))] lg:pl-[max(3rem,env(safe-area-inset-left,0px))] lg:pr-[max(3rem,env(safe-area-inset-right,0px))]">
        {/* Ancho fijo para que el main no solape la columna fija (md+). */}
        <div
          className="hidden w-[7rem] shrink-0 md:block"
          aria-hidden
        />
        <aside
          className="fixed z-30 hidden w-[7rem] rounded-[1.25rem] bg-zinc-100 shadow-sm ring-1 ring-zinc-900/[0.06] md:block md:top-[max(2rem,env(safe-area-inset-top,0px))] md:left-[max(2rem,env(safe-area-inset-left,0px),calc((100vw-min(1680px,100vw))/2+2rem))] lg:top-[max(2.5rem,env(safe-area-inset-top,0px))] lg:left-[max(3rem,env(safe-area-inset-left,0px),calc((100vw-min(1680px,100vw))/2+3rem))] dark:bg-zinc-950 dark:shadow-none dark:ring-zinc-800/80"
        >
          {/* Sin scrollbar-gutter:stable: reserva espacio solo a la derecha y desalinea el contenido. */}
          <div className="max-h-[calc(100dvh-2rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))] overflow-y-auto overscroll-contain rounded-[1.25rem]">
            <DashboardSidebarColumn
              user={user}
              defaultThemeDark={defaultThemeDark}
            />
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <DashboardMainHeader />
          {children}
        </main>
      </div>
    </div>
  );
}
