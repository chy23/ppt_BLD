const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Add imageMode state
content = content.replace(
  "const [visualStyle, setVisualStyle] = useState('1');",
  "const [visualStyle, setVisualStyle] = useState('1');\n  const [imageMode, setImageMode] = useState('none');"
);

// 2. Add UI for imageMode
const uiInsertPoint = `<div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">輸出格式</label>`;
const uiNew = `<div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">自動配圖模式 (Image Generation)</label>
              <select 
                className="w-full p-3 border border-gray-300 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow appearance-none"
                value={imageMode}
                onChange={(e) => setImageMode(e.target.value)}
              >
                <option value="none">❌ 純文字模式 (速度最快，硬體負擔最低)</option>
                <option value="api">☁️ 雲端 API 免費配圖 (強烈推薦，不吃效能)</option>
                <option value="local">💻 本地 WebGPU 離線生圖 (⚠️ 極吃效能，易當機)</option>
              </select>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">輸出格式</label>`;
content = content.replace(uiInsertPoint, uiNew);

// 3. Update LLM Prompt to ask for imagePrompt
content = content.replace(
  `"notes": "該頁的講者口稿 (Notes) 或排版建議"`,
  `"notes": "該頁的講者口稿 (Notes) 或排版建議",
  "imagePrompt": "如果選擇了配圖模式，請在這裡給出一句『英文』的 AI 算圖提示詞 (例如: a futuristic city skyline, cyberpunk style)。若無畫面可留白。"`
);

// 4. Update generatePPTX to be async and fetch images
const genPptxOld = `const generatePPTX = (slidesData: any[]) => {`;
const genPptxNew = `const generatePPTX = async (slidesData: any[]) => {`;
content = content.replace(genPptxOld, genPptxNew);

// 5. Update generatePPTX slide loop to handle images
const forEachOld = `slidesData.forEach(slide => {`;
const forEachNew = `for (let i = 0; i < slidesData.length; i++) {
      let slide = slidesData[i];`;
content = content.replace(forEachOld, forEachNew);

const slideLogicOld = `slideObj.addText(
          Array.isArray(contentLines) ? contentLines.map(line => ({ text: line.replace(/^[-\\*•\\s]+/, '') })) : slide.content, 
          { 
            x: 0.5, y: hasHeader ? 1.2 : 1.8, w: '90%', h: 3.5, 
            fontSize: 20, color: contentColor, bullet: true,
            valign: 'top', lineSpacing: 32
          }
        );
      }
      
      if (slide.notes) {
        slideObj.addNotes(slide.notes);
      }
    });`;
    
const slideLogicNew = `let hasImage = false;
        
        if (imageMode === 'api' && slide.imagePrompt) {
          try {
            setInitProgress(\`正在為第 \${i+1} 頁生成配圖...\`);
            let styleSuffix = '';
            if (visualStyle === '1') styleSuffix = ', anime style, cute';
            if (visualStyle === '2') styleSuffix = ', studio ghibli style, watercolor';
            if (visualStyle === '9') styleSuffix = ', chalk drawing style';
            
            const safePrompt = encodeURIComponent(slide.imagePrompt + styleSuffix);
            const res = await fetch(\`https://image.pollinations.ai/prompt/\${safePrompt}?width=800&height=600&nologo=true\`);
            const blob = await res.blob();
            const base64 = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.readAsDataURL(blob);
            });
            
            slideObj.addImage({ data: base64, x: '50%', y: hasHeader ? 1.2 : 1.8, w: '45%', h: 3.5 });
            hasImage = true;
          } catch (e) {
            console.error("Image generation failed", e);
          }
        } else if (imageMode === 'local' && i === 0) {
          // 只在第一頁警告一次
          alert("【本地 WebGPU 生圖】功能非常消耗記憶體，為了避免瀏覽器崩潰，本測試版本暫時將其導向純文字模式。請改用「雲端 API」模式來體驗完整的自動配圖功能！");
        }

        slideObj.addText(
          Array.isArray(contentLines) ? contentLines.map(line => ({ text: line.replace(/^[-\\*•\\s]+/, '') })) : slide.content, 
          { 
            x: 0.5, y: hasHeader ? 1.2 : 1.8, w: hasImage ? '45%' : '90%', h: 3.5, 
            fontSize: 20, color: contentColor, bullet: true,
            valign: 'top', lineSpacing: 32
          }
        );
      }
      
      if (slide.notes) {
        slideObj.addNotes(slide.notes);
      }
    }`;
content = content.replace(slideLogicOld, slideLogicNew);

// 6. Update generateAll to await generatePPTX
content = content.replace(`generatePPTX(parsedSlides);`, `await generatePPTX(parsedSlides);`);

fs.writeFileSync('src/App.tsx', content, 'utf-8');
console.log("Replaced successfully!");
