const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const iconsDir = path.resolve('public', 'icons');
fs.mkdirSync(iconsDir, { recursive: true });

// 1. Generate SVG Icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f766e" />
      <stop offset="50%" stop-color="#0d9488" />
      <stop offset="100%" stop-color="#042f2e" />
    </linearGradient>
    <linearGradient id="shineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
  </defs>
  
  <!-- Rounded Squircle Base -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)" />
  <rect x="12" y="12" width="488" height="488" rx="100" fill="none" stroke="#2dd4bf" stroke-width="6" stroke-opacity="0.35" />
  
  <!-- Car Silhouette & Bubbles -->
  <g transform="translate(64, 100)">
    <!-- Bubbles -->
    <circle cx="330" cy="30" r="24" fill="url(#shineGrad)" />
    <circle cx="370" cy="75" r="14" fill="#7dd3fc" />
    <circle cx="60" cy="50" r="18" fill="url(#shineGrad)" />
    <path d="M70 20 L76 34 L90 40 L76 46 L70 60 L64 46 L50 40 L64 34 Z" fill="#fef08a" />
    <path d="M350 0 L355 12 L367 17 L355 22 L350 34 L345 22 L333 17 L345 12 Z" fill="#fef08a" />

    <!-- Car Body -->
    <path d="M70 190 L110 110 C120 90 140 75 175 75 L265 75 C300 75 320 90 330 110 L370 190 C390 198 400 215 400 240 L400 290 C400 300 390 310 380 310 L360 310 C350 310 340 300 340 290 L340 275 L100 275 L100 290 C100 300 90 310 80 310 L60 310 C50 310 40 300 40 290 L40 240 C40 215 50 198 70 190 Z" fill="#ffffff" />

    <!-- Windshield -->
    <path d="M125 175 L155 110 C160 100 170 95 185 95 L255 95 C270 95 280 100 285 110 L315 175 Z" fill="#0f766e" />

    <!-- Headlights -->
    <circle cx="90" cy="225" r="18" fill="#fef08a" />
    <circle cx="350" cy="225" r="18" fill="#fef08a" />

    <!-- Wheels -->
    <circle cx="115" cy="285" r="30" fill="#0f172a" />
    <circle cx="115" cy="285" r="15" fill="#94a3b8" />
    <circle cx="325" cy="285" r="30" fill="#0f172a" />
    <circle cx="325" cy="285" r="15" fill="#94a3b8" />
  </g>

  <!-- Typography -->
  <text x="256" y="445" font-family="system-ui, -apple-system, sans-serif" font-size="52" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="3">WE CARE</text>
</svg>`;

fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgContent, 'utf8');
console.log('✓ Created public/icons/icon.svg');

// Helper to create pure PNG file
function createPngBuffer(width, height, r, g, b) {
  // Construct raw RGBA bitmap with teal theme and rounded badge
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.44;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: none
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Create smooth rounded icon
      if (dist <= radius) {
        // Subtle gradient from top-left to bottom-right
        const factor = 1 - (x + y) / (width + height) * 0.4;
        rawData[pxOffset] = Math.min(255, Math.floor(r * factor));     // R
        rawData[pxOffset + 1] = Math.min(255, Math.floor(g * factor)); // G
        rawData[pxOffset + 2] = Math.min(255, Math.floor(b * factor)); // B
        rawData[pxOffset + 3] = 255;                                  // A
      } else if (dist <= radius + 2) {
        // Anti-aliased edge
        const alpha = Math.floor((1 - (dist - radius) / 2) * 255);
        rawData[pxOffset] = r;
        rawData[pxOffset + 1] = g;
        rawData[pxOffset + 2] = b;
        rawData[pxOffset + 3] = Math.max(0, Math.min(255, alpha));
      } else {
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
      }
    }
  }

  const deflated = zlib.deflateSync(rawData, { level: 9 });

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT chunk
  const idatChunk = makeChunk('IDAT', deflated);

  // IEND chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(8 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const crcTarget = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = zlib.crc32(crcTarget);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

// Generate 192x192 and 512x512 icons (Teal #0d9488 -> r:13, g:148, b:136)
const png192 = createPngBuffer(192, 192, 13, 148, 136);
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), png192);
console.log('✓ Created public/icons/icon-192.png');

const png512 = createPngBuffer(512, 512, 13, 148, 136);
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), png512);
console.log('✓ Created public/icons/icon-512.png');
