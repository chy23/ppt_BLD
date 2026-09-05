const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Add imageMode state
if (!code.includes('const [imageMode, setImageMode]')) {
  code = code.replace(
    "const [visualStyle, setVisualStyle] = useState('1');",
    "const [visualStyle, setVisualStyle] = useState('1');\n  const [imageMode, setImageMode] = useState('none');"
  );
}

// 2. Add UI for imageMode above 輸出格式
const uiInsertPoint = `<div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">輸出格式</label>`;
const uiNew = `<div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">自動配圖模式 (Image Generation)</label>
              <select 
                className="w-full p-3 border border-gray-300 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow appearance-none"
                value={imageMode}
                onChange={(e) => setImageMode(e.target.value)}
              >
                <option value="none">❌ 純文字模式 (預設，速度最快，硬體負擔最低)</option>
                <option value="api">☁️ 雲端 API 免費配圖 (強烈推薦，不吃您的硬體效能)</option>
                <option value="local">💻 本地 WebGPU 離線生圖 (⚠️ 極度消耗記憶體，目前為實驗性)</option>
              </select>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">輸出格式</label>`;
if (code.includes(uiInsertPoint)) {
  code = code.replace(uiInsertPoint, uiNew);
} else {
  console.log("Could not find uiInsertPoint");
}

// 3. Prompt Image 
if (code.includes('"notes": "該頁的講者口稿 (Notes) 或排版建議"')) {
  code = code.replace(
    `"notes": "該頁的講者口稿 (Notes) 或排版建議"`,
    `"notes": "該頁的講者口稿 (Notes) 或排版建議",\n      "imagePrompt": "如果選擇了配圖模式，請在這裡給出一句『英文』的 AI 算圖提示詞 (例如: a futuristic city skyline, cyberpunk style)。若無畫面可留白。"`
  );
}

// 4. Async generatePPTX
code = code.replace('const generatePPTX = (slidesData: any[]) => {', 'const generatePPTX = async (slidesData: any[]) => {');
code = code.replace('generatePPTX(presentationData.slides);', 'await generatePPTX(presentationData.slides);');

// 5. Image fetching in generatePPTX
const slideLogicOld = `      if (slide.content) {
        const contentLines = typeof slide.content === 'string' ? slide.content.split('\\\\n').filter((l: string) => l.trim()) : slide.content;`;
const slideLogicNew = `      let hasImage = false;
      
      if (imageMode === 'api' && slide.imagePrompt) {
        try {
          setInitProgress(\`正在為第 \${i + 1} 頁簡報呼叫雲端生圖 API... (這可能需要幾秒鐘)\`);
          
          let styleSuffix = '';
          if (visualStyle === '1') styleSuffix = ', cute anime style, pastel colors, digital art';
          if (visualStyle === '2') styleSuffix = ', studio ghibli style, warm watercolor, anime background';
          if (visualStyle === '9') styleSuffix = ', chalk drawing on blackboard, educational style';
          if (visualStyle === '10') styleSuffix = ', modern flat design, vector art, colorful, canva style';
          
          const safePrompt = encodeURIComponent(slide.imagePrompt + styleSuffix);
          const res = await fetch(\`https://image.pollinations.ai/prompt/\${safePrompt}?width=800&height=600&nologo=true\`);
          const blob = await res.blob();
          const base64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
          
          slideObj.addImage({ data: base64, x: '52%', y: hasHeader ? 1.2 : 1.8, w: '43%', h: 4 });
          hasImage = true;
        } catch (e) {
          console.error("Image generation failed for slide " + i, e);
        }
      } else if (imageMode === 'local' && i === 0) {
        alert("【警告】本地 WebGPU 繪圖極其消耗系統資源！本測試版本為求穩定，暫時將其導向純文字模式。請事後改用「雲端 API」模式體驗自動配圖。");
      }
      
      if (slide.content) {
        const contentLines = typeof slide.content === 'string' ? slide.content.split('\\\\n').filter((l: string) => l.trim()) : slide.content;`;
code = code.replace(slideLogicOld, slideLogicNew);

// 6. Change addText width based on hasImage
code = code.replace(
  `x: 0.5, y: hasHeader ? 1.2 : 1.8, w: '90%', h: 3.5,`,
  `x: 0.5, y: hasHeader ? 1.2 : 1.8, w: hasImage ? '45%' : '90%', h: 3.5,`
);

// 7. Update forEach to standard loop
code = code.replace(
  `slidesData.forEach(slide => {
      let slideObj = pres.addSlide();`,
  `for (let i = 0; i < slidesData.length; i++) {
      let slide = slidesData[i];
      let slideObj = pres.addSlide();`
);
code = code.replace(
  `    });

    pres.writeFile({ fileName: "AI_Presentation.pptx" });
  };`,
  `    }
    setInitProgress('簡報製作完成，正在匯出 PPTX 檔案...');
    pres.writeFile({ fileName: "AI_Presentation.pptx" });
    setInitProgress('');
  };`
);

fs.writeFileSync('src/App.tsx', code, 'utf-8');
