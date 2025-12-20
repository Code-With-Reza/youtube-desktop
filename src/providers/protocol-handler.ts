import path from 'node:path';

import { app, type BrowserWindow } from 'electron';

import { getVideoControls } from './video-controls';

export const APP_PROTOCOL =
  '\u0079\u006f\u0075\u0074\u0075\u0062\u0065\u006d\u0075\u0073\u0069\u0063';

let protocolHandler: ((cmd: string, ...args: string[]) => void) | undefined;

export function setupProtocolHandler(win: BrowserWindow) {
  if (process.defaultApp && process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(APP_PROTOCOL, process.execPath, [
      path.resolve(process.argv[1]),
    ]);
  } else {
    app.setAsDefaultProtocolClient(APP_PROTOCOL);
  }

  const videoControls = getVideoControls(win);

  protocolHandler = ((cmd: keyof typeof videoControls, ...args) => {
    if (Object.keys(videoControls).includes(cmd)) {
      // @ts-expect-error: cmd is a key of videoControls
      videoControls[cmd](...args);
    }
  }) as (cmd: string, ...args: string[]) => void;
}

export function handleProtocol(cmd: string, ...args: string[]) {
  protocolHandler?.(cmd, ...args);
}

export function changeProtocolHandler(
  f: (cmd: string, ...args: string[]) => void,
) {
  protocolHandler = f;
}
