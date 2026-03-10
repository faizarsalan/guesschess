"use client";

import {
  useState, useEffect, useCallback, useRef,
  Component, type ReactNode, type ErrorInfo,
} from "react";
import { Chess } from "chess.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type TileState  = "correct" | "present" | "absent" | "empty" | "active" | "current";
type GameState  = "playing" | "won" | "lost";

interface Puzzle { name: string; fen: string; solution: string[]; hint: string; }

interface SavedState {
  dayNum:       number;
  guesses:      string[][];
  results:      TileState[][];
  gameState:    GameState;
  currentGuess: string[];
  filledCount:  number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Puzzle pool
// ─────────────────────────────────────────────────────────────────────────────
const PUZZLE_POOL: Puzzle[] = [
  { name:"Ruy Lopez",        fen:"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", solution:["e4","e5","Nf3","Nc6","Bb5","a6"],   hint:"Spanish opening — White's bishop pins the knight on c6" },
  { name:"Queen's Gambit",   fen:"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", solution:["d4","d5","c4","e6","Nc3","Nf6"],   hint:"White offers a pawn; Black solidly declines with e6" },
  { name:"Sicilian Najdorf", fen:"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", solution:["e4","c5","Nf3","d6","d4","cxd4"],  hint:"The sharpest Sicilian — Black trades in the centre" },
  { name:"Mate in 3 — Rook File Mate", fen:"6k1/6pp/8/8/8/8/5PPP/R5K1 w - - 0 1", solution:["Ra8+","Rxa8","Rxa8#"], hint:"Control the open file and finish with the rook." },
  { name:"Italian Game",     fen:"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", solution:["e4","e5","Nf3","Nc6","Bc4","Bc5"], hint:"Both sides mirror development toward the centre" },
  { name:"King's Indian",    fen:"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", solution:["d4","Nf6","c4","g6","Nc3","Bg7"],  hint:"Black fianchettoes the bishop — a hyper-modern classic" },
  { name:"Mate in 3 — Queen Corner Trap", fen:"7k/6pp/8/8/8/6Q1/6PP/6K1 w - - 0 1", solution:["Qb8+","Qf8","Qxf8#"], hint:"Drive the king into the corner before the final capture." },
  { name:"French Defence",   fen:"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", solution:["e4","e6","d4","d5","Nc3","Nf6"],   hint:"Black builds a solid pawn chain from e6 and d5" },
  { name:"Caro-Kann",        fen:"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", solution:["e4","c6","d4","d5","Nc3","dxe4"],  hint:"Black's solid reply — captures White's e4 pawn early" },
  { name:"London System",    fen:"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", solution:["d4","d5","Nf3","Nf6","Bf4","e6"],  hint:"White's steady system — bishop outside the pawn chain" },
  { name:"Nimzo-Indian",     fen:"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", solution:["d4","Nf6","c4","e6","Nc3","Bb4"],  hint:"Black pins the knight immediately after c4 and Nc3" },
  { name:"Mate in 3 — Back Rank Net", fen:"6k1/5ppp/8/8/8/8/5PPP/4RRK1 w - - 0 1", solution:["Re8+","Rxe8","Rxe8#"], hint:"The back rank is weak — sacrifice then deliver mate." },
  { name:"Scotch Game",      fen:"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", solution:["e4","e5","Nf3","Nc6","d4","exd4"], hint:"White opens the centre with d4 on move 3" },
  { name:"English Opening",  fen:"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", solution:["c4","e5","Nc3","Nf6","g3","d5"],   hint:"Flank opening — White controls d5 from c4" },
  { name:"Vienna Game",      fen:"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", solution:["e4","e5","Nc3","Nf6","f4","d5"],   hint:"White supports e4 with the knight, then attacks with f4" },
  { name:"Mate in 3 — Scholar Finish", fen:"r1bqkb1r/pppp1Qpp/2n2n2/4p3/8/8/PPPP1PPP/RNB1KB1R w KQkq - 0 1", solution:["Qxf7+","Kxf7","Bc4+","d5","Bxd5#"], hint:"Classic scholar-style attack — sacrifice then bring the bishop." },
  { name:"Pirc Defence",     fen:"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", solution:["e4","d6","d4","Nf6","Nc3","g6"],   hint:"Black invites White to build a broad centre, then attacks" },
  { name:"Dutch Defence",    fen:"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", solution:["d4","f5","g3","Nf6","Bg2","e6"],   hint:"Black seizes kingside space immediately with f5" },
  { name:"Mate in 3 — Queen Drive", fen:"6k1/5ppp/8/8/8/5Q2/6PP/6K1 w - - 0 1", solution:["Qa8+","Qf8","Qxf8#"], hint:"The queen forces the king back and delivers mate." },
  { name:"King's Gambit",      fen:"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", solution:["e4","e5","f4","exf4","Nf3","g5"], hint:"White sacrifices the f-pawn for rapid kingside attack" },
  { name:"Evans Gambit",      fen:"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", solution:["e4","e5","Nf3","Nc6","Bc4","Bc5","b4"], hint:"White sacrifices the b-pawn to gain rapid development" },
  { name:"Petrov Defence",    fen:"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", solution:["e4","e5","Nf3","Nf6","Nxe5","d6"], hint:"A symmetrical and solid defence to 1.e4" },
  { name:"Philidor Defence",  fen:"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", solution:["e4","e5","Nf3","d6","d4","Nf6"], hint:"Black defends e5 with a solid pawn structure" },
  { name:"Alekhine Defence",  fen:"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", solution:["e4","Nf6","e5","Nd5","d4","d6"], hint:"Black provokes White's centre before attacking it" },
  { name:"Benoni Defence",    fen:"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", solution:["d4","Nf6","c4","c5","d5","e6"], hint:"Black challenges White's centre with c5 early" },
  { name:"Grünfeld Defence",  fen:"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", solution:["d4","Nf6","c4","g6","Nc3","d5"], hint:"Black attacks the centre immediately with d5" },
  { name:"Catalan Opening",   fen:"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", solution:["d4","Nf6","c4","e6","g3","d5"], hint:"White prepares a long diagonal fianchetto with g3" },
  { name:"King's Indian Attack", fen:"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", solution:["Nf3","d5","g3","Nf6","Bg2","e6"], hint:"White builds a flexible kingside fianchetto system" },
  { name:"Bird Opening",      fen:"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", solution:["f4","d5","Nf3","Nf6","e3","g6"], hint:"A flank opening similar in spirit to the Dutch Defence" },
  { name:"Benko Gambit",      fen:"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", solution:["d4","Nf6","c4","c5","d5","b5"], hint:"Black sacrifices a pawn for queenside activity" },
  { name:"Modern Defence",    fen:"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", solution:["e4","g6","d4","Bg7","Nc3","d6"], hint:"Black delays the centre fight with a hypermodern setup" }
];

function getDailyPuzzle() {
  const now    = new Date();
  const epoch  = new Date("2025-01-01");
  const dayNum = Math.floor((now.getTime() - epoch.getTime()) / 86_400_000);
  return {
    puzzle:  PUZZLE_POOL[((dayNum % PUZZLE_POOL.length) + PUZZLE_POOL.length) % PUZZLE_POOL.length],
    dayNum,
    dateStr: now.toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" }),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// localStorage helpers  (safe — no SSR crash)
// ─────────────────────────────────────────────────────────────────────────────
const LS_KEY = "chessdle_v1";

function loadSave(): SavedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedState;
  } catch { return null; }
}

function writeSave(s: SavedState) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch { /* quota */ }
}

