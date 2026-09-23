// ============================================================================
// 3D & Photorealistic Ray-Traced Master Chess Piece Engine
// Hyper-Realistic Vector & PBR Shader Render Sets (60fps Optimized)
// ============================================================================

export const PIECE_VALUES = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0
};

// Common SVG filters and gradients builder for 3D realism & Ray-Tracing
function create3DPiece(type, color, style = 'luxury') {
  const isWhite = color === 'w';
  const idSuffix = `_${style.replace(/[^a-zA-Z0-9]/g, '_')}_${color}_${type}`;

  // Theme palettes
  let fills = {
    // 3D Luxury (Pearl White vs Obsidian Polished Black)
    bodyGradStart: isWhite ? '#ffffff' : '#475569',
    bodyGradMid: isWhite ? '#e2e8f0' : '#1e293b',
    bodyGradEnd: isWhite ? '#94a3b8' : '#090d16',
    specular: isWhite ? '#ffffff' : 'rgba(255,255,255,0.4)',
    accent: isWhite ? '#f59e0b' : '#38bdf8',
    rimStroke: isWhite ? '#64748b' : '#0f172a',
    goldTrim: '#d97706',
    innerGlow: isWhite ? 'rgba(255,255,255,0.9)' : 'rgba(148,163,184,0.3)',
    shadowColor: 'rgba(0,0,0,0.45)',
    isRaytrace: false
  };

  if (style === 'metal') {
    // 3D Gold & Silver Metallic
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
    // 3D Maple & Dark Walnut Handcrafted Wood
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
    // 3D Sapphire & Ruby Cyber Crystal
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
  } else if (style === 'marble') {
    // [Photoreal Raytrace 1] Italian Carrara Marble vs Nero Marquina Polished Black
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
      isRaytrace: true,
      marbleNoise: true
    };
  } else if (style === 'gold-titanium') {
    // [Photoreal Raytrace 2] 24K Hairline Gold vs Black Titanium Chrome
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
  } else if (style === 'royal-ebony') {
    // [Photoreal Raytrace 3] Royal Oak & Burmese Ebony Wood
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
  } else if (style === 'cyber-neon') {
    // [Photoreal Raytrace 4] Cyber Neon Raytrace Hologram
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
  } else if (style === 'jade') {
    // [Photoreal Raytrace 5] Imperial Emerald Jade vs Obsidian Black Jade
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
    // [Photoreal Raytrace 6] Damascus Steel & Brushed Platinum
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
      isRaytrace: true
    };
  }

  // Common Gradients Definition + Photorealistic Raytrace Lighting Filters
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

      <!-- 3D / Raytrace Shadow Filter with Ambient Contact Occlusion -->
      <filter id="piece3dShadow${idSuffix}" x="-30%" y="-30%" width="160%" height="170%">
        <feDropShadow dx="0" dy="4" stdDeviation="2.8" flood-color="${fills.shadowColor}" />
        <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="rgba(0,0,0,0.8)" />
      </filter>

      <!-- Specular Bloom / SSS Glow (For Raytrace styles) -->
      ${fills.isRaytrace ? `
      <radialGradient id="rayGlow${idSuffix}" cx="50%" cy="20%" r="50%">
        <stop offset="0%" stop-color="${fills.specular}" stop-opacity="0.8" />
        <stop offset="100%" stop-color="${fills.bodyGradMid}" stop-opacity="0" />
      </radialGradient>
      ` : ''}
    </defs>
  `;

  // Standard 3D Base Pedestal for all pieces with Contact Shadow
  const pieceBase = `
    <!-- Contact Raytrace Ground Shadow -->
    <ellipse cx="22.5" cy="41" rx="15" ry="3.5" fill="${fills.shadowColor}" opacity="0.85" />
    <ellipse cx="22.5" cy="40.5" rx="12" ry="2" fill="rgba(0,0,0,0.9)" />

    <!-- 3D Pedestal Base -->
    <path d="M 9.5,39 C 9.5,37 13,36 22.5,36 C 32,36 35.5,37 35.5,39 L 35.5,41 C 35.5,43 32,44 22.5,44 C 13,44 9.5,43 9.5,41 Z" fill="url(#baseGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.8"/>
    <ellipse cx="22.5" cy="39" rx="13" ry="2.2" fill="url(#specularGrad${idSuffix})" opacity="0.7"/>
    <!-- Pedestal Step 2 -->
    <path d="M 12.5,36 C 12.5,34.5 15.5,33.5 22.5,33.5 C 29.5,33.5 32.5,34.5 32.5,36 L 32.5,37.5 C 32.5,39 29.5,40 22.5,40 C 15.5,40 12.5,39 12.5,37.5 Z" fill="url(#bodyGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.7"/>
    <ellipse cx="22.5" cy="36" rx="10" ry="1.8" fill="url(#trimGrad${idSuffix})" opacity="0.88"/>
  `;

  let innerGraphic = '';

  switch (type.toLowerCase()) {
    case 'p': // PAWN
      innerGraphic = `
        ${pieceBase}
        <!-- Pawn Body (Bell shape) -->
        <path d="M 15,34.5 C 15,26 19,22 19,18 L 26,18 C 26,22 30,26 30,34.5 Z" fill="url(#bodyGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.8"/>
        <!-- 3D Cylindrical Highlight -->
        <path d="M 17.5,34 C 17.5,27 20.5,22 20.5,18.5 L 22.5,18.5 C 22.5,22 20,27 20,34 Z" fill="url(#specularGrad${idSuffix})" opacity="0.8"/>
        <!-- Collar Ring -->
        <ellipse cx="22.5" cy="18" rx="5.5" ry="1.6" fill="url(#trimGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.6"/>
        <ellipse cx="22.5" cy="17.2" rx="4.5" ry="1.2" fill="url(#specularGrad${idSuffix})"/>
        <!-- Head Sphere -->
        <circle cx="22.5" cy="11.5" r="5.5" fill="url(#sphereLight${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.8"/>
        <!-- 3D Specular Dot on Head -->
        <ellipse cx="20.5" cy="9.5" rx="2" ry="1.3" fill="#ffffff" opacity="0.95" transform="rotate(-25 20.5 9.5)"/>
        <circle cx="24.2" cy="13.2" r="0.6" fill="${fills.innerGlow}" opacity="0.7"/>
      `;
      break;

    case 'n': // KNIGHT
      innerGraphic = `
        ${pieceBase}
        <!-- Knight 3D Muscular Horse Head -->
        <path d="M 14,35 C 13,29 11,24 13.5,19 C 14.5,17 14,14 15,11 C 15.5,9.5 17,9 18,9.5 C 19.5,10 20,8 21.5,8 C 23.5,8 25,10 24,12 C 26,12.5 28.5,15 28,18 C 27.5,20.5 24,22 22,23 C 24,24.5 26,27 28.5,30 C 30.5,32.5 31,34 31,35 Z" 
              fill="url(#bodyGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.9" stroke-linejoin="round"/>
        
        <!-- Mane 3D Curves -->
        <path d="M 16,11 C 18,12 18.5,15 17,17 M 18.5,14 C 21,15.5 21,19 19,21 M 21,18 C 24,20 23,24 21,26 M 23,24 C 26,26 25,30 23.5,32" 
              stroke="url(#trimGrad${idSuffix})" stroke-width="1.6" stroke-linecap="round" fill="none"/>

        <!-- Cheek & Snout Specular Highlight -->
        <path d="M 23,13 C 26,15 25.5,17.5 23.5,19 C 21.5,20 20,20.5 19,19 C 18.5,17 20,14.5 23,13 Z" 
              fill="url(#specularGrad${idSuffix})" opacity="0.85"/>
        
        <!-- Muscle Line & Jaw -->
        <path d="M 19,19 C 17,23 16,28 17.5,34" stroke="${fills.rimStroke}" stroke-width="0.8" fill="none" opacity="0.6"/>
        
        <!-- Knight Eye (Glowing / 3D Gem) -->
        <circle cx="21" cy="14" r="1.3" fill="${fills.accent}" stroke="${fills.rimStroke}" stroke-width="0.4"/>
        <circle cx="20.6" cy="13.6" r="0.5" fill="#ffffff"/>
        
        <!-- Muzzle / Nostril -->
        <circle cx="26.5" cy="18" r="0.7" fill="${fills.rimStroke}"/>
        
        <!-- Chest Highlight curve -->
        <path d="M 23,27 C 26,30 28,32.5 28.5,34.5" stroke="#ffffff" stroke-width="1" stroke-linecap="round" opacity="0.7"/>
      `;
      break;

    case 'b': // BISHOP
      innerGraphic = `
        ${pieceBase}
        <!-- Bishop Body Pillar -->
        <path d="M 15,34.5 C 15,28 18,24 18,20 L 27,20 C 27,24 30,28 30,34.5 Z" fill="url(#bodyGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.8"/>
        <!-- Pillar Specular -->
        <path d="M 18,34 C 18,27 20,23 20,20.5 L 22.5,20.5 C 22.5,23 21,27 21,34 Z" fill="url(#specularGrad${idSuffix})" opacity="0.75"/>
        <!-- Waist Ring with Gold -->
        <ellipse cx="22.5" cy="20" rx="6" ry="1.7" fill="url(#trimGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.7"/>
        
        <!-- Bishop Mitre (Head) -->
        <path d="M 16,19 C 14.5,14 17.5,9.5 22.5,8 C 27.5,9.5 30.5,14 29,19 C 27.5,21.5 17.5,21.5 16,19 Z" 
              fill="url(#sphereLight${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.9"/>
        
        <!-- 3D Cutout Slash (Traditional Bishop feature) -->
        <path d="M 20.5,11 L 26,16" stroke="${fills.rimStroke}" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M 20.5,11 L 26,16" stroke="url(#trimGrad${idSuffix})" stroke-width="1.2" stroke-linecap="round"/>

        <!-- Mitre Highlight -->
        <path d="M 18,14 C 18,11 20,9.5 22.5,9" stroke="#ffffff" stroke-width="1.1" stroke-linecap="round" opacity="0.85"/>

        <!-- Cross / Jewel on Peak -->
        <circle cx="22.5" cy="6.5" r="1.9" fill="url(#trimGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.5"/>
        <circle cx="22.5" cy="6" r="0.7" fill="#ffffff"/>
      `;
      break;

    case 'r': // ROOK
      innerGraphic = `
        ${pieceBase}
        <!-- Rook Tower Body -->
        <path d="M 14.5,34.5 L 16,20 L 29,20 L 30.5,34.5 Z" fill="url(#bodyGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.8"/>
        <!-- Tower 3D Shading Strip -->
        <path d="M 17,34 L 18,20 L 21.5,20 L 20,34 Z" fill="url(#specularGrad${idSuffix})" opacity="0.75"/>
        
        <!-- Middle Cornice Ring -->
        <ellipse cx="22.5" cy="19.5" rx="7.5" ry="2" fill="url(#trimGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.7"/>

        <!-- Castle Battlements (Crenellations) -->
        <path d="M 14,19 L 13.5,10.5 L 17,10.5 L 17,13.5 L 20.5,13.5 L 20.5,10.5 L 24.5,10.5 L 24.5,13.5 L 28,13.5 L 28,10.5 L 31.5,10.5 L 31,19 Z" 
              fill="url(#bodyGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.9" stroke-linejoin="round"/>
        
        <!-- Battlement Front Wall Bevel -->
        <path d="M 14.5,18 C 17,19.5 28,19.5 30.5,18" stroke="url(#trimGrad${idSuffix})" stroke-width="1.3" fill="none"/>
        <path d="M 14,12.5 L 31,12.5" stroke="${fills.rimStroke}" stroke-width="0.6" opacity="0.5"/>
        
        <!-- 3D Castle Rim Specular -->
        <rect x="14.5" y="11" width="2" height="6" fill="#ffffff" opacity="0.75" rx="0.5"/>
        <rect x="29" y="11" width="1.8" height="6" fill="#ffffff" opacity="0.5" rx="0.5"/>
      `;
      break;

    case 'q': // QUEEN
      innerGraphic = `
        ${pieceBase}
        <!-- Queen Waist & Lower Gown -->
        <path d="M 14,34.5 C 14,27 17.5,22 17.5,18 L 27.5,18 C 27.5,22 31,27 31,34.5 Z" fill="url(#bodyGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.8"/>
        <!-- Body Specular Sheen -->
        <path d="M 17,34 C 17,26 19.5,22 20,18.5 L 22.5,18.5 C 22,22 20,26 19.5,34 Z" fill="url(#specularGrad${idSuffix})" opacity="0.8"/>

        <!-- Royal Belt / Waistband -->
        <ellipse cx="22.5" cy="18" rx="6.5" ry="1.8" fill="url(#trimGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.7"/>

        <!-- Flared Crown Base -->
        <path d="M 16.5,18 L 12,11.5 L 17,14.5 L 22.5,9.5 L 28,14.5 L 33,11.5 L 28.5,18 Z" 
              fill="url(#sphereLight${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.9" stroke-linejoin="round"/>

        <!-- Crown Jewels / Pearls (5 Orbs) -->
        <circle cx="12" cy="11" r="1.8" fill="url(#trimGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.5"/>
        <circle cx="17" cy="14" r="1.6" fill="url(#trimGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.5"/>
        <circle cx="22.5" cy="9" r="2.2" fill="url(#trimGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.6"/>
        <circle cx="28" cy="14" r="1.6" fill="url(#trimGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.5"/>
        <circle cx="33" cy="11" r="1.8" fill="url(#trimGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.5"/>

        <!-- Center Ruby / Accent Gem on Crown -->
        <circle cx="22.5" cy="9" r="1.2" fill="${fills.accent}"/>
        <circle cx="22.2" cy="8.6" r="0.5" fill="#ffffff"/>

        <!-- Crown Facet Highlights -->
        <path d="M 13.5,13 L 17.5,16.5 L 22.5,11.5 L 27.5,16.5 L 31.5,13" stroke="#ffffff" stroke-width="0.9" fill="none" opacity="0.8"/>
      `;
      break;

    case 'k': // KING
      innerGraphic = `
        ${pieceBase}
        <!-- King Robe & Shoulders -->
        <path d="M 13.5,34.5 C 13.5,27 16.5,21 16.5,17.5 L 28.5,17.5 C 28.5,21 31.5,27 31.5,34.5 Z" fill="url(#bodyGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.8"/>
        <!-- Robe Specular Shading -->
        <path d="M 16.5,34 C 16.5,26 19,21 19.5,18 L 22.5,18 C 22,21 19.5,26 19,34 Z" fill="url(#specularGrad${idSuffix})" opacity="0.85"/>

        <!-- Imperial Collar -->
        <ellipse cx="22.5" cy="17.5" rx="7.5" ry="2" fill="url(#trimGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.7"/>

        <!-- King Imperial Arched Crown (Monarch Cap) -->
        <path d="M 15.5,17 C 14.5,12 18,10.5 22.5,10.5 C 27,10.5 30.5,12 29.5,17 Z" 
              fill="url(#sphereLight${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.8"/>
        
        <!-- Crown Cross Finial (Imperial Cross of Sovereignty) -->
        <g filter="url(#piece3dShadow${idSuffix})">
          <!-- Cross Vert -->
          <rect x="21.2" y="3.2" width="2.6" height="7.2" rx="0.6" fill="url(#trimGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.6"/>
          <!-- Cross Horiz -->
          <rect x="19" y="5.2" width="7" height="2.2" rx="0.6" fill="url(#trimGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.6"/>
          <!-- Gem in Center of Cross -->
          <circle cx="22.5" cy="6.3" r="1.0" fill="${fills.accent}"/>
          <circle cx="22.3" cy="6.0" r="0.4" fill="#ffffff"/>
        </g>

        <!-- Crown Side Arches -->
        <path d="M 17,16 C 17,12.5 20,11.5 22.5,11.5 C 25,11.5 28,12.5 28,16" stroke="url(#trimGrad${idSuffix})" stroke-width="1.3" fill="none"/>
        <circle cx="22.5" cy="11" r="1.4" fill="url(#trimGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.4"/>
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

// Supported piece styles list
export const SUPPORTED_STYLES = [
  'luxury',
  'metal',
  'wood',
  'crystal',
  'marble',
  'gold-titanium',
  'royal-ebony',
  'cyber-neon',
  'jade',
  'damascus'
];

// Generate full SVG maps for given style
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

// Current active style (default: 3D Luxury)
export let currentPieceStyle = (typeof localStorage !== 'undefined' && localStorage.getItem('chess_piece_style')) || 'luxury';

// Exported piece SVGs dictionary
export let PIECE_SVGS = generatePieceSet(currentPieceStyle);

export function getPieceSvg(pieceKey) {
  if (!PIECE_SVGS || Object.keys(PIECE_SVGS).length === 0) {
    PIECE_SVGS = generatePieceSet(currentPieceStyle);
  }
  return PIECE_SVGS[pieceKey] || '';
}

// Switch piece style at runtime
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
