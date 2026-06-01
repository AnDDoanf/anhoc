import MainLayoutShell from "@/components/layout/MainLayoutShell";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return <MainLayoutShell>{children}</MainLayoutShell>;
}
