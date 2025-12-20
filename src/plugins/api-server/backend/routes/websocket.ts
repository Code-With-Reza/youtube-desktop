import { createRoute } from '@hono/zod-openapi';

import { type NodeWebSocket } from '@hono/node-ws';

import registerCallback, {
  type VideoInfo,
  VideoInfoEvent,
} from '@/providers/video-info';

import { API_VERSION } from '../api-version';

import type { WSContext } from 'hono/ws';
import type { Context, Next } from 'hono';
import type { RepeatMode, VolumeState } from '@/types/datahost-get-state';
import type { HonoApp } from '../types';
import type { BackendContext } from '@/types/contexts';
import type { APIServerConfig } from '@/plugins/api-server/config';

enum DataTypes {
  PlayerInfo = 'PLAYER_INFO',
  VideoChanged = 'VIDEO_CHANGED',
  PlayerStateChanged = 'PLAYER_STATE_CHANGED',
  PositionChanged = 'POSITION_CHANGED',
  VolumeChanged = 'VOLUME_CHANGED',
  RepeatChanged = 'REPEAT_CHANGED',
  ShuffleChanged = 'SHUFFLE_CHANGED',
}

type PlayerState = {
  song?: VideoInfo;
  isPlaying: boolean;
  muted: boolean;
  position: number;
  volume: number;
  repeat: RepeatMode;
  shuffle: boolean;
};

export const register = (
  app: HonoApp,
  { ipc }: BackendContext<APIServerConfig>,
  { upgradeWebSocket }: NodeWebSocket,
) => {
  let volumeState: VolumeState | undefined = undefined;
  let repeat: RepeatMode = 'NONE';
  let shuffle = false;
  let lastVideoInfo: VideoInfo | undefined = undefined;

  const sockets = new Set<WSContext<WebSocket>>();

  const send = (type: DataTypes, state: Partial<PlayerState>) => {
    sockets.forEach((socket) =>
      socket.send(JSON.stringify({ type, ...state })),
    );
  };

  const createPlayerState = ({
    videoInfo,
    volumeState,
    repeat,
    shuffle,
  }: {
    videoInfo?: VideoInfo;
    volumeState?: VolumeState;
    repeat: RepeatMode;
    shuffle: boolean;
  }): PlayerState => ({
    song: videoInfo,
    isPlaying: videoInfo ? !videoInfo.isPaused : false,
    muted: volumeState?.isMuted ?? false,
    position: videoInfo?.elapsedSeconds ?? 0,
    volume: volumeState?.state ?? 100,
    repeat,
    shuffle,
  });

  registerCallback((videoInfo: VideoInfo, event: VideoInfoEvent) => {
    if (event === VideoInfoEvent.VideoSrcChanged) {
      send(DataTypes.VideoChanged, { song: videoInfo, position: 0 });
    }

    if (event === VideoInfoEvent.PlayOrPaused) {
      send(DataTypes.PlayerStateChanged, {
        isPlaying: !(videoInfo?.isPaused ?? true),
        position: videoInfo.elapsedSeconds,
      });
    }

    if (event === VideoInfoEvent.TimeChanged) {
      send(DataTypes.PositionChanged, { position: videoInfo.elapsedSeconds });
    }

    lastVideoInfo = { ...videoInfo };
  });

  ipc.on('ytd:volume-changed', (newVolumeState: VolumeState) => {
    volumeState = newVolumeState;
    send(DataTypes.VolumeChanged, {
      volume: volumeState.state,
      muted: volumeState.isMuted,
    });
  });

  ipc.on('ytd:repeat-changed', (mode: RepeatMode) => {
    repeat = mode;
    send(DataTypes.RepeatChanged, { repeat });
  });

  ipc.on('ytd:seeked', (t: number) => {
    send(DataTypes.PositionChanged, { position: t });
  });

  ipc.on('ytd:shuffle-changed', (newShuffle: boolean) => {
    shuffle = newShuffle;
    send(DataTypes.ShuffleChanged, { shuffle });
  });

  app.openapi(
    createRoute({
      method: 'get',
      path: `/api/${API_VERSION}/ws`,
      summary: 'websocket endpoint',
      description: 'WebSocket endpoint for real-time updates',
      responses: {
        101: {
          description: 'Switching Protocols',
        },
      },
    }),
    upgradeWebSocket(() => ({
      onOpen(_, ws) {
        // "Unsafe argument of type `WSContext<WebSocket>` assigned to a parameter of type `WSContext<WebSocket>`. (@typescript-eslint/no-unsafe-argument)" ????? what?
        sockets.add(ws as WSContext<WebSocket>);

        ws.send(
          JSON.stringify({
            type: DataTypes.PlayerInfo,
            ...createPlayerState({
              videoInfo: lastVideoInfo,
              volumeState,
              repeat,
              shuffle,
            }),
          }),
        );
      },

      onClose(_, ws) {
        sockets.delete(ws as WSContext<WebSocket>);
      },
    })) as (ctx: Context, next: Next) => Promise<Response>,
  );
};
