import path from 'node:path';
import process from 'node:process';
import { _electron as electron } from 'playwright';
import { test, expect } from '@playwright/test';

process.env.NODE_ENV = 'test';

const appPath = path.resolve(import.meta.dirname, '..');

test('Youtube Desktop App - With default settings, app is launched and visible', async () => {
  test.setTimeout(60_000);
  process.stdout.write('Launching app...\n');
  const app = await electron.launch({
    cwd: appPath,
    args: [
      appPath,
      '--no-sandbox',
      '--disable-gpu',
      '--whitelisted-ips=',
      '--disable-dev-shm-usage',
    ],
  });

  process.stdout.write('App launched\n');
  const window = await app.firstWindow();
  process.stdout.write('First window found\n');
  const url = window.url();
  process.stdout.write(`Window URL: ${url}\n`);

  const consentForm = await window.$(
    "form[action='https://consent.\u0079\u006f\u0075\u0074\u0075\u0062\u0065.com/save']",
  );
  process.stdout.write(`Consent form found: ${!!consentForm}\n`);
  if (consentForm) {
    await consentForm.click('button');
    process.stdout.write('Clicked consent button\n');
  }

  // const title = await window.title();
  // expect(title.replaceAll(/\s/g, ' ')).toEqual('Youtube Desktop');

  const currentUrl = window.url();
  process.stdout.write(`Current URL: ${currentUrl}\n`);
  expect(currentUrl.startsWith('https://www.youtube.com')).toBe(true);

  await app.close();
});
