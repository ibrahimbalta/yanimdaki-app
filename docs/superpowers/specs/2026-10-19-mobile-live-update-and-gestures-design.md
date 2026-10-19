# Design Spec: Aşama 1 - Mobil Canlı Güncelleme & Swipe-to-Dismiss Gesture

- **Tarih:** 2026-10-19
- **Proje:** Yanımdaki (Hyperlocal Marketplace & Sharing Platform)
- **Hedef:** Mobil uygulamada canlı güncelleme (OTA) yeteneği kazanmak ve tüm modallara yerel mobil hissi veren parmakla aşağı kaydırarak kapatma (swipe-to-dismiss gesture) özelliği eklemek.

---

## 1. Mimari Genel Bakış

Bu tasarım iki temel mobil yeteneği projeye entegre eder:
1. **Capacitor Live Server (OTA):** Telefondaki Android APK'sının her açılışta doğrudan `https://yanimdaki.com` canlı sunucusuna bağlanmasını sağlayarak sürekli APK derleme ve manuel kurulum döngüsünü sonlandırmak.
2. **Gesture Controller (Swipe-to-Dismiss):** Modalların alttan açılma animasyonunu tamamlayan, dokunmatik aşağı çekme ve titreşim (haptic feedback) mekanizması.

---

## 2. Detaylı Bileşen Tasarımları

### 2.1. Capacitor Canlı Güncelleme Yapılandırması
- **Dosya:** `capacitor.config.json` (ve `android/app/src/main/assets/capacitor.config.json`)
- **Ayar:**
  ```json
  {
    "appId": "com.yanimdaki.app",
    "appName": "Yanımdaki",
    "webDir": "www",
    "server": {
      "url": "https://yanimdaki.com",
      "cleartext": false,
      "androidScheme": "https"
    }
  }
  ```
- **Çalışma Prensibi:**
  - Uygulama başlatıldığında Capacitor WebView'ı doğrudan `https://yanimdaki.com` adresine yönlenir.
  - Cihaz çevrimdışı kaldığında veya ağ kesintisinde `sw.js` (Service Worker Cache) devreye girerek uygulamanın çevrimdışı çalışmaya devam etmesini sağlar.
  - Firebase Hosting'e deploy edilen her güncelleme kullanıcıların telefonundaki uygulamaya anında yansır.

---

### 2.2. Modal Swipe-to-Dismiss Controller
- **Dosya:** `js/gestures.js` (veya `app.js` içine `app.initModalGestures()`)
- **Kapsam:**
  - Mobil cihazlarda (`window.innerWidth <= 768`) açılan tüm `.modal-overlay`, `#seller-profile-modal`, `#product-detail-modal`, `#pazar-add-modal` vb. modallar.
- **Etkileşim Dinamikleri:**
  - **Touch Target:** Modal üst alanı (`.modal-header`, `::before` drag bar, modalın üst 60px kısmı).
  - **Touch Start:**
    - `startY` ve `currentY` kaydedilir.
    - Modal içeriğinde dikey scroll pozisyonu `scrollTop === 0` ise gesture dinlenir (kullanıcı modalın içini yukarı kaydırmıyorsa).
  - **Touch Move:**
    - `deltaY = e.touches[0].clientY - startY`.
    - Eğer `deltaY > 0` (aşağı çekiliyorsa):
      - `modalElement.style.transform = `translateY(${deltaY}px)`;
      - `modalElement.style.transition = 'none'`;
    - Eğer `deltaY < 0` (yukarı itiliyorsa): Hafif direnç uygulanır (`deltaY * 0.2`).
  - **Touch End:**
    - Eğer `deltaY > 100` veya çekme hızı (velocity) yüksekse:
      - `modalElement.style.transition = 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)'`;
      - `modalElement.style.transform = 'translateY(100%)'`;
      - Kapanma anında dokunsal titreşim tetiklenir:
        ```javascript
        if (navigator.vibrate) navigator.vibrate(15);
        if (window.Capacitor?.Plugins?.Haptics) {
            window.Capacitor.Plugins.Haptics.impact({ style: 'Light' });
        }
        ```
      - İlgili modalın kapatma fonksiyonu çağrılır (örneğin modal içindeki `.fa-times`, `.close-btn` veya overlay click).
    - Eğer `deltaY <= 100`:
      - `modalElement.style.transition = 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)'`;
      - `modalElement.style.transform = 'translateY(0)'`;
      - Animasyon bittikten sonra geçici stiller temizlenir.

---

## 3. Test ve Doğrulama Planı
1. **Web & Mobil Simülasyon Testi (Playwright):**
   - Mobil viewport (390x844) ayarında modal açılır.
   - Yapay dokunmatik hareketle (`touchmove` Y: 0 -> 150px) modal aşağı çekilir.
   - Modalın `translateY(100%)` ile düzgün kapandığı ve sayfa hatası üretmediği doğrulanır.
2. **Android APK Senkronizasyonu:**
   - `npx cap sync android` ve `gradlew assembleDebug` çalıştırılır.
   - `capacitor.config.json` `server.url` ayarı doğrulanır.
3. **Canlıya Deploy & Sürüm Kontrolü:**
   - Değişiklikler Firebase Hosting'e deploy edilir ve GitHub `main` dalına aktarılır.
