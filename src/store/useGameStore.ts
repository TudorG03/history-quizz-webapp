import { create } from 'zustand'
import questionsData from '../data/questions.json'

interface Question {
  question: string;
  options: { a: string, b: string };
  correctAnswer: 'a' | 'b';
}

interface GameState {
  status: 'menu' | 'playing' | 'crashed' | 'success' | 'finished';
  score: number;
  highScore: number;
  totalCorrect: number;
  totalAttempted: number;
  gameLength: number;
  currentQuestionIndex: number;
  currentQuestion: Question | null;
  questions: Question[];
  lastAnswer: 'a' | 'b' | null;
  setStatus: (status: GameState['status']) => void;
  setGameLength: (length: number) => void;
  startGame: () => void;
  answerQuestion: (answer: 'a' | 'b') => void;
  nextQuestion: () => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  status: 'menu',
  score: 0,
  highScore: 0,
  totalCorrect: 0,
  totalAttempted: 0,
  gameLength: 10,
  currentQuestionIndex: 0,
  currentQuestion: null,
  questions: [],
  lastAnswer: null,

  setStatus: (status) => set({ status }),
  setGameLength: (length) => set({ gameLength: length }),
  
  startGame: () => {
    // Shuffle and pick
    const allQuestions = [...questionsData] as Question[];
    const shuffled = allQuestions.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, get().gameLength).map(q => {
      // Randomly swap options a and b
      if (Math.random() > 0.5) {
        return {
          ...q,
          options: {
            a: q.options.b,
            b: q.options.a
          },
          correctAnswer: q.correctAnswer === 'a' ? 'b' : 'a'
        };
      }
      return q;
    });
    
    if (selected.length === 0) return;

    set({
      status: 'playing',
      score: 0,
      totalCorrect: 0,
      totalAttempted: 0,
      questions: selected,
      currentQuestionIndex: 0,
      currentQuestion: selected[0],
      lastAnswer: null
    });
  },

  answerQuestion: (answer) => {
    const { currentQuestion, score, highScore, status, totalCorrect, totalAttempted } = get();
    if (!currentQuestion || status !== 'playing') return;

    if (currentQuestion.correctAnswer === answer) {
      const newScore = score + 1;
      set({ 
        status: 'success', 
        score: newScore,
        totalCorrect: totalCorrect + 1,
        totalAttempted: totalAttempted + 1,
        highScore: Math.max(newScore, highScore),
        lastAnswer: answer
      });
    } else {
      // Reset score but keep playing
      set({ 
        status: 'crashed', 
        score: 0, 
        totalAttempted: totalAttempted + 1,
        lastAnswer: answer 
      });
    }
  },

  nextQuestion: () => {
    const { currentQuestionIndex, questions } = get();
    const nextIndex = currentQuestionIndex + 1;
    
    if (nextIndex < questions.length) {
      set({
        status: 'playing',
        currentQuestionIndex: nextIndex,
        currentQuestion: questions[nextIndex]
      });
    } else {
      // Finished all questions for this session
      set({ status: 'finished', lastAnswer: null }); 
    }
  },

  resetGame: () => {
    set({ status: 'menu', score: 0, totalCorrect: 0, totalAttempted: 0, lastAnswer: null });
  }
}));