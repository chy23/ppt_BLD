const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({headless: 'new'});
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  await page.goto('http://localhost:8080/ppt_BLD/');
  await new Promise(r => setTimeout(r, 2000));
  
  try {
    await page.select('select', 'gemma3-4b-it-q4f16_1-MLC').catch(() => {});
    
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const loadBtn = btns.find(b => b.innerText.includes('載入模型'));
      if (loadBtn) loadBtn.click();
    });
    
    await new Promise(r => setTimeout(r, 3000));
    
    const bodyText = await page.evaluate(() => document.body.innerText);
    if (bodyText.includes('無法加載模型')) {
      const idx = bodyText.indexOf('無法加載模型');
      console.log('Error found on screen:', bodyText.substring(idx, idx + 100).replace(/\n/g, ' '));
    } else {
      console.log('No error found. Current progress text:', bodyText.substring(0, 100));
    }
  } catch (e) {
    console.log(e);
  }
  
  await browser.close();
})();
