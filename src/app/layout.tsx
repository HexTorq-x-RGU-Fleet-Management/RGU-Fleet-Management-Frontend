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
export const metadata: Metadata = {
  title: { default: 'RGU Fleet | Campus in view', template: '%s | RGU Fleet' },
  description:
    'A considered camera workspace for campus transport. Monitor recorders, organize views and manage your team.',
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
