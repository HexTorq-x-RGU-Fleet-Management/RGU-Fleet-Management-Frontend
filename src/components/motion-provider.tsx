'use client';
import { useEffect } from 'react';
import { MotionConfig } from 'framer-motion';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useWorkspace } from './workspace-provider';
export function MotionProvider({ children }: { children: React.ReactNode }) {
  const { state } = useWorkspace();
  useEffect(() => {
    if (state.settings.reduceMotion || matchMedia('(prefers-reduced-motion: reduce)').matches)
      return;
    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({
      duration: 0.7,
      smoothWheel: true,
      prevent: (node) =>
        !!node.closest('[role="dialog"], [role="alertdialog"], [data-lenis-prevent]'),
    });
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, [state.settings.reduceMotion]);
  return (
    <MotionConfig reducedMotion={state.settings.reduceMotion ? 'always' : 'user'}>
      {children}
    </MotionConfig>
  );
}
