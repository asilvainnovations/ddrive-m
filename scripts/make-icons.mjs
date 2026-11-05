#!/usr/bin/env node
// Saves a local copy of the DDRiVE-M logo and makes the app icons (PWA, favicon, Apple touch icon).
// Run once with network access: `npm run icons`, then commit public/icons/. Re-run if the logo changes.
// Icons are circular: the logo is cut to a circle on a transparent background, except the maskable
// icon, which needs a full square (the phone applies its own mask), so it gets a white background.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const SOURCE = process.env.LOGO_URL || 'https://appimize.app/assets/apps/user_1097/images/b4e60d94a143_503_1097.png';
const OUT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'public', 'icons');

async function load() {
  if (process.argv[2]) return fs.readFile(process.argv[2]); // a local file instead of the URL
  const res = await fetch(SOURCE);
  if (!res.ok) throw new Error(`downloading the logo: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

const circle = (size) =>
  Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`);

async function round(input, size) {
  const square = await sharp(input).resize(size, size, { fit: 'cover' }).png().toBuffer();
  return sharp(square).composite([{ input: circle(size), blend: 'dest-in' }]).png().toBuffer();
}

const input = await load();
await fs.mkdir(OUT, { recursive: true });
const outputs = {
  'ddrive-m-logo-512.png': await round(input, 512),
  'icon-192.png': await round(input, 192),
  'icon-512.png': await round(input, 512),
  'apple-touch-icon.png': await sharp(input).resize(180, 180, { fit: 'cover' }).flatten({ background: '#ffffff' }).png().toBuffer(),
  'favicon-48.png': await round(input, 48),
  // Maskable: logo at 80% inside a white square, so the phone's mask never cuts into it.
  'icon-maskable-512.png': await sharp({ create: { width: 512, height: 512, channels: 4, background: '#ffffff' } })
    .composite([{ input: await round(input, 410), gravity: 'center' }])
    .png()
    .toBuffer(),
};
for (const [name, buf] of Object.entries(outputs)) {
  await fs.writeFile(path.join(OUT, name), buf);
  console.log(`wrote public/icons/${name}`);
}
