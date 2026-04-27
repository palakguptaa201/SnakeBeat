import { useState, useEffect, useRef, useCallback } from 'react';

const TRACKS = [
  {
    title: 'Cyber Dream',
    artist: 'AI Alpha',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  },
  {
    title: 'Overdrive',
    artist: 'AI Beta',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  },
  {
    title: 'Synthwave',
    artist: 'AI Gamma',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  },
];

const GRID_SIZE = 20;

type DifficultyLevel = 'easy' | 'normal' | 'hard';
const DIFFICULTY_CONFIG = {
  easy: { 
    name: 'EASY', baseSpeed: 200, speedBoost: 2, startLength: 3, 
    buttonActive: 'bg-[#f0f] text-[#000] border-[2px] border-[#0ff] [box-shadow:4px_4px_0_0_#0ff]'
  },
  normal: { 
    name: 'NORMAL', baseSpeed: 150, speedBoost: 5, startLength: 3, 
    buttonActive: 'bg-[#0ff] text-[#000] border-[2px] border-[#f0f] [box-shadow:4px_4px_0_0_#f0f]'
  },
  hard: { 
    name: 'HARD', baseSpeed: 90, speedBoost: 8, startLength: 5, 
    buttonActive: 'bg-white text-[#000] border-[2px] border-[#f0f] [box-shadow:-4px_4px_0_0_#0ff]'
  },
};

const getInitialSnake = (length: number) => Array.from({length}, (_, i) => ({ x: 10, y: 10 + i }));

const SNAKE_COLORS = [
  { name: 'MAGENTA', value: '#f0f' },
  { name: 'LIME', value: '#0f0' },
  { name: 'YELLOW', value: '#ff0' },
  { name: 'ORANGE', value: '#f80' },
];

