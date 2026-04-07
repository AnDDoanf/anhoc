export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-sol-bg">
      {/* No Sidebar, No Settingbar, just the login form */}
      <main className="w-full h-full flex items-center justify-center">
        {children}
      </main>
    </div>
  );
}