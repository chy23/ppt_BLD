import React, { useState } from 'react';
import { Upload, FileText, Settings, CheckCircle, Presentation, Table2, FileUp, Cpu, Loader2, Paintbrush, Image as ImageIcon } from 'lucide-react';
import pptxgen from "pptxgenjs";
import { CreateMLCEngine } from "@mlc-ai/web-llm";

const AVAILABLE_MODELS = [
  { id: "gemma3-1b-it-q4f16_1-MLC", name: "Gemma 3 (1B) (Google, 美國)", hint: "【限制與建議】硬體需求極低。適合絕大多數手機與文書筆電。速度極快，但邏輯推論與長文生成較弱。" },
  { id: "Llama-3.2-1B-Instruct-q4f16_1-MLC", name: "Llama 3.2 (1B) (Meta, 美國)", hint: "【限制與建議】硬體需求極低。適合絕大多數手機與文書筆電。反應迅速，適合簡單日常寫作任務。" },
  { id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC", name: "Qwen2.5 (1.5B) (中文極速)", hint: "【限制與建議】硬體需求極低。中文處理能力優秀，速度極快。" },
  { id: "gemma-2-2b-it-q4f16_1-MLC", name: "Gemma 2 (2B) (Google, 美國)", hint: "【限制與建議】硬體需求低。約需 2GB 記憶體，適合一般筆電。回答品質與細節較 1B 模型提升不少。" },
  { id: "Llama-3.2-3B-Instruct-q4f16_1-MLC", name: "Llama 3.2 (3B) (Meta, 美國)", hint: "【限制與建議】硬體需求中。約需 3-4GB 記憶體。適合較新規格的電腦或高階手機，邏輯能力佳。" },
  { id: "Llama-3.1-8B-Instruct-q4f16_1-MLC", name: "Llama 3.1 (8B) (Meta, 美國)", hint: "【限制與建議】硬體需求高。需 8GB 以上記憶體與強大獨立顯卡。運算負載重，但能處理最複雜的寫作與邏輯推演。" },
  { id: "Qwen2.5-7B-Instruct-q4f16_1-MLC", name: "Qwen2.5 (7B) (中文高品質)", hint: "【限制與建議】硬體需求高。需 6GB 以上記憶體與強大獨立顯卡。中文表現最佳的模型之一。" }
];

function App() {
  const [sourceText, setSourceText] = useState('');
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [textMode, setTextMode] = useState('A');
  const [useIP, setUseIP] = useState(false);
  const [visualStyle, setVisualStyle] = useState('1');
  const [outputFormat, setOutputFormat] = useState('B'); 
  
  // WebLLM State
  const [selectedModelStr, setSelectedModelStr] = useState(AVAILABLE_MODELS[2].id); // 預設 Qwen2.5 1.5B 比較保險
  const [engine, setEngine] = useState<any>(null);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [initProgress, setInitProgress] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSourceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSourceFile(e.target.files[0]);
    }
  };

  const translateProgress = (text: string) => {
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
    try {
      const newEngine = await CreateMLCEngine(selectedModelStr, {
        initProgressCallback: (info) => {
          setInitProgress(translateProgress(info.text));
        }
      });
      setEngine(newEngine);
      setInitProgress("✅ 模型加載完成！");
    } catch (err: any) {
      console.error(err);
      setError("無法加載模型。請確認您的硬體是否支援 WebGPU，或更換較小的模型。\n詳細錯誤: " + err.message);
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

  const generatePPTX = (slidesData: any[]) => {
    let pres = new pptxgen();
    
    slidesData.forEach(slide => {
      let slideObj = pres.addSlide();
      
      slideObj.addText(slide.title || '', { 
        x: 0.5, y: 0.5, w: '90%', h: 1, 
        fontSize: 24, bold: true, color: '363636' 
      });
      
      if (slide.content) {
        slideObj.addText(slide.content, { 
          x: 0.5, y: 1.8, w: '90%', h: 3, 
          fontSize: 18, color: '666666', bullet: true 
        });
      }
      
      if (slide.notes) {
        slideObj.addNotes(slide.notes);
      }
    });

    pres.writeFile({ fileName: "AI_Presentation.pptx" });
  };

  const callWebLLM = async () => {
    if (!engine) throw new Error("引擎尚未加載");
    setStreamText('');

    const prompt = `
你是一個 AI 簡報生成助理。請根據以下資訊建立簡報結構。
【絕對要求】：務必嚴格以 JSON 格式回傳，不得包含任何額外的對話文字或 markdown 語法。若無法生成完整內容，也必須保持 JSON 括號閉合。

文字處理方式：${textMode} (A: 完整保留, B: 潤飾, C: 摘要)
視覺風格：${visualStyle}
是否使用人物IP：${useIP}

簡報來源內容：
${sourceText || (sourceFile ? '使用者上傳了檔案，請根據檔名 ' + sourceFile.name + ' 生成一個展示範例內容' : '')}

回傳格式範例：
{
  "slides": [
    {
      "title": "單頁標題",
      "content": "單頁主要條列或內容(字串)",
      "notes": "演講備忘錄或畫面提示詞"
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
        generatePPTX(presentationData.slides);
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
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl hover:bg-indigo-50 hover:border-indigo-400 transition-colors cursor-pointer bg-white"
                >
                  <FileUp className="text-indigo-500 mb-2" size={28} />
                  <span className="text-sm font-medium text-gray-700">
                    {sourceFile ? `已選擇檔案：${sourceFile.name}` : '點擊上傳檔案 (本測試版暫不實作前端檔案解析)'}
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
              <div className="mt-4 p-6 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                <ImageIcon className="text-gray-400 mb-2" size={32} />
                <span className="text-sm font-medium text-gray-600">點擊上傳人物照片或角色參考圖</span>
                <span className="text-xs text-gray-400 mt-1">支援 PNG, JPG</span>
                <input type="file" className="hidden" accept="image/*" />
              </div>
            )}
          </section>

          <hr className="border-gray-200" />

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
