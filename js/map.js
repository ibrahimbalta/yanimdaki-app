Object.assign(window.app, {
    renderSafeMap: async function (lat, lng, productId) {
        const mapContainer = document.getElementById('detail-map');
        if (!mapContainer) return;

        // Koordinat kontrolü ve Fallback (Gelen veri hatalıysa kullanıcının konumu veya İstanbul)
        let displayLat = parseFloat(lat);
        let displayLng = parseFloat(lng);

        if (isNaN(displayLat) || isNaN(displayLng)) {
            console.warn("Harita için geçersiz koordinat, fallback kullanılıyor.");
            displayLat = this.state.user?.location?.lat || 41.0082;
            displayLng = this.state.user?.location?.lng || 28.9784;
        }

        // Eski haritayı temizle
        if (this.state.mapInstance) {
            this.state.mapInstance.remove();
        }

        // Haritayı başlat (Hemen başlatıyoruz, noktaları sonra yükleyeceğiz)
        this.state.mapInstance = L.map('detail-map', {
            zoomControl: false,
            attributionControl: false
        }).setView([displayLat, displayLng], 15);

        const isDarkMode = document.documentElement.classList.contains('dark-mode');
        const tileUrl = isDarkMode
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

        const attribution = isDarkMode
            ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

        L.tileLayer(tileUrl, { attribution }).addTo(this.state.mapInstance);

        // İlan konumu marker'ı
        const productIcon = L.divIcon({
            html: `<i class="fas fa-location-dot" style="font-size: 1.5rem; color: var(--accent); filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));"></i>`,
            className: 'product-map-icon',
            iconSize: [24, 24],
            iconAnchor: [12, 24]
        });
        L.marker([displayLat, displayLng], { icon: productIcon }).addTo(this.state.mapInstance);

        // Güvenli noktaları asenkron yükle (Non-blocking)
        this.loadMapSafePoints(displayLat, displayLng);

        // Harita geç render edildiği için boyutunu tazele
        setTimeout(() => {
            if (this.state.mapInstance) this.state.mapInstance.invalidateSize();
        }, 400);
    },

    loadMapSafePoints: async function (lat, lng) {
        const safePointsList = document.getElementById('safe-points-list');
        if (safePointsList) safePointsList.innerHTML = '<div style="padding: 10px; color: var(--text-muted); font-size: 0.8rem;"><i class="fas fa-spinner fa-spin"></i> Yakındaki noktalar taranıyor...</div>';

        try {
            // Dinamik olarak yakınlardaki mekanları çek
            const dynamicPoints = await this.fetchNearbySafePoints(lat, lng);
            const allPoints = [...(this.state.safePoints || []), ...dynamicPoints];

            if (safePointsList) safePointsList.innerHTML = '';

            const nearbyPoints = allPoints
                .map(sp => ({
                    ...sp,
                    distance: this.utils.calculateDistance(lat, lng, sp.lat, sp.lng)
                }))
                .filter(sp => sp.distance < 3) // 3km içindeyse göster
                .sort((a, b) => {
                    if (a.isPartner && !b.isPartner) return -1;
                    if (!a.isPartner && b.isPartner) return 1;
                    return a.distance - b.distance;
                })
                .slice(0, 6);

            if (nearbyPoints.length === 0 && safePointsList) {
                safePointsList.innerHTML = '<div style="padding: 10px; color: var(--text-muted); font-size: 0.8rem;">Yakında güvenli nokta bulunamadı.</div>';
                return;
            }

            nearbyPoints.forEach(sp => {
                const isPartner = sp.isPartner;

                // Haritaya marker ekle
                const markerIcon = L.divIcon({
                    html: `
                        <div class="safe-zone-pulse"></div>
                        <div class="safe-zone-marker" style="width: 100%; height: 100%; font-size: ${isPartner ? '1rem' : '0.8rem'};">
                            <i class="fas fa-shield-halved"></i>
                        </div>
                    `,
                    className: isPartner ? 'partner-map-icon' : 'safe-map-icon',
                    iconSize: [isPartner ? 32 : 24, isPartner ? 32 : 24],
                    iconAnchor: [isPartner ? 16 : 12, isPartner ? 16 : 12]
                });

                L.marker([sp.lat, sp.lng], { icon: markerIcon })
                    .addTo(this.state.mapInstance)
                    .bindPopup(`<b>${isPartner ? '⭐ ' : ''}${sp.name}</b><br>${sp.description || 'Güvenli Buluşma Noktası'}`);

                // Listeye ekle
                if (safePointsList) {
                    const item = document.createElement('div');
                    item.className = `safe-point-item ${isPartner ? 'is-partner' : ''}`;
                    item.innerHTML = `
                        <div class="safe-point-icon ${isPartner ? 'partner-icon' : ''}">
                            <i class="fas fa-shield-halved"></i>
                        </div>
                        <div class="safe-point-info" style="flex: 1;">
                            ${isPartner ? '<span class="partner-badge">⭐ Partner İşletme</span>' : ''}
                            <h4 style="color: var(--text-main); font-size: 0.85rem;">${sp.name}</h4>
                            <p style="color: var(--text-muted); font-size: 0.7rem;">${sp.description || 'Popüler Buluşma Noktası'}</p>
                        </div>
                        <div class="safe-point-distance ${isPartner ? 'is-partner' : ''}" style="font-size: 0.75rem; font-weight: 700;">
                            ${this.utils.formatDistance(sp.distance)}
                        </div>
                    `;
                    item.onclick = () => {
                        this.state.mapInstance.setView([sp.lat, sp.lng], 16);
                        this.toast(`${sp.name} seçildi. Sohbetten önerebilirsiniz.`, 'info');
                        this.state.selectedSafePoint = sp;
                    };
                    safePointsList.appendChild(item);
                }
            });
        } catch (err) {
            console.error("Safe points load error:", err);
            if (safePointsList) safePointsList.innerHTML = '<div style="padding: 10px; color: var(--text-muted); font-size: 0.8rem;">Noktalar yüklenemedi.</div>';
        }
    },

    fetchNearbySafePoints: async function (lat, lng) {
        try {
            // Overpass API Query: 2km çapındaki kafe, fast_food, restaurant ve malları çek
            const query = `[out:json];node["amenity"~"cafe|fast_food|restaurant"]["name"](around:2000,${lat},${lng});out 10;`;
            const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

            const response = await fetch(url);
            const data = await response.json();

            return data.elements.map(e => ({
                id: 'dynamic-' + e.id,
                name: e.tags.name,
                lat: e.lat,
                lng: e.lon,
                description: e.tags.amenity === 'cafe' ? 'Kafe' : (e.tags.amenity === 'restaurant' ? 'Restoran' : 'Buluşma Noktası'),
                type: 'dynamic'
            }));
        } catch (err) {
            console.error("Dinamik mekan arama hatası:", err);
            return [];
        }
    },

    updateUserLocation: function () {
        if (!navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                if (!this.state.user) this.state.user = {};
                this.state.user.location = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude
                };
                console.log("Viewer location updated:", this.state.user.location);
                // Konum gelince listeleri yenile
                if (this.renderProducts) this.renderProducts();
                const detailModal = document.getElementById('product-detail-modal');
                if (detailModal && detailModal.style.display === 'block' && this.currentProductId) {
                    this.showProductDetails(this.currentProductId);
                }
            },
            (err) => console.warn("Could not get viewer location:", err.message),
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    },

    openGoogleMaps: function (lat, lng, name = '') {
        if (!lat || !lng) return this.toast('Konum bilgisi eksik.', 'error');
        // Yol tarifi URL'i
        const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
        window.open(url, '_blank');
    },

    openInMaps: function (lat, lng) {
        this.openGoogleMaps(lat, lng);
    },

    getSettingsLocation: function () {
        if (!navigator.geolocation) {
            return this.toast('Tarayıcınız konum özelliğini desteklemiyor.', 'error');
        }

        this.toast('Konumunuz belirleniyor...', 'info');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                document.getElementById('settings-lat').value = lat;
                document.getElementById('settings-lng').value = lng;

                // Reverse Geocoding
                fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`)
                    .then(r => r.json())
                    .then(data => {
                        const city = data.address.city || data.address.town || data.address.village || data.address.province || '';
                        const district = data.address.district || data.address.county || data.address.suburb || '';
                        const finalAddr = (district && city) ? `${district}, ${city}` : (city || district || 'Konum Belirlendi');
                        document.getElementById('settings-location-name').value = finalAddr;
                        this.toast('Konum bulundu: ' + finalAddr, 'success');
                    })
                    .catch(err => {
                        console.error("Geocoding error:", err);
                        document.getElementById('settings-location-name').value = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                        this.toast('Konum başarıyla alındı. 📍', 'success');
                    });
            },
            (err) => this.toast('Konum alınamadı: ' + err.message, 'error'),
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
        );
    },

    getPartnerLocation: function () {
        if (!navigator.geolocation) {
            this.toast('Tarayıcınız konum özelliğini desteklemiyor.', 'error');
            return;
        }

        const btn = event.currentTarget;
        const icon = btn.querySelector('i');
        const originalClass = icon.className;
        icon.className = 'fas fa-spinner fa-spin';

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                document.getElementById('partner-apply-lat').value = lat;
                document.getElementById('partner-apply-lng').value = lng;

                // Reverse Geocoding
                fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`)
                    .then(r => r.json())
                    .then(data => {
                        const city = data.address.city || data.address.town || data.address.village || data.address.province || '';
                        const district = data.address.district || data.address.county || data.address.suburb || '';
                        const finalAddr = (district && city) ? `${district}, ${city}` : (city || district || 'Konum Belirlendi');
                        document.getElementById('partner-apply-loc-name').value = finalAddr;
                        icon.className = originalClass;
                        this.toast('Konum bulundu: ' + finalAddr);
                    })
                    .catch(err => {
                        console.error("Geocoding error:", err);
                        document.getElementById('partner-apply-loc-name').value = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                        icon.className = originalClass;
                        this.toast('Konum başarıyla alındı. 📍');
                    });
            },
            (err) => {
                icon.className = originalClass;
                this.toast('Konum alınamadı: ' + err.message, 'error');
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
        );
    },

    getEsnafLocation: function () {
        if (!navigator.geolocation) {
            this.toast('Tarayıcınız konum özelliğini desteklemiyor.', 'error');
            return;
        }

        const icon = event.currentTarget.querySelector('i');
        const originalClass = icon.className;
        icon.className = 'fas fa-spinner fa-spin';

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                document.getElementById('esnaf-apply-lat').value = lat;
                document.getElementById('esnaf-apply-lng').value = lng;

                // Reverse Geocoding
                fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`)
                    .then(r => r.json())
                    .then(data => {
                        const city = data.address.city || data.address.town || data.address.village || data.address.province || '';
                        const district = data.address.district || data.address.county || data.address.suburb || '';
                        const finalAddr = (district && city) ? `${district}, ${city}` : (city || district || 'Konum Belirlendi');
                        document.getElementById('esnaf-apply-loc-name').value = finalAddr;
                        icon.className = originalClass;
                        this.toast('Konum bulundu: ' + finalAddr);
                    })
                    .catch(err => {
                        console.error("Geocoding error:", err);
                        document.getElementById('esnaf-apply-loc-name').value = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                        icon.className = originalClass;
                        this.toast('Konum başarıyla alındı. 📍');
                    });
            },
            (err) => {
                icon.className = originalClass;
                this.toast('Konum alınamadı: ' + err.message, 'error');
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
        );
    },

    getCurrentLocation: function () {
        if (!navigator.geolocation) {
            this.toast('Tarayıcınız konum özelliğini desteklemiyor.', 'error');
            return;
        }

        const btn = event.currentTarget;
        const icon = btn.querySelector('i');
        const originalClass = icon.className;
        icon.className = 'fas fa-spinner fa-spin';

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;

                const latEl = document.getElementById('add-lat');
                const lngEl = document.getElementById('add-lng');
                const nameEl = document.getElementById('add-location-name');

                if (latEl) latEl.value = lat;
                if (lngEl) lngEl.value = lng;

                // Reverse Geocoding
                fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`)
                    .then(r => r.json())
                    .then(data => {
                        const city = data.address.city || data.address.town || data.address.village || data.address.province || '';
                        const district = data.address.district || data.address.county || data.address.suburb || '';
                        const finalAddr = (district && city) ? `${district}, ${city}` : (city || district || 'Konum Belirlendi');
                        if (nameEl) nameEl.value = finalAddr;
                        icon.className = originalClass;
                        this.toast('Konum bulundu: ' + finalAddr);
                    })
                    .catch(err => {
                        console.error("Geocoding error:", err);
                        if (nameEl) nameEl.value = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                        icon.className = originalClass;
                        this.toast('Konum başarıyla alındı. 📍');
                    });
            },
            (err) => {
                icon.className = originalClass;
                this.toast('Konum alınamadı: ' + err.message, 'error');
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
        );
    },
});
