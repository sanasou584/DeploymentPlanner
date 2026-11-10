import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardTopNav } from "@/components/dashboard/top-nav";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export function ProjectsPage() {
  return (
    <div className="bg-surface-low font-display text-body-md text-haze antialiased">
      <DashboardSidebar />
      <div className="pl-[260px]">
        <DashboardTopNav />
        <main className="min-h-screen w-full bg-surface-low pt-[72px]">
          <DashboardView />
        </main>
      </div>
    </div>
  );
}
