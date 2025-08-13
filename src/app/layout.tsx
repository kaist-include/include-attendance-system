import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/hooks/useAuth";
import ThemeProvider from "@/components/ui/theme-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Attendtion by include",
  description: "KAIST Include 동아리 세미나 출석 관리 시스템",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
            (function(){
              try {
                var cookieMatch = document.cookie.match(/(?:^|; )theme=([^;]*)/);
                var cookieTheme = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null; // 'light' | 'dark' | 'system'
                var stored = cookieTheme || localStorage.getItem('theme');
                var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                var shouldDark = stored === 'dark' || (stored !== 'light' && stored !== 'dark' && systemDark);
                // Persist normalized value back if missing
                if (!cookieTheme && stored) {
                  document.cookie = 'theme=' + encodeURIComponent(stored) + '; path=/; max-age=31536000; SameSite=Lax';
                }
                if (shouldDark) document.documentElement.classList.add('dark');
                else document.documentElement.classList.remove('dark');
              } catch (e) {}
            })();
          `,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>
          <ThemeProvider />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
