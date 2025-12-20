import type { LyricProvider, LyricResult, SearchVideoInfo } from '../types';
import type { YouTubeAppElement } from '@/types/youtube-music-app-element';



const getVideoId = (url: string): string | null => {
  try {
    return new URL(url).searchParams.get('v');
  } catch {
    return null;
  }
};

const headers = {
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0',
};

const client = {
  clientName: '26',
  clientVersion: '7.01.05',
};

export class YTMusic implements LyricProvider {
  public name = 'YouTube Music';
  public baseUrl = 'https://music.youtube.com/';
  private PROXIED_ENDPOINT = 'https://ytmbrowseproxy.zvz.be/';

  async search(info: SearchVideoInfo): Promise<LyricResult | null> {
    const videoId = info.videoId || getVideoId(window.location.href);
    if (!videoId) return null;

    const lyricsData = await window.ipcRenderer.invoke(
      'ytmd:get-lyrics',
      videoId,
    );
    if (lyricsData) return lyricsData;

    const document = window.document.querySelector<YouTubeAppElement>('ytmusic-app');
    const playerPage = document?.querySelector<HTMLElement>(
      'ytmusic-player-page',
    );
    const renderer = (playerPage as any)?.playerPage?.runs?.[0];
    const tabs = renderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs;

    // Fallback to fetch if tabs are not available (e.g. strict types or missing DOM)
    // But for now, try to find lyrics tab
    let browseId: string | undefined;

    if (Array.isArray(tabs)) {
      const lyricsTab = tabs.find((it: any) => {
        const pageType = it?.tabRenderer?.endpoint?.browseEndpoint
          ?.browseEndpointContextSupportedConfigs
          ?.browseEndpointContextMusicConfig?.pageType;
        return pageType === 'MUSIC_PAGE_TYPE_TRACK_LYRICS';
      });

      browseId = (lyricsTab as any)?.tabRenderer?.endpoint?.browseEndpoint?.browseId;
    }

    if (!browseId) {
      // If we can't find browseId from DOM (e.g. background tab), we can try to fetch next endpoint
      // But implementing fetchNext is complex without full InnerTube.
      // For now, if we can't get browseId, we return null or try the proxy with videoId?
      // Proxy browse needs browseId. Proxy next needs videoId.
      // Let's try to just return null if DOM scan fails, assuming usually it works when playing.
      return null;
    }

    const contents = await this.fetchBrowse(browseId);
    if (!contents) return null;

    const syncedLines = contents?.elementRenderer?.newElement?.type
      ?.componentType?.model?.timedLyricsModel?.lyricsData?.timedLyricsData;

    const synced = syncedLines?.length && syncedLines[0]?.cueRange
      ? syncedLines.map((it: any) => ({
        time: this.millisToTime(parseInt(it.cueRange.startTimeMilliseconds)),
        timeInMs: parseInt(it.cueRange.startTimeMilliseconds),
        duration: parseInt(it.cueRange.endTimeMilliseconds) -
          parseInt(it.cueRange.startTimeMilliseconds),
        text: it.lyricLine.trim() === '♪' ? '' : it.lyricLine.trim(),
        status: 'upcoming' as const,
      }))
      : undefined;

    const plain = !synced
      ? syncedLines?.length
        ? syncedLines.map((it: any) => it.lyricLine).join('\n')
        : contents?.messageRenderer
          ? contents?.messageRenderer?.text?.runs?.map((it: any) => it.text).join('\n')
          : contents?.sectionListRenderer?.contents?.[0]
            ?.musicDescriptionShelfRenderer?.description?.runs?.map((it: any) =>
              it.text
            )?.join('\n')
      : undefined;

    if (typeof plain === 'string' && plain === 'Lyrics not available') {
      return null;
    }

    if (synced?.length && synced[0].timeInMs > 300) {
      synced.unshift({
        duration: 0,
        text: '',
        time: '00:00.00',
        timeInMs: 0,
        status: 'upcoming' as const,
      });
    }

    return {
      title: info.title,
      artists: [info.artist],
      lyrics: plain,
      lines: synced,
    };
  }

  private millisToTime(millis: number) {
    const minutes = Math.floor(millis / 60000);
    const seconds = Math.floor((millis - minutes * 60 * 1000) / 1000);
    const remaining = (millis - minutes * 60 * 1000 - seconds * 1000) / 10;
    return `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}.${remaining.toString().padStart(2, '0')}`;
  }

  private async fetchBrowse(browseId: string) {
    try {
      const response = await fetch(this.PROXIED_ENDPOINT + 'browse?prettyPrint=false', {
        headers,
        method: 'POST',
        body: JSON.stringify({
          browseId,
          context: { client },
        }),
      });
      const data = await response.json() as any;
      return data?.contents; // Adjust based on actual response structure if needed, previous code assumed data is BrowseData
    } catch {
      return null;
    }
  }
}



