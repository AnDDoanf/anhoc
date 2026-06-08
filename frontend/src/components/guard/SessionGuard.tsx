"use client";

import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { logout, setCredentials } from "@/redux/slices/authSlice";
import { setPermissions } from "@/redux/slices/permissionSlice";
import { useTranslations } from "next-intl";
import { ShieldAlert } from "lucide-react";

interface SessionGuardProps {
  children?: React.ReactNode;
}

export default function SessionGuard({ children }: SessionGuardProps) {
  const t = useTranslations("Common");
  const dispatch = useDispatch();
  const router = useRouter();
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const handleRefreshed = (e: Event) => {
      const { token, user } = (e as CustomEvent).detail;
      dispatch(setCredentials({ token, user }));
      dispatch(setPermissions(user.permissions));
    };

    const handleExpired = () => {
      setIsExpired(true);
    };

    window.addEventListener("auth-token-refreshed", handleRefreshed);
    window.addEventListener("auth-session-expired", handleExpired);

    return () => {
      window.removeEventListener("auth-token-refreshed", handleRefreshed);
      window.removeEventListener("auth-session-expired", handleExpired);
    };
  }, [dispatch]);

  const handleRedirect = () => {
    setIsExpired(false);
    dispatch(logout());
    router.replace("/login");
  };

  return (
    <>
      {children}

      {isExpired && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-sol-bg/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="relative w-full max-w-md rounded-[2.5rem] border border-sol-orange/20 bg-sol-surface p-8 text-center shadow-2xl origin-center animate-in zoom-in-95 duration-300">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sol-orange/10 text-sol-orange mb-6">
              <ShieldAlert size={36} className="animate-bounce" />
            </div>

            <h3 className="text-2xl font-black text-sol-text tracking-tight uppercase mb-3">
              {t("sessionExpiredTitle")}
            </h3>

            <p className="text-sm font-semibold text-sol-muted leading-relaxed mb-8">
              {t("sessionExpiredDesc")}
            </p>

            <button
              type="button"
              onClick={handleRedirect}
              className="w-full rounded-2xl bg-sol-orange hover:bg-sol-orange/90 text-sol-bg px-6 py-4 text-center text-sm font-black uppercase tracking-wider transition-all transform hover:scale-[1.01] active:scale-95 shadow-lg shadow-sol-orange/20 hover:cursor-pointer"
            >
              {t("logInAgain")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
