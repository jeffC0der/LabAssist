import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/context/ToastContext';
import { AuthProvider } from '@/context/AuthContext';
import { TicketProvider } from '@/context/TicketContext';
import { RoleProvider } from '@/context/RoleContext';
import { ToastContainer } from '@/components/shared/Toast';

export const metadata: Metadata = {
  title: 'LabAssist — Campus Lab Maintenance Platform',
  description: 'IoT-integrated campus lab hardware-to-software maintenance ticketing platform with ESP32 physical keypad remote integration and real-time IT dispatch queue.',
  keywords: ['lab maintenance', 'IoT', 'ESP32', 'IT ticketing', 'campus', 'hardware'],
  authors: [{ name: 'LabAssist IT Services' }],
  openGraph: {
    title: 'LabAssist — Campus Lab Maintenance Platform',
    description: 'Real-time IT dispatch queue powered by ESP32 IoT hardware integration.',
    type: 'website',
  },
  icons: {
    icon: '/UMakLabAssistLogo.png',
    apple: '/UMakLabAssistLogo.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        {/* Google Identity Services — loaded here with hl=en to enforce English */}
        <script src="https://accounts.google.com/gsi/client?hl=en" async defer />
      </head>
      <body className="bg-base text-text-primary antialiased">
        <ToastProvider>
          <AuthProvider>
            <RoleProvider>
              <TicketProvider>
                {children}
                <ToastContainer />
              </TicketProvider>
            </RoleProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