export default function App() {
  // Audio State
  const audioRef = useRef<HTMLAudioElement>(null);
  const [trackIndex, setTrackIndex] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Game State
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('normal');
  const [tailColor, setTailColor] = useState<string>('#f0f');
  const [snake, setSnake] = useState(getInitialSnake(DIFFICULTY_CONFIG['normal'].startLength));
  // Initialize food off-screen, will be set on game start instantly
  const [food, setFood] = useState({ x: -1, y: -1 });
  const [score, setScore] = useState(0);
  const [highScores, setHighScores] = useState<Record<DifficultyLevel, number>>({ easy: 0, normal: 0, hard: 0 });
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Refs for Game Loop to avoid closure stale state
  const dirRef = useRef({ x: 0, y: -1 });
  const lastRenderedDirRef = useRef({ x: 0, y: -1 });
  const snakeRef = useRef(snake);
  const foodRef = useRef(food);
  const gameStartedRef = useRef(gameStarted);
  const isPausedRef = useRef(isPaused);
  const scoreRef = useRef(score);
  const tailColorRef = useRef(tailColor);
  const growthRef = useRef(0);

  useEffect(() => { snakeRef.current = snake; }, [snake]);
  useEffect(() => { foodRef.current = food; }, [food]);
  useEffect(() => { gameStartedRef.current = gameStarted; }, [gameStarted]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { tailColorRef.current = tailColor; }, [tailColor]);

  const generateFood = useCallback((currentSnake: {x: number, y: number}[]) => {
    const availableSpaces = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        if (!currentSnake.some(s => s.x === x && s.y === y)) {
          availableSpaces.push({ x, y });
        }
      }
    }
    
    // Fallback if somehow grid is full
    if (availableSpaces.length === 0) return { x: -1, y: -1 };

    const randomIndex = Math.floor(Math.random() * availableSpaces.length);
    return availableSpaces[randomIndex];
  }, []);

  const handleDir = (newDir: {x: number, y: number}) => {
    const currDir = lastRenderedDirRef.current;
    if (currDir.x !== 0 && newDir.x !== 0) return;
    if (currDir.y !== 0 && newDir.y !== 0) return;
    dirRef.current = newDir;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === " ") {
        if (!gameStartedRef.current) {
          startGame();
        } else if (gameOver) {
          resetGame();
        } else {
          setIsPaused(p => !p);
        }
        return;
      }

      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          handleDir({ x: 0, y: -1 });
          break;
        case "ArrowDown":
        case "s":
        case "S":
          handleDir({ x: 0, y: 1 });
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          handleDir({ x: -1, y: 0 });
          break;
        case "ArrowRight":
        case "d":
        case "D":
          handleDir({ x: 1, y: 0 });
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameOver]);

  const startGame = () => {
    setGameStarted(true);
    setGameOver(false);
    setIsPaused(false);
    setScore(0);
    dirRef.current = { x: 0, y: -1 };
    lastRenderedDirRef.current = { x: 0, y: -1 };
    growthRef.current = 0;
    
    const startSnake = getInitialSnake(DIFFICULTY_CONFIG[difficulty].startLength);
    setSnake(startSnake);
    setFood(generateFood(startSnake));

    if (!isPlayingAudio && audioRef.current) {
      toggleAudio();
    }
  };

  const resetGame = () => {
    startGame();
  };

  useEffect(() => {
    if (!gameStarted || gameOver || isPaused) return;

    let timeoutId: NodeJS.Timeout;

    const gameLoop = () => {
      const currSnake = snakeRef.current;
      const head = currSnake[0];
      const dir = dirRef.current;

      const newHead = { x: head.x + dir.x, y: head.y + dir.y };

      if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
        handleGameOver();
        return;
      }

      if (currSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        handleGameOver();
        return;
      }

      lastRenderedDirRef.current = dir;

      const newSnake = [newHead, ...currSnake];

      if (newHead.x === foodRef.current.x && newHead.y === foodRef.current.y) {
        setScore(s => s + 10);
        setFood(generateFood(newSnake));
        growthRef.current += 2; // Extra growth to make it visible
      } else if (growthRef.current > 0) {
        growthRef.current -= 1;
      } else {
        newSnake.pop();
      }

      setSnake(newSnake);

      // Determine next tick speed with random fluctuation +/- 15%
      const currentScore = scoreRef.current;
      const baseSpeed = Math.max(40, DIFFICULTY_CONFIG[difficulty].baseSpeed - Math.floor(currentScore / 50) * DIFFICULTY_CONFIG[difficulty].speedBoost);
      const fluctuation = baseSpeed * 0.15;
      const dynamicSpeed = baseSpeed + (Math.random() * (fluctuation * 2) - fluctuation);

      timeoutId = setTimeout(gameLoop, dynamicSpeed);
    };

    timeoutId = setTimeout(gameLoop, DIFFICULTY_CONFIG[difficulty].baseSpeed);

    return () => clearTimeout(timeoutId);
  }, [gameStarted, gameOver, isPaused, difficulty, generateFood]);

  const handleGameOver = () => {
    setGameOver(true);
    setGameStarted(false);
    setHighScores(s => ({ ...s, [difficulty]: Math.max(s[difficulty], score) }));
  };

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
    } else {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => {
          if (e.name !== 'AbortError') console.error("Audio playback blocked:", e);
        });
      }
    }
    setIsPlayingAudio(!isPlayingAudio);
  };

  const skipTrack = (direction: 'next' | 'prev') => {
    let newIndex = trackIndex;
    if (direction === 'next') {
      newIndex = (trackIndex + 1) % TRACKS.length;
    } else {
      newIndex = (trackIndex - 1 + TRACKS.length) % TRACKS.length;
    }
    setTrackIndex(newIndex);
  };

  useEffect(() => {
    if (isPlayingAudio && audioRef.current) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => {
          if (e.name !== 'AbortError') {
            console.error("Audio playback blocked after skip:", e);
            setIsPlayingAudio(false);
          }
        });
      }
    }
  }, [trackIndex]);

  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;
    const handleEnded = () => skipTrack('next');
    audioEl.addEventListener('ended', handleEnded);
    return () => audioEl.removeEventListener('ended', handleEnded);
  }, [trackIndex]);

  return (
    <div className="min-h-screen bg-[#000] font-mono text-[#0ff] crt scanlines tear selection:bg-[#f0f] selection:text-black overflow-x-hidden relative flex flex-col items-center p-4">
      <div className="noise-bg" />
      <audio ref={audioRef} src={TRACKS[trackIndex].url} preload="auto" />

      <div className="z-10 w-full max-w-6xl flex flex-col items-center gap-6 md:gap-8 mt-2 md:mt-6">
        
        {/* Header */}
        <header className="w-full flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-4 border-[#f0f] pb-4 px-2">
          <div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-pixel glitch tracking-tighter" data-text="SNAKE BEAT">
              SNAKE BEAT
            </h1>
            <p className="text-[10px] md:text-sm text-[#f0f] mt-4 uppercase tracking-widest bg-[#111] inline-block px-3 py-1 border-l-4 border-[#0ff]">
              STATUS: {gameOver ? 'GAME OVER' : (isPaused ? 'PAUSED' : (gameStarted ? 'PLAYING' : 'READY'))}
            </p>
          </div>
          
          <div className="flex gap-6 md:gap-10 text-xl md:text-3xl font-bold bg-[#111] p-3 md:p-4 border-[3px] border-[#0ff] [box-shadow:6px_6px_0_0_#f0f] shrink-0">
            <div className="flex flex-col">
              <span className="text-white text-xs md:text-sm font-pixel mb-1 text-[#f0f]">SCORE</span> 
              <span className="text-[#0ff] font-pixel">{score.toString().padStart(4, '0')}</span>
            </div>
            <div className="flex flex-col border-l-2 border-[#333] pl-6 md:pl-10">
              <span className="text-white text-xs md:text-sm font-pixel mb-1 text-[#0ff]">HIGH SCORE</span> 
              <span className="text-[#f0f] font-pixel">{highScores[difficulty].toString().padStart(4, '0')}</span>
            </div>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-8 lg:gap-16 w-full mt-4">
          
          {/* Game Board Container */}
          <div className="flex flex-col gap-6 w-full max-w-[400px] md:max-w-[500px] shrink-0">
            {/* Game Board */}
            <div className="relative w-full aspect-square bg-[#0a0a0a] border-[4px] border-[#0ff] [box-shadow:8px_8px_0_0_#f0f] overflow-hidden">
            
            {/* Grid overlay aesthetic */}
            <div className="absolute inset-0 opacity-[0.15] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#f0f 1px, transparent 1px), linear-gradient(90deg, #f0f 1px, transparent 1px)', backgroundSize: `${100/GRID_SIZE}% ${100/GRID_SIZE}%` }}></div>

            {!gameStarted && !gameOver && (
              <div className="absolute inset-3 bg-[#000]/95 flex flex-col items-center justify-center z-20 px-4 text-center border-4 border-dashed border-[#f0f] [box-shadow:inset_0_0_40px_rgba(255,0,255,0.2)]">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-pixel text-[#0ff] mb-10 animate-pulse drop-shadow-[0_0_10px_#0ff] tracking-tight">SNAKE BEAT</h2>
                
                <div className="flex flex-col gap-4 mb-10 w-full max-w-[280px]">
                  {(['easy', 'normal', 'hard'] as DifficultyLevel[]).map(level => (
                    <button
                      key={level}
                      onClick={() => setDifficulty(level)}
                      className={`py-3 px-4 font-pixel text-xs md:text-sm uppercase transition-none ${
                        difficulty === level 
                          ? DIFFICULTY_CONFIG[level].buttonActive
                          : 'bg-[#111] text-[#666] border-[2px] border-[#333] hover:border-[#0ff] hover:text-[#0ff]'
                      }`}
                    >
                      {DIFFICULTY_CONFIG[level].name}
                    </button>
                  ))}
                </div>

                <div className="w-full max-w-[280px] mb-10 border-2 border-[#333] p-3 text-left bg-black text-[#0ff]">
                  <p className="text-[10px] md:text-xs font-pixel mb-3 text-[#f0f]">&gt; SYS_TAIL_COLOR:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {SNAKE_COLORS.map(c => (
                       <button 
                         key={c.name}
                         onClick={(e) => { e.stopPropagation(); setTailColor(c.value); }}
                         className={`w-8 h-8 md:w-10 md:h-10 border-2 transition-none shadow-[2px_2px_0_0_rgba(255,255,255,0.2)]`}
                         style={{ 
                           backgroundColor: c.value,
                           borderColor: tailColor === c.value ? '#fff' : '#000',
                           opacity: tailColor === c.value ? 1 : 0.5 
                         }}
                         title={c.name}
                       />
                    ))}
                  </div>
                </div>

                <button
                  onClick={startGame}
                  className="py-5 px-8 bg-[#f0f] text-[#000] font-pixel text-sm md:text-base border-[3px] border-[#0ff] [box-shadow:6px_6px_0_0_#0ff] hover:translate-y-[2px] hover:translate-x-[2px] hover:[box-shadow:2px_2px_0_0_#0ff] uppercase transition-all"
                >
                  PLAY NOW
                </button>
                <p className="mt-8 text-[10px] md:text-[12px] text-[#555] font-pixel animate-pulse">* PRESS SPACE TO PLAY/PAUSE</p>
              </div>
            )}

            {gameOver && (
              <div className="absolute inset-2 bg-[#110000] flex flex-col items-center justify-center z-20 px-4 text-center border-[6px] border-red-600 glitch" data-text="GAME OVER">
                <h2 className="text-4xl md:text-5xl font-pixel text-red-500 mb-4 mt-6 glitch" data-text="GAME OVER">GAME OVER</h2>
                <div className="text-sm md:text-lg text-white font-mono mb-10 bg-black px-4 py-2 border-l-4 border-red-600 shadow-[2px_2px_0_0_red]">
                  FINAL SCORE: {score}
                </div>
                
                <div className="flex justify-center gap-3 mb-10 bg-black p-3 border-2 border-red-900 w-full max-w-[320px]">
                  {(['easy', 'normal', 'hard'] as DifficultyLevel[]).map(level => (
                    <button
                      key={level}
                      onClick={() => setDifficulty(level)}
                      className={`px-2 py-2 w-full font-pixel text-[8px] md:text-[10px] uppercase transition-none ${
                        difficulty === level 
                          ? 'bg-red-600 text-white border-[2px] border-white'
                          : 'text-red-900 border-[2px] border-red-900 hover:text-red-500 hover:border-red-500 bg-[#110000]'
                      }`}
                    >
                      {DIFFICULTY_CONFIG[level].name}
                    </button>
                  ))}
                </div>

                <button
                  onClick={resetGame}
                  className="py-4 px-8 bg-black text-red-500 font-pixel text-sm border-[3px] border-red-500 hover:bg-red-500 hover:text-black uppercase [box-shadow:6px_6px_0_0_red] active:translate-x-[2px] active:translate-y-[2px] active:[box-shadow:2px_2px_0_0_red]"
                >
                  PLAY AGAIN
                </button>
              </div>
            )}

            {isPaused && !gameOver && gameStarted && (
               <div className="absolute inset-4 bg-[#000]/80 flex flex-col items-center justify-center z-20 border-[4px] border-[#0ff] border-dashed backdrop-blur-sm">
                 <h2 className="text-2xl md:text-4xl font-pixel text-[#f0f] bg-black px-6 py-4 border-y-4 border-[#0ff] animate-pulse">
                   [ PAUSED ]
                 </h2>
               </div>
            )}

            {/* Snake Body */}
            {snake.map((segment, i) => (
              <div
                key={i}
                className="absolute shadow-[0_0_10px_#0ff]"
                style={{
                  left: `${(segment.x / GRID_SIZE) * 100}%`,
                  top: `${(segment.y / GRID_SIZE) * 100}%`,
                  width: `${100 / GRID_SIZE}%`,
                  height: `${100 / GRID_SIZE}%`,
                  backgroundColor: i === 0 ? '#0ff' : tailColor,
                  border: '1px solid #111',
                  zIndex: i === 0 ? 10 : 5,
                  boxShadow: i === 0 ? '0 0 10px #0ff' : `0 0 10px ${tailColor}`,
                }}
              />
            ))}

            {/* Food */}
            <div
              className="absolute bg-white"
              style={{
                left: `${(food.x / GRID_SIZE) * 100}%`,
                top: `${(food.y / GRID_SIZE) * 100}%`,
                width: `${100 / GRID_SIZE}%`,
                height: `${100 / GRID_SIZE}%`,
                border: '2px solid #0ff',
                boxShadow: '0 0 15px #f0f, inset 0 0 5px #f0f',
                animation: 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite'
              }}
            />
          </div>

          <button
            onClick={() => {
              if (!gameStarted || gameOver) return;
              setIsPaused(p => !p);
            }}
            disabled={!gameStarted || gameOver}
            className={`py-3 md:py-4 px-6 font-pixel text-sm md:text-base border-[3px] uppercase transition-none w-full flex justify-center items-center gap-4 ${(!gameStarted || gameOver) ? 'bg-[#111] text-[#444] border-[#333] cursor-not-allowed' : (isPaused ? 'bg-[#f0f] text-black border-[#0ff] [box-shadow:4px_4px_0_0_#0ff] active:translate-y-[2px] active:translate-x-[2px] active:[box-shadow:2px_2px_0_0_#0ff]' : 'bg-[#111] text-[#f0f] border-[#0ff] hover:bg-[#0ff] hover:text-black hover:border-black [box-shadow:4px_4px_0_0_#f0f] active:translate-y-[2px] active:translate-x-[2px] active:[box-shadow:2px_2px_0_0_#0ff]')}`}
          >
            {isPaused ? 'RESUME' : 'PAUSE'}
          </button>
        </div>

          {/* Side Panel: Music & Mobile Controls */}
          <div className="flex flex-col gap-8 w-full max-w-sm shrink-0">
            
            {/* Music Terminal */}
            <div className="bg-[#050505] p-5 md:p-6 flex flex-col gap-5 border-[4px] border-[#f0f] [box-shadow:-8px_8px_0_0_#0ff] relative">
              <div className="absolute top-2 left-2 w-3 h-3 bg-[#0ff] animate-pulse shadow-[0_0_10px_#0ff]" />
              
              <div className="border-b-[3px] border-dashed border-[#0ff] pb-3 flex justify-between items-end pl-6">
                <span className="text-[#f0f] font-pixel text-xs">MUSIC</span>
                <span className={`text-[10px] md:text-xs font-pixel ${isPlayingAudio ? 'text-[#0ff]' : 'text-[#777]'}`}>{isPlayingAudio ? 'PLAYING' : 'PAUSED'}</span>
              </div>

              <div className="bg-[#111] p-4 border-2 border-[#333] flex flex-col gap-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-8 h-8 bg-[#0ff] opacity-10"></div>
                
                <span className="text-[10px] text-[#f0f] font-pixel bg-black self-start px-1 border border-[#333]">TITLE</span>
                <span className="text-white text-sm md:text-base break-words font-pixel truncate mt-1">{TRACKS[trackIndex].title}</span>
                
                <span className="text-[10px] text-[#0ff] font-pixel bg-black self-start px-1 border border-[#333] mt-3">ARTIST</span>
                <span className="text-[#0ff] text-xs font-pixel mt-1">{TRACKS[trackIndex].artist}</span>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-2 font-pixel text-[10px] md:text-xs">
                <button 
                  onClick={() => skipTrack('prev')} 
                  className="py-3 md:py-4 bg-[#111] border-[2px] border-[#0ff] hover:bg-[#0ff] hover:text-black transition-none active:translate-y-[2px] [box-shadow:2px_2px_0_0_#f0f]"
                >
                  PREV
                </button>
                <button 
                  onClick={toggleAudio}
                  className={`py-3 md:py-4 font-bold border-[2px] transition-none active:translate-y-[2px] ${isPlayingAudio ? 'bg-[#f0f] text-black border-[#0ff] [box-shadow:2px_2px_0_0_#0ff]' : 'bg-[#111] text-[#0ff] border-[#f0f] hover:bg-[#f0f] hover:text-black hover:border-[#0ff] [box-shadow:2px_2px_0_0_#f0f]'}`}
                >
                  {isPlayingAudio ? 'PAUSE' : 'PLAY'}
                </button>
                <button 
                  onClick={() => skipTrack('next')} 
                  className="py-3 md:py-4 bg-[#111] border-[2px] border-[#0ff] hover:bg-[#0ff] hover:text-black transition-none active:translate-y-[2px] [box-shadow:2px_2px_0_0_#f0f]"
                >
                  NEXT
                </button>
              </div>
            </div>

            {/* Mobile Directional / Status Block */}
            <div className="lg:hidden bg-[#050505] p-5 border-[4px] border-[#0ff] [box-shadow:-8px_8px_0_0_#f0f] flex flex-col">
              <span className="text-[#f0f] font-pixel text-xs mb-5 text-center bg-black border border-[#f0f] py-2">CONTROLS</span>
              
              <div className="grid grid-cols-3 gap-3 justify-items-center mb-6 mt-2 relative font-pixel">
                <div />
                <button onClick={() => handleDir({x:0, y:-1})} className="w-14 h-14 flex items-center justify-center bg-[#111] text-[#0ff] border-[3px] border-[#f0f] hover:bg-[#0ff] hover:text-black hover:border-black active:translate-y-[2px] [box-shadow:4px_4px_0_0_#0ff]">W</button>
                <div />
                <button onClick={() => handleDir({x:-1, y:0})} className="w-14 h-14 flex items-center justify-center bg-[#111] text-[#0ff] border-[3px] border-[#f0f] hover:bg-[#0ff] hover:text-black hover:border-black active:translate-y-[2px] [box-shadow:4px_4px_0_0_#0ff]">A</button>
                <button onClick={() => handleDir({x:0, y:1})} className="w-14 h-14 flex items-center justify-center bg-[#111] text-[#0ff] border-[3px] border-[#f0f] hover:bg-[#0ff] hover:text-black hover:border-black active:translate-y-[2px] [box-shadow:4px_4px_0_0_#0ff]">S</button>
                <button onClick={() => handleDir({x:1, y:0})} className="w-14 h-14 flex items-center justify-center bg-[#111] text-[#0ff] border-[3px] border-[#f0f] hover:bg-[#0ff] hover:text-black hover:border-black active:translate-y-[2px] [box-shadow:4px_4px_0_0_#0ff]">D</button>
              </div>

              <div className="text-[10px] text-[#555] mt-2 text-center border-t-[2px] border-dashed border-[#333] pt-4 font-pixel">
                KEYBOARD SUPPORTED
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