function clearSave() {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const MAX_GUESSES = 6;
const MOVE_COUNT  = 6;

const BASE = "https://lichess1.org/assets/piece/cburnett";
const PIECE_URL: Record<string,string> = {
  wK:`${BASE}/wK.svg`,wQ:`${BASE}/wQ.svg`,wR:`${BASE}/wR.svg`,
  wB:`${BASE}/wB.svg`,wN:`${BASE}/wN.svg`,wP:`${BASE}/wP.svg`,
  bK:`${BASE}/bK.svg`,bQ:`${BASE}/bQ.svg`,bR:`${BASE}/bR.svg`,
  bB:`${BASE}/bB.svg`,bN:`${BASE}/bN.svg`,bP:`${BASE}/bP.svg`,
};

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers
// ─────────────────────────────────────────────────────────────────────────────
const normMove = (m: string) => m.replace(/[+#!?]/g,"").trim();

function evaluateGuess(guess: string[], solution: string[]): TileState[] {
  return guess.map((g,i) => {
    const ng = normMove(g);
    if (ng === normMove(solution[i])) return "correct";
    if (solution.some(s => normMove(s) === ng)) return "present";
    return "absent";
  });
}

function fenAfterMoves(startFen: string, moves: string[]) {
  const c = new Chess(startFen);
  for (const m of moves) { if (!m) break; try { c.move(m); } catch { break; } }
  return c.fen();
}

// ─────────────────────────────────────────────────────────────────────────────
// Error Boundary
// ─────────────────────────────────────────────────────────────────────────────
interface EBState { hasError: boolean; message: string; }

class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }
  static getDerivedStateFromError(err: Error): EBState {
    return { hasError: true, message: err.message };
  }
  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error("[ChessWordle]", err, info.componentStack);
  }
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{
        minHeight:"100vh", display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center", gap:16,
        background:"#111010", color:"#e4ddd0", fontFamily:"monospace", padding:24,
        textAlign:"center",
      }}>
        <div style={{ fontSize:"2.5rem" }}>♟</div>
        <h2 style={{ color:"#c9a030", letterSpacing:".1em", textTransform:"uppercase" }}>
          Something went wrong
        </h2>
        <p style={{ color:"#6a6050", fontSize:".75rem", maxWidth:360 }}>
          {this.state.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={() => { clearSave(); window.location.reload(); }}
          style={{
            padding:"10px 24px", background:"rgba(180,140,50,.15)",
            border:"1px solid rgba(180,140,50,.4)", borderRadius:3,
            color:"#c9a030", fontFamily:"monospace", fontSize:".75rem",
            letterSpacing:".1em", textTransform:"uppercase", cursor:"pointer",
          }}
        >
          Reset &amp; Reload
        </button>
      </div>
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Piece image with loading skeleton
// ─────────────────────────────────────────────────────────────────────────────
function PieceImg({ pk, style, onPointerDown }: {
  pk: string;
  style?: React.CSSProperties;
  onPointerDown?: (e: React.PointerEvent) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error,  setError]  = useState(false);

  // Unicode fallback symbols
  const FALLBACK: Record<string,string> = {
    wK:"♔",wQ:"♕",wR:"♖",wB:"♗",wN:"♘",wP:"♙",
    bK:"♚",bQ:"♛",bR:"♜",bB:"♝",bN:"♞",bP:"♟",
  };

  if (error) {
    return (
      <span
        style={{ fontSize:"min(7vw,2.2rem)", lineHeight:1, userSelect:"none", ...style }}
        onPointerDown={onPointerDown}
      >
        {FALLBACK[pk]}
      </span>
    );
  }

  return (
    <>
      {!loaded && (
        <div style={{
          width:"88%", height:"88%", borderRadius:"50%",
          background:"rgba(255,255,255,0.08)",
          animation:"shimmer 1.2s ease infinite",
          position:"absolute",
        }}/>
      )}
      <img
        src={PIECE_URL[pk]}
        alt={pk}
        style={{ opacity: loaded ? 1 : 0, transition:"opacity .15s", ...style }}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        onPointerDown={onPointerDown}
        draggable={false}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chess Board — pointer-event drag, mobile-ready
// ─────────────────────────────────────────────────────────────────────────────
interface BoardProps {
  fen: string;
  filledCount: number;
  onMove: (san: string) => void;
  disabled: boolean;
}

function ChessBoard({ fen, filledCount, onMove, disabled }: BoardProps) {
  const chess  = new Chess(fen);
  const FILES  = ["a","b","c","d","e","f","g","h"];
  const RANKS  = [8,7,6,5,4,3,2,1];

  const drag     = useRef<{ from:string; pk:string; sqSize:number } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const [dragFrom,   setDragFrom]   = useState<string|null>(null);
  const [dragOver,   setDragOver]   = useState<string|null>(null);
  const [legalDests, setLegalDests] = useState<string[]>([]);
  const [floatPos,   setFloatPos]   = useState<{x:number;y:number}|null>(null);
  const [floatKey,   setFloatKey]   = useState<string|null>(null);

  const turn    = chess.turn();
  const moveNum = Math.floor(filledCount / 2) + 1;

  function coordsToSq(cx: number, cy: number): string | null {
    const b = boardRef.current;
    if (!b) return null;
    const r  = b.getBoundingClientRect();
    const col = Math.floor((cx - r.left)  / (r.width  / 8));
    const row = Math.floor((cy - r.top)   / (r.height / 8));
    if (col < 0 || col > 7 || row < 0 || row > 7) return null;
    return `${FILES[col]}${RANKS[row]}`;
  }

  function onPointerDown(e: React.PointerEvent, sq: string) {
    if (disabled) return;
    const piece = chess.get(sq as any);
    if (!piece || piece.color !== turn) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const pk     = `${piece.color}${piece.type.toUpperCase()}`;
    const sqSize = boardRef.current!.getBoundingClientRect().width / 8;
    drag.current = { from: sq, pk, sqSize };
    setDragFrom(sq);
    setFloatKey(pk);
    setFloatPos({ x: e.clientX, y: e.clientY });
    setLegalDests(chess.moves({ square: sq as any, verbose: true }).map((m:any) => m.to));
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    e.preventDefault();
    setFloatPos({ x: e.clientX, y: e.clientY });
    setDragOver(coordsToSq(e.clientX, e.clientY));
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!drag.current) return;
    e.preventDefault();
    const toSq   = coordsToSq(e.clientX, e.clientY);
    const fromSq = drag.current.from;
    drag.current = null;
    setDragFrom(null); setDragOver(null); setLegalDests([]);
    setFloatPos(null); setFloatKey(null);
    if (!toSq || toSq === fromSq) return;
    try {
      const result = chess.move({ from: fromSq as any, to: toSq as any, promotion:"q" });
      onMove(result.san);
    } catch { /* illegal */ }
  }

  const sqPx = boardRef.current
    ? boardRef.current.getBoundingClientRect().width / 8
    : 40;

  return (
    <div className="board-wrap">
      <div className="board-turn-label">
        Move {moveNum} —{" "}
        <span className={turn==="w" ? "turn-w" : "turn-b"}>
          {turn==="w" ? "White" : "Black"} to play
        </span>
      </div>

      {/* Floating piece under finger/cursor */}
      {floatPos && floatKey && (
        <img
          src={PIECE_URL[floatKey]}
          alt=""
          style={{
            position:"fixed",
            left: floatPos.x - sqPx * 0.44,
            top:  floatPos.y - sqPx * 0.44,
            width:  sqPx * 0.88,
            height: sqPx * 0.88,
            pointerEvents:"none",
            zIndex:9999,
            userSelect:"none",
            filter:"drop-shadow(0 4px 12px rgba(0,0,0,0.7))",
          }}
        />
      )}

      <div
        ref={boardRef}
        className="board"
        style={{ touchAction:"none" }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {RANKS.map(rank => FILES.map(file => {
          const sq      = `${file}${rank}`;
          const isLight = (FILES.indexOf(file) + rank) % 2 === 0;
          const piece   = chess.get(sq as any);
          const isFrom  = dragFrom === sq;
          const isOver  = dragOver === sq;
          const isLegal = legalDests.includes(sq);
          const canDrag = !disabled && !!piece && piece.color === turn;
          const pk      = piece ? `${piece.color}${piece.type.toUpperCase()}` : null;

          return (
            <div
              key={sq}
              className={[
                "square",
                isLight   ? "sq-light" : "sq-dark",
                isFrom    ? "sq-from"  : "",
                isOver && isLegal ? "sq-over" : "",
              ].filter(Boolean).join(" ")}
            >
              {pk && (
                <PieceImg
                  pk={pk}
                  style={{
                    width:"90%", height:"90%",
                    objectFit:"contain",
                    position:"relative", zIndex:1,
                    userSelect:"none",
                    opacity: isFrom && floatPos ? 0 : 1,
                    cursor: canDrag ? "grab" : "default",
                    transition:"opacity .1s",
                  }}
                  onPointerDown={canDrag ? (e) => onPointerDown(e, sq) : undefined}
                />
              )}
              {isLegal && !piece && <div className="legal-dot"/>}
              {isLegal &&  piece && <div className="legal-ring"/>}
            </div>
          );
        }))}
      </div>

      <div className="file-labels">
        {FILES.map(f => <span key={f}>{f}</span>)}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tile
// ─────────────────────────────────────────────────────────────────────────────
function Tile({ value, state, moveIdx }: { value:string; state:TileState; moveIdx:number }) {
  const side = moveIdx % 2 === 0 ? "w" : "b";
  const n    = Math.floor(moveIdx / 2) + 1;
  return (
    <div
      className={["tile",`tile-${state}`,`tile-side-${side}`].join(" ")}
      style={{ animationDelay:`${moveIdx * 90}ms` }}
    >
      <span className="tile-label">{side==="w" ? `${n}.` : `${n}…`}</span>
      <span className="tile-san">{value || "·"}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Countdown
// ─────────────────────────────────────────────────────────────────────────────
function Countdown() {
  const [t, setT] = useState("--:--:--");
  useEffect(() => {
    const tick = () => {
      const now = new Date(), mid = new Date(now);
      mid.setHours(24,0,0,0);
      const d = mid.getTime() - now.getTime();
      const h = String(Math.floor(d/3_600_000)).padStart(2,"0");
      const m = String(Math.floor((d%3_600_000)/60_000)).padStart(2,"0");
      const s = String(Math.floor((d%60_000)/1_000)).padStart(2,"0");
      setT(`${h}:${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, []);
  return <span className="countdown">{t}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main game (inner — wrapped by ErrorBoundary below)
// ─────────────────────────────────────────────────────────────────────────────
function ChessWordleGame() {
  const { puzzle, dayNum, dateStr } = getDailyPuzzle();

  // ── State — hydrated from localStorage on first render ──────────────────
  const [hydrated,     setHydrated]     = useState(false);
  const [guesses,      setGuesses]      = useState<string[][]>([]);
  const [results,      setResults]      = useState<TileState[][]>([]);
  const [currentGuess, setCurrentGuess] = useState<string[]>(Array(MOVE_COUNT).fill(""));
  const [filledCount,  setFilledCount]  = useState(0);
  const [gameState,    setGameState]    = useState<GameState>("playing");
  const [showHint,     setShowHint]     = useState(false);
  const [shake,        setShake]        = useState(false);
  const [errorMsg,     setErrorMsg]     = useState("");

  // Hydrate from localStorage once on mount
  useEffect(() => {
    const saved = loadSave();
    if (saved && saved.dayNum === dayNum) {
      setGuesses(saved.guesses);
      setResults(saved.results);
      setGameState(saved.gameState);
      setCurrentGuess(saved.currentGuess);
      setFilledCount(saved.filledCount);
    }
    setHydrated(true);
  }, [dayNum]);

  // Persist to localStorage whenever meaningful state changes
  useEffect(() => {
    if (!hydrated) return;
    writeSave({ dayNum, guesses, results, gameState, currentGuess, filledCount });
  }, [hydrated, dayNum, guesses, results, gameState, currentGuess, filledCount]);

  const boardFen = fenAfterMoves(puzzle.fen, currentGuess.slice(0, filledCount));

  const handleBoardMove = useCallback((san: string) => {
    if (gameState !== "playing" || filledCount >= MOVE_COUNT) return;
    setCurrentGuess(prev => { const n=[...prev]; n[filledCount]=san; return n; });
    setFilledCount(n => n + 1);
    setErrorMsg("");
  }, [gameState, filledCount]);

  const handleUndo = useCallback(() => {
    if (filledCount === 0 || gameState !== "playing") return;
    setCurrentGuess(prev => { const n=[...prev]; n[filledCount-1]=""; return n; });
    setFilledCount(n => n - 1);
    setErrorMsg("");
  }, [filledCount, gameState]);

  const submitGuess = useCallback(() => {
    if (gameState !== "playing") return;
    if (filledCount < MOVE_COUNT) {
      setShake(true);
      setErrorMsg(`${MOVE_COUNT-filledCount} more move${MOVE_COUNT-filledCount!==1?"s":""} needed`);
      setTimeout(() => setShake(false), 500);
      return;
    }
    const c = new Chess(puzzle.fen);
    const norm: string[] = [];
    for (const m of currentGuess) {
      try { norm.push(c.move(m.trim()).san); }
      catch {
        setShake(true);
        setErrorMsg(`"${m}" is illegal in this sequence`);
        setTimeout(() => setShake(false), 500);
        return;
      }
    }
    const states = evaluateGuess(norm, puzzle.solution) as TileState[];
    const ng = [...guesses, norm];
    const nr = [...results, states];
    setGuesses(ng);
    setResults(nr);
    setCurrentGuess(Array(MOVE_COUNT).fill(""));
    setFilledCount(0);
    setErrorMsg("");
    if (states.every(s => s==="correct")) setGameState("won");
    else if (ng.length >= MAX_GUESSES)    setGameState("lost");
  }, [currentGuess, filledCount, gameState, guesses, puzzle, results]);

  const remainingRows = MAX_GUESSES - guesses.length - (gameState==="playing" ? 1 : 0);

  // ── Loading skeleton (prevents hydration mismatch) ───────────────────────
  if (!hydrated) {
    return (
      <div style={{
        minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
        background:"#111010",
      }}>
        <div style={{
          width:48, height:48, border:"3px solid rgba(180,140,50,.3)",
          borderTopColor:"#c9a030", borderRadius:"50%",
          animation:"spin 0.8s linear infinite",
        }}/>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=JetBrains+Mono:wght@400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html{-webkit-text-size-adjust:100%}
        body{background:#111010;color:#e4ddd0;font-family:'JetBrains Mono',monospace;min-height:100vh;overflow-x:hidden}

        @keyframes spin    { to { transform:rotate(360deg) } }
        @keyframes shimmer { 0%,100%{opacity:.4} 50%{opacity:.8} }
        @keyframes shake   { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-5px)} 40%{transform:translateX(5px)} 60%{transform:translateX(-3px)} 80%{transform:translateX(3px)} }
        @keyframes blink   { 0%,100%{border-color:rgba(180,140,50,.3)} 50%{border-color:rgba(212,168,50,.85)} }
        @keyframes flip    { 0%{transform:scaleY(1)} 40%{transform:scaleY(.04)} 100%{transform:scaleY(1)} }

        .app{
          min-height:100vh;display:flex;flex-direction:column;align-items:center;
          padding:20px 12px 60px;gap:20px;
          background:radial-gradient(ellipse 80% 50% at 50% -10%,rgba(160,120,40,.13) 0%,transparent 65%),#111010;
        }

        /* ── Header ── */
        .header{text-align:center;padding-bottom:14px;border-bottom:1px solid rgba(180,140,50,.25);width:100%;max-width:920px}
        .header h1{font-family:'Playfair Display',Georgia,serif;font-size:clamp(1.6rem,5vw,2.6rem);font-weight:900;color:#c9a030;letter-spacing:.12em;text-transform:uppercase}
        .header-sub{display:flex;align-items:center;justify-content:center;gap:14px;margin-top:6px;flex-wrap:wrap}
        .day-badge{font-size:.62rem;color:#6a6050;letter-spacing:.12em;text-transform:uppercase}
        .day-badge strong{color:#9a8060}
        .date-label{font-size:.62rem;color:#5a5040;letter-spacing:.1em}
        .next-label{font-size:.58rem;color:#4a4030;letter-spacing:.08em}
        .countdown{font-size:.7rem;color:#c9a030;letter-spacing:.06em;font-variant-numeric:tabular-nums}

        /* ── Layout ── */
        .main{
          display:flex;gap:24px;align-items:flex-start;
          width:100%;max-width:920px;flex-wrap:wrap;justify-content:center;
        }

        /* ── Board ── */
        .board-wrap{display:flex;flex-direction:column;gap:6px;flex-shrink:0;width:clamp(260px,90vw,340px)}
        .board-turn-label{font-size:.62rem;letter-spacing:.12em;text-transform:uppercase;text-align:center;color:#7a6840}
        .turn-w{color:#d4c090}.turn-b{color:#8090b0}
        .board{
          display:grid;grid-template-columns:repeat(8,1fr);
          width:100%;aspect-ratio:1/1;
          border:2px solid rgba(180,140,50,.4);
          box-shadow:0 0 40px rgba(180,140,50,.07),0 12px 50px rgba(0,0,0,.7);
          user-select:none;
        }
        .square{position:relative;display:flex;align-items:center;justify-content:center;aspect-ratio:1/1;overflow:hidden}
        .sq-light{background:#f0d9b5}.sq-dark{background:#b58863}
        .sq-from{background:rgba(255,220,50,.5)!important}
        .sq-over{outline:3px solid rgba(255,220,50,.9);outline-offset:-3px}
        .legal-dot{width:32%;height:32%;border-radius:50%;background:rgba(0,0,0,.18);pointer-events:none;flex-shrink:0}
        .legal-ring{position:absolute;inset:0;border-radius:50%;border:4px solid rgba(0,0,0,.18);pointer-events:none}
        .file-labels{display:flex;justify-content:space-around;font-size:.55rem;color:#4a4030;letter-spacing:.06em}

        /* ── Board controls ── */
        .board-controls{display:flex;justify-content:center;gap:8px}
        .btn-undo{
          padding:8px 20px;background:none;
          border:1px solid rgba(180,140,50,.25);border-radius:2px;
          color:#7a6848;font-family:'JetBrains Mono',monospace;
          font-size:.65rem;letter-spacing:.1em;text-transform:uppercase;
          cursor:pointer;transition:all .15s;
          /* larger tap target on mobile */
          min-height:40px;
        }
        .btn-undo:hover:not(:disabled){border-color:rgba(180,140,50,.6);color:#c9a030}
        .btn-undo:active:not(:disabled){background:rgba(180,140,50,.08)}
        .btn-undo:disabled{opacity:.28;cursor:default}

        /* ── Panel ── */
        .panel{display:flex;flex-direction:column;gap:7px;flex:1;min-width:min(290px,90vw);max-width:460px}
        .col-headers{display:grid;grid-template-columns:repeat(6,1fr);gap:4px;margin-bottom:2px}
        .col-header{text-align:center;font-size:.52rem;letter-spacing:.08em;text-transform:uppercase}
        .col-w{color:#7a7060}.col-b{color:#50586a}

        .progress-row{display:flex;gap:3px;margin-bottom:1px}
        .pip{flex:1;height:3px;border-radius:2px;background:#222018;transition:background .2s}
        .pip.on{background:#c9a030}

        /* ── Rows ── */
        .guess-row{display:grid;grid-template-columns:repeat(6,1fr);gap:4px}
        .guess-row.shake{animation:shake .4s ease}

        /* ── Tiles ── */
        .tile{display:flex;flex-direction:column;align-items:center;justify-content:center;height:clamp(44px,10vw,56px);border-radius:3px;gap:1px}
        .tile-label{font-size:.44rem;opacity:.45;letter-spacing:.04em}
        .tile-san{font-size:clamp(.65rem,2.5vw,.78rem);font-weight:600;letter-spacing:.02em}
        .tile-empty{background:#181614;border:1px solid #222018;color:#383430}
        .tile-current{background:#181614;border:1px dashed rgba(180,140,50,.45);color:#e4ddd0;animation:blink 1.5s ease infinite}
        .tile-active{background:#1c1a16;border:1px solid rgba(180,140,50,.5);color:#e4ddd0}
        .tile-correct{background:#223c1e;border:1px solid #4a9040;color:#8ae078;animation:flip .32s ease both}
        .tile-present{background:#483808;border:1px solid #c07c10;color:#f0b428;animation:flip .32s ease both}
        .tile-absent{background:#161412;border:1px solid #2c2820;color:#484038;animation:flip .32s ease both}
        .tile-side-w .tile-label{color:#c0a050}.tile-side-b .tile-label{color:#7888a0}

        /* ── Error ── */
        .error-msg{font-size:.62rem;color:#c05040;letter-spacing:.06em;min-height:16px;text-align:center}

        /* ── Actions ── */
        .actions{display:flex;gap:8px}
        .btn-submit{
          flex:1;padding:12px;
          background:linear-gradient(135deg,#7a5010,#b88010);
          border:none;border-radius:3px;color:#fff8e0;
          font-family:'JetBrains Mono',monospace;font-size:.7rem;font-weight:600;
          letter-spacing:.14em;text-transform:uppercase;cursor:pointer;
          transition:opacity .15s,transform .1s;
          /* touch-friendly */
          min-height:44px;
          -webkit-tap-highlight-color:transparent;
        }
        .btn-submit:hover:not(:disabled){opacity:.84;transform:translateY(-1px)}
        .btn-submit:active:not(:disabled){transform:none;opacity:.7}
        .btn-submit:disabled{opacity:.3;cursor:default}

        .btn-hint{
          padding:12px 14px;background:none;
          border:1px solid #2c2820;border-radius:3px;
          color:#5a5040;font-family:'JetBrains Mono',monospace;
          font-size:.62rem;cursor:pointer;letter-spacing:.08em;
          transition:all .15s;min-height:44px;
          -webkit-tap-highlight-color:transparent;
        }
        .btn-hint:hover{border-color:rgba(180,140,50,.4);color:#a09060}
        .btn-hint:active{background:rgba(180,140,50,.06)}
        .hint-box{background:rgba(180,140,50,.05);border:1px solid rgba(180,140,50,.18);border-radius:3px;padding:8px 10px;font-size:.65rem;color:#907050;letter-spacing:.04em;line-height:1.55}

        /* ── Legend ── */
        .legend{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;padding-top:2px}
        .legend-item{display:flex;align-items:center;gap:5px;font-size:.58rem;color:#5a5040;letter-spacing:.06em}
        .ldot{width:10px;height:10px;border-radius:2px;flex-shrink:0}
        .ld-c{background:#223c1e;border:1px solid #4a9040}
        .ld-p{background:#483808;border:1px solid #c07c10}
        .ld-a{background:#161412;border:1px solid #2c2820}

        /* ── End banner ── */
        .end-banner{text-align:center;padding:18px 24px;border-radius:4px;width:100%;max-width:920px}
        .end-banner.won{background:rgba(34,60,30,.25);border:1px solid rgba(74,144,64,.3)}
        .end-banner.lost{background:rgba(70,25,15,.25);border:1px solid rgba(140,50,30,.3)}
        .end-banner h2{font-family:'Playfair Display',Georgia,serif;font-size:1.2rem;letter-spacing:.1em;margin-bottom:6px}
        .end-banner.won h2{color:#70c860}.end-banner.lost h2{color:#c05040}
        .end-banner p{font-size:.66rem;color:#6a6050;margin-bottom:10px;letter-spacing:.06em}
        .sol-moves{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-bottom:14px}
        .sol-move{background:rgba(200,160,40,.12);border:1px solid rgba(200,160,40,.25);border-radius:2px;padding:4px 9px;font-size:.7rem;color:#c9a030;letter-spacing:.04em}
        .opening-chip{display:inline-block;background:rgba(180,140,50,.1);border:1px solid rgba(180,140,50,.25);border-radius:3px;padding:6px 16px;font-family:'Playfair Display',Georgia,serif;font-size:1rem;color:#c9a030;letter-spacing:.08em;margin-bottom:14px}
        .next-info{font-size:.62rem;color:#5a5040;letter-spacing:.1em;text-transform:uppercase}

        .divider{width:100%;max-width:920px;height:1px;background:rgba(180,140,50,.1)}

        /* ── Responsive: stack board above panel on narrow screens ── */
        @media (max-width:600px) {
          .main{flex-direction:column;align-items:center;gap:16px}
          .panel{min-width:min(320px,95vw);max-width:95vw}
          .board-wrap{width:min(340px,95vw)}
          .tile{height:clamp(40px,11vw,52px)}
          .tile-san{font-size:clamp(.6rem,3vw,.78rem)}
        }
      `}</style>

      <div className="app">
        {/* Header */}
        <div className="header">
          <h1>♟ Chess·dle</h1>
          <div className="header-sub">
            <span className="day-badge">Puzzle <strong>#{dayNum+1}</strong></span>
            <span className="date-label">{dateStr}</span>
            <span className="next-label">Next in <Countdown /></span>
          </div>
        </div>

        <div className="main">
          {/* Board column */}
          <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
            <ChessBoard
              fen={boardFen}
              filledCount={filledCount}
              onMove={handleBoardMove}
              disabled={gameState!=="playing" || filledCount>=MOVE_COUNT}
            />
            <div className="board-controls">
              <button
                className="btn-undo"
                onClick={handleUndo}
                disabled={filledCount===0 || gameState!=="playing"}
                aria-label="Undo last move"
              >
                ← Undo
              </button>
            </div>
          </div>

          {/* Guess panel */}
          <div className="panel" role="grid" aria-label="Guess grid">
            <div className="col-headers" role="row">
              {Array.from({length:MOVE_COUNT}).map((_,i) => (
                <div key={i} className={`col-header ${i%2===0?"col-w":"col-b"}`} role="columnheader">
                  {i%2===0 ? `W${Math.floor(i/2)+1}` : `B${Math.floor(i/2)+1}`}
                </div>
              ))}
            </div>

            {gameState==="playing" && (
              <div className="progress-row" aria-label={`${filledCount} of ${MOVE_COUNT} moves entered`}>
                {Array.from({length:MOVE_COUNT}).map((_,i) => (
                  <div key={i} className={`pip ${i<filledCount?"on":""}`}/>
                ))}
              </div>
            )}

            {guesses.map((row,ri) => (
              <div className="guess-row" key={ri} role="row">
                {row.map((mv,ci) => (
                  <Tile key={ci} value={mv} state={(results[ri]?.[ci]??"empty") as TileState} moveIdx={ci}/>
                ))}
              </div>
            ))}

            {gameState==="playing" && (
              <div className={`guess-row ${shake?"shake":""}`} role="row" aria-label="Current guess">
                {Array.from({length:MOVE_COUNT}).map((_,i) => {
                  const st: TileState = i<filledCount ? "active" : i===filledCount ? "current" : "empty";
                  return <Tile key={i} value={currentGuess[i]} state={st} moveIdx={i}/>;
                })}
              </div>
            )}

            {gameState==="playing" && Array.from({length:remainingRows}).map((_,ri) => (
              <div className="guess-row" key={`e${ri}`} role="row">
                {Array.from({length:MOVE_COUNT}).map((_,ci) => (
                  <Tile key={ci} value="" state="empty" moveIdx={ci}/>
                ))}
              </div>
            ))}

            <div className="error-msg" role="alert" aria-live="polite">{errorMsg}</div>

            {gameState==="playing" && (
              <div className="actions">
                <button
                  className="btn-submit"
                  onClick={submitGuess}
                  disabled={filledCount<MOVE_COUNT}
                  aria-label="Submit guess"
                >
                  Submit Guess →
                </button>
                <button
                  className="btn-hint"
                  onClick={() => setShowHint(h => !h)}
                  aria-expanded={showHint}
                  aria-label="Toggle hint"
                >
                  {showHint ? "Hide" : "Hint"}
                </button>
              </div>
            )}

            {showHint && <div className="hint-box" role="note">💡 {puzzle.hint}</div>}

            <div className="legend" aria-label="Colour key">
              <div className="legend-item"><div className="ldot ld-c"/>Correct slot</div>
              <div className="legend-item"><div className="ldot ld-p"/>Wrong slot</div>
              <div className="legend-item"><div className="ldot ld-a"/>Not in sequence</div>
            </div>
          </div>
        </div>

        {/* End banner */}
        {gameState!=="playing" && (
          <>
            <div className="divider"/>
            <div className={`end-banner ${gameState}`} role="status">
              <h2>{gameState==="won" ? "Brilliant! ✓" : "Missed it"}</h2>
              <p>
                {gameState==="won"
                  ? `Solved in ${guesses.length}/${MAX_GUESSES} attempt${guesses.length!==1?"s":""}`
                  : "The correct sequence was:"}
              </p>
              <div className="sol-moves">
                {puzzle.solution.map((m,i) => (
                  <span key={i} className="sol-move">
                    {i%2===0 ? `${Math.floor(i/2)+1}.` : ""}{m}
                  </span>
                ))}
              </div>
              <div className="opening-chip">{puzzle.name}</div>
              <div className="next-info">Next puzzle in <Countdown /></div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Export — wrapped in ErrorBoundary
// ─────────────────────────────────────────────────────────────────────────────
export default function ChessWordle() {
  return (
    <ErrorBoundary>
      <ChessWordleGame />
    </ErrorBoundary>
  );
}
