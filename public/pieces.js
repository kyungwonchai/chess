// ============================================================================
// 3D Master Chess Piece Engine - Hyper-Realistic Vector Render Sets
// ============================================================================

export const PIECE_VALUES = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0
};

// Common SVG filters and gradients builder for 3D realism
function create3DPiece(type, color, style = 'luxury') {
  const isWhite = color === 'w';
  const idSuffix = `_${style}_${color}_${type}`;

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
    shadowColor: 'rgba(0,0,0,0.45)'
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
      shadowColor: 'rgba(0,0,0,0.5)'
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
      shadowColor: 'rgba(0,0,0,0.45)'
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
      shadowColor: isWhite ? 'rgba(6,182,212,0.4)' : 'rgba(225,29,72,0.4)'
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
        <stop offset="0%" stop-color="${fills.specular}" stop-opacity="0.95" />
        <stop offset="60%" stop-color="${fills.specular}" stop-opacity="0.2" />
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
        <stop offset="0%" stop-color="${fills.specular}" stop-opacity="0.9" />
        <stop offset="40%" stop-color="${fills.bodyGradStart}" />
        <stop offset="80%" stop-color="${fills.bodyGradMid}" />
        <stop offset="100%" stop-color="${fills.bodyGradEnd}" />
      </radialGradient>

      <!-- Gold/Accent Trim -->
      <linearGradient id="trimGrad${idSuffix}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#fbbf24" />
        <stop offset="50%" stop-color="#fffbeb" />
        <stop offset="100%" stop-color="#d97706" />
      </linearGradient>

      <!-- 3D Shadow Filter -->
      <filter id="piece3dShadow${idSuffix}" x="-20%" y="-20%" width="145%" height="150%">
        <feDropShadow dx="0" dy="3.5" stdDeviation="2.5" flood-color="${fills.shadowColor}" />
      </filter>
    </defs>
  `;

  // Standard 3D Base Pedestal for all pieces
  const pieceBase = `
    <!-- 3D Pedestal Base -->
    <ellipse cx="22.5" cy="40" rx="14" ry="3" fill="${fills.shadowColor}" />
    <path d="M 9.5,39 C 9.5,37 13,36 22.5,36 C 32,36 35.5,37 35.5,39 L 35.5,41 C 35.5,43 32,44 22.5,44 C 13,44 9.5,43 9.5,41 Z" fill="url(#baseGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.8"/>
    <ellipse cx="22.5" cy="39" rx="13" ry="2.2" fill="url(#specularGrad${idSuffix})" opacity="0.6"/>
    <!-- Pedestal Step 2 -->
    <path d="M 12.5,36 C 12.5,34.5 15.5,33.5 22.5,33.5 C 29.5,33.5 32.5,34.5 32.5,36 L 32.5,37.5 C 32.5,39 29.5,40 22.5,40 C 15.5,40 12.5,39 12.5,37.5 Z" fill="url(#bodyGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.7"/>
    <ellipse cx="22.5" cy="36" rx="10" ry="1.8" fill="url(#trimGrad${idSuffix})" opacity="0.85"/>
  `;

  let innerGraphic = '';

  switch (type.toLowerCase()) {
    case 'p': // PAWN
      innerGraphic = `
        ${pieceBase}
        <!-- Pawn Body (Bell shape) -->
        <path d="M 15,34.5 C 15,26 19,22 19,18 L 26,18 C 26,22 30,26 30,34.5 Z" fill="url(#bodyGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.8"/>
        <!-- 3D Cylindrical Highlight -->
        <path d="M 17.5,34 C 17.5,27 20.5,22 20.5,18.5 L 22.5,18.5 C 22.5,22 20,27 20,34 Z" fill="url(#specularGrad${idSuffix})" opacity="0.75"/>
        <!-- Collar Ring -->
        <ellipse cx="22.5" cy="18" rx="5.5" ry="1.6" fill="url(#trimGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.6"/>
        <ellipse cx="22.5" cy="17.2" rx="4.5" ry="1.2" fill="url(#specularGrad${idSuffix})"/>
        <!-- Head Sphere -->
        <circle cx="22.5" cy="11.5" r="5.5" fill="url(#sphereLight${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.8"/>
        <!-- 3D Specular Dot on Head -->
        <ellipse cx="20.5" cy="9.5" rx="1.8" ry="1.2" fill="#ffffff" opacity="0.9" transform="rotate(-25 20.5 9.5)"/>
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
              fill="url(#specularGrad${idSuffix})" opacity="0.8"/>
        
        <!-- Muscle Line & Jaw -->
        <path d="M 19,19 C 17,23 16,28 17.5,34" stroke="${fills.rimStroke}" stroke-width="0.8" fill="none" opacity="0.6"/>
        
        <!-- Knight Eye (Glowing / 3D Gem) -->
        <circle cx="21" cy="14" r="1.3" fill="${fills.accent}" stroke="${fills.rimStroke}" stroke-width="0.4"/>
        <circle cx="20.6" cy="13.6" r="0.4" fill="#ffffff"/>
        
        <!-- Muzzle / Nostril -->
        <circle cx="26.5" cy="18" r="0.7" fill="${fills.rimStroke}"/>
        
        <!-- Chest Highlight curve -->
        <path d="M 23,27 C 26,30 28,32.5 28.5,34.5" stroke="#ffffff" stroke-width="0.9" stroke-linecap="round" opacity="0.6"/>
      `;
      break;

    case 'b': // BISHOP
      innerGraphic = `
        ${pieceBase}
        <!-- Bishop Body Pillar -->
        <path d="M 15,34.5 C 15,28 18,24 18,20 L 27,20 C 27,24 30,28 30,34.5 Z" fill="url(#bodyGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.8"/>
        <!-- Pillar Specular -->
        <path d="M 18,34 C 18,27 20,23 20,20.5 L 22.5,20.5 C 22.5,23 21,27 21,34 Z" fill="url(#specularGrad${idSuffix})" opacity="0.7"/>
        <!-- Waist Ring with Gold -->
        <ellipse cx="22.5" cy="20" rx="6" ry="1.7" fill="url(#trimGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.7"/>
        
        <!-- Bishop Mitre (Head) -->
        <path d="M 16,19 C 14.5,14 17.5,9.5 22.5,8 C 27.5,9.5 30.5,14 29,19 C 27.5,21.5 17.5,21.5 16,19 Z" 
              fill="url(#sphereLight${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.9"/>
        
        <!-- 3D Cutout Slash (Traditional Bishop feature) -->
        <path d="M 20.5,11 L 26,16" stroke="${fills.rimStroke}" stroke-width="2" stroke-linecap="round"/>
        <path d="M 20.5,11 L 26,16" stroke="url(#trimGrad${idSuffix})" stroke-width="1.1" stroke-linecap="round"/>

        <!-- Mitre Highlight -->
        <path d="M 18,14 C 18,11 20,9.5 22.5,9" stroke="#ffffff" stroke-width="1" stroke-linecap="round" opacity="0.8"/>

        <!-- Cross / Jewel on Peak -->
        <circle cx="22.5" cy="6.5" r="1.8" fill="url(#trimGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.5"/>
        <circle cx="22.5" cy="6" r="0.6" fill="#ffffff"/>
      `;
      break;

    case 'r': // ROOK
      innerGraphic = `
        ${pieceBase}
        <!-- Rook Tower Body -->
        <path d="M 14.5,34.5 L 16,20 L 29,20 L 30.5,34.5 Z" fill="url(#bodyGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.8"/>
        <!-- Tower 3D Shading Strip -->
        <path d="M 17,34 L 18,20 L 21.5,20 L 20,34 Z" fill="url(#specularGrad${idSuffix})" opacity="0.7"/>
        
        <!-- Middle Cornice Ring -->
        <ellipse cx="22.5" cy="19.5" rx="7.5" ry="2" fill="url(#trimGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.7"/>

        <!-- Castle Battlements (Crenellations) -->
        <path d="M 14,19 L 13.5,10.5 L 17,10.5 L 17,13.5 L 20.5,13.5 L 20.5,10.5 L 24.5,10.5 L 24.5,13.5 L 28,13.5 L 28,10.5 L 31.5,10.5 L 31,19 Z" 
              fill="url(#bodyGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.9" stroke-linejoin="round"/>
        
        <!-- Battlement Front Wall Bevel -->
        <path d="M 14.5,18 C 17,19.5 28,19.5 30.5,18" stroke="url(#trimGrad${idSuffix})" stroke-width="1.2" fill="none"/>
        <path d="M 14,12.5 L 31,12.5" stroke="${fills.rimStroke}" stroke-width="0.6" opacity="0.5"/>
        
        <!-- 3D Castle Rim Specular -->
        <rect x="14.5" y="11" width="2" height="6" fill="#ffffff" opacity="0.7" rx="0.5"/>
      `;
      break;

    case 'q': // QUEEN
      innerGraphic = `
        ${pieceBase}
        <!-- Queen Waist & Lower Gown -->
        <path d="M 14,34.5 C 14,27 17.5,22 17.5,18 L 27.5,18 C 27.5,22 31,27 31,34.5 Z" fill="url(#bodyGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.8"/>
        <!-- Body Specular Sheen -->
        <path d="M 17,34 C 17,26 19.5,22 20,18.5 L 22.5,18.5 C 22,22 20,26 19.5,34 Z" fill="url(#specularGrad${idSuffix})" opacity="0.75"/>

        <!-- Royal Belt / Waistband -->
        <ellipse cx="22.5" cy="18" rx="6.5" ry="1.8" fill="url(#trimGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.7"/>

        <!-- Flared Crown Base -->
        <path d="M 16.5,18 L 12,11.5 L 17,14.5 L 22.5,9.5 L 28,14.5 L 33,11.5 L 28.5,18 Z" 
              fill="url(#sphereLight${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.9" stroke-linejoin="round"/>

        <!-- Crown Jewels / Pearls (5 Orbs) -->
        <circle cx="12" cy="11" r="1.7" fill="url(#trimGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.5"/>
        <circle cx="17" cy="14" r="1.5" fill="url(#trimGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.5"/>
        <circle cx="22.5" cy="9" r="2.1" fill="url(#trimGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.6"/>
        <circle cx="28" cy="14" r="1.5" fill="url(#trimGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.5"/>
        <circle cx="33" cy="11" r="1.7" fill="url(#trimGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.5"/>

        <!-- Center Ruby / Accent Gem on Crown -->
        <circle cx="22.5" cy="9" r="1.1" fill="${fills.accent}"/>
        <circle cx="22.2" cy="8.6" r="0.4" fill="#ffffff"/>

        <!-- Crown Facet Highlights -->
        <path d="M 13.5,13 L 17.5,16.5 L 22.5,11.5 L 27.5,16.5 L 31.5,13" stroke="#ffffff" stroke-width="0.8" fill="none" opacity="0.7"/>
      `;
      break;

    case 'k': // KING
      innerGraphic = `
        ${pieceBase}
        <!-- King Robe & Shoulders -->
        <path d="M 13.5,34.5 C 13.5,27 16.5,21 16.5,17.5 L 28.5,17.5 C 28.5,21 31.5,27 31.5,34.5 Z" fill="url(#bodyGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.8"/>
        <!-- Robe Specular Shading -->
        <path d="M 16.5,34 C 16.5,26 19,21 19.5,18 L 22.5,18 C 22,21 19.5,26 19,34 Z" fill="url(#specularGrad${idSuffix})" opacity="0.8"/>

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
          <circle cx="22.5" cy="6.3" r="0.9" fill="${fills.accent}"/>
          <circle cx="22.3" cy="6.0" r="0.3" fill="#ffffff"/>
        </g>

        <!-- Crown Side Arches -->
        <path d="M 17,16 C 17,12.5 20,11.5 22.5,11.5 C 25,11.5 28,12.5 28,16" stroke="url(#trimGrad${idSuffix})" stroke-width="1.2" fill="none"/>
        <circle cx="22.5" cy="11" r="1.3" fill="url(#trimGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.4"/>
      `;
      break;
  }

  return `
    <svg viewBox="0 0 45 45" class="chess-piece-svg piece-style-${style}" filter="url(#piece3dShadow${idSuffix})">
      ${defs}
      <g class="piece-3d-group">
        ${innerGraphic}
      </g>
    </svg>
  `;
}

// Generate full SVG maps for all 4 supported styles
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
export let currentPieceStyle = localStorage.getItem('chess_piece_style') || 'luxury';

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
  if (['luxury', 'metal', 'wood', 'crystal'].includes(newStyle)) {
    currentPieceStyle = newStyle;
    localStorage.setItem('chess_piece_style', newStyle);
    PIECE_SVGS = generatePieceSet(newStyle);
    return true;
  }
  return false;
}

