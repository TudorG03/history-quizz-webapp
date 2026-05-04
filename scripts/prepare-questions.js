import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, '../data');
const outPath = path.resolve(__dirname, '../src/data/questions.json');

function parseText(text) {
  const questions = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  let currentQuestion = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Matches "1. Question" but not "a. Option"
    const questionMatch = line.match(/^\d+\.\s+(.+)$/);
    if (questionMatch) {
      currentQuestion = {
        question: questionMatch[1].trim(),
        options: {},
        correctAnswer: null
      };
      continue;
    }
    
    if (currentQuestion) {
      // Handle both "a. Option" and "Varianta A: Option"
      const optAMatch = line.match(/^(?:a\.|Varianta A:)\s+(.+)$/i);
      const optBMatch = line.match(/^(?:b\.|Varianta B:)\s+(.+)$/i);
      
      const parseOption = (text, optionKey) => {
        let isCorrect = false;
        // Check if the option ends with C or (C) or ( C )
        if (/(?:\s+\(?\s*C\s*\)?)$/i.test(text)) {
          isCorrect = true;
          text = text.replace(/(?:\s+\(?\s*C\s*\)?)$/i, '').trim();
        } else if (text.includes('( C )') || text.includes('(C)')) {
           isCorrect = true;
           text = text.replace(/\(\s*C\s*\)/gi, '').trim();
        }
        
        currentQuestion.options[optionKey] = text;
        if (isCorrect) {
          currentQuestion.correctAnswer = optionKey;
        }
      };
      
      if (optAMatch) {
        parseOption(optAMatch[1].trim(), 'a');
      } else if (optBMatch) {
        parseOption(optBMatch[1].trim(), 'b');
        
        // Once we have B, we usually have a full question
        if (currentQuestion.question && currentQuestion.options.a && currentQuestion.options.b) {
          // Default correct answer if none was marked (fallback)
          if (!currentQuestion.correctAnswer) {
              console.warn(`Warning: No correct answer marked for question "${currentQuestion.question}". Defaulting to 'a'.`);
              currentQuestion.correctAnswer = 'a';
          }
          questions.push(currentQuestion);
          currentQuestion = null;
        }
      }
    }
  }
  return questions;
}

async function main() {
  try {
    const files = fs.readdirSync(dataDir);
    let allQuestions = [];

    for (const file of files) {
      const filePath = path.join(dataDir, file);
      const ext = path.extname(file).toLowerCase();
      
      let text = '';
      if (ext === '.docx') {
        const result = await mammoth.extractRawText({ path: filePath });
        text = result.value;
      } else if (ext === '.txt') {
        text = fs.readFileSync(filePath, 'utf8');
      } else {
        continue; // skip other file types
      }

      const questions = parseText(text);
      allQuestions = allQuestions.concat(questions);
    }

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(allQuestions, null, 2));
    console.log(`Saved ${allQuestions.length} total questions to ${outPath}`);
  } catch (err) {
    console.error('Error processing questions:', err);
    process.exit(1);
  }
}

main();
