import { useEffect } from 'react'
import { useGameStore } from '../store/useGameStore'
import { useDrag } from '@use-gesture/react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function UI() {
  const { 
    status, score, highScore, gameLength, currentQuestion,
    startGame, setGameLength, answerQuestion, nextQuestion
  } = useGameStore()

  useEffect(() => {
    if (status === 'success' || status === 'crashed') {
      const timer = setTimeout(() => {
        nextQuestion()
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [status, nextQuestion])

  const bind = useDrag(({ swipe: [swipeX] }) => {
    if (status !== 'playing') return
    if (swipeX === -1) answerQuestion('a')
    if (swipeX === 1) answerQuestion('b')
  })

  // Also allow keyboard navigation for easy desktop testing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (status !== 'playing') return;
      if (e.key === 'ArrowLeft') answerQuestion('a');
      if (e.key === 'ArrowRight') answerQuestion('b');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, answerQuestion]);

  return (
    <div {...bind()} className="absolute inset-0 z-10 flex flex-col overflow-hidden touch-none" style={{ touchAction: 'none' }}>
      {/* HUD */}
      <div className="flex justify-between p-6 w-full">
        <div className="text-xl font-bold bg-black/50 px-4 py-2 rounded-xl backdrop-blur-md text-white border border-white/10">
          Score: {score}
        </div>
        <div className="text-xl font-bold bg-black/50 px-4 py-2 rounded-xl backdrop-blur-md text-white border border-white/10">
          High: {highScore}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 pointer-events-none">
        {status === 'menu' && (
          <div className="pointer-events-auto bg-black/80 backdrop-blur-lg p-8 rounded-3xl border border-purple-500/50 flex flex-col items-center text-center max-w-sm w-full shadow-[0_0_50px_rgba(168,85,247,0.2)]">
            <h1 className="text-4xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">HISTORY RUN</h1>
            <p className="text-slate-300 mb-8 font-medium">Swipe Left or Right to answer.</p>
            
            <label className="text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider">Game Length</label>
            <div className="flex gap-3 mb-8">
              {[5, 10, 20].map(len => (
                <button 
                  key={len}
                  onClick={() => setGameLength(len)}
                  className={cn(
                    "px-4 py-2 rounded-xl font-bold transition-all border-2",
                    gameLength === len 
                      ? "bg-purple-600 border-purple-400 text-white shadow-[0_0_20px_rgba(168,85,247,0.5)]" 
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                  )}
                >
                  {len}
                </button>
              ))}
            </div>
            
            <button 
              onClick={startGame}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-black text-xl py-4 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_10px_40px_rgba(236,72,153,0.4)]"
            >
              START DRIVING
            </button>
          </div>
        )}

        {(status === 'playing' || status === 'success') && currentQuestion && (
          <div className="w-full max-w-md absolute bottom-24 left-1/2 -translate-x-1/2 px-4 pointer-events-none">
            <div className="bg-black/80 backdrop-blur-xl border border-white/20 p-6 rounded-3xl mb-6 shadow-2xl">
              <h2 className="text-xl sm:text-2xl font-bold text-white text-center leading-snug">
                {currentQuestion.question}
              </h2>
            </div>
            <div className="flex gap-4">
              <div className="flex-1 bg-blue-600/90 backdrop-blur-md p-4 rounded-2xl border-2 border-blue-400/50 shadow-[0_0_30px_rgba(37,99,235,0.4)] flex flex-col justify-center">
                <div className="text-blue-200 text-xs sm:text-sm font-bold mb-1 uppercase tracking-widest text-center">← Swipe Left</div>
                <div className="text-white font-bold text-center text-base sm:text-lg">{currentQuestion.options.a}</div>
              </div>
              <div className="flex-1 bg-pink-600/90 backdrop-blur-md p-4 rounded-2xl border-2 border-pink-400/50 shadow-[0_0_30px_rgba(219,39,119,0.4)] flex flex-col justify-center">
                <div className="text-pink-200 text-xs sm:text-sm font-bold mb-1 uppercase tracking-widest text-center">Swipe Right →</div>
                <div className="text-white font-bold text-center text-base sm:text-lg">{currentQuestion.options.b}</div>
              </div>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl font-black text-green-400 drop-shadow-[0_0_30px_rgba(74,222,128,1)] animate-bounce pointer-events-none">
            PERFECT!
          </div>
        )}

        {status === 'crashed' && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center bg-black/80 backdrop-blur-md p-8 rounded-3xl border-4 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.8)] z-50 animate-bounce pointer-events-none w-11/12 max-w-md">
            <img src="../assets/cuza.jpg" alt="Alexandru Ioan Cuza" className="w-48 h-48 object-cover rounded-full mb-6 border-4 border-white shadow-[0_0_20px_rgba(255,255,255,0.5)]" />
            <div className="text-4xl sm:text-5xl font-black text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,1)] text-center leading-tight">
              Ai greșit!
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
