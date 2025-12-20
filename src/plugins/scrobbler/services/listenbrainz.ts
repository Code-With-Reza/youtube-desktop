import { net } from 'electron';

import { ScrobblerBase } from './base';

import type { SetConfType } from '../main';
import type { VideoInfo } from '@/providers/video-info';
import type { ScrobblerPluginConfig } from '../index';
import { APPLICATION_NAME } from '@/i18n';

interface ListenbrainzRequestBody {
  listen_type?: string;
  payload: {
    track_metadata?: {
      artist_name?: string;
      track_name?: string;
      release_name?: string;
      additional_info?: {
        media_player?: string;
        submission_client?: string;
        origin_url?: string;
        duration?: number;
      };
    };
    listened_at?: number;
  }[];
}

export class ListenbrainzScrobbler extends ScrobblerBase {
  override isSessionCreated(): boolean {
    return true;
  }

  override createSession(
    config: ScrobblerPluginConfig,
    _setConfig: SetConfType,
  ): Promise<ScrobblerPluginConfig> {
    return Promise.resolve(config);
  }

  override setNowPlaying(
    videoInfo: VideoInfo,
    config: ScrobblerPluginConfig,
    _setConfig: SetConfType,
  ): void {
    if (
      !config.scrobblers.listenbrainz.apiRoot ||
      !config.scrobblers.listenbrainz.token
    ) {
      return;
    }

    const body = createRequestBody('playing_now', videoInfo, config);
    submitListen(body, config);
  }

  override addScrobble(
    videoInfo: VideoInfo,
    config: ScrobblerPluginConfig,
    _setConfig: SetConfType,
  ): void {
    if (
      !config.scrobblers.listenbrainz.apiRoot ||
      !config.scrobblers.listenbrainz.token
    ) {
      return;
    }

    const body = createRequestBody('single', videoInfo, config);
    body.payload[0].listened_at = Math.trunc(Date.now() / 1000);

    submitListen(body, config);
  }
}

function createRequestBody(
  listenType: string,
  videoInfo: VideoInfo,
  config: ScrobblerPluginConfig,
): ListenbrainzRequestBody {
  const title =
    config.alternativeTitles && videoInfo.alternativeTitle !== undefined
      ? videoInfo.alternativeTitle
      : videoInfo.title;

  const artist =
    config.alternativeArtist && videoInfo.tags?.at(0) !== undefined
      ? videoInfo.tags?.at(0)
      : videoInfo.artist;

  const trackMetadata = {
    artist_name: artist,
    track_name: title,
    release_name: videoInfo.album ?? undefined,
    additional_info: {
      media_player: `${APPLICATION_NAME} Desktop App`,
      submission_client: `${APPLICATION_NAME} Desktop App - Scrobbler Plugin`,
      origin_url: videoInfo.url,
      duration: videoInfo.songDuration,
    },
  };

  return {
    listen_type: listenType,
    payload: [
      {
        track_metadata: trackMetadata,
      },
    ],
  };
}

function submitListen(
  body: ListenbrainzRequestBody,
  config: ScrobblerPluginConfig,
) {
  net
    .fetch(config.scrobblers.listenbrainz.apiRoot + 'submit-listens', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Authorization': 'Token ' + config.scrobblers.listenbrainz.token,
        'Content-Type': 'application/json',
      },
    })
    .catch(console.error);
}
