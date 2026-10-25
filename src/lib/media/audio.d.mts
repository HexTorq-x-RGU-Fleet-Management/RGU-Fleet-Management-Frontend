export class CameraAudio {
  constructor(options?: {
    onChange?: (enabled: boolean) => void;
    onError?: (message: string) => void;
  });
  start(options?: {
    external?: boolean;
    monitor?: boolean;
    record?: boolean;
    bufferDelay?: number;
  }): Promise<void>;
  play(packet: any): void;
  stop(): void;
  setVolume(value: number): void;
  enabled: boolean;
  recordDestination?: MediaStreamAudioDestinationNode;
}
