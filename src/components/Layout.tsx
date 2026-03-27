import { ReactNode } from "react";
import { AppSidebar } from "@/components/AppSidebar";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen w-full">
      <AppSidebar />
      <main className="flex-1 overflow-auto p-6 lg:p-6 pt-16 lg:pt-6">
        {children}
      </main>
    </div>
  );
}
