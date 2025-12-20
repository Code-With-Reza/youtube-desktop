import is from 'electron-is';
import { createPlugin } from '@/utils';

import { sortSegments } from './segments';

import { t } from '@/i18n';

// import type { YoutubePlayer } from '@/types/youtube-player';
// import registerCallback, { type VideoInfo, VideoInfoEvent } from '@/providers/video-info';

import { colors } from './colors';
import type { GetPlayerResponse } from '@/types/get-player-response';
import type { SponsorBlockPluginConfig, SkipSegment } from './types';


export interface SegmentWithCategory {
  segment: [number, number]; // Start and end times
  category: string; // Category associated with the segment
}
let currentSegments: SegmentWithCategory[] = [];

export default createPlugin({
  name: () => t('plugins.sponsorblock.name'),
  description: () => t('plugins.sponsorblock.description'),
  restartNeeded: true,
  config: {
    enabled: false,
    apiURL: 'https://sponsor.ajay.app',
    categories: [
      'sponsor',
      'intro',
      'outro',
      'interaction',
      'selfpromo',
      'music_offtopic',
    ],
  } as SponsorBlockPluginConfig,
  async backend({ getConfig, ipc }) {
    // webFrame.insertCSS(sponsorBlockCss)
    const fetchSegments = async (
      apiURL: string,
      categories: string[],
      videoId: string
    ) => {
      const sponsorBlockURL = `${apiURL} /api/skipSegments ? videoID = ${videoId}& categories=${JSON.stringify(categories)} `;
      try {
        const resp = await fetch(sponsorBlockURL, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          redirect: 'follow',
        });
        if (resp.status !== 200) {
          return [];
        }

        const segments = (await resp.json()) as SkipSegment[];

        // Log raw data for debugging
        console.log(segments);

        // Map to an array of objects with both segment and category
        return sortSegments(
          segments.map((submission) => ({
            segment: submission.segment, // [start, end]
            category: submission.category, // e.g., 'sponsor', 'intro', etc.
          }))
        );
      } catch (error) {
        if (is.dev()) {
          console.log('Error on SponsorBlock request:', error);
        }

        return [];
      }
    };

    const config = await getConfig();

    const { apiURL, categories } = config;

    ipc.on('ytd:video-src-changed', async (data: GetPlayerResponse) => {
      const segments = await fetchSegments(
        apiURL,
        categories,
        data?.videoDetails?.videoId,
      );
      ipc.send('sponsorblock-skip', segments);
    });
  },
  renderer: {
    timeUpdateListener: (e: Event) => {
      if (e.target instanceof HTMLVideoElement) {
        const target = e.target;

        for (const { segment } of currentSegments) {
          const [start, end] = segment;
          if (target.currentTime >= start && target.currentTime < end) {
            target.currentTime = end;
            if (window.electronIs.dev()) {
              console.log('SponsorBlock: skipping segment', segment);
            }
          }
        }
      }
    },
    resetSegments: () => {
      currentSegments = [];
      (this as any).updateProgressBar();
    },
    start: function ({ ipc }) {
      ipc.on('sponsorblock-skip', (segments: SegmentWithCategory[]) => {
        currentSegments = segments;
        (this as any).updateProgressBar();
      });
    },
    onPlayerApiReady: function () {
      const video = document.querySelector<HTMLVideoElement>('video');
      if (!video) return;

      video.addEventListener('timeupdate', this.timeUpdateListener);
      video.addEventListener('emptied', this.resetSegments);

      (this as any).addProgressBar();
    },
    stop: function () {
      const video = document.querySelector<HTMLVideoElement>('video');
      if (!video) return;

      video.removeEventListener('timeupdate', this.timeUpdateListener);
      video.removeEventListener('emptied', this.resetSegments);

      (this as any).removeProgressBar();
    },
    addProgressBar: function () {
      const progressContainer = document.querySelector('.ytp-progress-bar-container');
      if (!progressContainer) return;

      const sponsorBar = document.createElement('div');
      sponsorBar.id = 'sponsor-bar';
      sponsorBar.style.position = 'absolute';
      sponsorBar.style.top = '0';
      sponsorBar.style.height = '4px';
      sponsorBar.style.width = '100%';
      sponsorBar.style.pointerEvents = 'none';
      sponsorBar.style.display = 'flex';
      sponsorBar.style.zIndex = '10';

      progressContainer.appendChild(sponsorBar);
      (this as any).updateProgressBar();
    },
    updateProgressBar: function () {
      const sponsorBar = document.getElementById('sponsor-bar');
      if (!sponsorBar || !currentSegments.length) return;

      sponsorBar.innerHTML = ''; // Clear previous segments

      const video = document.querySelector<HTMLVideoElement>('video');
      if (!video) return;

      const duration = video.duration;

      currentSegments.forEach(({ segment, category }) => {
        const [start, end] = segment;

        const segmentDiv = document.createElement('div');
        segmentDiv.style.flexGrow = '0';
        segmentDiv.style.flexShrink = '0';
        segmentDiv.style.position = 'absolute';
        segmentDiv.style.left = (this as any).timeToPercentage(start, duration);
        segmentDiv.style.width = (this as any).timeToPercentage(end - start, duration);
        segmentDiv.style.height = '100%';

        // Assign color based on the category
        segmentDiv.style.backgroundColor = (this as any).getCategoryColor(category);

        sponsorBar.appendChild(segmentDiv);
      });
    },
    timeToPercentage(time: number, duration: number): string {
      return `${(time / duration) * 100}% `;
    },

    getCategoryColor(category: string): string {
      return (colors as Record<string, string>)[category] || 'rgba(0, 0, 0, 1)';
    },
    removeProgressBar: function () {
      const sponsorBar = document.getElementById('sponsor-bar');
      if (sponsorBar) {
        sponsorBar.remove();
      }
    },
  }
});
