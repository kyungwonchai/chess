// ============================================================================
// Chess Master - High-Contrast Masterpiece Piece Engine
// Clean Staunton Silhouette with Crystal-Clear Piece & Side Discrimination
// ============================================================================

export const PIECE_VALUES = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0
};

// Clean, curated styles (with backward-compatibility fallbacks)
export const SUPPORTED_STYLES = [
  'classic',       // 1. 최고 가독성 마스터 스타운톤 (권장 기본값)
  'slate',         // 2. 모던 미니멀 다크 슬레이트
  'wood',          // 3. 내추럴 클래식 우드
  'gold',          // 4. 로열 골드 & 흑요석
  'korean-pearl',  // 5. 한국 전통 자개 & 흑칠

  // 레거시 호환 목록 (기존 저장값 오류 방지)
  'rose-gold', 'pharaoh-gold', 'black-gold', 'solar-gold', 'dragon-gold',
  'dual-gold', 'gold-titanium', 'metal', 'fire-ice', 'cosmic-galaxy',
  'blood-ruby', 'ethereal-spirit', 'cyber-mech', 'cyber-neon', 'steampunk',
  'toxic-acid', 'marble', 'royal-ebony', 'jade', 'damascus', 'cel-comic',
  'retro-pixel', 'luxury', 'crystal'
];

function getPalette(style, isWhite) {
  // 1. CLASSIC STAUNTON (World Standard High-Contrast)
  if (style === 'classic' || !style || style === 'metal' || style === 'crystal' || style === 'luxury') {
    if (isWhite) {
      return {
        bodyGradStart: '#ffffff',
        bodyGradMid: '#f8fafc',
        bodyGradEnd: '#e2e8f0',
        specular: '#ffffff',
        accent: '#94a3b8',
        rimStroke: '#0f172a',
        strokeWidth: 1.35,
        baseRim: '#cbd5e1',
        shadowColor: 'rgba(0, 0, 0, 0.25)',
        filterHalo: 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))'
      };
    } else {
      return {
        bodyGradStart: '#334155',
        bodyGradMid: '#1e293b',
        bodyGradEnd: '#090d16',
        specular: '#64748b',
        accent: '#475569',
        rimStroke: '#020617',
        strokeWidth: 1.35,
        baseRim: '#475569',
        shadowColor: 'rgba(0, 0, 0, 0.45)',
        filterHalo: 'drop-shadow(0 0 1px rgba(255,255,255,0.8)) drop-shadow(0 2px 5px rgba(0,0,0,0.6))'
      };
    }
  }

  // 2. MODERN SLATE (Minimal Matte Dark)
  if (style === 'slate' || style === 'marble' || style === 'damascus') {
    if (isWhite) {
      return {
        bodyGradStart: '#f1f5f9',
        bodyGradMid: '#e2e8f0',
        bodyGradEnd: '#cbd5e1',
        specular: '#ffffff',
        accent: '#64748b',
        rimStroke: '#1e293b',
        strokeWidth: 1.3,
        baseRim: '#94a3b8',
        shadowColor: 'rgba(0, 0, 0, 0.25)',
        filterHalo: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
      };
    } else {
      return {
        bodyGradStart: '#27272a',
        bodyGradMid: '#18181b',
        bodyGradEnd: '#09090b',
        specular: '#52525b',
        accent: '#3f3f46',
        rimStroke: '#09090b',
        strokeWidth: 1.3,
        baseRim: '#3f3f46',
        shadowColor: 'rgba(0, 0, 0, 0.45)',
        filterHalo: 'drop-shadow(0 0 1.2px rgba(226,232,240,0.75)) drop-shadow(0 2px 5px rgba(0,0,0,0.6))'
      };
    }
  }

  // 3. CLASSIC WOOD (Warm Natural Beech & Walnut)
  if (style === 'wood' || style === 'royal-ebony' || style === 'steampunk') {
    if (isWhite) {
      return {
        bodyGradStart: '#fffbeb',
        bodyGradMid: '#fef3c7',
        bodyGradEnd: '#fde68a',
        specular: '#ffffff',
        accent: '#d97706',
        rimStroke: '#78350f',
        strokeWidth: 1.3,
        baseRim: '#fcd34d',
        shadowColor: 'rgba(120, 53, 15, 0.3)',
        filterHalo: 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))'
      };
    } else {
      return {
        bodyGradStart: '#573012',
        bodyGradMid: '#3e1d05',
        bodyGradEnd: '#1e0c01',
        specular: '#8a4b1c',
        accent: '#a15c25',
        rimStroke: '#1b0901',
        strokeWidth: 1.3,
        baseRim: '#78350f',
        shadowColor: 'rgba(0, 0, 0, 0.5)',
        filterHalo: 'drop-shadow(0 0 1px rgba(254,243,199,0.7)) drop-shadow(0 2px 5px rgba(0,0,0,0.6))'
      };
    }
  }

  // 4. ROYAL GOLD & OBSIDIAN (Subtle Champagne Gold & Ebony)
  if (style === 'gold' || style === 'rose-gold' || style === 'pharaoh-gold' || style === 'black-gold' || style === 'solar-gold' || style === 'dragon-gold' || style === 'dual-gold' || style === 'gold-titanium') {
    if (isWhite) {
      return {
        bodyGradStart: '#fffbeb',
        bodyGradMid: '#fef08a',
        bodyGradEnd: '#eab308',
        specular: '#ffffff',
        accent: '#ca8a04',
        rimStroke: '#854d0e',
        strokeWidth: 1.3,
        baseRim: '#facc15',
        shadowColor: 'rgba(161, 98, 7, 0.3)',
        filterHalo: 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))'
      };
    } else {
      return {
        bodyGradStart: '#262626',
        bodyGradMid: '#171717',
        bodyGradEnd: '#0a0a0a',
        specular: '#ca8a04',
        accent: '#eab308',
        rimStroke: '#0a0a0a',
        strokeWidth: 1.3,
        baseRim: '#a16207',
        shadowColor: 'rgba(0, 0, 0, 0.5)',
        filterHalo: 'drop-shadow(0 0 1.2px rgba(250,204,21,0.85)) drop-shadow(0 2px 5px rgba(0,0,0,0.6))'
      };
    }
  }

  // 5. KOREAN PEARL & LACQUER (전통 자개 & 흑칠)
  if (style === 'korean-pearl' || style === 'jade') {
    if (isWhite) {
      return {
        bodyGradStart: '#ffffff',
        bodyGradMid: '#fdf4ff',
        bodyGradEnd: '#e0e7ff',
        specular: '#ffffff',
        accent: '#f43f5e',
        rimStroke: '#312e81',
        strokeWidth: 1.3,
        baseRim: '#c7d2fe',
        shadowColor: 'rgba(79, 70, 229, 0.25)',
        filterHalo: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
      };
    } else {
      return {
        bodyGradStart: '#27272a',
        bodyGradMid: '#18181b',
        bodyGradEnd: '#09090b',
        specular: '#38bdf8',
        accent: '#fbbf24',
        rimStroke: '#000000',
        strokeWidth: 1.3,
        baseRim: '#0284c7',
        shadowColor: 'rgba(0, 0, 0, 0.5)',
        filterHalo: 'drop-shadow(0 0 1.2px rgba(56,189,248,0.85)) drop-shadow(0 2px 5px rgba(0,0,0,0.6))'
      };
    }
  }

  // Fallback to Classic
  return getPalette('classic', isWhite);
}

