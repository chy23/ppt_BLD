const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');
code = code.replace('generatePPTX(presentationData.slides);', 'await generatePPTX(presentationData.slides);');

// Also insert the UI for imageMode!
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
code = code.replace(uiInsertPoint, uiNew);

fs.writeFileSync('src/App.tsx', code, 'utf-8');
