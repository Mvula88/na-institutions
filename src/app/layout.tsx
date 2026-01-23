import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/components/providers/auth-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "InstituX | Tertiary Institute Software",
  description: "Comprehensive tertiary institute management software. Manage students, courses, fees, and more with ease. Start your free trial today!",
  keywords: ["tertiary institute software", "college management system", "student management", "fee management", "institux"],
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
  openGraph: {
    title: "InstituX | Tertiary Institute Software",
    description: "Comprehensive tertiary institute management software for modern educational institutions.",
    type: "website",
    locale: "en_NA",
    images: ['/institux-logo.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>
          {children}
          <Toaster 
            position="top-right"
            toastOptions={{
              // Default options for all toasts
              duration: 4000,
              style: {
                background: '#fff',
                color: '#1f2937',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                fontSize: '14px',
                fontWeight: '500',
                maxWidth: '420px',
              },
              // Success toast styling
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
                style: {
                  background: '#fff',
                  color: '#047857',
                  border: '1px solid #d1fae5',
                  boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.1), 0 4px 6px -2px rgba(16, 185, 129, 0.05)',
                },
              },
              // Error toast styling
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
                style: {
                  background: '#fff',
                  color: '#dc2626',
                  border: '1px solid #fee2e2',
                  boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.1), 0 4px 6px -2px rgba(239, 68, 68, 0.05)',
                },
              },
              // Loading toast styling
              loading: {
                iconTheme: {
                  primary: '#3b82f6',
                  secondary: '#fff',
                },
                style: {
                  background: '#fff',
                  color: '#1f2937',
                  border: '1px solid #dbeafe',
                },
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
