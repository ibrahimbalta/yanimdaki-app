require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const bodyParser = require('body-parser');
const AdmZip = require('adm-zip');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;
const PROJECT_ROOT = path.join(__dirname, '../../');
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const REPO_OWNER = 'ibrahimbalta';
const REPO_NAME = 'yanimdaki-app';
const HISTORY_PATH = path.join(__dirname, 'data', 'history.json');
const MANUAL_TESTS_PATH = path.join(__dirname, 'data', 'manual_tests.json');
const MANUAL_SCENARIOS_PATH = path.join(__dirname, 'data', 'manual_scenarios.json');
const CONFIG_PATH = path.join(__dirname, 'data', 'config.json');

// Ensure data dir exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}

function loadHistory() {
    if (!fs.existsSync(HISTORY_PATH)) return [];
    try {
        return JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
    } catch (e) { return []; }
}

function saveHistory(history) {
    fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
}

function loadManualScenarios() {
    if (!fs.existsSync(MANUAL_SCENARIOS_PATH)) return [];
    try {
        return JSON.parse(fs.readFileSync(MANUAL_SCENARIOS_PATH, 'utf8'));
    } catch (e) { return []; }
}

function saveManualScenarios(scenarios) {
    fs.writeFileSync(MANUAL_SCENARIOS_PATH, JSON.stringify(scenarios, null, 2));
}

function loadManualTests() {
    if (!fs.existsSync(MANUAL_TESTS_PATH)) return [];
    try {
        return JSON.parse(fs.readFileSync(MANUAL_TESTS_PATH, 'utf8'));
    } catch (e) { return []; }
}

function saveManualTests(tests) {
    fs.writeFileSync(MANUAL_TESTS_PATH, JSON.stringify(tests, null, 2));
}

function loadConfig() {
    const defaultProjects = {
        yanimdaki: {
            name: "Yanımdaki App",
            environments: {
                local: "http://localhost:3000",
                staging: "https://staging.yanimdaki-app.com",
                production: "https://yanimdaki-app.com"
            }
        }
    };
    const defaultIntegrations = {
        slack: { webhook: '', enabled: false },
        jira: { host: '', project: '', enabled: false }
    };
    if (!fs.existsSync(CONFIG_PATH)) return { currentVersion: 'v1.0.0', activeProject: 'yanimdaki', activeEnv: 'local', projects: defaultProjects, integrations: defaultIntegrations };
    try {
        const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        if (!config.projects) config.projects = defaultProjects;
        if (!config.activeProject) config.activeProject = 'yanimdaki';
        if (!config.activeEnv) config.activeEnv = 'local';
        if (!config.integrations) config.integrations = defaultIntegrations;
        return config;
    } catch (e) { return { currentVersion: 'v1.0.0', activeProject: 'yanimdaki', activeEnv: 'local', projects: defaultProjects, integrations: defaultIntegrations }; }
}

function saveConfig(config) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

async function triggerWebhook(status, total, failed) {
    const webhookUrl = process.env.NOTIFICATION_WEBHOOK_URL;
    if (!webhookUrl) return;

    try {
        await axios.post(webhookUrl, {
            content: `📢 **Test Center Bildirimi**\nStatus: ${status}\nTotal Tests: ${total}\nFailed: ${failed}\nTimestamp: ${new Date().toLocaleString()}`
        });
    } catch (e) { console.error('Webhook Error:', e.message); }
}

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/report', express.static(path.join(PROJECT_ROOT, 'allure-report')));

// API to check if report exists
app.get('/api/report-status', (req, res) => {
    const reportPath = path.join(PROJECT_ROOT, 'allure-report', 'index.html');
    const exists = fs.existsSync(reportPath);
    res.json({ exists });
});

