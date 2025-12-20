export class VolumeFader {
    constructor(private element: HTMLMediaElement | AudioNode, _options?: any) { }

    fadeTo(volume: number) {
        // Mock implementation
        if (this.element && (this.element as any).volume !== undefined) {
            (this.element as any).volume = volume;
        }
    }

    fadeOut(callback: () => void) {
        // Mock implementation
        this.fadeTo(0);
        callback();
    }
}
