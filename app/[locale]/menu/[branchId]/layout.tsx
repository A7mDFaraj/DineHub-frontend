import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
export const metadata: Metadata = {
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};
export default async function BranchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ar = (await getLocale()) === "ar";
  return (
    <main
      className="min-h-screen antialiased"
      dir={ar ? "rtl" : "ltr"}
      style={{
        fontFamily: ar
          ? "var(--font-thmanyah), var(--font-arabic), sans-serif"
          : "var(--font-outfit), sans-serif",
      }}
    >
      {children}
    </main>
  );
}
