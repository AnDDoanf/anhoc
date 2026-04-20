import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import Settingbar from "@/components/layout/Settingbar";
import ScrollToTop from "@/components/ui/ScrollToTop";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-sol-bg">
      {/* Sidebar is only visible here */}
      <Sidebar />
      
      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* Settingbar stays on top of the main content area */}
        <Settingbar />
        
        <main className="min-w-0 flex-grow p-3 sm:p-4 md:p-8 pb-20">
          {children}
        </main>
        
        <Footer />
        <ScrollToTop />
      </div>
    </div>
  );
}
