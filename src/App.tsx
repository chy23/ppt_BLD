import React, { useState } from 'react';
import { Upload, FileText, Settings, CheckCircle, Presentation, Table2, FileUp, Cpu, Loader2, Paintbrush, Image as ImageIcon } from 'lucide-react';


const AVAILABLE_MODELS = [
  { id: "Llama-3.2-1B-Instruct-q4f16_1-MLC", name: "Llama 3.2 (1B) (Meta, 美國) - 預設推薦", hint: "【預設推薦】極度輕量、穩定且快速。適合絕大多數手機與文書筆電。反應迅速，絕佳的測試首選。" },
  { id: "gemma3-1b-it-q4f16_1-MLC", name: "Gemma 3 (1B) (Google, 美國)", hint: "【注意】目前的 WebLLM 版本對此模型有組態衝突 (sliding_window_size 錯誤)，暫時不建議使用。" },
  { id: "Phi-3.5-mini-instruct-q4f16_1-MLC", name: "Phi-3.5 mini (Microsoft, 美國)", hint: "【限制與建議】微軟推出的輕量模型，效能高，中英混合處理能力不錯。" },
  { id: "Phi-4-mini-instruct-q4f16_1-MLC", name: "Phi-4 mini (Microsoft, 美國)", hint: "【限制與建議】微軟最新一代輕量模型，邏輯推理能力顯著提升。" },
  { id: "Llama-3.2-3B-Instruct-q4f16_1-MLC", name: "Llama 3.2 (3B) (Meta, 美國)", hint: "【限制與建議】硬體需求中 (需 3~4GB 記憶體)。適合中階電腦，中文能力不錯且速度較快。" },
  { id: "Mistral-7B-Instruct-v0.3-q4f16_1-MLC", name: "Mistral v0.3 (7B) (Mistral AI, 法國)", hint: "【限制與建議】硬體需求高。歐洲知名的開源模型，邏輯推演強，但中文比例略低於 Llama。" },
  { id: "Llama-3.1-8B-Instruct-q4f16_1-MLC", name: "Llama 3.1 (8B) (Meta, 美國)", hint: "【進階大模型】硬體需求高 (需 8GB+ 記憶體)。首次下載需數十分鐘！中文處理與邏輯擴寫能力極佳。" },
  { id: "gemma-2-9b-it-q4f16_1-MLC", name: "Gemma 2 (9B) (Google, 美國)", hint: "【進階大模型】硬體需求最高 (需 8GB+ 記憶體)。首次下載需數十分鐘！Google 的強大模型，細節最豐富。" },
  { id: "gemma-2-2b-it-q4f16_1-MLC", name: "Gemma 2 (2B) (Google, 美國)", hint: "【限制與建議】硬體需求低。上一代輕量級選項，生成複雜簡報時結構可能較單薄。" }
];

