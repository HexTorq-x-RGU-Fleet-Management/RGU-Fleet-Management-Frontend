export class SmoothPlayer {
  constructor(canvas: HTMLCanvasElement, paint: () => void, error: () => void);
  push(packet: any): void;
  reset(): void;
}
