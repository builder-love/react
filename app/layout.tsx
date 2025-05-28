// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from 'next/script';
import "./globals.css";
import CustomNavigation from "./navigation";
import CustomFooter from "./footer";

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

        <CustomNavigation>
          {/* MODIFIED: Removed p-5 from main, keeping only top padding */}
          <main className="flex-1 pt-20 md:pt-5 min-h-screen w-full">
            <h1 className="text-4xl font-bold text-red-500 text-center mb-5 px-4"> {/* Added px-4 to title for some padding */}
              Builder <span className="text-red-500">♥</span>
            </h1>
            <div className="flex justify-center items-center w-full">
              <div className="w-full max-w-7xl">
                {children} {/* ProjectDetailPage will use its own p-4 / md:p-8 */}
              </div>
            </div>
          </main>
        </CustomNavigation>
        <CustomFooter />
      </body>
    </html>
  );
}