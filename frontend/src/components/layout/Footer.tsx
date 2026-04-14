"use client";

import { useTranslations } from "next-intl";

export default function Footer() {
  const t = useTranslations("Common");

  return (
    <footer className="w-full py-6 border-t border-sol-border/20 bg-sol-bg mt-auto">
      <div className="max-w-[440px] mx-auto px-4 flex justify-between items-center text-sm text-sol-muted">
        <p>{t("footerCopyright")}</p>
      </div>
    </footer>
  );
}