function App() {
  const [sourceText, setSourceText] = useState('');
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [isDraggingSource, setIsDraggingSource] = useState(false);
  const [textMode, setTextMode] = useState('A');
  const [useIP, setUseIP] = useState(false);
  const [ipImageFile, setIpImageFile] = useState<File | null>(null);
  const [isDraggingIP, setIsDraggingIP] = useState(false);
  const [visualStyle, setVisualStyle] = useState('1');
  const [imageMode, setImageMode] = useState('none');
  const [outputFormat, setOutputFormat] = useState('B'); 
  
  // WebLLM State
  const [selectedModelStr, setSelectedModelStr] = useState(AVAILABLE_MODELS[0].id); // 預設使用 Llama 3.1 8B
  const [engine, setEngine] = useState<any>(null);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [initProgress, setInitProgress] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSourceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSourceFile(file);
      
      // 若為文字檔，直接讀取內容填入 sourceText
      if (file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.csv') || file.type.startsWith('text/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target && typeof e.target.result === 'string') {
            setSourceText(e.target.result);
          }
        };
        reader.readAsText(file);
      } else {
        alert("提示：網頁版目前無法直接解析 PDF / Word 內容。為獲得最佳效果，建議您直接『複製貼上』文字到下方的文字框中！");
      }
    }
  };

  const translateProgress = (text: string) => {
    if (!text) return "";
    let t = text;
    t = t.replace('Fetching param cache', '下載模型參數快取');
    t = t.replace('MB fetched.', 'MB 已下載。');
    t = t.replace('completed,', '完成，');
    t = t.replace('secs elapsed.', '秒經過。');
    t = t.replace('It can take a while when we first visit this page to populate the cache.', '初次載入需要較長時間下載數 GB 的模型檔案。');
    t = t.replace('Later refreshes will become faster.', '未來再次開啟網頁將會直接從本機快取讀取，速度會大幅加快。');
    t = t.replace('Loading model from cache', '從本機快取讀取模型');
    t = t.replace('Finish loading', '載入完成');
    return t;
  };

  const loadModel = async () => {
    setIsLoadingModel(true);
    setError(null);
    setInitProgress('');
    try {
      const { CreateMLCEngine } = await import("@mlc-ai/web-llm");
      const newEngine = await CreateMLCEngine(selectedModelStr, {
        initProgressCallback: (info) => {
          if (info && info.text) {
            setInitProgress(translateProgress(info.text));
          }
        }
      });
      setEngine(newEngine);
      setInitProgress("✅ 模型加載完成！");
    } catch (err: any) {
      console.error(err);
      setError("無法加載模型。可能是您選擇的模型目前 WebLLM 套件尚未支援，或是您的硬體不支援 WebGPU。\n詳細錯誤: " + err.message);
      alert("無法加載模型！詳細錯誤請見畫面紅框處。");
    } finally {
      setIsLoadingModel(false);
    }
  };

  const handleInterrupt = () => {
    if (engine) {
      engine.interruptGenerate();
      setIsGenerating(false);
      setError("已由使用者中斷生成。");
    }
  };

  const generatePPTX = async (slidesData: any[]) => {
    const PptxGenJS = (await import("pptxgenjs")).default;
    let pres = new PptxGenJS();
    
    // 設定不同風格的樣式參數
    let bgColor = 'FFFFFF';
    let titleColor = '363636';
    let contentColor = '666666';
    let hasHeader = false;
    let headerColor = '4F46E5';

    switch(visualStyle) {
      case '1': // 日式 Q 版漫畫風格 (粉彩)
        bgColor = 'FFF0F5';
        titleColor = 'FF69B4';
        contentColor = '555555';
        break;
      case '2': // 吉卜力溫暖插畫風 (暖綠)
        bgColor = 'F4F7F2';
        titleColor = '2E5339';
        contentColor = '4A4A4A';
        break;
      case '6': // 商務簡潔風
        bgColor = 'FFFFFF';
        titleColor = '1E3A8A';
        contentColor = '333333';
        hasHeader = true;
        headerColor = '1E3A8A';
        break;
      case '9': // 黑板教室風
        bgColor = '2F4F4F';
        titleColor = 'FFFFFF';
        contentColor = 'E0E0E0';
        break;
      case '10': // Canva 繽紛簡報風
        bgColor = 'F3F4F6';
        titleColor = '7C3AED';
        contentColor = '4B5563';
        hasHeader = true;
        headerColor = 'FCD34D';
        break;
      default:
        bgColor = 'FFFFFF';
        titleColor = '363636';
        break;
    }

    for (let i = 0; i < slidesData.length; i++) {
      let slide = slidesData[i];
      let slideObj = pres.addSlide();
      slideObj.background = { color: bgColor };
      
      if (hasHeader) {
        slideObj.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.8, fill: { color: headerColor } });
        slideObj.addText(slide.title || '', { 
          x: 0.5, y: 0.1, w: '90%', h: 0.6, 
          fontSize: 28, bold: true, color: (visualStyle === '6' ? 'FFFFFF' : '111827') 
        });
      } else {
        slideObj.addText(slide.title || '', { 
          x: 0.5, y: 0.5, w: '90%', h: 1, 
          fontSize: 28, bold: true, color: titleColor 
        });
      }
      
      let hasImage = false;
      if (imageMode === 'api' && slide.imagePrompt) {
        try {
          setInitProgress(`正在為第 ${i + 1} 頁簡報生成配圖... (約需數秒)`);
          let styleSuffix = '';
          if (visualStyle === '1') styleSuffix = ', anime style, cute';
          if (visualStyle === '2') styleSuffix = ', studio ghibli style, watercolor';
          if (visualStyle === '9') styleSuffix = ', chalk drawing style';
          
          const safePrompt = encodeURIComponent(slide.imagePrompt + styleSuffix);
          const res = await fetch(`https://image.pollinations.ai/prompt/${safePrompt}?width=800&height=600&nologo=true`);
          const blob = await res.blob();
          const base64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
          
          slideObj.addImage({ data: base64 as string, x: '52%', y: hasHeader ? 1.2 : 1.8, w: '43%', h: 4 });
          hasImage = true;
        } catch (e) {
          console.error("Image generation failed", e);
        }
      } else if (imageMode === 'local' && i === 0) {
        alert("【警告】本地 WebGPU 繪圖極其消耗系統資源！本測試版本為求穩定，暫不載入 Web SD，將為您導向純文字模式。請事後改用「雲端 API」模式體驗自動配圖。");
      }
      
      if (slide.content) {
        // 將內容根據 \n 拆分成真正的陣列，讓 bullet 排版更美觀
        const contentLines = typeof slide.content === 'string' ? slide.content.split('\\n').filter((l: string) => l.trim()) : slide.content;
        
        slideObj.addText(
          Array.isArray(contentLines) ? contentLines.map(line => ({ text: line.replace(/^[-\*•\s]+/, '') })) : slide.content, 
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
    }
    setInitProgress('簡報製作完成，正在匯出 PPTX 檔案...');
    pres.writeFile({ fileName: "AI_Presentation.pptx" });
    setInitProgress('');
  };

  const callWebLLM = async () => {
    if (!engine) throw new Error("引擎尚未加載");
    setStreamText('');

    const prompt = `
你是一個專業的 AI 簡報生成助理。請【嚴格】根據以下提供的來源內容，設計出一份簡報。絕對不可以自己發明與來源無關的內容！

【任務指示】：
1. 深入解析來源內容：必須萃取出核心概念與重點，將其組織成簡報邏輯。若來源內容很少，請適度擴充相關背景知識；若來源內容很多，請摘要。
2. 頁面內容：每一頁的 \`content\` 包含 3 到 5 個具體的條列式重點，請用 '\\n' 換行。
3. 英文配圖提示詞：每一頁都必須在 \`imagePrompt\` 欄位提供一句【純英文】的畫面描述，這將用來呼叫 AI 繪圖 API (例如: "A cute dog playing in a futuristic park, highly detailed")。

文字處理方式：${textMode} (A: 完整保留, B: 協助潤飾, C: 摘要並擴充細節)
視覺風格設定：${visualStyle}
是否使用人物IP：${useIP}

【簡報來源內容 (請嚴格根據此內容撰寫)】：
${sourceText || (sourceFile ? '使用者上傳了檔案 (檔名: ' + sourceFile.name + ')，但目前網頁版無法直接解析 PDF/Word。請以該檔名為主題，生成一份展示用的範例簡報。' : '')}

【絕對要求】：務必嚴格以 JSON 格式回傳，不得包含任何額外的對話文字或 markdown 語法 (例如 \`\`\`json)。
回傳格式必須完全符合以下結構：
{
  "slides": [
    {
      "title": "單頁標題",
      "content": "重點一\\n重點二\\n重點三",
      "notes": "講者口白",
      "imagePrompt": "English prompt for image generation..."
    }
  ]
}
`;

    const asyncChunkGenerator = await engine.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      stream: true
    });

    let fullText = "";
    for await (const chunk of asyncChunkGenerator) {
      const delta = chunk.choices[0]?.delta?.content || "";
      fullText += delta;
      setStreamText(fullText);
    }

    let jsonStr = fullText;
    const jsonMatch = fullText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    try {
      return JSON.parse(jsonStr);
    } catch (parseErr) {
      console.log("Raw output:", fullText);
      throw new Error("模型回傳的格式非有效 JSON (小型模型易發生此問題)。回傳內容為：\\n" + fullText.substring(0, 200) + "...");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!engine) {
      setError('請先加載本地端 WebLLM 模型');
      return;
    }
    
    setIsGenerating(true);
    setResult(null);
    setError(null);
    
    try {
      const presentationData = await callWebLLM();
      
      if (outputFormat === 'B') {
        await generatePPTX(presentationData.slides);
        setResult('🎉 成功！您的 PPTX 簡報檔已開始下載。');
      } else {
        setResult('🎉 成功生成！由於是網頁預覽版，目前僅直接輸出規劃結果：\n' + JSON.stringify(presentationData, null, 2));
      }
    } catch (err: any) {
      setError(err.message || '生成失敗，請重試。');
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedModelObj = AVAILABLE_MODELS.find(m => m.id === selectedModelStr);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-indigo-600 px-6 py-8 sm:px-8 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Presentation size={32} />
            <h1 className="text-3xl font-bold">AI 簡報生成助理 (WebLLM 本地版)</h1>
          </div>
          <p className="text-indigo-100 mt-2 text-lg">
            使用您的顯示卡 (WebGPU) 在瀏覽器中完全本地執行 AI 模型，確保 100% 隱私！
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-8 sm:px-8 space-y-8">
          
          {/* WebLLM Setup */}
          <section className="bg-indigo-50 p-5 rounded-xl border border-indigo-200">
            <h2 className="text-lg font-semibold text-indigo-900 mb-3 flex items-center gap-2">
              <Cpu size={20} />
              本地端模型設定 (WebLLM)
            </h2>
            <p className="text-sm text-indigo-700 mb-4">
              模型將下載至您的瀏覽器快取中，並利用您的裝置硬體進行運算。第一次下載可能需要數分鐘時間。
            </p>
            
            <div className="flex flex-col mb-4 gap-2">
              <div className="flex flex-col sm:flex-row gap-3">
                <select 
                  className="flex-1 rounded-lg border border-indigo-300 px-4 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  value={selectedModelStr}
                  onChange={(e) => setSelectedModelStr(e.target.value)}
                  disabled={engine != null || isLoadingModel}
                >
                  {AVAILABLE_MODELS.map(model => (
                    <option key={model.id} value={model.id}>{model.name}</option>
                  ))}
                </select>
                
                <button
                  type="button"
                  onClick={loadModel}
                  disabled={isLoadingModel || engine != null}
                  className="whitespace-nowrap px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2 justify-center"
                >
                  {isLoadingModel && <Loader2 size={16} className="animate-spin" />}
                  {engine ? '已加載' : (isLoadingModel ? '下載/加載中...' : '載入模型')}
                </button>
              </div>
              
              {selectedModelObj && (
                <p className="text-xs text-indigo-600 mt-1">
                  {selectedModelObj.hint}
                </p>
              )}
            </div>

            {initProgress && (
              <div className="text-xs font-mono text-indigo-800 bg-indigo-100 p-2 rounded truncate">
                {initProgress}
              </div>
            )}
            
            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-800 rounded-xl p-4">
                <p className="font-medium whitespace-pre-wrap">{error}</p>
              </div>
            )}
          </section>

          {/* 1. Source */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="text-indigo-600" size={24} />
              1. 簡報來源內容
            </h2>
            <div className="space-y-4">
              <div className="relative">
                <input 
                  type="file" 
                  id="source-file" 
                  className="hidden" 
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md"
                  onChange={handleSourceFileChange}
                />
                <label 
                  htmlFor="source-file"
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingSource(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setIsDraggingSource(false); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingSource(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      const file = e.dataTransfer.files[0];
                      setSourceFile(file);
                      if (file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.csv') || file.type.startsWith('text/')) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          if (ev.target && typeof ev.target.result === 'string') {
                            setSourceText(ev.target.result);
                          }
                        };
                        reader.readAsText(file);
                      } else {
                        alert("提示：網頁版目前無法直接解析 PDF / Word 內容。為獲得最佳效果，建議您直接『複製貼上』文字到下方的文字框中！");
                      }
                    }
                  }}
                  className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl transition-colors cursor-pointer ${isDraggingSource ? 'bg-indigo-100 border-indigo-500' : 'bg-white border-gray-300 hover:bg-indigo-50 hover:border-indigo-400'}`}
                >
                  <FileUp className={`mb-2 ${isDraggingSource ? 'text-indigo-600 scale-110 transition-transform' : 'text-indigo-500'}`} size={28} />
                  <span className="text-sm font-medium text-gray-700">
                    {sourceFile ? `已選擇檔案：${sourceFile.name}` : (isDraggingSource ? '放開滑鼠以上傳' : '點擊或拖曳上傳檔案')}
                  </span>
                </label>
              </div>

              <div className="flex items-center gap-4">
                <hr className="flex-1 border-gray-200" />
                <span className="text-sm text-gray-400 font-medium">或</span>
                <hr className="flex-1 border-gray-200" />
              </div>

              <textarea
                rows={5}
                className="w-full rounded-xl border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-4"
                placeholder="建議：在此貼上您的內容、筆記或大綱..."
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
              />
            </div>
          </section>

          <hr className="border-gray-200" />

          {/* 2. Text Processing */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Settings className="text-indigo-600" size={24} />
              2. 文字處理方式
            </h2>
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50">
                <input type="radio" name="textMode" value="A" checked={textMode === 'A'} onChange={(e) => setTextMode(e.target.value)} className="mt-1" />
                <div>
                  <span className="block font-medium">完整保留、不可更改</span>
                  <span className="block text-sm text-gray-500">不改寫、不潤飾</span>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50">
                <input type="radio" name="textMode" value="B" checked={textMode === 'B'} onChange={(e) => setTextMode(e.target.value)} className="mt-1" />
                <div>
                  <span className="block font-medium">協助潤飾文字</span>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50">
                <input type="radio" name="textMode" value="C" checked={textMode === 'C'} onChange={(e) => setTextMode(e.target.value)} className="mt-1" />
                <div>
                  <span className="block font-medium">摘要重組</span>
                </div>
              </label>
            </div>
          </section>

          <hr className="border-gray-200" />

          {/* 3. Visual Style & IP */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Paintbrush className="text-indigo-600" size={24} />
              3. 視覺風格與人物 IP
            </h2>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">視覺風格選擇</label>
              <select 
                className="mt-1 block w-full rounded-xl border border-gray-300 p-3 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={visualStyle}
                onChange={(e) => setVisualStyle(e.target.value)}
              >
                <option value="1">日式 Q 版漫畫風格</option>
                <option value="2">吉卜力溫暖插畫風</option>
                <option value="3">教育科技清新風</option>
                <option value="4">扁平向量插畫風</option>
                <option value="5">手繪粉彩風</option>
                <option value="6">商務簡潔風</option>
                <option value="7">未來科技感</option>
                <option value="8">可愛教學圖卡風</option>
                <option value="9">黑板教室風</option>
                <option value="10">Canva 繽紛簡報風</option>
              </select>
            </div>

            <label className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border cursor-pointer">
              <input type="checkbox" checked={useIP} onChange={(e) => setUseIP(e.target.checked)} className="w-4 h-4 text-indigo-600 rounded" />
              <span className="font-medium text-gray-900">加入固定人物 IP (若不使用則以主題插圖替代)</span>
            </label>

            {useIP && (
              <label 
                onDragOver={(e) => { e.preventDefault(); setIsDraggingIP(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDraggingIP(false); }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingIP(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    setIpImageFile(e.dataTransfer.files[0]);
                  }
                }}
                className={`mt-4 p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-colors cursor-pointer block text-center ${isDraggingIP ? 'bg-indigo-100 border-indigo-500' : 'bg-gray-50 border-gray-300 hover:bg-gray-100'}`}
              >
                <ImageIcon className={`mb-2 mx-auto ${isDraggingIP ? 'text-indigo-600 scale-110 transition-transform' : 'text-gray-400'}`} size={32} />
                <span className="text-sm font-medium text-gray-600">
                  {ipImageFile ? `已選擇圖片：${ipImageFile.name}` : (isDraggingIP ? '放開滑鼠以上傳圖片' : '點擊或拖曳上傳人物照片或角色參考圖')}
                </span>
                <span className="text-xs text-gray-400 mt-1">支援 PNG, JPG</span>
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setIpImageFile(e.target.files[0]);
                    }
                  }}
                />
              </label>
            )}
          </section>

          <hr className="border-gray-200" />

          {/* Image Mode */}
          <section className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ImageIcon className="text-indigo-600" size={24} />
              簡報配圖模式
            </h2>
            <select 
              className="w-full p-4 border-2 border-gray-200 rounded-xl bg-white focus:border-indigo-600 outline-none transition-colors"
              value={imageMode}
              onChange={(e) => setImageMode(e.target.value)}
            >
              <option value="none">❌ 純文字模式 (預設，速度最快，不吃效能)</option>
              <option value="api">☁️ 雲端 API 免費配圖 (強烈推薦，效果佳且零硬體負擔)</option>
              <option value="local">💻 本地 WebGPU 離線生圖 (⚠️ 極度消耗記憶體，測試版實驗功能)</option>
            </select>
          </section>

          {/* 4. Output Format */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Upload className="text-indigo-600" size={24} />
              4. 輸出格式
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className={`flex flex-col items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${outputFormat === 'B' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200'}`}>
                <input type="radio" name="format" value="B" className="hidden" checked={outputFormat === 'B'} onChange={(e) => setOutputFormat(e.target.value)} />
                <Presentation size={32} className="mb-2" />
                <span className="font-semibold">PPTX 簡報檔</span>
                <span className="text-xs text-center mt-1">產生並下載 PowerPoint 檔</span>
              </label>

              <label className={`flex flex-col items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${outputFormat === 'D' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200'}`}>
                <input type="radio" name="format" value="D" className="hidden" checked={outputFormat === 'D'} onChange={(e) => setOutputFormat(e.target.value)} />
                <Table2 size={32} className="mb-2" />
                <span className="font-semibold">純文字結果</span>
                <span className="text-xs text-center mt-1">只觀看 AI 生成的 JSON 資料</span>
              </label>
            </div>
          </section>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4">
              <p className="font-medium whitespace-pre-wrap">{error}</p>
            </div>
          )}

          {isGenerating && streamText && (
            <div className="bg-gray-800 text-green-400 p-4 rounded-xl shadow-inner font-mono text-sm overflow-y-auto max-h-64 whitespace-pre-wrap">
              {streamText}
            </div>
          )}

          {result && !isGenerating && (
            <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-4">
              <CheckCircle className="inline-block mr-2" size={20} />
              <span className="font-medium">完成！</span>
              {outputFormat === 'D' && (
                <pre className="mt-2 p-2 bg-white rounded text-sm overflow-x-auto whitespace-pre-wrap">{result}</pre>
              )}
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isGenerating || (!sourceText && !sourceFile) || !engine}
              className="flex-1 flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-sm text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {isGenerating ? (
                <span className="flex items-center gap-2"><Loader2 className="animate-spin" /> 正在串流生成中...</span>
              ) : '開始產生簡報 / 規劃'}
            </button>
            
            {isGenerating && (
              <button
                type="button"
                onClick={handleInterrupt}
                className="py-4 px-6 border border-red-500 rounded-xl shadow-sm text-lg font-medium text-red-500 hover:bg-red-50 transition-colors"
              >
                停止生成
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;
