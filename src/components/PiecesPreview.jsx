const W = 56

function Pawn({ fill, stroke, strokeWidth = 1.5 }) {
  return (
    <svg viewBox="0 0 45 45" width={W} height={W}>
      <circle cx="22.5" cy="10" r="6" fill={fill} stroke={stroke} strokeWidth={strokeWidth}/>
      <path d="M20,16 C17,18 15.5,24 17,30 L28,30 C29.5,24 28,18 25,16 Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round"/>
      <path d="M17,30 L15,36 L30,36 L28,30 Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round"/>
      <rect x="12" y="36" width="21" height="4.5" rx="2" fill={fill} stroke={stroke} strokeWidth={strokeWidth}/>
    </svg>
  )
}

function Rook({ fill, stroke, strokeWidth = 1.5 }) {
  return (
    <svg viewBox="0 0 45 45" width={W} height={W}>
      <rect x="9" y="36" width="27" height="4" rx="2" fill={fill} stroke={stroke} strokeWidth={strokeWidth}/>
      {/* shoulder + battlements + base, all 16 corners rounded with r=0.5 Q curves */}
      <path d="M14,35.5 L14,20.5 Q14,20 13.5,20 L12.5,20 Q12,20 12,19.5 L12,11.5 Q12,11 12.5,11 L15.5,11 Q16,11 16,11.5 L16,14.5 Q16,15 16.5,15 L19.5,15 Q20,15 20,14.5 L20,11.5 Q20,11 20.5,11 L24.5,11 Q25,11 25,11.5 L25,14.5 Q25,15 25.5,15 L28.5,15 Q29,15 29,14.5 L29,11.5 Q29,11 29.5,11 L32.5,11 Q33,11 33,11.5 L33,19.5 Q33,20 32.5,20 L31.5,20 Q31,20 31,20.5 L31,35.5 Q31,36 30.5,36 L14.5,36 Q14,36 14,35.5 Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round"/>
      {/* decorative band at the shoulder line */}
      <line x1="14" y1="20" x2="31" y2="20" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round"/>
    </svg>
  )
}

function Bishop({ fill, stroke, strokeWidth = 1.5 }) {
  return (
    <svg viewBox="0 0 45 45" width={W} height={W}>
      <circle cx="22.5" cy="8" r="3" fill={fill} stroke={stroke} strokeWidth={strokeWidth}/>
      <path d="M22.5,11 C17,15 13,22 14,30 L31,30 C32,22 28,15 22.5,11 Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round"/>
      <path d="M14,30 L12,36 L33,36 L31,30 Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round"/>
      <rect x="10" y="36" width="25" height="4" rx="2" fill={fill} stroke={stroke} strokeWidth={strokeWidth}/>
      <line x1="23.5" y1="20.5" x2="27" y2="15.4" stroke={stroke || (fill === 'transparent' ? stroke : '#00000077')} strokeWidth={strokeWidth} strokeLinecap="round"/>
    </svg>
  )
}

function Knight({ fill, stroke, strokeWidth = 1.5 }) {
  return (
    <svg viewBox="0 0 45 45" width={W} height={W}>
      {/* body with ear baked into the silhouette (no gap at the join) */}
      <path d="M22,10 L18,6 L17.57,11.46 C15.05,13.14 13,16.16 13,20 C13,24 15,26 16,28 L14,36 L31,36 L29,28 C31,26 32,23 31,19 C30,14 27,10 22,10 Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round"/>
      <rect x="11" y="36" width="23" height="4" rx="2" fill={fill} stroke={stroke} strokeWidth={strokeWidth}/>
      <circle cx="19" cy="19" r="2" fill={stroke || (fill === 'transparent' ? stroke : '#00000044')}/>
      <path d="M13,20 C14,17.5 17,15 20,14.5" fill="none" stroke={stroke || (fill === 'transparent' ? stroke : '#00000033')} strokeWidth={strokeWidth * 0.8} strokeLinecap="round"/>
      {/* mane — middle edge curves outward, corners slightly smoothed */}
      <path d="M24,10.3 L32,11.8 Q33,12 33.4,12.7 Q37,19.5 34.7,26.5 Q35,27 33.5,27.2 L29.5,27.5" fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>
      {/* 2 strands, fully crossing from body edge to outer mane curve */}
      <line x1="30.4" y1="16.85" x2="35" y2="16.85" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round"/>
      <line x1="31.4" y1="22.15" x2="35.5" y2="22.15" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round"/>
    </svg>
  )
}

