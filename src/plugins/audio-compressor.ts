import { createPlugin } from '@/utils';
import { t } from '@/i18n';
import { type YoutubePlayer } from '@/types/youtube-player';

const lazySafeTry = (...fns: (() => void)[]) => {
  for (const fn of fns) {
    try {
      fn();
    } catch { }
  }
};

const createCompressorNode = (
  audioContext: AudioContext,
): DynamicsCompressorNode => {
  const compressor = audioContext.createDynamicsCompressor();

  compressor.threshold.value = -50;
  compressor.ratio.value = 12;
  compressor.knee.value = 40;
  compressor.attack.value = 0;
  compressor.release.value = 0.25;

  return compressor;
};

class Storage {
  lastSource: MediaElementAudioSourceNode | null = null;
  lastContext: AudioContext | null = null;
  lastCompressor: DynamicsCompressorNode | null = null;

  connected: WeakMap<MediaElementAudioSourceNode, DynamicsCompressorNode> =
    new WeakMap();

  connectToCompressor = (
    source: MediaElementAudioSourceNode | null = null,
    audioContext: AudioContext | null = null,
    compressor: DynamicsCompressorNode | null = null,
  ): boolean => {
    if (!(source && audioContext && compressor)) return false;

    const current = this.connected.get(source);
    if (current === compressor) return false;

    this.lastSource = source;
    this.lastContext = audioContext;
    this.lastCompressor = compressor;

    if (current) {
      lazySafeTry(
        () => source.disconnect(current),
        () => current.disconnect(audioContext.destination),
      );
    } else {
      lazySafeTry(() => source.disconnect(audioContext.destination));
    }

    try {
      source.connect(compressor);
      compressor.connect(audioContext.destination);
      this.connected.set(source, compressor);
      return true;
    } catch (error) {
      console.error('connectToCompressor failed', error);
      return false;
    }
  };

  disconnectCompressor = (): boolean => {
    const source = this.lastSource;
    const audioContext = this.lastContext;
    if (!(source && audioContext)) return false;
    const current = this.connected.get(source);
    if (!current) return false;

    lazySafeTry(
      () => source.connect(audioContext.destination),
      () => source.disconnect(current),
      () => current.disconnect(audioContext.destination),
    );
    this.connected.delete(source);
    return true;
  };
}

const storage = new Storage();

const audioCanPlayHandler = ({
  detail: { audioSource, audioContext },
}: CustomEvent<Compressor>) => {
  storage.connectToCompressor(
    audioSource,
    audioContext,
    createCompressorNode(audioContext),
  );
};

const ensureAudioContextLoad = (playerApi: YoutubePlayer) => {
  if (playerApi.getPlayerState() !== 1 || storage.lastContext) return;

  playerApi.loadVideoById(
    playerApi.getPlayerResponse().videoDetails.videoId,
    playerApi.getCurrentTime(),
    playerApi.getUserPlaybackQualityPreference(),
  );
};

export default createPlugin({
  name: () => t('plugins.audio-compressor.name'),
  description: () => t('plugins.audio-compressor.description'),

  renderer: {
    onPlayerApiReady(playerApi) {
      ensureAudioContextLoad(playerApi);
    },

    start() {
      document.addEventListener('ytd:audio-can-play', audioCanPlayHandler as unknown as EventListener, {
        once: true,
      });
      // The 'else' block provided in the instruction was syntactically incorrect
      // without an 'if'. Assuming it was meant to be part of a larger conditional
      // or a replacement for the previous storage.connectToCompressor call.
      // For now, I'm adding setupEql() directly as it was in the user's provided snippet,
      // but this might need further context if it was part of an if/else.

    },

    stop: () => {
      const video = document.querySelector('video');

      if (video) {
        // Clean up the event listener
        document.removeEventListener('ytd:audio-can-play', audioCanPlayHandler as unknown as EventListener);
        storage.disconnectCompressor();
      }
    },
  },
});
