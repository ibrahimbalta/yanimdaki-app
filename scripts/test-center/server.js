const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;
const PROJECT_ROOT = path.join(__dirname, '../../');
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const REPO_OWNER = 'ibrahimbalta';
const REPO_NAME = 'yanimdaki-app';

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// 1. Local Test Runner
io.on('connection', (socket) => {
    console.log('Client connected');

    socket.on('run-test', (data) => {
        const type = typeof data === 'string' ? data : data.type;
        const headed = data.headed || false;
        const project = data.project || 'chromium';

        const cmd = 'npx';
        let args = type === 'unit' ? ['run', 'test:unit'] : ['playwright', 'test'];

        if (type === 'e2e') {
            args.push(`--project=${project}`);
            if (headed) args.push('--headed');
        }

        const testProcess = spawn(cmd, args, { cwd: PROJECT_ROOT, shell: true });

        testProcess.stdout.on('data', (data) => {
            socket.emit('test-output', data.toString());
        });

        testProcess.stderr.on('data', (data) => {
            socket.emit('test-output', data.toString());
        });

        testProcess.on('close', (code) => {
            socket.emit('test-finished', code);
        });
    });
});

// 2. GitHub Action Trigger
app.post('/api/trigger-github', async (req, res) => {
    try {
        await axios.post(
            `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/scheduled-tests.yml/dispatches`,
            { ref: 'main' },
            {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );
        res.json({ success: true, message: 'GitHub Action tetiklendi!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 3. Test Code Generator
app.post('/api/generate-test', (req, res) => {
    const { scenario, type } = req.body;
    let fileName, content;

    const timestamp = Date.now();

    if (type === 'e2e') {
        fileName = `tests/e2e/generated_${timestamp}.spec.js`;
        content = `import { test, expect } from '@playwright/test';

test('${scenario}', async ({ page }) => {
    await page.goto('http://localhost:5173');
    // Senaryo: ${scenario}
    // TODO: AI tarafindan uretilen detayli adimlar buraya gelebilir.
});
`;
    } else {
        fileName = `tests/unit/generated_${timestamp}.test.js`;
        content = `import { describe, it, expect } from 'vitest';
const utils = require('../../utils.js');

describe('Generated Test: ${scenario}', () => {
    it('should pass', () => {
        expect(true).toBe(true);
    });
});
`;
    }

    try {
        fs.writeFileSync(path.join(PROJECT_ROOT, fileName), content);
        res.json({ success: true, fileName });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

server.listen(PORT, () => {
    console.log(`Test Center running at http://localhost:${PORT}`);
});