function Queen({ fill, stroke, strokeWidth = 1.5 }) {
  return (
    <svg viewBox="0 0 45 45" width={W} height={W}>
      <circle cx="22.5" cy="8" r="3" fill={fill} stroke={stroke} strokeWidth={strokeWidth}/>
      <circle cx="10" cy="13" r="3" fill={fill} stroke={stroke} strokeWidth={strokeWidth}/>
      <circle cx="35" cy="13" r="3" fill={fill} stroke={stroke} strokeWidth={strokeWidth}/>
      <path d="M10,16 L13,30 L32,30 L35,16 L28,22 L22.5,11 L17,22 Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round"/>
      <path d="M13,30 L11,36 L34,36 L32,30 Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round"/>
      <rect x="9" y="36" width="27" height="4" rx="2" fill={fill} stroke={stroke} strokeWidth={strokeWidth}/>
    </svg>
  )
}

function King({ fill, stroke, strokeWidth = 1.5 }) {
  return (
    <svg viewBox="0 0 45 45" width={W} height={W}>
      {/* vertical bar — open at bottom (no bottom stroke) */}
      <path d="M20,16.25 L20,3.75 A1.5,1.5 0 0,1 21.5,2.25 L23.5,2.25 A1.5,1.5 0 0,1 25,3.75 L25,16.25" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round"/>
      <rect x="16" y="6.25" width="13" height="5" rx="1.5" fill={fill} stroke={stroke} strokeWidth={strokeWidth}/>
      <path d="M14,30 C14,20 18,17 22.5,16 C27,17 31,20 31,30 Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round"/>
      <path d="M14,30 L12,36 L33,36 L31,30 Z" fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round"/>
      <rect x="9" y="36" width="27" height="4" rx="2" fill={fill} stroke={stroke} strokeWidth={strokeWidth}/>
    </svg>
  )
}

const PIECES = [King, Queen, Rook, Bishop, Knight, Pawn]
const LABELS = ['King', 'Queen', 'Rook', 'Bishop', 'Knight', 'Pawn']

const THEMES = [
  {
    name: 'Flat',
    desc: 'Solid fills, no outlines — very modern',
    white: { fill: '#f0e6d0', stroke: 'none', strokeWidth: 0 },
    black: { fill: '#2a2020', stroke: 'none', strokeWidth: 0 },
    bg: '#8b6f47',
    bgAlt: '#d4a96a',
  },
  {
    name: 'Classic',
    desc: 'Filled with bold outline — clean Staunton feel',
    white: { fill: '#f5f0e8', stroke: '#1a1a1a', strokeWidth: 1.5 },
    black: { fill: '#1c1c1c', stroke: '#f0e8d8', strokeWidth: 1.5 },
    bg: '#769656',
    bgAlt: '#eeeed2',
  },
  {
    name: 'Ghost',
    desc: 'Outline only, transparent fill — minimal',
    white: { fill: 'transparent', stroke: '#f0e8d8', strokeWidth: 2 },
    black: { fill: 'transparent', stroke: '#d4a040', strokeWidth: 2 },
    bg: '#4a3f35',
    bgAlt: '#6b5d52',
  },
]

export default function PiecesPreview() {
  return (
    <div style={{ background: '#0d1117', minHeight: '100vh', padding: 40, fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#ccc', marginBottom: 8, fontSize: 22 }}>Piece Themes</h1>
      <p style={{ color: '#555', marginBottom: 40, fontSize: 13 }}>Three clean styles — pick one to apply</p>

      {THEMES.map(theme => (
        <div key={theme.name} style={{ marginBottom: 48 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
            <span style={{ color: '#ddd', fontSize: 16, fontWeight: 600 }}>{theme.name}</span>
            <span style={{ color: '#555', fontSize: 12 }}>{theme.desc}</span>
          </div>
          <div style={{ display: 'flex', gap: 2 }}>
            {PIECES.map((Piece, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{
                  width: W + 12, height: W + 12,
                  background: i % 2 === 0 ? theme.bgAlt : theme.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 4,
                }}>
                  <Piece {...theme.white} />
                </div>
                <div style={{
                  width: W + 12, height: W + 12,
                  background: i % 2 === 1 ? theme.bgAlt : theme.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 4,
                }}>
                  <Piece {...theme.black} />
                </div>
                <div style={{ textAlign: 'center', color: '#444', fontSize: 10, marginTop: 4 }}>{LABELS[i]}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
