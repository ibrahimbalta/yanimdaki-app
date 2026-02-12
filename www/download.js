const crypto = require('crypto');
const fs = require('fs');
const https = require('https');
const path = require('path');

const PROJECT_ID = 'yanimdaki';
const VERSION_ID = 'c15ff3';
const KEY_PATH = fs.readdirSync(__dirname).find(f => f.endsWith('.json') && f.includes('firebase-adminsdk'));

if (!KEY_PATH) {
    console.error('HATA: Servis hesabi JSON dosyasi bulunamadi!');
    process.exit(1);
}

const keyJson = JSON.parse(fs.readFileSync(path.join(__dirname, KEY_PATH), 'utf8'));

async function getAccessToken() {
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const now = Math.floor(Date.now() / 1000);
    const claimSet = Buffer.from(JSON.stringify({
        iss: keyJson.client_email,
        scope: 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/firebase',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now
    })).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    const input = `${header}.${claimSet}`;
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(input);
    const signature = signer.sign(keyJson.private_key, 'base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const jwt = `${input}.${signature}`;

    return new Promise((resolve, reject) => {
        const req = https.request('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }, res => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                const data = JSON.parse(body);
                console.log('Token Response:', body);
                if (data.error) reject(new Error(data.error_description || data.error));
                else resolve(data.access_token);
            });
        });
        req.on('error', reject);
        req.write(`grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${encodeURIComponent(jwt)}`);
        req.end();
    });
}

function request(url, options = {}) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, res => {
            let body = '';
            if (options.stream) return resolve(res);
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(body)); } catch (e) { resolve(body); }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function main() {
    try {
        const token = await getAccessToken();
        const headers = { Authorization: `Bearer ${token}` };

        console.log('Site bilgileri aliniyor...');
        const versions = await request(`https://firebasehosting.googleapis.com/v1beta1/projects/${PROJECT_ID}/sites/${PROJECT_ID}/versions`, { headers });
        console.log('API Response:', JSON.stringify(versions, null, 2));

        if (!versions || !versions.versions) {
            throw new Error(`Versiyonlar listelenemedi. Yanit: ${JSON.stringify(versions)}`);
        }
        const targetVersion = versions.versions.find(v => v.name.includes(VERSION_ID));

        if (!targetVersion) throw new Error(`Versiyon ${VERSION_ID} bulunamadi.`);
        const versionName = targetVersion.name;
        console.log(`Hedef Versiyon: ${versionName}`);

        const siteUrl = `https://${PROJECT_ID}.web.app`;
        console.log(`Site URL: ${siteUrl}`);

        console.log('Dosya listesi aliniyor...');
        const files = await request(`https://firebasehosting.googleapis.com/v1beta1/${versionName}/files`, { headers });
        console.log(`Toplam ${files.files.length} dosya indiriliyor...`);

        for (const file of files.files) {
            const cleanPath = file.path.startsWith('/') ? file.path.substring(1) : file.path;
            const localPath = path.join(__dirname, cleanPath);
            fs.mkdirSync(path.dirname(localPath), { recursive: true });

            console.log(`Indiriliyor: ${cleanPath}`);
            const downloadUrl = `${siteUrl}/${cleanPath}`;
            try {
                const res = await request(downloadUrl, { stream: true });
                if (res.statusCode !== 200) {
                    console.warn(`  UYARI: ${cleanPath} indirilemedi (Status: ${res.statusCode})`);
                    continue;
                }
                const fileStream = fs.createWriteStream(localPath);
                res.pipe(fileStream);
                await new Promise(r => fileStream.on('finish', r));
            } catch (e) {
                console.warn(`  HATA: ${cleanPath} - ${e.message}`);
            }
        }

        console.log('\nTAMAMLANDI! Tum dosyalar indirildi.');
    } catch (err) {
        console.error('\nHATA:', err.message);
    }
}

main();