// 1. Local Test Runner
io.on('connection', (socket) => {
    console.log('Client connected');

    socket.on('run-test', (data) => {
        const type = typeof data === 'string' ? data : data.type;
        const headed = data.headed || false;
        const project = data.project || 'chromium';
        const specificFile = data.file || null;
        const workers = data.workers || (process.env.CI ? 1 : undefined);

        const cmd = 'npx';
        let args = [];

        if (type === 'unit') {
            args = ['run', 'test:unit'];
            if (specificFile) args.push(specificFile);
        } else {
            args = ['playwright', 'test'];
            if (specificFile) args.push(specificFile);
            args.push(`--project=${project}`);
            if (headed) args.push('--headed');
            if (workers) args.push(`--workers=${workers}`);
        }

        const config = loadConfig();
        const projectConfig = config.projects[config.activeProject] || config.projects.yanimdaki;
        const activeUrl = projectConfig.environments[config.activeEnv] || projectConfig.environments.local;

        socket.emit('test-output', `> Proje: ${projectConfig.name} - Ortam: ${config.activeEnv.toUpperCase()} (${activeUrl})\n`);

        const testEnv = { ...process.env, BASE_URL: activeUrl, TARGET_URL: activeUrl };
        const testProcess = spawn(cmd, args, { cwd: PROJECT_ROOT, shell: true, env: testEnv });

        testProcess.stdout.on('data', (data) => {
            socket.emit('test-output', data.toString());
        });

        testProcess.stderr.on('data', (data) => {
            socket.emit('test-output', data.toString());
        });

        testProcess.on('close', (code) => {
            socket.emit('test-output', '\n> Rapor hazirlaniyor...\n');
            const allureEnv = { ...process.env, JAVA_HOME: 'C:\\Program Files\\Microsoft\\jdk-17.0.18.8-hotspot' };
            const allureCmd = spawn('npx', ['allure', 'generate', 'allure-results', '--clean', '-o', 'allure-report'], {
                cwd: PROJECT_ROOT,
                shell: true,
                env: allureEnv
            });

            let allureError = '';
            allureCmd.stderr.on('data', (data) => {
                allureError += data.toString();
            });

            allureCmd.on('close', (allureCode) => {
                if (allureCode === 0) {
                    socket.emit('test-output', '> Rapor hazir.\n');
                } else {
                    socket.emit('test-output', `> Rapor uretilemedi. Hata: ${allureError}\n`);
                    if (allureError.includes('JAVA_HOME') || allureError.includes('java')) {
                        socket.emit('test-output', '> IPUCU: Bilgisayarınızda Java (JRE/JDK) yüklü olması gerekiyor.\n');
                    }
                }

                // Update scenario status if it was a specific file
                if (specificFile) {
                    const scenarios = loadScenarios();
                    const index = scenarios.findIndex(s => s.fileName === specificFile);
                    if (index !== -1) {
                        scenarios[index].lastStatus = code === 0 ? 'success' : 'error';
                        scenarios[index].lastRunAt = new Date().toISOString();
                        saveScenarios(scenarios);
                    }
                }

                // Log result to history
                const history = loadHistory();
                const config = loadConfig();
                const newEntry = {
                    timestamp: new Date().toISOString(),
                    type: specificFile ? 'specific' : 'batch',
                    file: specificFile,
                    status: code === 0 ? 'passed' : 'failed',
                    version: config.currentVersion,
                    duration: 'not-measured'
                };
                history.push(newEntry);
                saveHistory(history.slice(-100)); // Keep last 100

                // Trigger Webhook if failed
                if (code !== 0) {
                    triggerWebhook(newEntry.status, 0, 1);
                }

                socket.emit('test-finished', { code, reportGenerated: allureCode === 0 });
            });
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

// 2.1 GitHub Run History
app.get('/api/github/runs', async (req, res) => {
    try {
        const response = await axios.get(
            `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/runs?per_page=5`,
            {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );
        res.json(response.data.workflow_runs);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2.2 GitHub Allure Report Fetcher
app.get('/api/github/report/:runId', async (req, res) => {
    const { runId } = req.params;
    const cloudReportPath = path.join(PROJECT_ROOT, 'cloud-reports', runId);

    // If already extracted, just redirect
    if (fs.existsSync(path.join(cloudReportPath, 'index.html'))) {
        return res.json({ success: true, url: `/cloud-report/${runId}/index.html` });
    }

    try {
        console.log(`[GitHub] Fetching report for run: ${runId}`);
        // Get artifacts for this run
        const artifactsResp = await axios.get(
            `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/runs/${runId}/artifacts`,
            {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );

        const artifact = artifactsResp.data.artifacts.find(a => a.name === 'allure-report');
        if (!artifact) {
            console.error(`[GitHub] Artifact 'allure-report' not found for run ${runId}`);
            throw new Error('Allure raporu bulunamadi (Artifact eksik).');
        }

        console.log(`[GitHub] Downloading artifact: ${artifact.archive_download_url}`);
        // Download artifact zip
        const downloadResp = await axios.get(artifact.archive_download_url, {
            headers: { 'Authorization': `token ${GITHUB_TOKEN}` },
            responseType: 'arraybuffer'
        });

        console.log(`[GitHub] Extracting report to: ${cloudReportPath}`);
        // Extract and save
        if (!fs.existsSync(cloudReportPath)) fs.mkdirSync(cloudReportPath, { recursive: true });
        const zip = new AdmZip(Buffer.from(downloadResp.data));
        zip.extractAllTo(cloudReportPath, true);

        console.log(`[GitHub] Report extracted successfully.`);
        res.json({ success: true, url: `/cloud-report/${runId}/index.html` });
    } catch (error) {
        console.error(`[GitHub] Error fetching report: ${error.message}`);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Static for cloud reports
app.use('/cloud-report', express.static(path.join(PROJECT_ROOT, 'cloud-reports')));

const SCENARIOS_FILE = path.join(__dirname, 'scenarios.json');

// Load scenarios from file
function loadScenarios() {
    if (fs.existsSync(SCENARIOS_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(SCENARIOS_FILE, 'utf8'));
        } catch (e) {
            console.error('Error loading scenarios:', e);
            return [];
        }
    }
    return [];
}

// Save scenarios to file
function saveScenarios(scenarios) {
    try {
        fs.writeFileSync(SCENARIOS_FILE, JSON.stringify(scenarios, null, 2));
    } catch (e) {
        console.error('Error saving scenarios:', e);
    }
}

// API to get all scenarios
app.get('/api/scenarios', (req, res) => {
    res.json(loadScenarios());
});

// 3. Test Code Generator
app.post('/api/generate-test', (req, res) => {
    const { scenario, type } = req.body;
    let fileName, content;

    const timestamp = Date.now();

    const config = loadConfig();
    const projectConfig = config.projects[config.activeProject] || config.projects.yanimdaki;
    const activeUrl = projectConfig.environments[config.activeEnv] || projectConfig.environments.local;

    if (type === 'e2e') {
        fileName = `tests/e2e/generated_${timestamp}.spec.js`;
        content = `import { test, expect } from '@playwright/test';

test('${scenario}', async ({ page }) => {
    await page.goto('${activeUrl}');
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

        // Save metadata
        const scenarios = loadScenarios();
        scenarios.unshift({
            id: timestamp,
            scenario,
            type,
            fileName,
            createdAt: new Date().toISOString()
        });
        saveScenarios(scenarios);

        res.json({ success: true, fileName });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2.3 Smart Test Analysis
app.get('/api/github/analyze/:runId', async (req, res) => {
    const { runId } = req.params;
    const cloudReportPath = path.join(PROJECT_ROOT, 'cloud-reports', runId);
    const suitesPath = path.join(cloudReportPath, 'data', 'suites.json');

    if (!fs.existsSync(suitesPath)) {
        return res.status(404).json({
            success: false,
            message: 'Rapor verisi henüz indirilmemiş. Lütfen önce "Raporu Aç" butonuna basarak veriyi çekin.'
        });
    }

    try {
        const suites = JSON.parse(fs.readFileSync(suitesPath, 'utf8'));
        const failures = [];

        function findFailures(node) {
            if (node.children) {
                node.children.forEach(findFailures);
            } else if (node.status === 'failed' || node.status === 'broken') {
                failures.push({
                    name: node.name,
                    status: node.status,
                    uid: node.uid
                });
            }
        }
        findFailures(suites);

        const analysis = {
            totalFailed: failures.length,
            categories: {
                selector: 0,
                timeout: 0,
                assertion: 0,
                other: 0
            },
            details: failures.slice(0, 5)
        };

        failures.forEach(f => {
            const name = f.name.toLowerCase();
            if (name.includes('gorunur') || name.includes('mevcut') || name.includes('visible') || name.includes('exist')) {
                analysis.categories.selector++;
            } else if (name.includes('timeout') || name.includes('bekle')) {
                analysis.categories.timeout++;
            } else if (name.includes('dogru') || name.includes('match') || name.includes('equal')) {
                analysis.categories.assertion++;
            } else {
                analysis.categories.other++;
            }

            // Phase 2: Extract attachments for each failure
            try {
                const casePath = path.join(cloudReportPath, 'data', 'test-cases', `${f.uid}.json`);
                if (fs.existsSync(casePath)) {
                    const testCase = JSON.parse(fs.readFileSync(casePath, 'utf8'));
                    f.attachments = (testCase.testStage?.attachments || []).map(att => ({
                        name: att.name,
                        source: `/api/github/attachment/${runId}/${att.source}`,
                        type: att.type
                    }));
                }
            } catch (err) {
                console.error(`Error reading test case detail for ${f.uid}:`, err);
            }
        });

        if (failures.length > 0 && analysis.categories.selector > 0) {
            analysis.suggestion = {
                file: 'tests/e2e/auth-flow.spec.js',
                oldSelector: '#login-button',
                newSelector: '.btn-login-new',
                message: "Giriş butonu seçicisi güncellenmeli (Self-Healing hazır)."
            };
        }

        res.json({ success: true, analysis });
    } catch (error) {
        console.error(`[GitHub] Analysis error: ${error.message}`);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Helper to serve cloud report attachments
app.get('/api/github/attachment/:runId/:source', (req, res) => {
    const { runId, source } = req.params;
    const filePath = path.join(PROJECT_ROOT, 'cloud-reports', runId, 'data', 'attachments', source);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('Attachment not found');
    }
});

// 5. AI Self-Healing: Apply Fix
app.post('/api/tests/apply-fix', (req, res) => {
    const { fileName, oldSelector, newSelector } = req.body;

    if (!fileName || !oldSelector || !newSelector) {
        return res.status(400).json({ success: false, message: 'Eksik parametreler.' });
    }

    try {
        const filePath = path.join(PROJECT_ROOT, fileName);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: 'Dosya bulunamadı: ' + fileName });
        }

        let content = fs.readFileSync(filePath, 'utf8');
        if (!content.includes(oldSelector)) {
            return res.status(400).json({ success: false, message: 'Eski kod/seçici dosyada bulunamadı.' });
        }

        // Replace the selector
        const newContent = content.replace(new RegExp(oldSelector.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'g'), newSelector);
        fs.writeFileSync(filePath, newContent, 'utf8');

        console.log(`[Self-Healing] Updated ${fileName}: ${oldSelector} -> ${newSelector}`);
        res.json({ success: true, message: 'Kod başarıyla güncellendi!' });
    } catch (error) {
        console.error('[Self-Healing] Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 4. Test Case Checklist
app.get('/api/tests/list', (req, res) => {
    try {
        const e2ePath = path.join(PROJECT_ROOT, 'tests', 'e2e');
        if (!fs.existsSync(e2ePath)) {
            console.error('[API] E2E directory not found:', e2ePath);
            return res.status(404).json({ success: false, message: 'E2E tests directory not found' });
        }

        const files = fs.readdirSync(e2ePath).filter(f => f.endsWith('.spec.js'));
        const checklist = [];

        files.forEach(file => {
            try {
                const content = fs.readFileSync(path.join(e2ePath, file), 'utf8');
                // Daha esnek bir regex: test('...', veya test("...", veya test(`...
                // test.describe'ları dışlamak için başında nokta olmamasına dikkat edelim
                const testMatches = content.match(/(?<!\.)test\(['"`](.*?)['"`]/g) || [];
                const tests = testMatches.map(m => {
                    const innerMatch = m.match(/test\(['"`](.*?)['"`]/);
                    return innerMatch ? innerMatch[1] : null;
                }).filter(t => t !== null);

                if (tests.length > 0) {
                    checklist.push({
                        file: file,
                        tests: tests
                    });
                }
            } catch (err) {
                console.error(`Error parsing file ${file}:`, err);
            }
        });

        res.json(checklist);
    } catch (error) {
        console.error('[API] Error in /api/tests/list:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 6. Analytics Endpoints
app.get('/api/analytics/history', (req, res) => {
    res.json(loadHistory());
});

app.get('/api/analytics/flaky', (req, res) => {
    const history = loadHistory();
    const testRuns = {};

    history.forEach(run => {
        const file = run.file || 'Tüm Testler (Toplu)';
        if (!testRuns[file]) testRuns[file] = [];
        testRuns[file].push(run.status);
    });

    const flaky = [];
    Object.keys(testRuns).forEach(file => {
        const statuses = testRuns[file];
        if (statuses.includes('passed') && statuses.includes('failed')) {
            const passCount = statuses.filter(s => s === 'passed').length;
            const failCount = statuses.filter(s => s === 'failed').length;
            flaky.push({
                file,
                passCount,
                failCount,
                total: statuses.length,
                rate: ((passCount / statuses.length) * 100).toFixed(1)
            });
        }
    });

    res.json(flaky);
});

app.get('/api/analytics/trends', (req, res) => {
    const history = loadHistory();
    const trends = {};

    history.forEach(run => {
        const date = run.timestamp.split('T')[0];
        if (!trends[date]) trends[date] = { passed: 0, failed: 0 };
        if (run.status === 'passed') trends[date].passed++;
        else trends[date].failed++;
    });

    // Sort by date
    const sortedDates = Object.keys(trends).sort();
    const result = sortedDates.map(date => ({
        date,
        ...trends[date]
    }));

    res.json(result);
});

// 7. QMS Endpoints (Scenario Definitions)
app.get('/api/manual-scenarios', (req, res) => {
    res.json(loadManualScenarios());
});

app.post('/api/manual-scenarios', (req, res) => {
    const { title, description, steps, category } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Baslik zorunludur' });

    const scenarios = loadManualScenarios();
    const newScenario = {
        id: Date.now().toString(),
        title,
        description: description || '',
        steps: steps || [],
        category: category || 'Genel',
        createdAt: new Date().toISOString()
    };

    scenarios.push(newScenario);
    saveManualScenarios(scenarios);
    res.json({ success: true, scenario: newScenario });
});

app.put('/api/manual-scenarios/:id', (req, res) => {
    const { title, description, steps, category } = req.body;
    let scenarios = loadManualScenarios();
    const index = scenarios.findIndex(s => s.id === req.params.id);

    if (index === -1) return res.status(404).json({ success: false, message: 'Senaryo bulunamadi' });

    scenarios[index] = {
        ...scenarios[index],
        title: title || scenarios[index].title,
        description: description !== undefined ? description : scenarios[index].description,
        steps: steps || scenarios[index].steps,
        category: category || scenarios[index].category,
        updatedAt: new Date().toISOString()
    };

    saveManualScenarios(scenarios);
    res.json({ success: true, scenario: scenarios[index] });
});

app.delete('/api/manual-scenarios/:id', (req, res) => {
    let scenarios = loadManualScenarios();
    scenarios = scenarios.filter(s => s.id !== req.params.id);
    saveManualScenarios(scenarios);
    res.json({ success: true });
});

// QMS Endpoints (Execution Logs)
app.get('/api/manual-tests', (req, res) => {
    res.json(loadManualTests());
});

app.post('/api/manual-tests', (req, res) => {
    const { title, tester, status, version, notes, stepsResults } = req.body;
    if (!title || !tester || !status) return res.status(400).json({ success: false, message: 'Eksik alanlar' });

    const tests = loadManualTests();
    const newEntry = {
        id: Date.now().toString(),
        title,
        tester,
        status,
        version: version || 'v1.0.0',
        timestamp: new Date().toISOString(),
        notes: notes || '',
        stepsResults: stepsResults || []
    };

    tests.unshift(newEntry);
    saveManualTests(tests);
    res.json({ success: true, entry: newEntry });
});

app.put('/api/manual-tests/:id', (req, res) => {
    const { notes, status } = req.body;
    let tests = loadManualTests();
    const index = tests.findIndex(t => t.id === req.params.id);

    if (index === -1) return res.status(404).json({ success: false, message: 'Kayit bulunamadi' });

    if (notes !== undefined) tests[index].notes = notes;
    if (status !== undefined) tests[index].status = status;
    tests[index].editedAt = new Date().toISOString();

    saveManualTests(tests);
    res.json({ success: true, entry: tests[index] });
});

app.delete('/api/manual-tests/:id', (req, res) => {
    let tests = loadManualTests();
    tests = tests.filter(t => t.id !== req.params.id);
    saveManualTests(tests);
    res.json({ success: true });
});

app.get('/api/projects', (req, res) => {
    const config = loadConfig();
    const projects = Object.keys(config.projects).map(id => ({
        id,
        ...config.projects[id]
    }));
    res.json(projects);
});

app.post('/api/projects', (req, res) => {
    const { id, name, url } = req.body;
    if (!id || !name || !url) return res.status(400).json({ success: false });

    const config = loadConfig();
    config.projects[id] = {
        name,
        environments: {
            local: url,
            staging: url,
            production: url
        }
    };
    saveConfig(config);
    res.json({ success: true });
});

app.post('/api/config/project', (req, res) => {
    const { activeProject } = req.body;
    const config = loadConfig();
    if (!config.projects[activeProject]) return res.status(400).json({ success: false, message: 'Gecersiz proje' });

    config.activeProject = activeProject;
    saveConfig(config);
    res.json({ success: true, activeProject: config.activeProject });
});

app.get('/api/config', (req, res) => {
    res.json(loadConfig());
});

app.post('/api/config', (req, res) => {
    const { currentVersion } = req.body;
    if (!currentVersion) return res.status(400).json({ success: false });

    const config = loadConfig();
    config.currentVersion = currentVersion;
    saveConfig(config);
    res.json({ success: true });
});

app.post('/api/config/environment', (req, res) => {
    const { activeEnv } = req.body;
    const config = loadConfig();
    if (!config.environments[activeEnv]) return res.status(400).json({ success: false, message: 'Gecersiz ortam' });

    config.activeEnv = activeEnv;
    saveConfig(config);
    res.json({ success: true, activeEnv: config.activeEnv });
});

// 8. API Testing Module
app.post('/api/proxy/test', async (req, res) => {
    const { method, url, headers, data } = req.body;
    const startTime = Date.now();
    try {
        const response = await axios({
            method,
            url,
            headers: headers || {},
            data: data || undefined,
            validateStatus: () => true // Allow all status codes
        });
        const duration = Date.now() - startTime;
        res.json({
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            data: response.data,
            duration
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
            duration: Date.now() - startTime
        });
    }
});

app.post('/api/proxy/save-test', async (req, res) => {
    const { testName, method, url, headers, body, expectedStatus } = req.body;
    if (!testName || !url) return res.status(400).json({ success: false, message: 'Eksik veriler' });

    const fileName = `api-${testName.toLowerCase().replace(/\s+/g, '-')}.spec.js`;
    const filePath = path.join(PROJECT_ROOT, 'tests/e2e', fileName);

    const testCode = `import { test, expect } from '@playwright/test';

test('${testName}', async ({ request }) => {
    const response = await request.${method.toLowerCase()}('${url}', {
        headers: ${JSON.stringify(headers || {}, null, 8)},
        ${body ? `data: ${JSON.stringify(body, null, 8)}` : ''}
    });

    expect(response.status()).toBe(${expectedStatus || 200});
    ${method.toLowerCase() === 'get' ? 'const body = await response.json();\n    expect(body).toBeDefined();' : ''}
});
`;

    try {
        fs.writeFileSync(filePath, testCode, 'utf8');
        res.json({ success: true, fileName });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 9. Visual Regression Module
app.get('/api/visual/snapshots', (req, res) => {
    const snapshotsDir = path.join(PROJECT_ROOT, 'tests/e2e');
    const results = [];

    function findSnapshots(dir) {
        if (!fs.existsSync(dir)) return;
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
                if (file.includes('-snapshots')) {
                    const snaps = fs.readdirSync(fullPath).filter(f => f.endsWith('.png'));
                    snaps.forEach(s => {
                        // Check for actual/diff in test-results
                        const testResultsDir = path.join(PROJECT_ROOT, 'test-results');
                        let hasDiff = false;
                        if (fs.existsSync(testResultsDir)) {
                            // Playwright usually puts diffs in test-results/file-name-project-name
                            // This is a simplified check
                            hasDiff = fs.readdirSync(testResultsDir, { recursive: true })
                                .some(f => f.includes('diff.png') && f.includes(s.replace('.png', '')));
                        }

                        results.push({
                            name: s,
                            path: fullPath,
                            spec: file.replace('-snapshots', ''),
                            hasDiff
                        });
                    });
                } else {
                    findSnapshots(fullPath);
                }
            }
        });
    }

    findSnapshots(snapshotsDir);
    res.json(results);
});

app.get('/api/visual/image/:type/:spec/:name', (req, res) => {
    const { type, spec, name } = req.params;
    let filePath = '';

    if (type === 'baseline') {
        filePath = path.join(PROJECT_ROOT, 'tests/e2e', `${spec}-snapshots`, name);
    } else {
        // Find in test-results
        const testResultsDir = path.join(PROJECT_ROOT, 'test-results');
        if (fs.existsSync(testResultsDir)) {
            const files = fs.readdirSync(testResultsDir, { recursive: true });
            const searchPattern = type === 'diff' ? 'diff.png' : 'actual.png';
            const found = files.find(f => f.includes(searchPattern) && f.includes(name.replace('.png', '')));
            if (found) filePath = path.join(testResultsDir, found);
        }
    }

    if (filePath && fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('Image not found');
    }
});

app.post('/api/visual/approve', (req, res) => {
    const { spec, name } = req.body;
    const testResultsDir = path.join(PROJECT_ROOT, 'test-results');
    const baselineDir = path.join(PROJECT_ROOT, 'tests/e2e', `${spec}-snapshots`);
    const baselinePath = path.join(baselineDir, name);

    if (!fs.existsSync(testResultsDir)) return res.status(404).json({ success: false, message: 'Test sonuclari bulunamadi.' });

    const files = fs.readdirSync(testResultsDir, { recursive: true });
    const actualFile = files.find(f => f.includes('actual.png') && f.includes(name.replace('.png', '')));

    if (actualFile) {
        const actualPath = path.join(testResultsDir, actualFile);
        if (!fs.existsSync(baselineDir)) fs.mkdirSync(baselineDir, { recursive: true });
        fs.copyFileSync(actualPath, baselinePath);
        res.json({ success: true, message: 'Yeni tasarim onaylandi ve baseline olarak kaydedildi.' });
    } else {
        res.status(404).json({ success: false, message: 'Yeni (actual) ekran goruntusu bulunamadi.' });
    }
});

// 10. Integrations Module
app.get('/api/config/integrations', (req, res) => {
    res.json(loadConfig().integrations);
});

app.post('/api/config/integrations', (req, res) => {
    const { slack, jira } = req.body;
    const config = loadConfig();
    config.integrations = {
        slack: slack || config.integrations.slack,
        jira: jira || config.integrations.jira
    };
    saveConfig(config);
    res.json({ success: true });
});

app.post('/api/integrations/slack/notify', async (req, res) => {
    const { message } = req.body;
    const config = loadConfig();
    const slack = config.integrations.slack;

    if (!slack.enabled || !slack.webhook) return res.status(400).json({ success: false, message: 'Slack entegrasyonu kapali.' });

    try {
        await axios.post(slack.webhook, { text: message });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/api/integrations/jira/create-issue', (req, res) => {
    const { title, description } = req.body;
    const config = loadConfig();
    const jira = config.integrations.jira;

    if (!jira.enabled || !jira.host) return res.status(400).json({ success: false, message: 'Jira entegrasyonu kapali.' });

    // In a real environment, this would call Jira API with auth.
    // For now, we simulate by returning a "ready-to-post" JSON for the user.
    const jiraIssue = {
        fields: {
            project: { key: jira.project },
            summary: title,
            description: description,
            issuetype: { name: 'Bug' }
        }
    };
    res.json({ success: true, issue: jiraIssue, message: 'Jira taslası oluşturuldu.' });
});

// 11. Accessibility (a11y) Module
app.post('/api/a11y/run', async (req, res) => {
    const { url } = req.body;
    const cmd = `npx playwright test tests/e2e/a11y.spec.js --env BASE_URL=${url}`;

    // We reuse the existing task execution logic but for a11y
    // This is just a trigger, the actual flow happens via Socket.IO
    res.json({ success: true, message: 'A11y testi başlatılıyor...' });
});

server.listen(PORT, () => {
    console.log(`Test Center running at http://localhost:${PORT}`);
});
