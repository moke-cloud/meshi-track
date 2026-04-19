// public/icon.svg から iOS / Android / Windows 用 PNG を一括生成するスクリプト。
// 実行: node scripts/generate-icons.mjs
//
// 生成物 (すべて public/ 以下):
//   - icon-192.png         (Android ホーム画面 / manifest)
//   - icon-512.png         (Android スプラッシュ / manifest)
//   - icon-512-maskable.png(Android maskable icon、セーフゾーン考慮版)
//   - apple-touch-icon.png (iOS ホーム画面、180x180)
//   - favicon-32.png       (タブアイコン)
//
// sharp は SVG から PNG へラスタライズする際に librsvg を使用し、
// システムフォント (Yu Mincho 等) を読み込む。Windows 環境で実行する前提。

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const PUBLIC = join(ROOT, 'public')

const baseSvg = readFileSync(join(PUBLIC, 'icon.svg'))

// maskable アイコンはセーフゾーン (中央80%) に絵柄を収めるバージョン。
// 背景を拡大し、文字は相対的に小さくなるよう調整。
const maskableSvg = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="50%" r="75%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="70%" stop-color="#121a2e"/>
      <stop offset="100%" stop-color="#070c18"/>
    </radialGradient>
    <linearGradient id="kanji" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fdf2d6"/>
      <stop offset="100%" stop-color="#e5cd94"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <text
    x="256" y="328"
    font-family="'Yu Mincho','YuMincho','Hiragino Mincho ProN','Noto Serif JP','MS Mincho',serif"
    font-weight="600" font-size="240"
    fill="url(#kanji)" text-anchor="middle" letter-spacing="-4">飯</text>
</svg>`)

const variants = [
  { name: 'icon-192.png', size: 192, svg: baseSvg },
  { name: 'icon-512.png', size: 512, svg: baseSvg },
  { name: 'icon-512-maskable.png', size: 512, svg: maskableSvg },
  { name: 'apple-touch-icon.png', size: 180, svg: baseSvg },
  { name: 'favicon-32.png', size: 32, svg: baseSvg },
]

for (const v of variants) {
  const out = join(PUBLIC, v.name)
  await sharp(v.svg, { density: Math.max(300, v.size) })
    .resize(v.size, v.size, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toFile(out)
  const { size } = await sharp(out).metadata()
  console.log(`  ${v.name.padEnd(26)} ${v.size}x${v.size}  (sharp reports size=${size})`)
}

console.log('\n✓ Generated all icons in public/')