function create3DPiece(type, color, style = 'classic') {
  const isWhite = color === 'w';
  const idSuffix = `_${style.replace(/[^a-zA-Z0-9]/g, '_')}_${color}_${type}`;
  const fills = getPalette(style, isWhite);

  const defs = `
    <defs>
      <!-- Body Main Vertical Gradient -->
      <linearGradient id="bodyGrad${idSuffix}" x1="20%" y1="0%" x2="80%" y2="100%">
        <stop offset="0%" stop-color="${fills.bodyGradStart}" />
        <stop offset="55%" stop-color="${fills.bodyGradMid}" />
        <stop offset="100%" stop-color="${fills.bodyGradEnd}" />
      </linearGradient>

      <!-- Specular Highlight Top Light -->
      <linearGradient id="specularGrad${idSuffix}" x1="0%" y1="0%" x2="100%" y2="80%">
        <stop offset="0%" stop-color="${fills.specular}" stop-opacity="0.9" />
        <stop offset="50%" stop-color="${fills.specular}" stop-opacity="0.25" />
        <stop offset="100%" stop-color="${fills.specular}" stop-opacity="0" />
      </linearGradient>

      <!-- Base Pedestal Gradient -->
      <linearGradient id="baseGrad${idSuffix}" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${fills.bodyGradStart}" />
        <stop offset="60%" stop-color="${fills.bodyGradMid}" />
        <stop offset="100%" stop-color="${fills.bodyGradEnd}" />
      </linearGradient>

      <!-- Radial Spherical Light for Orbs -->
      <radialGradient id="sphereLight${idSuffix}" cx="35%" cy="30%" r="65%">
        <stop offset="0%" stop-color="${fills.specular}" stop-opacity="0.95" />
        <stop offset="40%" stop-color="${fills.bodyGradStart}" />
        <stop offset="80%" stop-color="${fills.bodyGradMid}" />
        <stop offset="100%" stop-color="${fills.bodyGradEnd}" />
      </radialGradient>
    </defs>
  `;

  // Slim, elegant, proportioned chess base (y=36.5 to 43.5)
  // Frees up valuable vertical space so piece heads and silhouettes are large and crystal-clear
  const pieceBase = `
    <!-- Contact Ground Shadow -->
    <ellipse cx="22.5" cy="41.8" rx="14" ry="2" fill="${fills.shadowColor}" />
    <!-- Lower Base Rim -->
    <path d="M 9.5,41 C 9.5,39.5 13.5,38.5 22.5,38.5 C 31.5,38.5 35.5,39.5 35.5,41 L 35.5,42 C 35.5,43.2 31.5,44 22.5,44 C 13.5,44 9.5,43.2 9.5,42 Z"
          fill="url(#baseGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="${fills.strokeWidth}" stroke-linejoin="round"/>
    <!-- Upper Base Step -->
    <path d="M 12.5,38.5 C 12.5,37.2 15.5,36.5 22.5,36.5 C 29.5,36.5 32.5,37.2 32.5,38.5 L 32.5,39.5 C 32.5,40.8 29.5,41.5 22.5,41.5 C 15.5,41.5 12.5,40.8 12.5,39.5 Z"
          fill="url(#bodyGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="${fills.strokeWidth * 0.85}" stroke-linejoin="round"/>
  `;

  let innerGraphic = '';

  switch (type.toLowerCase()) {
    case 'p': // ================= PAWN =================
      innerGraphic = `
        ${pieceBase}
        <!-- Pawn Trunk -->
        <path d="M 15.5,37 C 15.5,28 19,23 19,19.5 L 26,19.5 C 26,23 29.5,28 29.5,37 Z" 
              fill="url(#bodyGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="${fills.strokeWidth}" stroke-linejoin="round"/>
        <!-- Soft highlight line -->
        <path d="M 18,36 C 18,28 20.5,23 20.5,20 L 22.5,20 C 22.5,23 20.5,28 20.5,36 Z" 
              fill="url(#specularGrad${idSuffix})" opacity="0.6"/>
        <!-- Pawn Neck Collar -->
        <ellipse cx="22.5" cy="19.5" rx="5.5" ry="1.6" fill="url(#bodyGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="${fills.strokeWidth * 0.85}"/>
        <!-- Pawn Head (Classic Large Sphere) -->
        <circle cx="22.5" cy="12.5" r="6" fill="url(#sphereLight${idSuffix})" stroke="${fills.rimStroke}" stroke-width="${fills.strokeWidth}"/>
        <ellipse cx="20.5" cy="10" rx="2" ry="1.2" fill="${fills.specular}" opacity="0.9" transform="rotate(-25 20.5 10)"/>
      `;
      break;

    case 'n': // ================= KNIGHT =================
      innerGraphic = `
        ${pieceBase}
        <!-- Detailed, proud Knight Head & Mane -->
        <path d="M 13.5,37 C 13,31 11,26 13,20 C 13.8,17.5 13.5,14 14.8,10.5 C 15.2,9.2 16.5,8.8 17.5,9.2 C 18.8,9.8 19.5,8 21.2,7.8 C 23.2,7.8 24.8,9.5 24,11.5 C 26,12 28.5,14.5 28.5,17.5 C 28.5,20 25.5,21.5 23.5,22.5 C 25.5,24 27.5,26.5 29.5,30 C 31,32.5 31.5,35 31.5,37 Z" 
              fill="url(#bodyGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="${fills.strokeWidth}" stroke-linejoin="round"/>
        <!-- Mane Ridge Details -->
        <path d="M 18,12 C 20,13 21,16 19,18 M 21,15 C 23.5,16.5 23.5,20 21.5,22 M 24,19 C 27,21 26,25 24,27 M 26,25 C 29,27 28,32 26,34" 
              stroke="${fills.rimStroke}" stroke-width="1.3" stroke-linecap="round" fill="none" opacity="0.75"/>
        <!-- Cheek Volume & Eye -->
        <path d="M 23,13 C 26,15 25.5,17.5 23.5,19 C 21.5,20 20,20.5 19,19 C 18.5,17 20,14.5 23,13 Z" fill="url(#specularGrad${idSuffix})" opacity="0.8"/>
        <circle cx="21" cy="14" r="1.3" fill="${fills.rimStroke}"/>
        <circle cx="20.6" cy="13.6" r="0.45" fill="${fills.specular}"/>
        <!-- Muzzle & Nostril -->
        <circle cx="15.2" cy="12.5" r="0.8" fill="${fills.rimStroke}" opacity="0.8"/>
        <!-- Chest Highlight curve -->
        <path d="M 15.5,23 C 17,28 19,34 20,36.5" stroke="url(#specularGrad${idSuffix})" stroke-width="1.5" stroke-linecap="round" fill="none" opacity="0.7"/>
      `;
      break;

    case 'b': // ================= BISHOP =================
      innerGraphic = `
        ${pieceBase}
        <!-- Bishop Column -->
        <path d="M 15,37 C 15,29 18,24 18,20.5 L 27,20.5 C 27,24 30,29 30,37 Z" 
              fill="url(#bodyGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="${fills.strokeWidth}" stroke-linejoin="round"/>
        <!-- Collar -->
        <ellipse cx="22.5" cy="20.5" rx="6.2" ry="1.6" fill="url(#bodyGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="${fills.strokeWidth * 0.85}"/>
        <!-- Bishop Mitre Cap (Pointed Arch) -->
        <path d="M 15.5,19.5 C 14,13.5 17.5,8.5 22.5,7 C 27.5,8.5 31,13.5 29.5,19.5 C 27.5,21.8 17.5,21.8 15.5,19.5 Z" 
              fill="url(#bodyGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="${fills.strokeWidth}" stroke-linejoin="round"/>
        <path d="M 17.5,19 C 16.5,14 18.5,10.5 22.5,9 C 23.5,12 23,17 21,19 Z" fill="url(#specularGrad${idSuffix})" opacity="0.7"/>
        <!-- Distinct Bishop Slit (Diagonal cut - Instant Recognition) -->
        <path d="M 20.5,10.5 L 26,16" stroke="${fills.rimStroke}" stroke-width="2.3" stroke-linecap="round"/>
        <path d="M 20.5,10.5 L 26,16" stroke="${fills.specular}" stroke-width="1.0" stroke-linecap="round"/>
        <!-- Top Finial Ball -->
        <circle cx="22.5" cy="5.8" r="1.8" fill="url(#sphereLight${idSuffix})" stroke="${fills.rimStroke}" stroke-width="${fills.strokeWidth * 0.85}"/>
      `;
      break;

    case 'r': // ================= ROOK =================
      innerGraphic = `
        ${pieceBase}
        <!-- Rook Castle Column -->
        <path d="M 14,37 L 15.5,19.5 L 29.5,19.5 L 31,37 Z" 
              fill="url(#bodyGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="${fills.strokeWidth}" stroke-linejoin="round"/>
        <!-- Column Highlight -->
        <path d="M 17,36 L 18,20 L 21.5,20 L 20,36 Z" fill="url(#specularGrad${idSuffix})" opacity="0.6"/>
        <!-- Castle Platform Collar -->
        <ellipse cx="22.5" cy="19.5" rx="7.5" ry="1.8" fill="url(#bodyGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="${fills.strokeWidth * 0.85}"/>
        <!-- Rook Crenellated Battlement (Castle Tower Teeth) -->
        <path d="M 13.5,19.5 L 13,9.5 L 16.5,9.5 L 16.5,13 L 20,13 L 20,9.5 L 25,9.5 L 25,13 L 28.5,13 L 28.5,9.5 L 32,9.5 L 31.5,19.5 Z" 
              fill="url(#bodyGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="${fills.strokeWidth}" stroke-linejoin="round"/>
        <!-- Tower Inset Line -->
        <path d="M 14.5,16.5 L 30.5,16.5" stroke="${fills.rimStroke}" stroke-width="1.1" stroke-linecap="round"/>
      `;
      break;

    case 'q': // ================= QUEEN =================
      innerGraphic = `
        ${pieceBase}
        <!-- Queen Elegant Body -->
        <path d="M 14,37 C 14,28 17.5,22 17.5,18 L 27.5,18 C 27.5,22 31,28 31,37 Z" 
              fill="url(#bodyGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="${fills.strokeWidth}" stroke-linejoin="round"/>
        <!-- Highlight -->
        <path d="M 17,36 C 17,27 19.5,22 20,18.5 L 22.5,18.5 C 22,22 20,27 19.5,36 Z" fill="url(#specularGrad${idSuffix})" opacity="0.65"/>
        <!-- Collar -->
        <ellipse cx="22.5" cy="18" rx="6.8" ry="1.7" fill="url(#bodyGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="${fills.strokeWidth * 0.85}"/>
        <!-- 5-Pointed Coronet Crown -->
        <path d="M 16,18 L 11.5,10.5 L 17,14 L 22.5,8.5 L 28,14 L 33.5,10.5 L 29,18 Z" 
              fill="url(#bodyGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="${fills.strokeWidth}" stroke-linejoin="round"/>
        <!-- 5 Jewels / Pearl Orbs on Points -->
        <circle cx="11.5" cy="10" r="1.6" fill="url(#sphereLight${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.8"/>
        <circle cx="17" cy="13.5" r="1.5" fill="url(#sphereLight${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.8"/>
        <circle cx="22.5" cy="8" r="2.0" fill="url(#sphereLight${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.9"/>
        <circle cx="28" cy="13.5" r="1.5" fill="url(#sphereLight${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.8"/>
        <circle cx="33.5" cy="10" r="1.6" fill="url(#sphereLight${idSuffix})" stroke="${fills.rimStroke}" stroke-width="0.8"/>
      `;
      break;

    case 'k': // ================= KING =================
      innerGraphic = `
        ${pieceBase}
        <!-- King Tall Majestic Body -->
        <path d="M 13.5,37 C 13.5,27 16.5,21 16.5,17 L 28.5,17 C 28.5,21 31.5,27 31.5,37 Z" 
              fill="url(#bodyGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="${fills.strokeWidth}" stroke-linejoin="round"/>
        <!-- Body highlight -->
        <path d="M 16.5,36 C 16.5,26 19,21 19.5,18 L 22.5,18 C 22,21 19.5,26 19,36 Z" fill="url(#specularGrad${idSuffix})" opacity="0.7"/>
        <!-- Collar -->
        <ellipse cx="22.5" cy="17" rx="7.5" ry="1.8" fill="url(#bodyGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="${fills.strokeWidth * 0.85}"/>
        <!-- King Arched Royal Crown -->
        <path d="M 15,16.5 C 14,11 18,9 22.5,9 C 27,9 31,11 30,16.5 Z" 
              fill="url(#bodyGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="${fills.strokeWidth}" stroke-linejoin="round"/>
        <!-- UNMISTAKABLE PROUD LATIN CROSS (King's Defining Emblem) -->
        <g>
          <rect x="21.3" y="2.2" width="2.4" height="7.2" rx="0.5" fill="url(#bodyGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="${fills.strokeWidth * 0.85}"/>
          <rect x="19" y="4.2" width="7" height="2.2" rx="0.5" fill="url(#bodyGrad${idSuffix})" stroke="${fills.rimStroke}" stroke-width="${fills.strokeWidth * 0.85}"/>
          <circle cx="22.5" cy="5.3" r="0.9" fill="${fills.specular}"/>
        </g>
      `;
      break;
  }

  return `
    <svg viewBox="0 0 45 45" class="chess-piece-svg piece-style-${style}" style="filter: ${fills.filterHalo};">
      ${defs}
      <g class="piece-3d-group">
        ${innerGraphic}
      </g>
    </svg>
  `;
}

export function generatePieceSet(style = 'classic') {
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

export let currentPieceStyle = (typeof localStorage !== 'undefined' && localStorage.getItem('chess_piece_style')) || 'classic';

export let PIECE_SVGS = generatePieceSet(currentPieceStyle);

export function getPieceSvg(pieceKey) {
  if (!PIECE_SVGS || Object.keys(PIECE_SVGS).length === 0) {
    PIECE_SVGS = generatePieceSet(currentPieceStyle);
  }
  return PIECE_SVGS[pieceKey] || '';
}

export function setPieceStyle(newStyle) {
  const targetStyle = SUPPORTED_STYLES.includes(newStyle) ? newStyle : 'classic';
  currentPieceStyle = targetStyle;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('chess_piece_style', targetStyle);
  }
  PIECE_SVGS = generatePieceSet(targetStyle);
  return true;
}
