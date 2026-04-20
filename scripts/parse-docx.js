import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const docxPath = path.resolve(__dirname, '../intrebari joc.docx');
const outPath = path.resolve(__dirname, '../src/data/questions.json');

mammoth.extractRawText({ path: docxPath })
  .then((result) => {
    const text = result.value;
    const questions = [];
    
    // Split by level or just process line by line to find questions
    // Better approach: find all patterns that look like "1. Question text" followed by "a." and "b."
    
    // Normalize line endings and spacing
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    let currentQuestion = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Matches "1. Question" but not "a. Option"
      const questionMatch = line.match(/^\d+\.\s+(.+)$/);
      if (questionMatch) {
        if (currentQuestion) {
          // If we find a new question before finishing the previous one, skip it or handle it
          // But usually we expect a, b after a question.
        }
        currentQuestion = {
          question: questionMatch[1].trim(),
          options: {},
          correctAnswer: null
        };
        continue;
      }
      
      if (currentQuestion) {
        const optAMatch = line.match(/^a\.\s+(.+)$/i);
        const optBMatch = line.match(/^b\.\s+(.+)$/i);
        
        if (optAMatch) {
          let text = optAMatch[1].trim();
          if (text.includes('( C )') || text.includes('(C)')) {
            currentQuestion.correctAnswer = 'a';
            text = text.replace(/\(\s*C\s*\)/gi, '').trim();
          }
          currentQuestion.options.a = text;
        } else if (optBMatch) {
          let text = optBMatch[1].trim();
          if (text.includes('( C )') || text.includes('(C)')) {
            currentQuestion.correctAnswer = 'b';
            text = text.replace(/\(\s*C\s*\)/gi, '').trim();
          }
          currentQuestion.options.b = text;
          
          // Once we have B, we usually have a full question
          if (currentQuestion.question && currentQuestion.options.a && currentQuestion.options.b && currentQuestion.correctAnswer) {
            questions.push(currentQuestion);
            currentQuestion = null;
          }
        }
      }
    }
    
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(questions, null, 2));
    console.log(`Saved ${questions.length} questions to ${outPath}`);
  })
  .catch(console.error);
