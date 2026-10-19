const fs = require('fs');
const assert = require('assert');

const raw = fs.readFileSync('capacitor.config.json', 'utf-8');
const config = JSON.parse(raw);

assert.strictEqual(config.appId, 'com.yanimdaki.app');
assert.strictEqual(config.server?.url, 'https://yanimdaki.com');
assert.strictEqual(config.server?.cleartext, false);
console.log('Capacitor config test passed: server.url is valid');
