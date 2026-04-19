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
    
    const questionRegex = /\d+\.\s*(.*?)\s*\n+a\.\s*(.*?)\s*\n+b\.\s*(.*?)\s*(?=\n+\d+\.|\n+Level|\n*$)/gs;
    
    let match;
    while ((match = questionRegex.exec(text)) !== null) {
      const qText = match[1].trim();
      let optA = match[2].trim();
      let optB = match[3].trim();
      
      let correct = null;
      if (optA.includes('( C )') || optA.includes('(C)')) {
        correct = 'a';
        optA = optA.replace(/\(\s*C\s*\)/i, '').trim();
      } else if (optB.includes('( C )') || optB.includes('(C)')) {
        correct = 'b';
        optB = optB.replace(/\(\s*C\s*\)/i, '').trim();
      }
      
      if (qText && optA && optB && correct) {
        questions.push({
          question: qText,
          options: {
            a: optA,
            b: optB
          },
          correctAnswer: correct
        });
      }
    }
    
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(questions, null, 2));
    console.log(`Saved ${questions.length} questions to ${outPath}`);
  })
  .catch(console.error);