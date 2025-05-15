// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from 'next/script';
import "./globals.css";
import CustomNavigation from "./navigation"; // Using the new Navigation
import CustomFooter from "./footer";       // Using the new Footer
// Make sure Flowbite's base styles are included if not handled by the plugin entirely
// Typically, the Tailwind plugin for Flowbite handles this.

const inter = Inter({ subsets: ["latin"] });
const GTM_ID = 'GTM-TRZ2C7L2';

export const metadata: Metadata = {
  title: "Builder Love",
  description: "Fight FUD, with love",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <Script
          id="gtm-base"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${GTM_ID}');
            `
          }}
        />
      </head>
      <body className={`${inter.className} bg-black text-white flex flex-col min-h-screen`}>
        <noscript
          dangerouslySetInnerHTML={{
            __html: `
              <iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_ID}"
              height="0" width="0" style="display:none;visibility:hidden"></iframe>
            `
          }}
        />

        <CustomNavigation> {/* Navigation now wraps the main content to apply margins */}
          <main className="flex-1 p-5 pt-20 md:pt-5 min-h-screen w-full"> {/* Adjusted pt-20 for fixed mobile toggle button */}
            <h1 className="text-4xl font-bold text-red-500 text-center mb-5">
              Builder <span className="text-red-500">♥</span>
            </h1>
            <div className="flex justify-center items-center w-full">
              <div className="w-full max-w-7xl">
                {children}
              </div>
            </div>
          </main>
        </CustomNavigation>
        <CustomFooter />
      </body>
    </html>
  );
}