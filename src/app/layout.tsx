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
export const metadata: Metadata = {
  title: { default: 'RGU Fleet Management | HexTorq', template: '%s | RGU Fleet' },
  description:
    'RGU Fleet Management by HexTorq: bus cameras, GPS, fuel telemetry and synchronized journey history for Rathinam Global University, Coimbatore.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
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
