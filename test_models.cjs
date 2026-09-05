const webllm = require('@mlc-ai/web-llm');
console.log(webllm.prebuiltAppConfig.model_list.map(m => m.model_id).filter(id => id.toLowerCase().includes('gemma')));
