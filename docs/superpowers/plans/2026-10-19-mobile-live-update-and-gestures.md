# Aşama 1: Mobil Canlı Güncelleme & Swipe-to-Dismiss Gesture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Telefondaki Android uygulamasına canlı güncelleme (OTA) özelliği kazandırmak ve tüm modallara parmakla aşağı çekilerek kapatılan yerel mobil jest (swipe-to-dismiss gesture) mekanizmasını entegre etmek.

**Architecture:** Capacitor'ın `server.url` konfigürasyonu canlı alan adı `https://yanimdaki.com` adresine yönlendirilir. `js/gestures.js` modülü ile mobil viewport'larda (`<= 768px`) açık olan modalların tepe ve başlık kısımlarından dikey dokunma hareketleri dinlenir, `deltaY` parmağı takip eder, eşik aşımında yumuşak kapanış ve dokunsal titreşim (Haptics) tetiklenir.

**Tech Stack:** JavaScript (ES6), Capacitor 5/6, HTML5 Touch Events, Web Vibration API, Playwright, Firebase Hosting, Android Gradle.

**Spec:** [docs/superpowers/specs/2026-10-19-mobile-live-update-and-gestures-design.md](file:///C:/Users/A/Desktop/KOLAYWEBCİ/yanımdaki/docs/superpowers/specs/2026-10-19-mobile-live-update-and-gestures-design.md)

## Global Constraints

- Android APK id: `com.yanimdaki.app`
- Canlı sunucu: `https://yanimdaki.com`
- Mobil breakpoint: `max-width: 768px`
- Modal çekme eşik değeri: `100px`
- CSS Animasyon süresi: `0.18s` kapanma, `0.22s` geri sekme (spring)

---

### Task 1: Capacitor Canlı Güncelleme (OTA) Yapılandırması

**Files:**
- Modify: `capacitor.config.json`
- Modify: `www/capacitor.config.json`
- Test: `tests/test_capacitor_config.js`

**Interfaces:**
- Produces: `server.url: "https://yanimdaki.com"` config property read by Capacitor Android Bridge.

- [ ] **Step 1: Write verification test for capacitor.config.json**

```javascript
// tests/test_capacitor_config.js
const fs = require('fs');
const assert = require('assert');

const raw = fs.readFileSync('capacitor.config.json', 'utf-8');
const config = JSON.parse(raw);

assert.strictEqual(config.appId, 'com.yanimdaki.app');
assert.strictEqual(config.server?.url, 'https://yanimdaki.com');
assert.strictEqual(config.server?.cleartext, false);
console.log('Capacitor config test passed: server.url is valid');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/test_capacitor_config.js`
Expected: FAIL with assertion error (server.url undefined).

- [ ] **Step 3: Update capacitor.config.json and www/capacitor.config.json**

```json
{
    "appId": "com.yanimdaki.app",
    "appName": "Yanımdaki",
    "webDir": "www",
    "server": {
        "url": "https://yanimdaki.com",
        "cleartext": false,
        "androidScheme": "https"
    },
    "plugins": {
        "GoogleAuth": {
            "scopes": [
                "profile",
                "email"
            ],
            "serverClientId": "231861965178-78t998edq2lkq22a0olirso03tunhpt0.apps.googleusercontent.com",
            "androidClientId": "231861965178-78t998edq2lkq22a0olirso03tunhpt0.apps.googleusercontent.com",
            "forceCodeForRefreshToken": true
        }
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/test_capacitor_config.js`
Expected: PASS with "Capacitor config test passed: server.url is valid".

- [ ] **Step 5: Commit**

```bash
git add capacitor.config.json www/capacitor.config.json tests/test_capacitor_config.js
git commit -m "feat(capacitor): enable live server url for automatic updates"
```

---

### Task 2: Modal Swipe-to-Dismiss Jest Kontrolcüsü (Gestures)

**Files:**
- Create: `js/gestures.js`
- Modify: `app.html` (script tag injection before `app.init()`)
- Test: `tests/test_gestures_flow.js`

**Interfaces:**
- Produces: `window.initModalGestures()` - initializes touch listeners on all `.modal-overlay`, `.game-modal` and `#product-detail-modal`.
- Consumes: Standard DOM Touch Events (`touchstart`, `touchmove`, `touchend`), `navigator.vibrate`, `window.Capacitor.Plugins.Haptics`.

- [ ] **Step 1: Write test for gesture logic**

```javascript
// tests/test_gestures_flow.js
const { chromium } = require('@playwright/test');
const assert = require('assert');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });
  const page = await context.newPage();
  await page.goto('http://localhost:8080/app.html', { waitUntil: 'domcontentloaded' });
  
  // Verify initModalGestures is registered
  const hasGestures = await page.evaluate(() => typeof window.initModalGestures === 'function');
  assert.strictEqual(hasGestures, true, 'initModalGestures must be defined on window');
  
  console.log('Gestures registration test passed');
  await browser.close();
})();
```

- [ ] **Step 2: Create js/gestures.js with touch dragging and threshold dismiss**

```javascript
// js/gestures.js
(function () {
    function initModalGestures() {
        if (window.innerWidth > 768) return;

        let activeSheet = null;
        let startY = 0;
        let currentDeltaY = 0;
        let isDragging = false;

        document.addEventListener('touchstart', (e) => {
            const overlay = e.target.closest('.modal-overlay, #product-detail-modal');
            if (!overlay || overlay.style.display === 'none') return;

            const sheet = overlay.querySelector('.modal-content, .game-modal') || overlay;
            const header = e.target.closest('.modal-header, .game-modal-header, #product-detail-modal > div:first-child') ||
                           (e.target === sheet && e.touches[0].clientY - sheet.getBoundingClientRect().top < 60);

            // Sadece modalın en tepesinden veya içerik scroll edilmemişse (scrollTop <= 0) çekmeye izin ver
            const scrollableBody = sheet.querySelector('.game-modal-body, #detail-content, .modal-body');
            const canDragBody = scrollableBody && scrollableBody.scrollTop <= 0 && e.touches[0].clientY - sheet.getBoundingClientRect().top < 120;

            if (header || canDragBody) {
                isDragging = true;
                activeSheet = sheet;
                startY = e.touches[0].clientY;
                currentDeltaY = 0;
                activeSheet.style.transition = 'none';
            }
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            if (!isDragging || !activeSheet) return;
            const deltaY = e.touches[0].clientY - startY;

            if (deltaY > 0) {
                currentDeltaY = deltaY;
                activeSheet.style.transform = `translateY(${deltaY}px)`;
            } else {
                // Yukarı doğru çekilirse hafif direnç uygula
                currentDeltaY = deltaY * 0.2;
                activeSheet.style.transform = `translateY(${currentDeltaY}px)`;
            }
        }, { passive: true });

        document.addEventListener('touchend', () => {
            if (!isDragging || !activeSheet) return;
            isDragging = false;
            const sheet = activeSheet;
            activeSheet = null;

            if (currentDeltaY > 100) {
                // Aşağı kaydırarak kapat
                sheet.style.transition = 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)';
                sheet.style.transform = 'translateY(100%)';

                // Dokunsal titreşim (Haptics)
                if (navigator.vibrate) try { navigator.vibrate(15); } catch (err) {}
                if (window.Capacitor?.Plugins?.Haptics) {
                    try { window.Capacitor.Plugins.Haptics.impact({ style: 'Light' }); } catch (err) {}
                }

                setTimeout(() => {
                    // Modal kapatma butonunu veya fonksiyonunu bul ve tetikle
                    const parentModal = sheet.closest('.modal-overlay, #product-detail-modal');
                    if (parentModal) {
                        const closeBtn = parentModal.querySelector('.fa-times, .close-btn, [onclick*="close"]');
                        if (closeBtn) {
                            closeBtn.click();
                        } else {
                            parentModal.style.display = 'none';
                        }
                    }
                    sheet.style.transform = '';
                    sheet.style.transition = '';
                }, 180);
            } else {
                // Yerine geri yaylan
                sheet.style.transition = 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)';
                sheet.style.transform = 'translateY(0)';
                setTimeout(() => {
                    sheet.style.transform = '';
                    sheet.style.transition = '';
                }, 220);
            }
        }, { passive: true });
    }

    window.initModalGestures = initModalGestures;
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initModalGestures);
    } else {
        initModalGestures();
    }
})();
```

- [ ] **Step 3: Include js/gestures.js in app.html**

Add `<script src="js/gestures.js?v=3.4.0"></script>` right before `<script src="app.js"></script>` in `app.html`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/test_gestures_flow.js`
Expected: PASS with "Gestures registration test passed".

- [ ] **Step 5: Commit**

```bash
git add js/gestures.js app.html tests/test_gestures_flow.js
git commit -m "feat(mobile): add swipe-to-dismiss gesture for bottom-sheet modals with haptics"
```

---

### Task 3: Android Sync, Derleme ve Canlı Dağıtım (Deploy)

**Files:**
- Modify: `www/` (sync updated files)
- Modify: `android/app/src/main/assets/capacitor.config.json`
- Target: `android/app/build/outputs/apk/debug/app-debug.apk`

- [ ] **Step 1: Copy web assets to www and sync Capacitor Android**

Run:
```powershell
Copy-Item -Path "app.html","style.css","app.js","sw.js","firebase.json","capacitor.config.json" -Destination "www" -Force
Copy-Item -Path "js\gestures.js" -Destination "www\js" -Force
npx cap copy android
```
Expected: "copy android in Xms" success.

- [ ] **Step 2: Build Android debug APK with new live update configuration**

Run: `cmd /c "cd android && gradlew.bat assembleDebug"`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 3: Deploy to Firebase Hosting and Push to GitHub**

Run:
```powershell
Copy-Item "yanimdaki-firebase-adminsdk-fbsvc-2e8a7a6949.json" -Destination "C:\Users\A\sa.json"
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\Users\A\sa.json"
.\firebase.exe deploy --only hosting
Remove-Item -Path "C:\Users\A\sa.json" -Force -ErrorAction SilentlyContinue
git push origin main
```
Expected: "Deploy complete!" and GitHub `main` updated.

- [ ] **Step 4: Verify live site**

Run: `node tests/check_live.js`
Expected: 200 OK, loaded version 3.4.0, zero errors.
