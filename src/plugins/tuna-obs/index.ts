import { net } from 'electron';

import is from 'electron-is';

import { createPlugin } from '@/utils';
import registerCallback from '@/providers/video-info';
import { t } from '@/i18n';

interface Data {
  album: string | null | undefined;
  album_url: string;
  artists: string[];
  cover: string;
  cover_url: string;
  duration: number;
  progress: number;
  status: string;
  title: string;
  alternativeTitle: string;
  url: string;
  tags: string[];
}

export default createPlugin({
  name: () => t('plugins.tuna-obs.name'),
  description: () => t('plugins.tuna-obs.description'),
  restartNeeded: true,
  config: {
    enabled: false,
  },
  backend: {
    liteMode: false,
    start({ ipc }) {
      const secToMilisec = (t: number) => Math.round(Number(t) * 1e3);

      const post = (data: Data) => {
        const port = 1608;
        const headers = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Allow-Origin': '*',
        };
        const url = `http://127.0.0.1:${port}/`;
        net
          .fetch(url, {
            method: this.liteMode ? 'OPTIONS' : 'POST',
            headers,
            keepalive: true,
            body: this.liteMode ? undefined : JSON.stringify({ data }),
          })
          .then(() => {
            if (this.liteMode) {
              this.liteMode = false;
              console.debug(
                `obs-tuna webserver at port ${port} is now accessible. disable lite mode`,
              );
              post(data);
            }
          })
          .catch((error: { code: number; errno: number }) => {
            if (!this.liteMode) {
              if (is.dev()) {
                console.debug(
                  `Error: '${error.code || error.errno
                  }' - when trying to access obs-tuna webserver at port ${port}. enable lite mode`,
                );
              }
              this.liteMode = true;
            }
          });
      };

      ipc.on('ytd:player-api-loaded', () =>
        ipc.send('ytd:setup-time-changed-listener'),
      );

      registerCallback((videoInfo) => {
        if (!videoInfo.title && !videoInfo.artist) {
          return;
        }

        post({
          duration: secToMilisec(videoInfo.songDuration),
          progress: secToMilisec(videoInfo.elapsedSeconds ?? 0),
          cover: videoInfo.imageSrc ?? '',
          cover_url: videoInfo.imageSrc ?? '',
          album_url: videoInfo.imageSrc ?? '',
          title: videoInfo.title,
          alternativeTitle: videoInfo.alternativeTitle ?? '',
          artists: [videoInfo.artist],
          status: videoInfo.isPaused ? 'stopped' : 'playing',
          album: videoInfo.album,
          url: videoInfo.url ?? '',
          tags: videoInfo.tags ?? [],
        });
      });
    },
  },
});
