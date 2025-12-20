import { type OpenAPIHono as Hono } from '@hono/zod-openapi';
import { type serve } from '@hono/node-server';

import type { RepeatMode, VolumeState } from '@/types/datahost-get-state';
import type { BackendContext } from '@/types/contexts';
import type { VideoInfo } from '@/providers/video-info';
import type { APIServerConfig } from '../config';

export type HonoApp = Hono;
export type BackendType = {
  app?: HonoApp;
  server?: ReturnType<typeof serve>;
  oldConfig?: APIServerConfig;
  videoInfo?: VideoInfo;
  currentRepeatMode?: RepeatMode;
  volumeState?: VolumeState;
  injectWebSocket?: (server: ReturnType<typeof serve>) => void;

  init: (ctx: BackendContext<APIServerConfig>) => void;
  run: (config: APIServerConfig) => void;
  end: () => void;
};
