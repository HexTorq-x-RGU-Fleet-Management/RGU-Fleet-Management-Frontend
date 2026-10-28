'use client';
import { useEffect, useRef } from 'react';

type GoogleCredential = { credential: string };
type GoogleButtonProps = { onCredential: (credential: string) => void; text?: 'signin_with' | 'signup_with' };

let googleScript: Promise<void> | null = null;
let initializedClientId = '';
let activeCredentialHandler: ((credential: string) => void) | null = null;
function loadGoogleScript() {
  if (googleScript) return googleScript;
  googleScript = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-identity]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Could not load Google sign-in.')), { once: true });
      if ((window as any).google?.accounts?.id) resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Google sign-in.'));
    document.head.appendChild(script);
  });
  return googleScript;
}

export function GoogleAuthButton({ onCredential, text = 'signin_with' }: GoogleButtonProps) {
  const target = useRef<HTMLDivElement>(null);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  useEffect(() => {
    if (!clientId || !target.current) return;
    let active = true;
    activeCredentialHandler = (credential) => {
      if (active) onCredential(credential);
    };
    void loadGoogleScript()
      .then(() => {
        if (!active || !target.current || !(window as any).google?.accounts?.id) return;
        const google = (window as any).google;
        if (initializedClientId !== clientId) {
          google.accounts.id.initialize({
            client_id: clientId,
            callback: (response: GoogleCredential) => {
              if (response?.credential) activeCredentialHandler?.(response.credential);
            },
          });
          initializedClientId = clientId;
        }
        target.current.replaceChildren();
        google.accounts.id.renderButton(target.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text,
          shape: 'rectangular',
        });
      })
      .catch(() => undefined);
    return () => {
      active = false;
      activeCredentialHandler = null;
    };
  }, [clientId, text]);
  if (!clientId) return null;
  return <div ref={target} className="google-auth-button" aria-label="Google sign-in" />;
}
