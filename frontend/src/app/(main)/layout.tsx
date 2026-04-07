import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import Settingbar from "@/components/layout/Settingbar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar is only visible here */}
      <Sidebar />
      
      <div className="flex flex-col flex-1 relative">
        {/* Settingbar stays on top of the main content area */}
        <Settingbar />
        
        <main className="flex-grow p-4 md:p-8">
          {children}
        </main>
        
        <Footer />
      </div>
    </div>
  );
}