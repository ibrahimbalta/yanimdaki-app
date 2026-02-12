// AR (Artırılmış Gerçeklik) Modu Fonksiyonları
// Temiz UTF-8 encoding ile oluşturuldu

(function () {
    // app objesine AR fonksiyonlarını ekle
    if (typeof app === 'undefined') {
        console.error('AR: app objesi bulunamadı');
        return;
    }

    // AR Log fonksiyonu
    app.arLog = function (msg) {
        console.log("[AR Debug]", msg);
        const logEl = document.getElementById('ar-debug-log');
        if (logEl) {
            const time = new Date().toLocaleTimeString().split(' ')[0];
            logEl.innerHTML += `<br>[${time}] > ${msg}`;
            if (logEl.innerHTML.split('<br>').length > 15) {
                logEl.innerHTML = logEl.innerHTML.split('<br>').slice(-15).join('<br>');
            }
        }
    };

    // Manuel video başlatma
    app.startARVideoManual = function () {
        const video = document.getElementById('ar-video');
        if (video) {
            this.arLog("Manual play triggered");
            video.play()
                .then(() => {
                    this.arLog("Manual play success");
                    document.getElementById('ar-retry-container').style.display = 'none';
                })
                .catch(e => this.arLog("Manual play error: " + e.message));
        }
    };

    // AR Modu Başlatma
    app.initARMode = async function () {
        this.toast('AR Modu Hazırlanıyor...', 'info');

        const logEl = document.getElementById('ar-debug-log');
        if (logEl) logEl.innerHTML = 'AR v5: Starting...';
        document.getElementById('ar-retry-container').style.display = 'none';

        this.arLog("Checking MediaDevices...");
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            this.arLog("Error: getUserMedia not supported (Insecure context or old browser)");
            this.toast('Cihazınız AR kamerasını desteklemiyor (HTTPS gerekli).', 'error');
            return;
        }

        // Fail-safe timeout: 5 saniye sonra hala açılmadıysa butonu göster
        this._arRetryTimeout = setTimeout(() => {
            if (this._arActive && (!this._arStream || !this._arStream.active)) {
                this.arLog("Timeout: Stream not active. Showing retry.");
                document.getElementById('ar-retry-container').style.display = 'block';
            }
        }, 5000);

        try {
            this.arLog("GUM Requesting...");
            // Önce en geniş seçeneklerle dene
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            }).catch(async (e) => {
                this.arLog("GUM Fail 1: " + e.name);
                this.arLog("Retrying simple GUM...");
                // Hata alırsak daha basit bir istekle tekrar dene
                return await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            });

            this.arLog("Stream obtained!");
            const video = document.getElementById('ar-video');
            if (video) {
                video.srcObject = stream;
                video.style.display = 'block';
                video.onloadedmetadata = () => {
                    this.arLog("Metadata Loaded");
                    const playPromise = video.play();
                    if (playPromise !== undefined) {
                        playPromise.then(() => {
                            this.arLog("Play Start!");
                            document.getElementById('ar-retry-container').style.display = 'none';
                        }).catch(err => {
                            this.arLog("Play Blocked: " + err.name);
                            document.getElementById('ar-retry-container').style.display = 'block';
                        });
                    }
                };
                // Bazı mobil tarayıcılar için hemen dene
                video.play().catch(() => { });
            }
            this._arStream = stream;
            this._arActive = true;

            // 2. Konum Al (eğer yoksa)
            if (!this.state.user?.location) {
                this.arLog("Getting user location...");
                try {
                    const pos = await new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, {
                            enableHighAccuracy: true,
                            timeout: 10000,
                            maximumAge: 0
                        });
                    });
                    this.state.user = this.state.user || {};
                    this.state.user.location = {
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude
                    };
                    this.arLog(`Location: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
                } catch (locErr) {
                    this.arLog("Location error: " + locErr.message);
                }
            } else {
                this.arLog(`Existing loc: ${this.state.user.location.lat.toFixed(4)}, ${this.state.user.location.lng.toFixed(4)}`);
            }

            // 3. Cihaz Yönü Dinleyicileri
            this._arOrientation = 0;
            const handleOrientation = (e) => {
                // webkitCompassHeading iOS için, alpha Android/Standart için
                this._arOrientation = e.webkitCompassHeading || (360 - e.alpha);
                const needle = document.getElementById('ar-compass-needle');
                if (needle) needle.style.transform = `rotate(${-this._arOrientation}deg)`;
            };

            window.addEventListener('deviceorientation', handleOrientation, true);
            this._arOrientationListener = handleOrientation;

            // 4. AR Döngüsü
            this._arActive = true;
            const updateLoop = () => {
                if (!this._arActive) return;
                this.updateARView();
                requestAnimationFrame(updateLoop);
            };
            updateLoop();

            this.toast('Pusula kalibrasyonu için telefonu 8 çizecek şekilde sallayın.', 'info');
        } catch (err) {
            console.error("AR Error Object:", err);
            let errMsg = 'Kamera erisimi saglanamadi.';
            if (err.name === 'NotAllowedError') errMsg = 'Kamera izni reddedildi. Lutfen ayarlardan izin verin.';
            else if (err.name === 'NotFoundError') errMsg = 'Kamera bulunamadi.';
            else if (err.name === 'NotReadableError') errMsg = 'Kamera su an baska bir uygulama tarafindan kullaniliyor olabilir.';
            else if (err.name === 'SecurityError') errMsg = 'Guvenlik hatasi: Kamera erisimi engellendi (HTTPS gerekli).';

            this.toast(errMsg, 'error');
            setTimeout(() => this.showScreen('home'), 2000);
        }
    };

    // AR Modu Durdurma
    app.stopARMode = function () {
        this._arActive = false;
        if (this._arStream) {
            this._arStream.getTracks().forEach(track => track.stop());
            this._arStream = null;
        }
        if (this._arOrientationListener) {
            window.removeEventListener('deviceorientation', this._arOrientationListener, true);
            this._arOrientationListener = null;
        }
        this.showScreen('home');
    };

    // AR Görünümü Güncelleme
    app.updateARView = function () {
        const container = document.getElementById('ar-overlay');
        if (!container) {
            this.arLog("No ar-overlay container");
            return;
        }
        if (!this.state.user?.location) {
            this.arLog("No user location");
            return;
        }

        const userLat = this.state.user.location.lat;
        const userLng = this.state.user.location.lng;
        const radius = 5000; // 5km içindeki ilanlar

        const now = new Date();
        const allProducts = this.state.products || [];
        const nearbyProducts = allProducts.filter(p => {
            if (!p.lat || !p.lng) return false;

            // Aktiflik ve süre kontrolü
            const isActive = (p.status || 'active') === 'active';
            const exp = p.expiresAt?.toDate ? p.expiresAt.toDate() : (p.expiresAt ? new Date(p.expiresAt) : null);
            const isAvailable = isActive && (!exp || exp > now);

            if (!isAvailable) return false;

            const dist = this.calculateDistance(userLat, userLng, p.lat, p.lng);
            return dist <= radius;
        });

        // Mevcut pinlerin hepsini başlangıçta gizle (sadece yakın olanlar tekrar açılacak)
        container.querySelectorAll('.ar-pin').forEach(pin => {
            pin.style.display = 'none';
        });

        // İlk çağrıda log göster
        if (!this._arLoggedOnce) {
            this.arLog(`User: ${userLat.toFixed(4)}, ${userLng.toFixed(4)}`);
            this.arLog(`Total products: ${allProducts.length}`);
            this.arLog(`Nearby (5km): ${nearbyProducts.length}`);
            this._arLoggedOnce = true;
        }

        const width = window.innerWidth;
        const height = window.innerHeight;
        const fov = 60; // Görüş alanı (derece)

        nearbyProducts.forEach(p => {
            let pin = document.getElementById(`ar-pin-${p.id}`);
            const bearing = this.calculateBearing(userLat, userLng, p.lat, p.lng);
            const dist = this.calculateDistance(userLat, userLng, p.lat, p.lng);

            // Cihazın baktığı yön ile ürünün bearingi arasındaki fark
            let diff = bearing - this._arOrientation;
            if (diff > 180) diff -= 360;
            if (diff < -180) diff += 360;

            // Eğer ürün görüş alanı içindeyse (fov/2)
            if (Math.abs(diff) < fov / 2) {
                if (!pin) {
                    pin = document.createElement('div');
                    pin.id = `ar-pin-${p.id}`;
                    pin.className = `ar-pin ${p.category === 'Askida' ? 'type-askida' : (p.isFree ? 'type-free' : '')}`;
                    pin.style.position = 'absolute';
                    pin.style.zIndex = '100';
                    pin.style.pointerEvents = 'auto';
                    pin.onclick = (e) => {
                        e.stopPropagation();
                        this.stopARMode();
                        this.showProductDetails(p.id);
                    };
                    container.appendChild(pin);
                }

                // Ekran koordinatını hesapla (merkeze göre diff/fov oranı)
                const x = (width / 2) + (diff / (fov / 2)) * (width / 2);
                // Mesafe arttıkça yukarı taşı (perspektif için)
                const y = (height * 0.4) - (dist / radius) * 200;
                // Uzaklaştıkça küçült
                const scale = Math.max(0.3, 1 - (dist / radius) * 0.7);

                pin.style.display = 'block';
                pin.style.left = `${x}px`;
                pin.style.top = `${y}px`;
                pin.style.transform = `translate(-50%, -50%) scale(${scale})`;
                pin.style.opacity = Math.max(0.4, 1 - (dist / radius) * 0.8);

                const isMine = p.ownerId === this.state.user?.uid;
                const imgUrl = (p.images && p.images.length > 0) ? p.images[0] : (p.image || 'img/placeholder.png');
                const priceText = p.price > 0 ? p.price + ' TL' : (p.category === 'Askida' ? 'ASKIDA' : 'Ucretsiz');

                pin.innerHTML = `
                    <div class="ar-pin-card" style="background: white; padding: 8px; border-radius: 12px; border: ${isMine ? '3px solid #7c3aed' : '2px solid var(--primary)'}; box-shadow: 0 8px 20px rgba(0,0,0,0.3); width: 110px; text-align: center; position: relative;">
                        ${isMine ? '<div style="position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: #7c3aed; color: white; font-size: 0.5rem; font-weight: 800; padding: 2px 8px; border-radius: 10px; white-space: nowrap; z-index: 10;">SENIN ILANIN</div>' : ''}
                        <div style="height: 60px; width: 100%; background: url('${imgUrl}') center/cover no-repeat; border-radius: 8px; margin-bottom: 5px;"></div>
                        <div class="ar-pin-info">
                            <span style="display: block; font-size: 0.65rem; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #1e293b;">${p.title}</span>
                            <span style="display: block; font-size: 0.8rem; font-weight: 900; color: ${isMine ? '#7c3aed' : 'var(--primary)'}; margin-top: 2px;">${priceText}</span>
                            <span style="display: block; font-size: 0.55rem; color: #64748b;">${Math.round(dist)}m</span>
                        </div>
                    </div>
                    <div style="width: 2px; height: 30px; background: ${isMine ? '#7c3aed' : 'var(--primary)'}; margin: 0 auto; box-shadow: 0 0 10px rgba(0,0,0,0.2);"></div>
                `;
            } else if (pin) {
                pin.style.display = 'none';
            }
        });
    };

    // Bearing Hesaplama
    app.calculateBearing = function (lat1, lon1, lat2, lon2) {
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const lat1Rad = lat1 * Math.PI / 180;
        const lat2Rad = lat2 * Math.PI / 180;
        const y = Math.sin(dLon) * Math.cos(lat2Rad);
        const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
        const brng = Math.atan2(y, x) * 180 / Math.PI;
        return (brng + 360) % 360;
    };

    // Mesafe Hesaplama
    app.calculateDistance = function (lat1, lon1, lat2, lon2) {
        const R = 6371000; // Dunya yaricapi (metre)
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    console.log("[AR] AR module loaded successfully (v5)");
})();
