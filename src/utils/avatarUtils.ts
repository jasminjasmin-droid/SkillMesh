export function generateInitialsAvatar(name: string): string {
  const cleanName = (name || 'Peer').trim();
  const initials = cleanName
    .split(/\s+/)
    .map(part => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'P';

  // Deterministic pleasant gradient colors based on name string
  let hash = 0;
  for (let i = 0; i < cleanName.length; i++) {
    hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hues = [220, 260, 280, 190, 160, 330, 25, 200];
  const hue1 = hues[Math.abs(hash) % hues.length];
  const hue2 = (hue1 + 35) % 360;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="100%" height="100%">
    <defs>
      <linearGradient id="grad-${Math.abs(hash)}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="hsl(${hue1}, 70%, 45%)" />
        <stop offset="100%" stop-color="hsl(${hue2}, 75%, 35%)" />
      </linearGradient>
    </defs>
    <rect width="128" height="128" rx="28" fill="url(#grad-${Math.abs(hash)})" />
    <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="44" font-weight="700" letter-spacing="1">
      ${initials}
    </text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
