const { JSDOM } = require('jsdom');
JSDOM.fromURL('https://chy23.github.io/ppt_BLD/', {
  runScripts: "dangerously",
  resources: "usable"
}).then(dom => {
  console.log("JSDOM loaded");
  setTimeout(() => {
    console.log("Root content:", dom.window.document.getElementById('root').innerHTML.substring(0, 200));
    process.exit(0);
  }, 2000);
}).catch(err => {
  console.error("JSDOM Error:", err);
});
