import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { CircleCheck, CircleX, Info, TriangleAlert } from 'lucide-react';
import { WorkspaceProvider } from '@/components/workspace-provider';
import { MotionProvider } from '@/components/motion-provider';
import './globals.css';
import './shell.css';
import './workspace.css';
import './controls.css';
import './responsive.css';
import './fleet.css';
import './navigation.css';
import 'leaflet/dist/leaflet.css';
import './map.css';
import './bus-directory.css';
import './live.css';
import './admin.css';
import '@/components/gradient-ascii.css';
export const metadata: Metadata = {
  title: { default: 'RGU Fleet Management | HexTorq', template: '%s | RGU Fleet' },
  description:
    'RGU Fleet Management by HexTorq: bus cameras, GPS, fuel telemetry and synchronized journey history for Rathinam Global University, Coimbatore.',
  icons: {
    icon: '/rathinam-logo.svg',
    apple: '/rathinam-logo.svg',
  },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <WorkspaceProvider>
          <MotionProvider>
            {children}
            <Toaster
              position="bottom-right"
              closeButton
              richColors
              icons={{
                success: <CircleCheck size={18} />,
                error: <CircleX size={18} />,
                info: <Info size={18} />,
                warning: <TriangleAlert size={18} />,
              }}
              toastOptions={{ className: 'rgu-toast' }}
            />
          </MotionProvider>
        </WorkspaceProvider>
      </body>
    </html>
  );
}
