// ============================================================================
// 3D & Photorealistic Ultra Piece Engine
// 17 Unique Visual Themes (Fantasy, Sci-Fi, Heritage, Cyber, Luxury, Comic, Pixel)
// ============================================================================

export const PIECE_VALUES = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0
};

export const SUPPORTED_STYLES = [
  // 1. Fantasy & Elemental
  'fire-ice',
  'cosmic-galaxy',
  'blood-ruby',
  'ethereal-spirit',
  // 2. Sci-Fi & Cyber
  'cyber-mech',
  'cyber-neon',
  'steampunk',
  'toxic-acid',
  // 3. Heritage & Art
  'korean-pearl',
  'marble',
  'royal-ebony',
  'jade',
  'damascus',
  // 4. Pop & Retro
  'cel-comic',
  'retro-pixel',
  // 5. Classic 3D & Luxury
  'gold-titanium',
  'luxury',
  'metal',
  'wood',
  'crystal'
];

function create3DPiece(type, color, style = 'luxury') {
  const isWhite = color === 'w';
  const idSuffix = `_${style.replace(/[^a-zA-Z0-9]/g, '_')}_${color}_${type}`;

  // Default Palette
  let fills = {
    bodyGradStart: isWhite ? '#ffffff' : '#475569',
    bodyGradMid: isWhite ? '#e2e8f0' : '#1e293b',
    bodyGradEnd: isWhite ? '#94a3b8' : '#090d16',
    specular: isWhite ? '#ffffff' : 'rgba(255,255,255,0.4)',
    accent: isWhite ? '#f59e0b' : '#38bdf8',
    rimStroke: isWhite ? '#64748b' : '#0f172a',
    goldTrim: '#d97706',
    innerGlow: isWhite ? 'rgba(255,255,255,0.9)' : 'rgba(148,163,184,0.3)',
    shadowColor: 'rgba(0,0,0,0.5)',
    isRaytrace: true,
    customOverlay: ''
  };

  // --- 1. Fantasy & Elemental ---
  if (style === 'fire-ice') {
    // White: Glacial Crystal Ice / Black: Magma Volcanic Lava
    if (isWhite) {
      fills = {
        bodyGradStart: '#e0f2fe',
        bodyGradMid: '#38bdf8',
        bodyGradEnd: '#0284c7',
        specular: '#ffffff',
        accent: '#bae6fd',
        rimStroke: '#0369a1',
        goldTrim: '#7dd3fc',
        innerGlow: 'rgba(186,230,253,0.95)',
        shadowColor: 'rgba(2,132,199,0.5)',
        isRaytrace: true,
        customOverlay: `
          <!-- Frost Ice Crystal Facets -->
          <path d="M 17,25 L 22.5,18 L 28,25 L 22.5,32 Z" fill="none" stroke="#ffffff" stroke-width="0.8" opacity="0.85"/>
          <path d="M 22.5,10 L 25,16 L 22.5,18 L 20,16 Z" fill="#ffffff" opacity="0.5"/>
          <circle cx="22.5" cy="22" r="2.5" fill="#e0f2fe" opacity="0.6"/>
        `
      };
    } else {
      fills = {
        bodyGradStart: '#ef4444',
        bodyGradMid: '#991b1b',
        bodyGradEnd: '#1c0707',
        specular: '#fde047',
        accent: '#f97316',
        rimStroke: '#450a0a',
        goldTrim: '#f59e0b',
        innerGlow: 'rgba(249,115,22,0.95)',
        shadowColor: 'rgba(220,38,38,0.6)',
        isRaytrace: true,
        customOverlay: `
          <!-- Molten Lava Magma Cracks -->
          <path d="M 18,34 Q 21,26 19,20 Q 24,24 27,33" fill="none" stroke="#fbbf24" stroke-width="1.2" stroke-linecap="round"/>
          <path d="M 20,17 Q 23,12 25,16" fill="none" stroke="#f97316" stroke-width="1.2" stroke-linecap="round"/>
          <circle cx="22.5" cy="24" r="1.8" fill="#fde047" opacity="0.9"/>
        `
      };
    }
  } else if (style === 'cosmic-galaxy') {
    // Deep Space Nebula & Starlight
    fills = {
      bodyGradStart: isWhite ? '#c084fc' : '#38bdf8',
      bodyGradMid: isWhite ? '#6b21a8' : '#1e1b4b',
      bodyGradEnd: isWhite ? '#1e1b4b' : '#020617',
      specular: '#ffffff',
      accent: isWhite ? '#f472b6' : '#a855f7',
      rimStroke: isWhite ? '#581c87' : '#0f172a',
      goldTrim: isWhite ? '#e879f9' : '#818cf8',
      innerGlow: isWhite ? 'rgba(232,121,249,0.9)' : 'rgba(129,140,248,0.9)',
      shadowColor: isWhite ? 'rgba(168,85,247,0.5)' : 'rgba(56,189,248,0.5)',
      isRaytrace: true,
      customOverlay: `
        <!-- Cosmic Stars & Nebula Particles -->
        <circle cx="18" cy="22" r="0.8" fill="#ffffff"/>
        <circle cx="27" cy="26" r="0.6" fill="#ffffff" opacity="0.8"/>
        <circle cx="22.5" cy="14" r="1" fill="#fef08a"/>
        <circle cx="24" cy="30" r="0.7" fill="#ffffff" opacity="0.9"/>
        <path d="M 16,18 Q 22,24 29,20" fill="none" stroke="${isWhite ? '#f472b6' : '#38bdf8'}" stroke-width="0.7" opacity="0.75"/>
      `
    };
  } else if (style === 'blood-ruby') {
    // Blood Ruby Red vs Brilliant Diamond Crystal
    if (isWhite) {
      fills = {
        bodyGradStart: '#ffffff',
        bodyGradMid: '#e2e8f0',
        bodyGradEnd: '#94a3b8',
        specular: '#ffffff',
        accent: '#38bdf8',
        rimStroke: '#64748b',
        goldTrim: '#bae6fd',
        innerGlow: 'rgba(255,255,255,0.98)',
        shadowColor: 'rgba(0,0,0,0.4)',
        isRaytrace: true,
        customOverlay: `
          <!-- Brilliant Diamond Cut Facets -->
          <polygon points="22.5,8 29,18 22.5,28 16,18" fill="none" stroke="#ffffff" stroke-width="0.9" opacity="0.8"/>
          <line x1="16" y1="18" x2="29" y2="18" stroke="#ffffff" stroke-width="0.7" opacity="0.9"/>
          <line x1="22.5" y1="8" x2="22.5" y2="28" stroke="#38bdf8" stroke-width="0.8" opacity="0.7"/>
        `
      };
    } else {
      fills = {
        bodyGradStart: '#fda4af',
        bodyGradMid: '#e11d48',
        bodyGradEnd: '#4c0519',
        specular: '#ffffff',
        accent: '#fb7185',
        rimStroke: '#881337',
        goldTrim: '#f43f5e',
        innerGlow: 'rgba(244,63,94,0.95)',
        shadowColor: 'rgba(225,29,72,0.6)',
        isRaytrace: true,
        customOverlay: `
          <!-- Ruby Gem Facets -->
          <polygon points="22.5,10 28,19 22.5,30 17,19" fill="none" stroke="#ffe4e6" stroke-width="0.9" opacity="0.85"/>
          <line x1="17" y1="19" x2="28" y2="19" stroke="#ffe4e6" stroke-width="0.8"/>
        `
      };
    }
  } else if (style === 'ethereal-spirit') {
    // Ethereal Ghost & Phantom Mist
    fills = {
      bodyGradStart: isWhite ? '#ccfbf1' : '#ede9fe',
      bodyGradMid: isWhite ? '#14b8a6' : '#7c3aed',
      bodyGradEnd: isWhite ? '#042f2e' : '#2e1065',
      specular: '#ffffff',
      accent: isWhite ? '#5eead4' : '#c4b5fd',
      rimStroke: isWhite ? '#0f766e' : '#5b21b6',
      goldTrim: isWhite ? '#99f6e4' : '#ddd6fe',
      innerGlow: isWhite ? 'rgba(94,234,212,0.9)' : 'rgba(196,181,253,0.9)',
      shadowColor: isWhite ? 'rgba(20,184,166,0.5)' : 'rgba(124,58,237,0.5)',
      isRaytrace: true,
      customOverlay: `
        <!-- Spirit Aura Waves -->
        <path d="M 16,30 Q 14,20 22.5,12 Q 31,20 29,30" fill="none" stroke="${isWhite ? '#a7f3d0' : '#e9d5ff'}" stroke-width="1.3" opacity="0.7" stroke-dasharray="3,2"/>
        <circle cx="22.5" cy="18" r="3" fill="#ffffff" opacity="0.3"/>
      `
    };
  }

  // --- 2. Sci-Fi & Cyber ---
  else if (style === 'cyber-mech') {
    // Cyberpunk Mech 2077 Armor & Circuits
    fills = {
      bodyGradStart: isWhite ? '#f8fafc' : '#1e293b',
      bodyGradMid: isWhite ? '#64748b' : '#0f172a',
      bodyGradEnd: isWhite ? '#1e293b' : '#020617',
      specular: '#38bdf8',
      accent: isWhite ? '#06b6d4' : '#ef4444',
      rimStroke: '#000000',
      goldTrim: isWhite ? '#0ea5e9' : '#f59e0b',
      innerGlow: isWhite ? 'rgba(14,165,233,0.9)' : 'rgba(239,68,68,0.9)',
      shadowColor: 'rgba(0,0,0,0.7)',
      isRaytrace: true,
      customOverlay: `
        <!-- Circuit Board Lines & Mech Visor HUD -->
        <path d="M 16,28 L 22.5,28 L 26,22 L 29,22" fill="none" stroke="${isWhite ? '#00f0ff' : '#ff003c'}" stroke-width="1.1" stroke-linecap="round"/>
        <circle cx="16" cy="28" r="1.2" fill="${isWhite ? '#00f0ff' : '#ff003c'}"/>
        <circle cx="29" cy="22" r="1.2" fill="${isWhite ? '#00f0ff' : '#ff003c'}"/>
        <rect x="18" y="14" width="9" height="2" rx="0.5" fill="${isWhite ? '#00f0ff' : '#ff003c'}" opacity="0.9"/>
      `
    };
  } else if (style === 'cyber-neon') {
    // Cyber Neon Glow
    fills = {
      bodyGradStart: isWhite ? '#67e8f9' : '#f472b6',
      bodyGradMid: isWhite ? '#0284c7' : '#db2777',
      bodyGradEnd: isWhite ? '#0369a1' : '#831843',
      specular: '#ffffff',
      accent: isWhite ? '#a5f3fc' : '#fbcfe8',
      rimStroke: isWhite ? '#0c4a6e' : '#500724',
      goldTrim: isWhite ? '#38bdf8' : '#f43f5e',
      innerGlow: isWhite ? 'rgba(56,189,248,0.9)' : 'rgba(244,63,94,0.9)',
      shadowColor: isWhite ? 'rgba(2,132,199,0.7)' : 'rgba(219,39,119,0.7)',
      isRaytrace: true
    };
  } else if (style === 'steampunk') {
    // Steampunk Brass & Copper Gears
    fills = {
      bodyGradStart: isWhite ? '#fef08a' : '#b45309',
      bodyGradMid: isWhite ? '#ca8a04' : '#78350f',
      bodyGradEnd: isWhite ? '#713f12' : '#3c1404',
      specular: '#fffbeb',
      accent: isWhite ? '#f97316' : '#fbbf24',
      rimStroke: '#270e04',
      goldTrim: isWhite ? '#fde047' : '#d97706',
      innerGlow: 'rgba(251,191,36,0.85)',
      shadowColor: 'rgba(0,0,0,0.65)',
      isRaytrace: true,
      customOverlay: `
        <!-- Gear / Cogwheel Motifs & Rivets -->
        <circle cx="22.5" cy="24" r="3.5" fill="none" stroke="${isWhite ? '#713f12' : '#fbbf24'}" stroke-width="1.2"/>
        <circle cx="22.5" cy="24" r="1.5" fill="${isWhite ? '#713f12' : '#fbbf24'}"/>
        <circle cx="16" cy="34" r="0.9" fill="#fde047"/>
        <circle cx="29" cy="34" r="0.9" fill="#fde047"/>
        <line x1="22.5" y1="19" x2="22.5" y2="29" stroke="${isWhite ? '#713f12' : '#fbbf24'}" stroke-width="0.8"/>
        <line x1="17.5" y1="24" x2="27.5" y2="24" stroke="${isWhite ? '#713f12' : '#fbbf24'}" stroke-width="0.8"/>
      `
    };
  } else if (style === 'toxic-acid') {
    // Toxic Radioactive Neon Bio
    fills = {
      bodyGradStart: isWhite ? '#bef264' : '#15803d',
      bodyGradMid: isWhite ? '#65a30d' : '#14532d',
      bodyGradEnd: isWhite ? '#365314' : '#052e16',
      specular: '#ffffff',
      accent: '#a3e635',
      rimStroke: '#1a2e05',
      goldTrim: '#84cc16',
      innerGlow: 'rgba(163,230,53,0.95)',
      shadowColor: 'rgba(101,163,13,0.6)',
      isRaytrace: true,
      customOverlay: `
        <!-- Biohazard Radioactive Core Glow -->
        <circle cx="22.5" cy="22" r="2.2" fill="#d9f99d"/>
        <path d="M 19,25 L 26,25 L 22.5,30 Z" fill="#84cc16" opacity="0.8"/>
      `
    };
  }

  // --- 3. Heritage & Art ---
  else if (style === 'korean-pearl') {
    // Korean Traditional Mother-of-Pearl & Black Lacquer (나전칠기)
    if (isWhite) {
      fills = {
        bodyGradStart: '#ffffff',
        bodyGradMid: '#fdf4ff',
        bodyGradEnd: '#e0e7ff',
        specular: '#ffffff',
        accent: '#f43f5e',
        rimStroke: '#6366f1',
        goldTrim: '#fbbf24',
        innerGlow: 'rgba(244,114,182,0.9)',
        shadowColor: 'rgba(99,102,241,0.4)',
        isRaytrace: true,
        customOverlay: `
          <!-- Mother-of-Pearl Iridescent Waves -->
          <path d="M 16,22 Q 22.5,16 29,22 Q 22.5,28 16,22 Z" fill="url(#pearlRainbowGrad${idSuffix})" opacity="0.85"/>
          <circle cx="22.5" cy="22" r="1.5" fill="#ffffff"/>
          <path d="M 18,34 Q 22.5,31 27,34" stroke="#fbbf24" stroke-width="1" fill="none"/>
        `
      };
    } else {
      fills = {
        bodyGradStart: '#27272a',
        bodyGradMid: '#18181b',
        bodyGradEnd: '#09090b',
        specular: '#38bdf8',
        accent: '#fbbf24',
        rimStroke: '#000000',
        goldTrim: '#f59e0b',
        innerGlow: 'rgba(56,189,248,0.8)',
        shadowColor: 'rgba(0,0,0,0.85)',
        isRaytrace: true,
        customOverlay: `
          <!-- Korean Lacquer Inlaid Mother-of-Pearl -->
          <path d="M 16,22 Q 22.5,16 29,22 Q 22.5,28 16,22 Z" fill="url(#pearlRainbowGrad${idSuffix})" opacity="0.95"/>
          <circle cx="22.5" cy="22" r="1.5" fill="#fbbf24"/>
          <path d="M 17,33 Q 22.5,30 28,33" stroke="#fbbf24" stroke-width="1.2" fill="none"/>
        `
      };
    }
  } else if (style === 'marble') {
    fills = {
      bodyGradStart: isWhite ? '#f8fafc' : '#27272a',
      bodyGradMid: isWhite ? '#e2e8f0' : '#18181b',
      bodyGradEnd: isWhite ? '#cbd5e1' : '#09090b',
      specular: '#ffffff',
      accent: isWhite ? '#38bdf8' : '#fbbf24',
      rimStroke: isWhite ? '#94a3b8' : '#000000',
      goldTrim: isWhite ? '#f1f5f9' : '#a1a1aa',
      innerGlow: isWhite ? 'rgba(255,255,255,0.95)' : 'rgba(113,113,122,0.5)',
      shadowColor: 'rgba(0,0,0,0.65)',
      isRaytrace: true
    };
  } else if (style === 'royal-ebony') {
    fills = {
      bodyGradStart: isWhite ? '#ffedd5' : '#451a03',
      bodyGradMid: isWhite ? '#c2410c' : '#1c0a00',
      bodyGradEnd: isWhite ? '#7c2d12' : '#0a0300',
      specular: isWhite ? '#fff7ed' : '#d97706',
      accent: isWhite ? '#ea580c' : '#f59e0b',
      rimStroke: isWhite ? '#9a3412' : '#000000',
      goldTrim: isWhite ? '#fdba74' : '#b45309',
      innerGlow: isWhite ? 'rgba(255,237,213,0.85)' : 'rgba(217,119,6,0.4)',
      shadowColor: 'rgba(0,0,0,0.6)',
      isRaytrace: true
    };
  } else if (style === 'jade') {
    fills = {
      bodyGradStart: isWhite ? '#a7f3d0' : '#1e293b',
      bodyGradMid: isWhite ? '#059669' : '#0f172a',
      bodyGradEnd: isWhite ? '#064e3b' : '#020617',
      specular: '#ffffff',
      accent: isWhite ? '#6ee7b7' : '#38bdf8',
      rimStroke: isWhite ? '#065f46' : '#000000',
      goldTrim: isWhite ? '#34d399' : '#cbd5e1',
      innerGlow: isWhite ? 'rgba(110,231,183,0.85)' : 'rgba(148,163,184,0.4)',
      shadowColor: isWhite ? 'rgba(5,150,105,0.5)' : 'rgba(0,0,0,0.65)',
      isRaytrace: true
    };
  } else if (style === 'damascus') {
    fills = {
      bodyGradStart: isWhite ? '#ffffff' : '#52525b',
      bodyGradMid: isWhite ? '#94a3b8' : '#27272a',
      bodyGradEnd: isWhite ? '#475569' : '#09090b',
      specular: '#ffffff',
      accent: isWhite ? '#38bdf8' : '#e4e4e7',
      rimStroke: isWhite ? '#334155' : '#000000',
      goldTrim: isWhite ? '#cbd5e1' : '#a1a1aa',
      innerGlow: isWhite ? 'rgba(255,255,255,0.9)' : 'rgba(161,161,170,0.5)',
      shadowColor: 'rgba(0,0,0,0.6)',
      isRaytrace: true,
      customOverlay: `
        <!-- Damascus Wave Layers -->
        <path d="M 15,22 Q 22.5,25 30,22 M 16,27 Q 22.5,30 29,27 M 17,17 Q 22.5,14 28,17" fill="none" stroke="${isWhite ? '#94a3b8' : '#71717a'}" stroke-width="0.9" opacity="0.6"/>
      `
    };
  }

  // --- 4. Pop & Retro ---
  else if (style === 'cel-comic') {
    // Pop Art Comic Cel-Shading
    fills = {
      bodyGradStart: isWhite ? '#fef08a' : '#f43f5e',
      bodyGradMid: isWhite ? '#eab308' : '#be123c',
      bodyGradEnd: isWhite ? '#ca8a04' : '#881337',
      specular: '#ffffff',
      accent: isWhite ? '#ef4444' : '#06b6d4',
      rimStroke: '#000000',
      goldTrim: '#000000',
      innerGlow: '#ffffff',
      shadowColor: 'rgba(0,0,0,0.7)',
      isRaytrace: false,
      customOverlay: `
        <!-- Comic Inking & Halftone Ben-Day Dots -->
        <path d="M 18,12 L 20,12" stroke="#000000" stroke-width="2" stroke-linecap="round"/>
        <path d="M 26,22 L 28,24" stroke="#000000" stroke-width="2" stroke-linecap="round"/>
        <circle cx="21" cy="24" r="1" fill="#000000"/>
        <circle cx="24" cy="24" r="1" fill="#000000"/>
        <circle cx="22.5" cy="27" r="1" fill="#000000"/>
      `
    };
  } else if (style === 'retro-pixel') {
    // 8-Bit Pixel Art Retro
    fills = {
      bodyGradStart: isWhite ? '#a3e635' : '#a855f7',
      bodyGradMid: isWhite ? '#65a30d' : '#7e22ce',
      bodyGradEnd: isWhite ? '#3f6212' : '#3b0764',
      specular: '#ffffff',
      accent: isWhite ? '#facc15' : '#ec4899',
      rimStroke: '#000000',
      goldTrim: '#facc15',
      innerGlow: '#ffffff',
      shadowColor: 'rgba(0,0,0,0.7)',
      isRaytrace: false,
      customOverlay: `
        <!-- Pixel Grid Blocks -->
        <rect x="20.5" y="10" width="4" height="4" fill="#ffffff" opacity="0.9"/>
        <rect x="18.5" y="20" width="8" height="3" fill="#000000" opacity="0.5"/>
      `
    };
  }

  // --- 5. Classics ---
  else if (style === 'gold-titanium') {
    fills = {
      bodyGradStart: isWhite ? '#fffbeb' : '#3f3f46',
      bodyGradMid: isWhite ? '#f59e0b' : '#18181b',
      bodyGradEnd: isWhite ? '#78350f' : '#030712',
      specular: '#ffffff',
      accent: isWhite ? '#ef4444' : '#60a5fa',
      rimStroke: isWhite ? '#92400e' : '#000000',
      goldTrim: isWhite ? '#fef08a' : '#d4d4d8',
      innerGlow: isWhite ? 'rgba(254,240,138,0.9)' : 'rgba(212,212,216,0.6)',
      shadowColor: 'rgba(0,0,0,0.65)',
      isRaytrace: true
    };
  } else if (style === 'metal') {
    fills = {
      bodyGradStart: isWhite ? '#fef08a' : '#f1f5f9',
      bodyGradMid: isWhite ? '#eab308' : '#94a3b8',
      bodyGradEnd: isWhite ? '#854d0e' : '#334155',
      specular: '#ffffff',
      accent: isWhite ? '#ef4444' : '#06b6d4',
      rimStroke: isWhite ? '#713f12' : '#1e293b',
      goldTrim: isWhite ? '#fef08a' : '#cbd5e1',
      innerGlow: 'rgba(255,255,255,0.85)',
      shadowColor: 'rgba(0,0,0,0.5)',
      isRaytrace: false
    };
  } else if (style === 'wood') {
    fills = {
      bodyGradStart: isWhite ? '#fed7aa' : '#78350f',
      bodyGradMid: isWhite ? '#d97706' : '#451a03',
      bodyGradEnd: isWhite ? '#92400e' : '#1c0a00',
      specular: isWhite ? '#fffbeb' : '#b45309',
      accent: isWhite ? '#b45309' : '#f59e0b',
      rimStroke: isWhite ? '#7c2d12' : '#000000',
      goldTrim: '#d97706',
      innerGlow: isWhite ? 'rgba(254,215,170,0.6)' : 'rgba(180,83,9,0.3)',
      shadowColor: 'rgba(0,0,0,0.45)',
      isRaytrace: false
    };
  } else if (style === 'crystal') {
    fills = {
      bodyGradStart: isWhite ? '#a5f3fc' : '#fca5a5',
      bodyGradMid: isWhite ? '#06b6d4' : '#e11d48',
      bodyGradEnd: isWhite ? '#0e7490' : '#881337',
      specular: '#ffffff',
      accent: isWhite ? '#67e8f9' : '#fda4af',
      rimStroke: isWhite ? '#164e63' : '#4c0519',
      goldTrim: isWhite ? '#22d3ee' : '#fb7185',
      innerGlow: isWhite ? 'rgba(165,243,252,0.8)' : 'rgba(254,205,211,0.8)',
      shadowColor: isWhite ? 'rgba(6,182,212,0.4)' : 'rgba(225,29,72,0.4)',
      isRaytrace: false
    };
  }

  // Common Gradients Definition
  const defs = `
    <defs>
      <!-- Base 3D Shading -->
      <linearGradient id="bodyGrad${idSuffix}" x1="20%" y1="0%" x2="85%" y2="100%">
        <stop offset="0%" stop-color="${fills.bodyGradStart}" />
        <stop offset="45%" stop-color="${fills.bodyGradMid}" />
        <stop offset="100%" stop-color="${fills.bodyGradEnd}" />
      </linearGradient>

      <!-- Specular Highlight Top Light -->
      <linearGradient id="specularGrad${idSuffix}" x1="0%" y1="0%" x2="100%" y2="80%">
        <stop offset="0%" stop-color="${fills.specular}" stop-opacity="0.98" />
        <stop offset="40%" stop-color="${fills.specular}" stop-opacity="0.35" />
        <stop offset="100%" stop-color="${fills.specular}" stop-opacity="0" />
      </linearGradient>

      <!-- Bottom Rim Pedestal Gradient -->
      <linearGradient id="baseGrad${idSuffix}" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${fills.bodyGradStart}" />
        <stop offset="60%" stop-color="${fills.bodyGradMid}" />
        <stop offset="100%" stop-color="${fills.bodyGradEnd}" />
      </linearGradient>

      <!-- Spherical Highlight for Orbs & Details -->
      <radialGradient id="sphereLight${idSuffix}" cx="35%" cy="30%" r="65%">
        <stop offset="0%" stop-color="${fills.specular}" stop-opacity="0.95" />
        <stop offset="35%" stop-color="${fills.bodyGradStart}" />
        <stop offset="75%" stop-color="${fills.bodyGradMid}" />
        <stop offset="100%" stop-color="${fills.bodyGradEnd}" />
      </radialGradient>

      <!-- Gold/Accent Trim -->
      <linearGradient id="trimGrad${idSuffix}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${fills.goldTrim}" />
        <stop offset="50%" stop-color="#ffffff" stop-opacity="0.9" />
        <stop offset="100%" stop-color="${fills.goldTrim}" />
      </linearGradient>

      <!-- Pearl Iridescent Rainbow Gradient -->
      <linearGradient id="pearlRainbowGrad${idSuffix}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#67e8f9" />
        <stop offset="30%" stop-color="#f472b6" />
        <stop offset="65%" stop-color="#fde047" />
        <stop offset="100%" stop-color="#a7f3d0" />
      </linearGradient>

      <!-- 3D / Raytrace Shadow Filter with Ambient Contact Occlusion -->
      <filter id="piece3dShadow${idSuffix}" x="-30%" y="-30%" width="160%" height="170%">
        <feDropShadow dx="0" dy="4" stdDeviation="2.8" flood-color="${fills.shadowColor}" />
        <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="rgba(0,0,0,0.8)" />
      </filter>
    </defs>
  `;

  // Standard Base Pedestal with Shadow
  const pieceBase = `
    <!-- Ground Shadow -->
    <ellipse cx="22.5" cy="41" rx="15" ry="3.5" fill="${fills.shadowColor}" opacity="0.85" />
    <ellipse cx="22.5" cy="40.5" rx="12" ry="2" fill="rgba(0,0,0,0.9)" />

    <!-- 3D Pedestal Base -->
    <path d="M 9.5,39 C 9.5,37 13,36 22.5,36 C 32,36 35.5,37 35.5,39 L 35.5,41 C 35.5,43 32,44 22.5,44 C 13,44 9.5,43 9.5,41 Z" fill="url(#baseGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="${style === 'cel-comic' ? 1.8 : 0.8}"/>
    <ellipse cx="22.5" cy="39" rx="13" ry="2.2" fill="url(#specularGrad${idSuffix})" opacity="0.7"/>
    <!-- Pedestal Step 2 -->
    <path d="M 12.5,36 C 12.5,34.5 15.5,33.5 22.5,33.5 C 29.5,33.5 32.5,34.5 32.5,36 L 32.5,37.5 C 32.5,39 29.5,40 22.5,40 C 15.5,40 12.5,39 12.5,37.5 Z" fill="url(#bodyGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="${style === 'cel-comic' ? 1.8 : 0.7}"/>
    <ellipse cx="22.5" cy="36" rx="10" ry="1.8" fill="url(#trimGrad${idSuffix})" opacity="0.88"/>
  `;

  let innerGraphic = '';

  switch (type.toLowerCase()) {
    case 'p': // PAWN
      innerGraphic = `
        ${pieceBase}
        <path d="M 15,34.5 C 15,26 19,22 19,18 L 26,18 C 26,22 30,26 30,34.5 Z" fill="url(#bodyGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="${style === 'cel-comic' ? 1.8 : 0.8}"/>
        <path d="M 17.5,34 C 17.5,27 20.5,22 20.5,18.5 L 22.5,18.5 C 22.5,22 20,27 20,34 Z" fill="url(#specularGrad${idSuffix})" opacity="0.8"/>
        <ellipse cx="22.5" cy="18" rx="5.5" ry="1.6" fill="url(#trimGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="${style === 'cel-comic' ? 1.5 : 0.6}"/>
        <ellipse cx="22.5" cy="17.2" rx="4.5" ry="1.2" fill="url(#specularGrad${idSuffix})"/>
        <circle cx="22.5" cy="11.5" r="5.5" fill="url(#sphereLight${idSuffix})" stroke="${fills.rimStroke}" stroke-width="${style === 'cel-comic' ? 1.8 : 0.8}"/>
        <ellipse cx="20.5" cy="9.5" rx="2" ry="1.3" fill="#ffffff" opacity="0.95" transform="rotate(-25 20.5 9.5)"/>
        ${fills.customOverlay || ''}
      `;
      break;

    case 'n': // KNIGHT
      innerGraphic = `
        ${pieceBase}
        <path d="M 14,35 C 13,29 11,24 13.5,19 C 14.5,17 14,14 15,11 C 15.5,9.5 17,9 18,9.5 C 19.5,10 20,8 21.5,8 C 23.5,8 25,10 24,12 C 26,12.5 28.5,15 28,18 C 27.5,20.5 24,22 22,23 C 24,24.5 26,27 28.5,30 C 30.5,32.5 31,34 31,35 Z" 
              fill="url(#bodyGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="${style === 'cel-comic' ? 1.8 : 0.9}" stroke-linejoin="round"/>
        <path d="M 16,11 C 18,12 18.5,15 17,17 M 18.5,14 C 21,15.5 21,19 19,21 M 21,18 C 24,20 23,24 21,26 M 23,24 C 26,26 25,30 23.5,32" 
              stroke="url(#trimGrad${idSuffix})" stroke-width="1.6" stroke-linecap="round" fill="none"/>
        <path d="M 23,13 C 26,15 25.5,17.5 23.5,19 C 21.5,20 20,20.5 19,19 C 18.5,17 20,14.5 23,13 Z" fill="url(#specularGrad${idSuffix})" opacity="0.85"/>
        <circle cx="21" cy="14" r="1.4" fill="${fills.accent}" stroke="${fills.rimStroke}" stroke-width="0.5"/>
        <circle cx="20.6" cy="13.6" r="0.5" fill="#ffffff"/>
        <circle cx="26.5" cy="18" r="0.7" fill="${fills.rimStroke}"/>
        <path d="M 23,27 C 26,30 28,32.5 28.5,34.5" stroke="#ffffff" stroke-width="1" stroke-linecap="round" opacity="0.7"/>
        ${fills.customOverlay || ''}
      `;
      break;

    case 'b': // BISHOP
      innerGraphic = `
        ${pieceBase}
        <path d="M 15,34.5 C 15,28 18,24 18,20 L 27,20 C 27,24 30,28 30,34.5 Z" fill="url(#bodyGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="${style === 'cel-comic' ? 1.8 : 0.8}"/>
        <path d="M 18,34 C 18,27 20,23 20,20.5 L 22.5,20.5 C 22.5,23 21,27 21,34 Z" fill="url(#specularGrad${idSuffix})" opacity="0.75"/>
        <ellipse cx="22.5" cy="20" rx="6" ry="1.7" fill="url(#trimGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="${style === 'cel-comic' ? 1.6 : 0.7}"/>
        <path d="M 16,19 C 14.5,14 17.5,9.5 22.5,8 C 27.5,9.5 30.5,14 29,19 C 27.5,21.5 17.5,21.5 16,19 Z" fill="url(#sphereLight${idSuffix})" stroke="${fills.rimStroke}" stroke-width="${style === 'cel-comic' ? 1.8 : 0.9}"/>
        <path d="M 20.5,11 L 26,16" stroke="${fills.rimStroke}" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M 20.5,11 L 26,16" stroke="url(#trimGrad${idSuffix})" stroke-width="1.2" stroke-linecap="round"/>
        <circle cx="22.5" cy="6.5" r="1.9" fill="url(#trimGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.5"/>
        <circle cx="22.5" cy="6" r="0.7" fill="#ffffff"/>
        ${fills.customOverlay || ''}
      `;
      break;

    case 'r': // ROOK
      innerGraphic = `
        ${pieceBase}
        <path d="M 14.5,34.5 L 16,20 L 29,20 L 30.5,34.5 Z" fill="url(#bodyGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="${style === 'cel-comic' ? 1.8 : 0.8}"/>
        <path d="M 17,34 L 18,20 L 21.5,20 L 20,34 Z" fill="url(#specularGrad${idSuffix})" opacity="0.75"/>
        <ellipse cx="22.5" cy="19.5" rx="7.5" ry="2" fill="url(#trimGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="${style === 'cel-comic' ? 1.6 : 0.7}"/>
        <path d="M 14,19 L 13.5,10.5 L 17,10.5 L 17,13.5 L 20.5,13.5 L 20.5,10.5 L 24.5,10.5 L 24.5,13.5 L 28,13.5 L 28,10.5 L 31.5,10.5 L 31,19 Z" 
              fill="url(#bodyGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="${style === 'cel-comic' ? 1.8 : 0.9}" stroke-linejoin="round"/>
        <path d="M 14.5,18 C 17,19.5 28,19.5 30.5,18" stroke="url(#trimGrad${idSuffix})" stroke-width="1.3" fill="none"/>
        ${fills.customOverlay || ''}
      `;
      break;

    case 'q': // QUEEN
      innerGraphic = `
        ${pieceBase}
        <path d="M 14,34.5 C 14,27 17.5,22 17.5,18 L 27.5,18 C 27.5,22 31,27 31,34.5 Z" fill="url(#bodyGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="${style === 'cel-comic' ? 1.8 : 0.8}"/>
        <path d="M 17,34 C 17,26 19.5,22 20,18.5 L 22.5,18.5 C 22,22 20,26 19.5,34 Z" fill="url(#specularGrad${idSuffix})" opacity="0.8"/>
        <ellipse cx="22.5" cy="18" rx="6.5" ry="1.8" fill="url(#trimGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="${style === 'cel-comic' ? 1.6 : 0.7}"/>
        <path d="M 16.5,18 L 12,11.5 L 17,14.5 L 22.5,9.5 L 28,14.5 L 33,11.5 L 28.5,18 Z" 
              fill="url(#sphereLight${idSuffix})" stroke="${fills.rimStroke}" stroke-width="${style === 'cel-comic' ? 1.8 : 0.9}" stroke-linejoin="round"/>
        <circle cx="12" cy="11" r="1.8" fill="url(#trimGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.5"/>
        <circle cx="17" cy="14" r="1.6" fill="url(#trimGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.5"/>
        <circle cx="22.5" cy="9" r="2.2" fill="url(#trimGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.6"/>
        <circle cx="28" cy="14" r="1.6" fill="url(#trimGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.5"/>
        <circle cx="33" cy="11" r="1.8" fill="url(#trimGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.5"/>
        <circle cx="22.5" cy="9" r="1.2" fill="${fills.accent}"/>
        ${fills.customOverlay || ''}
      `;
      break;

    case 'k': // KING
      innerGraphic = `
        ${pieceBase}
        <path d="M 13.5,34.5 C 13.5,27 16.5,21 16.5,17.5 L 28.5,17.5 C 28.5,21 31.5,27 31.5,34.5 Z" fill="url(#bodyGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="${style === 'cel-comic' ? 1.8 : 0.8}"/>
        <path d="M 16.5,34 C 16.5,26 19,21 19.5,18 L 22.5,18 C 22,21 19.5,26 19,34 Z" fill="url(#specularGrad${idSuffix})" opacity="0.85"/>
        <ellipse cx="22.5" cy="17.5" rx="7.5" ry="2" fill="url(#trimGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="${style === 'cel-comic' ? 1.6 : 0.7}"/>
        <path d="M 15.5,17 C 14.5,12 18,10.5 22.5,10.5 C 27,10.5 30.5,12 29.5,17 Z" fill="url(#sphereLight${idSuffix})" stroke="${fills.rimStroke}" stroke-width="${style === 'cel-comic' ? 1.8 : 0.8}"/>
        <g filter="url(#piece3dShadow${idSuffix})">
          <rect x="21.2" y="3.2" width="2.6" height="7.2" rx="0.6" fill="url(#trimGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.6"/>
          <rect x="19" y="5.2" width="7" height="2.2" rx="0.6" fill="url(#trimGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.6"/>
          <circle cx="22.5" cy="6.3" r="1.0" fill="${fills.accent}"/>
        </g>
        ${fills.customOverlay || ''}
      `;
      break;
  }

  return `
    <svg viewBox="0 0 45 45" class="chess-piece-svg piece-style-${style} ${fills.isRaytrace ? 'piece-raytraced' : ''}" filter="url(#piece3dShadow${idSuffix})">
      ${defs}
      <g class="piece-3d-group">
        ${innerGraphic}
      </g>
    </svg>
  `;
}

export function generatePieceSet(style = 'luxury') {
  const pieces = {};
  const colors = ['w', 'b'];
  const types = ['P', 'N', 'B', 'R', 'Q', 'K'];

  for (const c of colors) {
    for (const t of types) {
      pieces[`${c}${t}`] = create3DPiece(t, c, style);
    }
  }
  return pieces;
}

export let currentPieceStyle = (typeof localStorage !== 'undefined' && localStorage.getItem('chess_piece_style')) || 'fire-ice';

export let PIECE_SVGS = generatePieceSet(currentPieceStyle);

export function getPieceSvg(pieceKey) {
  if (!PIECE_SVGS || Object.keys(PIECE_SVGS).length === 0) {
    PIECE_SVGS = generatePieceSet(currentPieceStyle);
  }
  return PIECE_SVGS[pieceKey] || '';
}

export function setPieceStyle(newStyle) {
  if (SUPPORTED_STYLES.includes(newStyle)) {
    currentPieceStyle = newStyle;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('chess_piece_style', newStyle);
    }
    PIECE_SVGS = generatePieceSet(newStyle);
    return true;
  }
  return false;
}
