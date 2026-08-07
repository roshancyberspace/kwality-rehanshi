const fs = require('fs');

const path = 'src/services/vendorApi.js';
let content = fs.readFileSync(path, 'utf8');

const newImports = `import { vendorApiClient } from './apiClient'
import { buildApiUrl } from '../config/urls'
import axios from 'axios'

const request = async (path, options = {}) => {
  const isFormData = options.body instanceof FormData
  const config = {
    method: options.method || 'GET',
    url: path,
    params: options.params,
    headers: options.headers || {},
  }

  if (isFormData) {
    config.headers['Content-Type'] = 'multipart/form-data'
    config.data = options.body
  } else if (options.body) {
    try {
      config.data = typeof options.body === 'string' ? JSON.parse(options.body) : options.body
    } catch {
      config.data = options.body
    }
  }

  return vendorApiClient(config)
}
`;

content = content.replace("import { buildApiUrl } from '../config/urls'", newImports);
content = content.replace(/const readResponse = async \(response\) => \{[\s\S]*?\}\n/, '');

// Replace all occurrences of readResponse(await fetch(buildApiUrl(...), { ... }))
// with request(..., { ... })
// Notice that the razorpay api call is different: readResponse(await fetch(`https://ifsc.razorpay.com/...`, ...))

// Using a slightly more robust AST parser or regex loop
content = content.replace(/readResponse\(await fetch\(buildApiUrl\((.*?)\),(.*?)\)\)/g, 'request($1,$2)');

// Handle razorpay
content = content.replace(/readResponse\(await fetch\((.*?),(.*?)\)\)/g, 'axios.get($1).then(r => r.data)');

fs.writeFileSync(path, content);
console.log('Done refactoring vendorApi.js');
