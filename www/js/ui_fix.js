window.app = window.app || {};

Object.assign(app, {
    renderProducts: function () {
        const container = document.getElementById('product-list');
        if (!container) return;

        // --- Koruma: KullanÄ±cÄ± oturumu yoksa veya konum bilgisi henÃ¼z gelmediyse varsayÄ±lan ata ---
        const userLat = (this.state.user && this.state.user.location) ? this.state.user.location.lat : 41.0082;
        const userLng = (this.state.user && this.state.user.location) ? this.state.user.location.lng : 28.9784;

        // Performans Optimizasyonu: Mesafeleri memoize et
        if (!this._distanceCache) this._distanceCache = {};
        const cacheKey = `${userLat}_${userLng}_${this.state.products.length}`;

        const productsWithDistance = this.state.products.map(p => {
            const pLat = p.lat || p.location?.lat;
            const pLng = p.lng || p.location?.lng;
            const pKey = `${p.id}_${pLat}_${pLng}`;

            if (this._distanceCache[cacheKey] && this._distanceCache[cacheKey][pKey]) {
                return { ...p, _calculatedDistance: this._distanceCache[cacheKey][pKey] };
            }
            const dist = this.utils.calculateDistance(userLat, userLng, pLat, pLng);
            if (!this._distanceCache[cacheKey]) this._distanceCache[cacheKey] = {};
            this._distanceCache[cacheKey][pKey] = dist;
            return { ...p, _calculatedDistance: dist };
        });

        const filtered = productsWithDistance.filter(p => {
            // ÃœrÃ¼n satÄ±ldÄ± mÄ± kontrolÃ¼
            const isSold = p.status === 'sold' || this.state.offers.some(o => o.productId === p.id && o.status === 'accepted');
            const searchLower = this.state.filters.searchQuery.toLowerCase();
            const shopName = p.shopName || "";
            const matchesSearch = p.title.toLowerCase().includes(searchLower) ||
                (p.adNumber && p.adNumber.toString().includes(searchLower)) ||
                shopName.toLowerCase().includes(searchLower);
            const matchesCategory = this.state.filters.category === 'all' || p.category === this.state.filters.category;

            const expiresAt = (() => {
                if (p.expiresAt) return (p.expiresAt.toDate) ? p.expiresAt.toDate() : new Date(p.expiresAt);
                const baseTime = (p.republishedAt || p.createdAt);
                if (baseTime) {
                    const date = (baseTime.toDate) ? baseTime.toDate() : new Date(baseTime);
                    const finalDate = isNaN(date.getTime()) ? new Date() : date;
                    return new Date(finalDate.getTime() + 24 * 60 * 60 * 1000);
                }
                return new Date(Date.now() + 24 * 60 * 60 * 1000);
            })();
            const isExpired = expiresAt < new Date();
            const isOwner = (this.state.user && p.ownerId === this.state.user.uid) || (this.state.user && p.ownerPhone && p.ownerPhone === this.state.user.phone);

            const f = this.state.filters;
            const matchesPrice = (!f.minPrice || p.price >= f.minPrice) && (!f.maxPrice || p.price <= f.maxPrice);
            const matchesCondition = f.condition === 'all' || p.condition === f.condition;
            const matchesOnlyEsnaf = f.onlyEsnaf ? p.isEsnaf === true : true;

            let matchesLocation = true;
            if (f.city !== 'all') {
                matchesLocation = (p.city === f.city);
            } else if (f.maxDistance !== 'all') {
                matchesLocation = p._calculatedDistance <= f.maxDistance;
            }

            const matchesOnlyFree = f.onlyFree ? p.isFree === true : true;
            const matchesOnlyBulk = f.onlyBulk ? p.isBulk === true : true;
            const matchesOnlySurprise = f.onlySurprise ? p.isSurprise === true : true;
            const isFree = (p.price === 0 || !p.price || p.isFree);
            const matchesService = this.state.filters.onlyService ? (p.category === 'Hizmetler' || p.category === 'Usta & YardÄ±m') : true;
            const matchesAskida = this.state.filters.onlyAskida ? isFree : true;

            return !isSold && !isExpired && matchesSearch && matchesCategory && matchesPrice && matchesCondition && matchesLocation && matchesOnlyFree && matchesOnlyBulk && matchesOnlySurprise && matchesService && matchesAskida && matchesOnlyEsnaf;
        }).sort((a, b) => {
            const sortBy = this.state.filters.sortBy || 'distance';

            if (sortBy === 'distance') {
                return a._calculatedDistance - b._calculatedDistance;
            } else if (sortBy === 'date') {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                return dateB - dateA;
            } else if (sortBy === 'price_asc') {
                return (a.price || 0) - (b.price || 0);
            } else if (sortBy === 'price_desc') {
                return (b.price || 0) - (a.price || 0);
            }
            return 0;
        });

        if (filtered.length === 0) {
            if (this.state.products.length === 0) {
                container.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-muted); background: var(--bg-card); border-radius: var(--radius-lg); border: 2px dashed var(--border-color); margin: 20px 0;">
                        <i class="fas fa-box-open" style="font-size: 3rem; color: var(--border-color); margin-bottom: 15px; display: block;"></i>
                        <h3 style="color: var(--text-main); margin-bottom: 8px;">Henüz İlan Yok</h3>
                        <p style="font-size: 0.9rem; margin-bottom: 24px;">Mahallende henüz paylaşılan bir ürün yok. İlk adımı sen atmak ister misin?</p>
                        <button onclick="app.seedSampleData()" style="background: var(--primary); color: white; border: none; padding: 12px 24px; border-radius: var(--radius-md); font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(0, 168, 150, 0.2);">
                            <i class="fas fa-magic"></i> Örnek Veri Yükle
                        </button>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
                        <i class="fas fa-search" style="font-size: 2.5rem; color: var(--border-color); margin-bottom: 12px; display: block;"></i>
                        <p style="font-weight: 600;">AramanÄ±zla eÅŸleÅŸen Ã¼rÃ¼n bulunamadÄ±.</p>
                        <button onclick="app.clearFilters()" style="background: none; border: 1px solid var(--primary); color: var(--primary); padding: 8px 16px; border-radius: 20px; margin-top: 12px; font-size: 0.8rem; font-weight: 700;">Filtreleri Temizle</button>
                    </div>
                `;
            }
            return;
        }
        // KullanÄ±cÄ±nÄ±n en az bir 'PaylaÅŸ' ilanÄ± olup olmadÄ±ÄŸÄ±nÄ± kontrol et
        const userHasSharingAd = this.state.user ? this.state.products.some(p => p.ownerId === this.state.user.uid && p.isFree === true) : false;

        container.innerHTML = filtered.map((p, index) => {
            const d = p._calculatedDistance;

            const expiresAt = (() => {
                let realExp = null;
                if (p.expiresAt) realExp = (p.expiresAt.toDate) ? p.expiresAt.toDate() : new Date(p.expiresAt);
                else if (p.createdAt) {
                    const created = (p.createdAt.toDate) ? p.createdAt.toDate() : new Date(p.createdAt);
                    realExp = new Date(created.getTime() + 24 * 60 * 60 * 1000);
                } else {
                    realExp = new Date(Date.now() + 24 * 60 * 60 * 1000);
                }

                const now = new Date();
                const diff = realExp - now;
                const oneDay = 24 * 60 * 60 * 1000;

                if (diff > oneDay) {
                    const displayDiff = diff % oneDay || oneDay;
                    return new Date(now.getTime() + displayDiff);
                }
                return realExp;
            })();

            const getCountdownHtml = (expires) => {
                const diff = expires - new Date();
                if (diff <= 0) return '<span class="countdown-badge expired"><i class="fas fa-clock"></i> SÃ¼resi Doldu</span>';

                const hours = Math.floor(diff / (1000 * 60 * 60));
                const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const isUrgent = hours < 1;
                const label = p.vitrine ? 'Vitrin' : '';
                const titleAttr = p.vitrine ? 'Vitrin/Sponsorlu Ä°lan SÃ¼resi' : 'Kalan SÃ¼re';

                return `<span class="countdown-badge ${isUrgent ? 'urgent' : ''} ${p.vitrine ? 'vitrine' : ''}" data-expires="${expires.getTime()}" title="${titleAttr}">
                    <i class="fas ${p.vitrine ? 'fa-gem' : 'fa-clock'}"></i> ${label} ${hours > 0 ? hours + 's ' : ''}${mins}dk
                </span>`;
            };

            const countdownHtml = getCountdownHtml(expiresAt);

            const isExpired = expiresAt && (expiresAt - new Date() < 0);

            // Fiyat hesaplama
            const currentPrice = p.price || 0;
            const oldPrice = p.oldPrice || p.initialPrice || 0;
            const formatPrice = (num) => num.toLocaleString('tr-TR');

            let priceHtml = '';
            if (oldPrice > 0 && currentPrice < oldPrice) {
                priceHtml = `<span class="old-price">${formatPrice(oldPrice)}₺</span>${formatPrice(currentPrice)}₺`;
            } else {
                priceHtml = p.isFree ? 'Hediye' : (p.isNegotiable ? 'Teklif' : formatPrice(currentPrice) + '₺');
            }

            // Ã–zellik Ä°konlarÄ± (Ã‡oklu)
            let featureIconsHtml = '<div class="card-features-wrapper">';

            if (p.isEsnaf) {
                featureIconsHtml += `<div class="feature-icon-circle esnaf" title="Esnaf İlanı"><i class="fas fa-store"></i></div>`;
            }
            if ((p.isFree || p.price === 0) && !p.isSwap) {
                featureIconsHtml += `<div class="feature-icon-circle paylas" title="Hediye/Paylaş"><i class="fas fa-leaf"></i></div>`;
            }
            if (p.isAskida || p.category === 'askida' || p.category === 'Askıda') {
                featureIconsHtml += `<div class="feature-icon-circle askida" title="Askıda"><i class="fas fa-hand-holding-heart"></i></div>`;
            }
            let rescueBadgeHtml = '';
            if (p.isSurprise || p.category === 'surpriz-paket') {
                const now = new Date();
                const isRescueHour = now.getHours() >= 20 || now.getHours() < 2;
                if (isRescueHour) {
                    rescueBadgeHtml = `<div class="rescue-badge-premium" title="İSRAFI ÖNLE"><i class="fas fa-hand-holding-heart"></i> KURTAR</div>`;
                } else {
                    featureIconsHtml += `<div class="feature-icon-circle israf" title="İsrafı Önle"><i class="fas fa-box"></i></div>`;
                }
            }
            if (p.isService || p.category === 'Hizmetler' || p.category === 'Usta & Yardım') {
                featureIconsHtml += `<div class="feature-icon-circle hizmet" title="Hizmet"><i class="fas fa-tools"></i></div>`;
            }
            if (p.isBulk) {
                featureIconsHtml += `<div class="feature-icon-circle toplu" title="Toplu Satış"><i class="fas fa-boxes-stacked"></i></div>`;
            }
            if (p.isSwap) {
                featureIconsHtml += `<div class="feature-icon-circle takas" title="Takas Olur"><i class="fas fa-right-left"></i></div>`;
            }
            if (p.isNegotiable) {
                featureIconsHtml += `<div class="feature-icon-circle teklif" title="Teklif Bekliyorum"><i class="fas fa-handshake"></i></div>`;
            }
            if (p.isEsnaf && p.oldPrice > p.price) {
                featureIconsHtml += `<div class="feature-icon-circle firsat" title="Fırsat"><i class="fas fa-tag"></i></div>`;
            }
            if (p.verifiedNeighbor || p.ownerVerified) {
                featureIconsHtml += `<div class="feature-icon-circle verified" title="Doğrulanmış Komşu"><i class="fas fa-check-circle"></i></div>`;
            }
            if (p.delivery) {
                const deliveryIcons = {
                    'kapidan': { icon: 'fa-door-open', label: 'Kapıdan Teslim' },
                    'kapiya-birak': { icon: 'fa-box', label: 'Kapıya Bırak (Curb-side)' },
                    'ortak-nokta': { icon: 'fa-map-pin', label: 'Ortak Nokta' },
                    'gel-al': { icon: 'fa-shop', label: 'Gel-Al (DÃ¼kkan)' }
                };
                const del = deliveryIcons[p.delivery] || deliveryIcons['kapidan'];
                featureIconsHtml += `<div class="feature-icon-circle delivery" title="${del.label}"><i class="fas ${del.icon}"></i></div>`;
            }

            featureIconsHtml += '</div>';

            // Deal badge (Sadece Esnaf ve indirim varsa - opsiyonel, saÄŸda kalabilir)
            let dealBadgeHtml = '';
            if (p.isEsnaf && p.dealType && p.dealType !== 'none') {
                const labels = { indirim: 'Ä°NDÄ°RÄ°M', serisonu: 'SERÄ° SONU', teshir: 'TEÅHÄ°R' };
                dealBadgeHtml = `<span class="esnaf-compact-deal-badge">${labels[p.dealType]}</span>`;
            }

            // Favori kontrolÃ¼
            const isFav = this.state.favorites && this.state.favorites.includes(p.id);

            // Rating hesaplama
            const productRatings = this.state.ratings.filter(r => r.productId === p.id || r.userId === p.ownerId);
            const avgRating = productRatings.length > 0
                ? (productRatings.reduce((sum, r) => sum + (r.rating || 0), 0) / productRatings.length).toFixed(1)
                : 0;
            const ratingCount = productRatings.length;

            // YÄ±ldÄ±z HTML oluÅŸtur (Her zaman gÃ¶ster)
            const starsHtml = `
                <div class="card-rating">
                    <div class="card-rating-stars">
                        ${[1, 2, 3, 4, 5].map(i => `<i class="fas fa-star ${i <= Math.round(avgRating) ? (i === 5 && avgRating >= 4.5 ? 'highlight' : '') : 'empty'}"></i>`).join('')}
                    </div>
                    <span class="card-rating-value">${avgRating > 0 ? avgRating.toString().replace('.', ',') : '0,0'}</span>
                    <span class="card-rating-count">(${ratingCount})</span>
                </div>
            `;

            // Stagger animation delay
            const delay = (index % 10) * 0.05;

            return `
                <div class="esnaf-compact-card product-card stagger-in" 
                     onclick="${p.isFree && !userHasSharingAd ? `app.toast('Bu hizmetten faydalanmak iÃ§in siz de paylaÅŸ ilanÄ± yÃ¼klemelisiniz.', 'info')` : `app.showProductDetails('${p.id}')`}" 
                     style="${isExpired ? 'opacity: 0.6;' : ''} animation-delay: ${delay}s;">
                    <button class="card-favorite-btn ${isFav ? 'active' : ''}" onclick="event.stopPropagation(); app.toggleFavorite('${p.id}')" aria-label="Favorilere ekle">
                        <i class="${isFav ? 'fas' : 'far'} fa-heart"></i>
                    </button>
                    <div class="esnaf-compact-img" style="background-image: url('${this.utils.getProductImage(p)}');">
                        ${featureIconsHtml}
                        ${rescueBadgeHtml}
                        ${dealBadgeHtml}
                        <span class="esnaf-compact-price-tag"><i class="fas fa-location-dot" style="font-size:0.7rem; margin-right:4px;"></i> ${priceHtml}</span>
                    </div>
                    <div class="esnaf-compact-info">
                        <div class="esnaf-compact-title">
                            ${this.utils.escapeHTML(p.title)}
                        </div>
                        ${p.dealType && p.dealType !== 'none' ? `
                            <div class="esnaf-deal-label-red">
                                ${p.dealType === 'indirim' ? 'İNDİRİM' : (p.dealType === 'serisonu' ? 'SERİ SONU' : 'TEŞHİR ÜRÜNÜ')}
                            </div>
                        ` : ''}
                        <div class="esnaf-compact-location">
                            <div class="esnaf-location-left">
                                <i class="fas fa-location-dot"></i>
                                <span>${this.utils.escapeHTML(p.city || '')} ${this.utils.escapeHTML(p.district || '')}</span>
                            </div>
                            <div class="esnaf-location-right">
                                <i class="fas fa-route"></i>
                                <span>${this.utils.formatDistance(d)}</span>
                            </div>
                        </div>
                        ${starsHtml}
                        
                        ${(() => {
                    const now = new Date();
                    const isRescueHour = (now.getHours() >= 20 || now.getHours() < 2);
                    if ((p.isSurprise || p.category === 'surpriz-paket') && isRescueHour) {
                        // Progress Bar Hesaplama (20:00 -> 02:00 = 6 saatlik periyot)
                        let startTime = new Date(); startTime.setHours(20, 0, 0);
                        if (now.getHours() < 20) startTime.setDate(startTime.getDate() - 1);

                        let endTime = new Date(startTime.getTime() + (6 * 3600000));
                        const total = endTime - startTime;
                        const elapsed = now - startTime;
                        const percent = Math.max(0, Math.min(100, 100 - (elapsed / total * 100)));

                        return `
                                    <div class="rescue-progress-container">
                                        <div class="rescue-progress-bar" style="width: ${percent}%"></div>
                                    </div>
                                    <div class="rescue-timer-text">
                                        <span>♻️ İsrafı Önle</span>
                                        <span>${Math.round(percent)}% kaldı</span>
                                    </div>
                                `;
                    }
                    return '';
                })()}

                        ${p.isEsnaf ? `
                        <div class="esnaf-compact-shop" style="display: flex; align-items: center; gap: 4px;">
                            <i class="fas fa-store"></i>
                            <span>${this.utils.escapeHTML(p.shopName || p.ownerName)}</span>
                            ${p.isOwnerVerified || p.isEsnaf ? '<span class="verified-badge small" title="Onaylı Satıcı"><i class="fas fa-check-circle"></i></span>' : ''}
                        </div>
                        ` : `
                        <div class="esnaf-compact-shop" style="display: flex; align-items: center; gap: 4px;">
                            <i class="fas fa-user" style="font-size: 0.75rem; color: var(--text-muted);"></i>
                            <span style="font-size: 0.75rem; color: var(--text-muted);">${this.utils.escapeHTML(p.ownerName || 'Kullanıcı')}</span>
                            ${p.isOwnerVerified ? '<span class="verified-badge small" title="Onaylı Profil"><i class="fas fa-check-circle"></i></span>' : ''}
                        </div>
                        `}
                        ${countdownHtml}
                    </div>
                </div>
            `;
        }).join('');

        this.renderEsnafCarousel();
        this.startGlobalTimers(); // SayaÃ§larÄ± baÅŸlat
    },

    renderHeroSlider: function () {
        // Original slider logic (now hidden in index.html, but keeping JS for compatibility)
        const slider = document.getElementById('hero-slider');
        if (!slider) return;
        // ... (rest of the logic is same)
        this.renderMahallePazarı(); // Tetikle
    },

    renderMahallePazarı: function () {
        const container = document.getElementById('pazar-items-container');
        if (!container) return;

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD

        // Filter and Sort: Today only + City Match + Neighborhood priority + Latest first
        const pazarItems = (this.state.products || []).filter(p => {
            const isBasePazar = p.isDailyPazar === true && !this.utils.isProductExpired(p);

            // "İsrafı Önle" Logic: After 20:00, show surprise packages
            const isRescueHour = now.getHours() >= 20 || now.getHours() < 2;
            const isRescueAd = (p.isSurprise || p.category === 'surpriz-paket') && isRescueHour;

            const isMatchingCity = (this.state.filters.city === 'all' || p.city === this.state.filters.city);
            const isActive = p.status === 'active' && !this.state.offers.some(o => o.productId === p.id && o.status === 'accepted');

            return (isBasePazar || isRescueAd) && isActive && isMatchingCity;
        }).sort((a, b) => {
            // Neighborhood priority
            const myNeighborhood = this.state.user ? this.state.user.neighborhood : '';
            if (a.neighborhood === myNeighborhood && b.neighborhood !== myNeighborhood) return -1;
            if (a.neighborhood !== myNeighborhood && b.neighborhood === myNeighborhood) return 1;

            // Then date 
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
            return dateB - dateA;
        });

        if (pazarItems.length === 0) {
            container.innerHTML = `
                <div class="vitrine-placeholder-card" onclick="app.openPazarAddModal()" style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border-color: #f59e0b; min-width: 100%;">
                    <div class="vitrine-placeholder-icon" style="color: #f59e0b; background: white;">
                        <i class="fas fa-basket-shopping"></i>
                    </div>
                    <div class="vitrine-placeholder-content">
                        <h4 style="color: #92400e;">Mahalle PazarÄ±</h4>
                        <p style="color: #b45309;">HenÃ¼z Ã¼rÃ¼n yok. Ä°lk Ã¼rÃ¼nÃ¼ ekleyerek pazarÄ± siz baÅŸlatÄ±n!</p>
                        <span class="vitrine-placeholder-cta" style="color: #f59e0b;">ÃœrÃ¼n Ekle <i class="fas fa-plus"></i></span>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = pazarItems.map(item => {
            const isVeryNew = item.createdAt && (now - (item.createdAt.toDate ? item.createdAt.toDate() : new Date(item.createdAt))) < 1800000; // 30 dk

            return `
                <div class="pazar-premium-card" onclick="app.showProductDetails('${item.id}')">
                    <img src="${this.utils.getProductImage(item)}" style="width: 100%; height: 130px; object-fit: cover;">
                    
                    <div style="position: absolute; top: 10px; right: 10px; z-index: 5;">
                        <span style="background: rgba(255,255,255,0.9); color: var(--pazar-amber); padding: 4px 8px; border-radius: 10px; font-size: 0.75rem; font-weight: 800; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                            ${item.oldPrice && item.oldPrice > item.price ? `<span style="text-decoration:line-through; font-size: 0.6rem; opacity: 0.6; margin-right: 3px;">${item.oldPrice}</span>` : ''}
                            ${item.price}₺
                        </span>
                    </div>

                    <div style="padding: 12px;">
                        <h4 style="margin: 0; font-size: 0.9rem; font-weight: 700; color: #1e293b; line-height: 1.2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 2.2em;">
                            ${this.utils.escapeHTML(item.title)}
                        </h4>
                        
                        <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 8px;">
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <div style="width: 16px; height: 16px; background: #f1f5f9; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
                                    <i class="fas fa-location-dot" style="font-size: 0.6rem; color: #64748b;"></i>
                                </div>
                                <span style="font-size: 0.7rem; color: #64748b; font-weight: 600;">${item.city && item.district ? item.city + '-' + item.district : (item.neighborhood || 'Mahallende')}</span>
                            </div>

                            <div style="display: flex; align-items: center; gap: 6px;">
                                <div style="width: 16px; height: 16px; background: #ecfdf5; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
                                    <i class="${item.delivery === 'kapidan' ? 'fas fa-door-open' : (item.delivery === 'ortak-nokta' ? 'fas fa-map-pin' : 'fas fa-shop')}" style="font-size: 0.6rem; color: #10b981;"></i>
                                </div>
                                <span style="font-size: 0.7rem; color: #10b981; font-weight: 700;">
                                    ${item.delivery === 'kapidan' ? 'KapÄ±dan' : (item.delivery === 'ortak-nokta' ? 'Ortak Nokta' : 'Gel-Al')}
                                </span>
                            </div>
                        </div>
                    </div>

                    ${isVeryNew ? `
                        <div style="position: absolute; bottom: 8px; right: 12px; display: flex; align-items: center; gap: 4px;">
                            <div class="pazar-live-dot"></div>
                            <span style="font-size: 0.6rem; font-weight: 800; color: #ef4444; letter-spacing: 0.5px;">ÅÄ°MDÄ°</span>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        // --- Otomatik KaydÄ±rma (Auto-scroll) MantÄ±ÄŸÄ± ---
        if (this._pazarInterval) clearInterval(this._pazarInterval);

        const startAutoScroll = () => {
            if (!container || container.children.length <= 1) return;
            this._pazarInterval = setInterval(() => {
                const scrollStep = 200; // YaklaÅŸÄ±k bir kart geniÅŸliÄŸi + gap
                const maxScroll = container.scrollWidth - container.clientWidth;

                if (container.scrollLeft >= maxScroll - 10) {
                    container.scrollTo({ left: 0, behavior: 'smooth' });
                } else {
                    container.scrollBy({ left: scrollStep, behavior: 'smooth' });
                }
            }, 3000);
        };

        startAutoScroll();

        // EtkileÅŸim duraklatma (Hover & Touch)
        container.onmouseenter = () => clearInterval(this._pazarInterval);
        container.onmouseleave = () => startAutoScroll();
        container.ontouchstart = () => clearInterval(this._pazarInterval);
        container.ontouchend = () => startAutoScroll();
    },

    handlePazarImageSelect: function (e) {
        const file = e.target.files[0];
        if (!file) return;

        const preview = document.getElementById('pazar-preview-img');
        const icon = document.querySelector('#pazar-image-picker i');
        const text = document.querySelector('#pazar-image-picker span');

        const reader = new FileReader();
        reader.onload = (event) => {
            preview.src = event.target.result;
            preview.style.display = 'block';
            if (icon) icon.style.display = 'none';
            if (text) text.style.display = 'none';
            this.state.tempPazarImage = event.target.result;
        };
        reader.readAsDataURL(file);
    },

    clearHeroSliderInterval: function () {
        if (this._heroSliderInterval) {
            clearInterval(this._heroSliderInterval);
            this._heroSliderInterval = null;
        }
    },

    nextBannerSlide: function () {
        const total = this.state.banners.length;
        if (total === 0) return;
        this.goToBannerSlide((this.state.currentBannerSlide + 1) % total);
    },

    prevBannerSlide: function () {
        const total = this.state.banners.length;
        if (total === 0) return;
        this.goToBannerSlide((this.state.currentBannerSlide - 1 + total) % total);
    },

    goToBannerSlide: function (index) {
        this.state.currentBannerSlide = index;
        this.updateBannerSlide();
        // Reset timer
        this.clearHeroSliderInterval();
        if (this.state.banners.length > 1) {
            this._heroSliderInterval = setInterval(() => {
                this.nextBannerSlide();
            }, 6000);
        }
    },

    updateBannerSlide: function () {
        const slides = document.querySelectorAll('.hero-slide');
        const dots = document.querySelectorAll('.hero-dot');
        const current = this.state.currentBannerSlide;

        slides.forEach((slide, i) => {
            slide.classList.toggle('active', i === current);
        });
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === current);
        });
    },

    renderEsnafCarousel: function () {
        const container = document.getElementById('esnaf-carousel');
        const section = document.getElementById('esnaf-carousel-container');
        if (!container || !section) return;

        // 1. Admin panelinden seÃ§ilen esnaf vitrin Ã¼rÃ¼nlerini al
        const curatedEsnafItems = (this.state.galleryItems || [])
            .filter(item => item.vitrineType === 'esnaf')
            .filter(item => !item.expiresAt || item.expiresAt.seconds >= firebase.firestore.Timestamp.now().seconds)
            .sort((a, b) => (a.order || 0) - (b.order || 0));

        const curatedEsnafIds = curatedEsnafItems.map(item => item.productId);

        // 2. SeÃ§ilen Ã¼rÃ¼nleri tÃ¼m Ã¼rÃ¼nler iÃ§inden bul (isEsnaf olsun olmasÄ±n)
        const curatedAds = curatedEsnafItems
            .map(item => this.state.products.find(p => p.id === item.productId))
            .filter(p => p !== undefined)
            .filter(p => {
                const isSold = p.status === 'sold' || this.state.offers.some(o => o.productId === p.id && o.status === 'accepted');
                if (isSold) return false;
                if ((p.status || 'active') !== 'active') return false;

                // SÃ¼re sonu kontrolÃ¼
                const expiresAt = (() => {
                    if (p.expiresAt) return (p.expiresAt.toDate) ? p.expiresAt.toDate() : new Date(p.expiresAt);
                    if (p.createdAt) {
                        const created = (p.createdAt.toDate) ? p.createdAt.toDate() : new Date(p.createdAt);
                        return new Date(created.getTime() + 24 * 60 * 60 * 1000);
                    }
                    return new Date(Date.now() + 20 * 60 * 60 * 1000);
                })();
                if (expiresAt < new Date()) return false;

                // Filtreleri uygula
                const searchLower = this.state.filters.searchQuery.toLowerCase();
                const shopName = p.shopName || "";
                const matchesSearch = p.title.toLowerCase().includes(searchLower) || shopName.toLowerCase().includes(searchLower);
                const f = this.state.filters;
                const matchesLocation = f.city === 'all' || p.city === f.city;

                return matchesSearch && matchesLocation;
            });

        // 3. SÄ±ralama: Sadece aktif vitrin Ã¼rÃ¼nleri
        const esnafAds = [...curatedAds];

        // Vitrin boÅŸsa CTA placeholder kartÄ± gÃ¶ster
        if (esnafAds.length === 0) {
            section.style.display = 'block';
            container.innerHTML = `
                <div class="vitrine-placeholder-card" onclick="app.openGalleryInfoModal('esnaf')">
                    <div class="vitrine-placeholder-icon">
                        <i class="fas fa-store"></i>
                    </div>
                    <div class="vitrine-placeholder-content">
                        <h4>Esnaf Vitrini</h4>
                        <p>Ürünlerinizi vitrine ekleyerek daha fazla görüntülenme alın!</p>
                        <span class="vitrine-placeholder-cta">Vitrine İlan Ver <i class="fas fa-arrow-right"></i></span>
                    </div>
                </div>
            `;
            return;
        }


        section.style.display = 'block';

        // Kompakt kart HTML oluÅŸtur (Bireysel Vitrin tarzÄ±nda)
        container.innerHTML = esnafAds.map(p => {
            const d = p._calculatedDistance || this.utils.calculateDistance(41.0082, 28.9784, p.lat, p.lng);

            // Deal type badge hesapla
            let dealBadgeHtml = '';
            if (p.dealType && p.dealType !== 'none') {
                const labels = { indirim: 'İNDİRİM', serisonu: 'SERİ SONU', teshir: 'TEŞHİR ÜRÜNÜ', surprise: 'SÜRPRİZ PAKET' };
                dealBadgeHtml = `<span class="esnaf-compact-deal-badge">${labels[p.dealType] || ''}</span>`;
            }

            // Fiyat etiketini hesapla
            let priceHtml = '';
            if (p.isNegotiable) {
                priceHtml = `TEKLİF 🤝`;
            } else if (p.oldPrice && p.oldPrice > 0 && p.price < p.oldPrice) {
                priceHtml = `<span class="old-price">${p.oldPrice}₺</span>${p.price}₺`;
            } else {
                priceHtml = `${p.price}₺`;
            }

            // Favori kontrolÃ¼
            const isFav = this.state.favorites && this.state.favorites.includes(p.id);

            // Rating hesaplama
            const productRatings = this.state.ratings.filter(r => r.productId === p.id || r.userId === p.ownerId);
            const avgRating = productRatings.length > 0
                ? (productRatings.reduce((sum, r) => sum + (r.rating || 0), 0) / productRatings.length).toFixed(1)
                : 0;
            const ratingCount = productRatings.length;

            // YÄ±ldÄ±z HTML oluÅŸtur
            const starsHtml = `
                <div class="card-rating">
                    <div class="card-rating-stars">
                        ${[1, 2, 3, 4, 5].map(i => `<i class="fas fa-star ${i <= Math.round(avgRating) ? (i === 5 && avgRating >= 4.5 ? 'highlight' : '') : 'empty'}"></i>`).join('')}
                    </div>
                    <span class="card-rating-value">${avgRating > 0 ? avgRating.toString().replace('.', ',') : '0,0'}</span>
                    <span class="card-rating-count">(${ratingCount})</span>
                </div>
            `;

            const expiresAt = (() => {
                const now = new Date();
                let realExp = null;
                if (p.expiresAt) realExp = (p.expiresAt && p.expiresAt.toDate) ? p.expiresAt.toDate() : (p.expiresAt ? new Date(p.expiresAt) : null);
                else if (p.createdAt) {
                    const created = (p.createdAt && p.createdAt.toDate) ? p.createdAt.toDate() : new Date(p.createdAt);
                    realExp = new Date(created.getTime() + 24 * 60 * 60 * 1000);
                } else {
                    realExp = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                }

                const diff = realExp - now;
                const oneDay = 24 * 60 * 60 * 1000;

                if (diff > oneDay) {
                    const displayDiff = diff % oneDay || oneDay;
                    return new Date(now.getTime() + displayDiff);
                }
                return realExp;
            })();

            const getCountdownHtml = (expires) => {
                const diff = expires - new Date();
                if (diff <= 0) return '<span class="countdown-badge expired"><i class="fas fa-clock"></i> SÃ¼resi Doldu</span>';
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const isUrgent = hours < 1;
                const label = p.vitrine ? 'Vitrin' : '';
                return `<span class="countdown-badge ${isUrgent ? 'urgent' : ''} ${p.vitrine ? 'vitrine' : ''}" data-expires="${expires.getTime()}">
                    <i class="fas ${p.vitrine ? 'fa-gem' : 'fa-clock'}"></i> ${label} ${hours > 0 ? hours + 's ' : ''}${mins}dk
                </span>`;
            };

            // Ã–zellik Ä°konlarÄ± (Ã‡oklu)
            let featureIconsHtml = '<div class="card-features-wrapper">';
            featureIconsHtml += `<div class="feature-icon-circle esnaf" title="Esnaf Ä°lanÄ±"><i class="fas fa-store"></i></div>`;

            if ((p.isFree || p.price === 0) && !p.isSwap) {
                featureIconsHtml += `<div class="feature-icon-circle paylas" title="Hediye/PaylaÅŸ"><i class="fas fa-leaf"></i></div>`;
            }
            if (p.isAskida || p.category === 'askida' || p.category === 'Askıda') {
                featureIconsHtml += `<div class="feature-icon-circle askida" title="Askıda"><i class="fas fa-hand-holding-heart"></i></div>`;
            }
            let rescueBadgeHtml = '';
            if (p.isSurprise || p.category === 'surpriz-paket') {
                const now = new Date();
                const isRescueHour = now.getHours() >= 20 || now.getHours() < 2;
                if (isRescueHour) {
                    rescueBadgeHtml = `<div class="rescue-badge-premium" title="İSRAFI ÖNLE"><i class="fas fa-hand-holding-heart"></i> KURTAR</div>`;
                } else {
                    featureIconsHtml += `<div class="feature-icon-circle israf" title="İsrafı Önle"><i class="fas fa-box"></i></div>`;
                }
            }
            if (p.isService || p.category === 'Hizmetler' || p.category === 'Usta & Yardım') {
                featureIconsHtml += `<div class="feature-icon-circle hizmet" title="Hizmet"><i class="fas fa-tools"></i></div>`;
            }
            if (p.isBulk) {
                featureIconsHtml += `<div class="feature-icon-circle toplu" title="Toplu Satış"><i class="fas fa-boxes-stacked"></i></div>`;
            }
            if (p.isSwap) {
                featureIconsHtml += `<div class="feature-icon-circle takas" title="Takas Olur"><i class="fas fa-right-left"></i></div>`;
            }
            if (p.isNegotiable) {
                featureIconsHtml += `<div class="feature-icon-circle teklif" title="Teklif Bekliyorum"><i class="fas fa-handshake"></i></div>`;
            }
            if (p.oldPrice > p.price) {
                featureIconsHtml += `<div class="feature-icon-circle firsat" title="FÄ±rsat"><i class="fas fa-tag"></i></div>`;
            }
            if (p.verifiedNeighbor || p.ownerVerified) {
                featureIconsHtml += `<div class="feature-icon-circle verified" title="DoÄŸrulanmÄ±ÅŸ KomÅŸu"><i class="fas fa-check-circle"></i></div>`;
            }
            if (p.delivery) {
                const deliveryIcons = {
                    'kapidan': { icon: 'fa-door-open', label: 'Kapıdan Teslim' },
                    'kapiya-birak': { icon: 'fa-box', label: 'Kapıya Bırak (Curb-side)' },
                    'ortak-nokta': { icon: 'fa-map-pin', label: 'Ortak Nokta' },
                    'gel-al': { icon: 'fa-shop', label: 'Gel-Al (Dükkan)' }
                };
                const del = deliveryIcons[p.delivery] || deliveryIcons['kapidan'];
                featureIconsHtml += `<div class="feature-icon-circle delivery" title="${del.label}"><i class="fas ${del.icon}"></i></div>`;
            }
            featureIconsHtml += '</div>';

            const countdownHtml = getCountdownHtml(expiresAt);

            return `
                <div class="esnaf-compact-card ${p.isSurprise ? 'is-surprise' : ''}" onclick="app.showProductDetails('${p.id}')">
                    <button class="card-favorite-btn ${isFav ? 'active' : ''}" onclick="event.stopPropagation(); app.toggleFavorite('${p.id}')">
                        <i class="${isFav ? 'fas' : 'far'} fa-heart"></i>
                    </button>
                    <div class="esnaf-compact-img" style="background-image: url('${this.utils.getProductImage(p)}');">
                        ${featureIconsHtml}
                        ${rescueBadgeHtml}
                        <span class="esnaf-compact-price-tag"><i class="fas fa-location-dot" style="font-size:0.7rem; margin-right:4px;"></i> ${priceHtml}</span>
                    </div>
                    <div class="esnaf-compact-info">
                        <div class="esnaf-compact-title">${this.utils.escapeHTML(p.title)}</div>
                        ${p.dealType && p.dealType !== 'none' ? `
                            <div class="esnaf-deal-label-red">
                                ${p.dealType === 'indirim' ? 'İNDİRİM' : (p.dealType === 'serisonu' ? 'SERİ SONU' : 'TEŞHİR ÜRÜNÜ')}
                            </div>
                        ` : ''}
                        <div class="esnaf-compact-location">
                            <div class="esnaf-location-left">
                                <i class="fas fa-location-dot"></i>
                                <span>${this.utils.formatDistance(d)}</span>
                            </div>
                        </div>
                        ${starsHtml}

                        ${(() => {
                    const now = new Date();
                    const isRescueHour = (now.getHours() >= 20 || now.getHours() < 2);
                    if ((p.isSurprise || p.category === 'surpriz-paket') && isRescueHour) {
                        // Progress Bar Hesaplama (20:00 -> 02:00 = 6 saatlik periyot)
                        let startTime = new Date(); startTime.setHours(20, 0, 0);
                        if (now.getHours() < 20) startTime.setDate(startTime.getDate() - 1);

                        let endTime = new Date(startTime.getTime() + (6 * 3600000));
                        const total = endTime - startTime;
                        const elapsed = now - startTime;
                        const percent = Math.max(0, Math.min(100, 100 - (elapsed / total * 100)));

                        return `
                                    <div class="rescue-progress-container">
                                        <div class="rescue-progress-bar" style="width: ${percent}%"></div>
                                    </div>
                                    <div class="rescue-timer-text">
                                        <span>♻️ İsrafı Önle</span>
                                        <span>${Math.round(percent)}% kaldı</span>
                                    </div>
                                `;
                    }
                    return '';
                })()}
                        <div class="esnaf-compact-shop" style="display: flex; align-items: center; gap: 4px;">
                            <i class="fas fa-store"></i>
                            <span>${this.utils.escapeHTML(p.shopName || p.ownerName)}</span>
                            ${p.isOwnerVerified || p.isEsnaf ? '<span class="verified-badge small" title="Onaylı Satıcı"><i class="fas fa-check-circle"></i></span>' : ''}
                        </div>
                        ${countdownHtml}
                    </div>
                </div>
            `;
        }).join('');

        this.startGlobalTimers();
    },

    scrollEsnafCarousel: function (direction) {
        const container = document.getElementById('esnaf-carousel');
        if (!container) return;

        const scrollAmount = 192; // 180px kart + 12px gap
        const currentScroll = container.scrollLeft;

        if (direction === 'left') {
            container.scrollTo({
                left: currentScroll - scrollAmount,
                behavior: 'smooth'
            });
        } else {
            container.scrollTo({
                left: currentScroll + scrollAmount,
                behavior: 'smooth'
            });
        }
    },

    scrollPazar: function (direction) {
        const container = document.getElementById('pazar-items-container');
        if (!container) return;

        const scrollAmount = 200; // Pazar kartlarÄ± biraz daha geniÅŸ olabilir
        const currentScroll = container.scrollLeft;

        if (direction === 'left') {
            container.scrollTo({
                left: currentScroll - scrollAmount,
                behavior: 'smooth'
            });
        } else {
            container.scrollTo({
                left: currentScroll + scrollAmount,
                behavior: 'smooth'
            });
        }
    },

    scrollGallery: function (direction) {
        const container = document.getElementById('gallery-wrapper');
        if (!container) return;

        const scrollAmount = 192; // 180px kart + 12px gap
        const currentScroll = container.scrollLeft;

        if (direction === 'left') {
            container.scrollTo({
                left: currentScroll - scrollAmount,
                behavior: 'smooth'
            });
        } else {
            container.scrollTo({
                left: currentScroll + scrollAmount,
                behavior: 'smooth'
            });
        }
    },

    renderOffers: function () {
        const container = document.getElementById('offer-list');
        if (!container) return;

        if (!this._activeOfferTab) this._activeOfferTab = 'incoming';

        const uid = this.state.user?.uid;
        const phone = this.state.user?.phone;
        const email = this.state.user?.email;

        // Giden Teklifler (Alıcı olarak verdiğim)
        const outgoing = this.state.offers.filter(o =>
            ((uid && o.buyerId === uid) || (phone && o.buyerPhone === phone) || (email && o.buyerEmail === email)) &&
            !(o.hiddenBy || []).includes(uid)
        );

        // Gelen Teklifler (Satıcı olarak ilanlarıma gelen)
        const incoming = this.state.offers.filter(o =>
            ((uid && o.sellerId === uid) || (phone && o.sellerPhone === phone)) &&
            !(o.hiddenBy || []).includes(uid)
        );

        const currentOffers = this._activeOfferTab === 'incoming' ? incoming : outgoing;
        const emptyMsg = this._activeOfferTab === 'incoming' ? 'İlanlarınıza henüz teklif gelmedi.' : 'Henüz bir teklif vermediniz.';
        const emptyIcon = this._activeOfferTab === 'incoming' ? 'fa-inbox' : 'fa-paper-plane';

        container.innerHTML = `
        <div class="offers-container">
            <div class="offers-tabs">
                <button class="offer-tab ${this._activeOfferTab === 'incoming' ? 'active' : ''}" onclick="app.setOfferTab('incoming')">Gelen</button>
                <button class="offer-tab ${this._activeOfferTab === 'outgoing' ? 'active' : ''}" onclick="app.setOfferTab('outgoing')">Giden</button>
            </div>

            <div id="offers-rendered-list">
                ${currentOffers.length ? currentOffers.map(o => this.offerTemplate(o, this._activeOfferTab === 'incoming')).join('') : `
                    <div style="text-align: center; padding: 60px 20px; color: #94a3b8;">
                        <i class="fas ${emptyIcon}" style="font-size: 3rem; margin-bottom: 16px; opacity: 0.2;"></i>
                        <p style="font-size: 0.95rem; font-weight: 600;">${emptyMsg}</p>
                    </div>
                `}
            </div>
        </div>
        `;
    },

    setOfferTab: function (tab) {
        this._activeOfferTab = tab;
        this.renderOffers();
    },

    offerTemplate: function (o, isIncoming) {
        const product = this.state.products.find(p => p.id === o.productId) || { title: 'Ürün Silinmiş', image: '' };
        const labels = { pending: 'Beklemede', accepted: 'Kabul Edildi', rejected: 'Reddedildi' };

        let offerInfoHtml = '';
        if (o.offerType === 'swap' || o.offeredProductId) {
            offerInfoHtml = `
                <div style="display: flex; align-items: center; gap: 6px; margin: 4px 0;">
                    <i class="fas fa-right-left" style="color: #6366f1; font-size: 0.65rem;"></i>
                    <img src="${o.offeredProductImage || ''}" style="width: 20px; height: 20px; border-radius: 4px; object-fit: cover;">
                    <span style="font-size: 0.7rem; font-weight: 700; color: #4338ca; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px;">${this.utils.escapeHTML(o.offeredProductTitle || 'Takas Ürünü')}</span>
                </div>
            `;
        } else {
            offerInfoHtml = `<p style="font-size: 1.1rem; font-weight: 900; color: var(--primary); margin: 2px 0;">${o.price || 0}₺</p>`;
        }

        return `
        <div class="offer-card-modern">
            <div style="width: 65px; height: 65px; border-radius: 16px; background: url('${product.image || 'img/placeholder.png'}') center/cover; flex-shrink: 0; box-shadow: 0 4px 12px rgba(0,0,0,0.08);"></div>
            
            <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    <h4 style="font-size: 0.85rem; font-weight: 800; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px;">${this.utils.escapeHTML(product.title)}</h4>
                    ${offerInfoHtml}
                </div>
                <div style="margin-top: 4px;">
                    <span class="status-badge status-${o.status}">${labels[o.status]}</span>
                </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px; align-items: center;">
                ${isIncoming && o.status === 'pending' ? `
                    <button class="action-btn-circle" onclick="app.updateOfferStatus('${o.id}', 'accepted')" style="background: #10B981; color: white;"><i class="fas fa-check"></i></button>
                    <button class="action-btn-circle" onclick="app.updateOfferStatus('${o.id}', 'rejected')" style="background: #EF4444; color: white;"><i class="fas fa-times"></i></button>
                ` : ''}

                ${isIncoming ? `
                    <button class="action-btn-circle" onclick="event.stopPropagation(); app.closeProductDetails(); app.openChat('${o.productId}', '${o.buyerPhone}', '${this.utils.escapeHTML(o.buyerName || 'Alıcı')}')" 
                            style="background: #e0f2fe; color: #0369a1;"><i class="fas fa-comment-dots"></i></button>
                ` : `
                    ${(o.status === 'accepted' && !o.isRated) ? `
                        <button onclick="app.openRatingModal('${o.id}')" style="border: none; background: #FFD700; color: white; padding: 6px 12px; border-radius: 12px; font-size: 0.65rem; font-weight: 800;"><i class="fas fa-star"></i> PUANLA</button>
                    ` : ''}
                    <button class="action-btn-circle" onclick="event.stopPropagation(); app.closeProductDetails(); app.showScreen('home'); app.openChat('${o.productId}', '${product.ownerPhone}', '${this.utils.escapeHTML(product.ownerName || 'Satıcı')}')" 
                            style="background: #e0f2fe; color: #0369a1;"><i class="fas fa-comment-dots"></i></button>
                `}

                ${(isIncoming || o.buyerId === this.state.user?.uid) && o.status !== 'pending' ? `
                    <button class="action-btn-circle" onclick="app.hideOffer('${o.id}')" style="background: #f1f5f9; color: #94a3b8;"><i class="fas fa-trash-alt" style="font-size: 0.8rem;"></i></button>
                ` : ''}
            </div>
        </div>
        
        ${o.status === 'accepted' ? `
            <div style="background: #f0fdf4; padding: 12px; border-radius: 18px; border: 1px solid #dcfce7; margin: -8px 0 16px 0; position: relative; z-index: 1;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <img src="img/icon.png" style="width: 24px; height: 24px; border-radius: 50%;">
                        <div>
                            <div style="font-size: 0.75rem; font-weight: 800; color: #1e293b;">${this.utils.escapeHTML((isIncoming ? o.buyerName : product.ownerName) || 'Kullanıcı')}</div>
                            <div style="font-size: 0.65rem; color: #64748b; font-weight: 600;">${(isIncoming ? o.buyerPhone : (o.sellerPhone || product.ownerPhone)) || ''}</div>
                        </div>
                    </div>
                    <button onclick="app.whatsappRedirect('${isIncoming ? o.buyerPhone : (o.sellerPhone || product.ownerPhone)}', '${this.utils.escapeHTML(product.title)}')" 
                        style="background: #25D366; color: white; border: none; padding: 6px 14px; border-radius: 10px; font-size: 0.7rem; font-weight: 800; display: flex; align-items: center; gap: 6px;">
                        <i class="fab fa-whatsapp"></i> WHATSAPP
                    </button>
                </div>
            </div>
        ` : ''}
        `;
    },

    renderProfile: function () {
        if (!this.state.user) return;

        // Benim ilanlarÄ±m
        const myAds = this.state.products.filter(p =>
            p.ownerId === this.state.user.uid ||
            (p.ownerEmail && p.ownerEmail === this.state.user.email) ||
            (p.ownerPhone && p.ownerPhone === this.state.user.phone)
        );

        // Ä°statistikler
        const totalViews = myAds.reduce((acc, p) => acc + (p.views || 0), 0);
        const incomingOffersCount = this.state.offers.filter(o =>
            (o.sellerId === this.state.user.uid || o.sellerEmail === this.state.user.email || o.sellerPhone === this.state.user.phone) &&
            o.status === 'pending'
        ).length;
        const favsCount = (this.state.user.favorites || []).length;

        // Puan hesaplama
        const myRatings = this.state.ratings.filter(r =>
            (r.sellerId && r.sellerId === this.state.user.uid) ||
            (this.state.user.email && r.sellerEmail && r.sellerEmail === this.state.user.email) ||
            (this.state.user.phone && r.sellerPhone && r.sellerPhone === this.state.user.phone)
        );
        const avgRating = myRatings.length > 0
            ? (myRatings.reduce((acc, curr) => acc + curr.score, 0) / myRatings.length).toFixed(1)
            : '0.0';

        // Elementleri doldur
        const nameEl = document.getElementById('profile-display-name');
        const phoneEl = document.getElementById('profile-display-phone');
        const viewsEl = document.getElementById('stat-ads-views');
        const offersEl = document.getElementById('stat-incoming-offers');
        const favsCountEl = document.getElementById('stat-favs-count');
        const greenGiftsEl = document.getElementById('stat-green-gifts');
        const greenSurpriseEl = document.getElementById('stat-green-surprise');

        const isAdmin = this.state.user.isAdmin === true || this.state.user.isAdmin === 'true';

        if (nameEl) {
            const isVerified = this.state.user.emailVerified || (this.state.user.phone && this.state.user.phone.length > 5);
            nameEl.innerHTML = `
                ${this.utils.escapeHTML(this.state.user.displayName)}
                ${isVerified ? '<span class="verified-badge" title="Onaylı Profil" style="font-size: 0.9rem; margin-left: 4px;"><i class="fas fa-check-circle" style="color: #0ea5e9;"></i></span>' : ''}
                ${isAdmin ? '<span style="font-size: 0.6rem; background: var(--primary); color: white; padding: 2px 8px; border-radius: 20px; font-weight: 800; margin-left: 6px; vertical-align: middle;">ADMİN</span>' : ''}
            `;
        }
        if (phoneEl && this.state.user.phone) phoneEl.textContent = this.state.user.phone;
        if (viewsEl) viewsEl.textContent = totalViews > 999 ? (totalViews / 1000).toFixed(1) + 'k' : totalViews;
        if (offersEl) offersEl.textContent = incomingOffersCount;
        if (favsCountEl) favsCountEl.textContent = favsCount;
        if (greenGiftsEl) greenGiftsEl.textContent = this.state.user.greenGifts || 0;
        if (greenSurpriseEl) greenSurpriseEl.textContent = this.state.user.greenSurprise || 0;

        // FotoÄŸraf gÃ¼ncelleme
        const avatarImg = document.getElementById('profile-avatar-img');
        const avatarIcon = document.getElementById('profile-avatar-icon');
        if (this.state.user.photoURL && avatarImg) {
            avatarImg.src = this.state.user.photoURL;
            avatarImg.style.display = 'block';
            if (avatarIcon) avatarIcon.style.display = 'none';
        }

        // Bireysel Vitrin Paketleri (Dashboard)
        const indVitrineCard = document.getElementById('individual-vitrine-card');
        const indSubSection = document.getElementById('individual-panel-subscriptions');
        const indSubList = document.getElementById('individual-panel-subscription-list');

        if (indVitrineCard) {
            const subs = this.state.user.activeSubscriptions || [];
            const now = new Date();

            // Debug: Konsola abonelikleri yazdÄ±r
            if (subs.length > 0) console.log('[Profile Debug] Toplam Abonelik:', subs.length);

            const indVitrineSubs = subs.filter(s => {
                try {
                    const expiresAt = s.expiresAt && s.expiresAt.toDate ? s.expiresAt.toDate() : new Date(s.expiresAt);
                    const type = (s.vitrineType || s.type || s.packageType || '').toLowerCase();
                    const isActive = s.status === 'active' || !s.status;
                    return type !== 'esnaf' && isActive && expiresAt > now;
                } catch (e) { return false; }
            });

            if (indVitrineSubs.length > 0) {
                console.log('[Profile Debug] Aktif Bireysel Abonelikler:', indVitrineSubs);

                const getCapacity = (pkg) => {
                    if (!pkg) return 0;
                    const p = pkg.toLowerCase();
                    if (p.includes('aylÄ±k') || p.includes('aylik')) return 30;
                    if (p.includes('haftalÄ±k') || p.includes('haftalik')) return 10;
                    if (p.includes('gÃ¼nlÃ¼k') || p.includes('gunluk')) return 3;
                    return this.state.vitrineCapacities[pkg] || 0;
                };

                const totalCapacity = indVitrineSubs.reduce((sum, s) => sum + getCapacity(s.package), 0);
                const myAds = this.state.products.filter(p => p.ownerId === this.state.user.uid);
                const currentUsage = myAds.filter(p => p.vitrine && (p.vitrineType !== 'esnaf')).length;

                indVitrineCard.style.display = 'block';

                const progress = totalCapacity > 0 ? (currentUsage / totalCapacity) * 100 : 0;
                const progressBar = document.getElementById('individual-vitrine-progress');
                if (progressBar) progressBar.style.width = `${Math.min(progress, 100)}%`;

                const countLabel = document.getElementById('individual-vitrine-count');
                if (countLabel) {
                    countLabel.textContent = totalCapacity > 0
                        ? `${currentUsage}/${totalCapacity} Ä°lan YayÄ±nda`
                        : `${currentUsage} Ä°lan YayÄ±nda`;
                }

                const remainingLabel = document.getElementById('individual-vitrine-remaining');
                if (remainingLabel) {
                    const activeDates = indVitrineSubs
                        .map(s => s.expiresAt && s.expiresAt.toDate ? s.expiresAt.toDate() : new Date(s.expiresAt))
                        .sort((a, b) => a - b);
                    const diff = activeDates[0] - now;
                    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                    remainingLabel.textContent = `En yakÄ±n bitiÅŸe ${days} gÃ¼n`;
                }

                if (indSubSection && indSubList) {
                    indSubSection.style.display = 'block';
                    indSubList.innerHTML = indVitrineSubs.map((s, idx) => {
                        const expiry = s.expiresAt && s.expiresAt.toDate ? s.expiresAt.toDate() : new Date(s.expiresAt);
                        const pkgStr = (s.package || '').toLowerCase();
                        const title = pkgStr.includes('aylÄ±k') ? 'AltÄ±n' : (pkgStr.includes('haftalÄ±k') ? 'GÃ¼mÃ¼ÅŸ' : 'Standart');

                        return `
                        <div style="background: white; padding: 16px; border-radius: 16px; border: 1px solid #e2e8f0; margin-bottom: 8px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                <div>
                                    <span style="display: block; font-weight: 800; font-size: 0.9rem; color: #1e293b;">${title} Bireysel Paket</span>
                                    <span style="font-size: 0.75rem; color: #64748b; font-weight: 600;">Bitiş: ${expiry.toLocaleDateString('tr-TR')}</span>
                                </div>
                                <span style="font-size: 0.7rem; padding: 4px 10px; background: #eef2ff; color: #4f46e5; border-radius: 20px; font-weight: 800; text-transform: uppercase;">AKTİF</span>
                            </div>
                            <div id="ind-sub-timer-${idx}" data-expires="${expiry.getTime()}" 
                                 style="background: #f8fafc; padding: 10px; border-radius: 12px; text-align: center; font-size: 0.95rem; font-weight: 800; color: #1e293b; border: 1px solid #eff6ff;">
                                <i class="fas fa-clock" style="color: #6366f1; margin-right: 6px;"></i> --:--:--
                            </div>
                        </div>
                    `;
                    }).join('');

                    if (typeof this.startSubscriptionTimers === 'function') {
                        this.startSubscriptionTimers();
                    }
                }
            } else {
                indVitrineCard.style.display = 'none';
                if (indSubSection) indSubSection.style.display = 'none';
            }
        }

        const adminBtn = document.getElementById('admin-button');
        if (isAdmin) {
            if (adminBtn) adminBtn.style.setProperty('display', 'flex', 'important');
        } else {
            if (adminBtn) adminBtn.style.setProperty('display', 'none', 'important');
        }

        // Partner/Esnaf StatÃ¼lerinin Container'a Eklenmesi
        const approvedContainer = document.getElementById('profile-approved-buttons');
        const partnerCta = document.getElementById('profile-partner-cta');
        const esnafCta = document.getElementById('profile-esnaf-cta');

        if (approvedContainer) {
            approvedContainer.innerHTML = '';

            // Partner Status
            const pStatus = (this.state.user.partnerStatus || 'none').toString().trim().toLowerCase();
            if (pStatus === 'none' || pStatus === 'rejected') {
                if (partnerCta) partnerCta.style.display = 'block';
            } else {
                if (partnerCta) partnerCta.style.display = 'none';
                const div = document.createElement('div');
                div.style.cssText = 'background: white; padding: 14px 16px; border-radius: 18px; border: 1px solid #f0f0f0; margin-bottom: 12px; display: flex; align-items: center; gap: 12px;';
                div.innerHTML = `
                    <div style="width: 38px; height: 38px; background: ${pStatus === 'approved' ? '#f0fdf4' : '#fffbeb'}; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-handshake" style="color: ${pStatus === 'approved' ? '#166534' : '#b45309'};"></i>
                    </div>
                    <div style="flex: 1;">
                        <span style="display: block; font-weight: 800; font-size: 0.85rem; color: #1e293b;">
                            ${pStatus === 'approved' ? 'Tebrikler, Güvenli Nokta oldunuz! ✨' : 'Güvenli Nokta'}
                        </span>
                        <span style="font-size: 0.75rem; color: ${pStatus === 'approved' ? '#166534' : '#b45309'}; font-weight: 700;">
                            ${pStatus === 'approved' ? 'Aktif Üye' : 'Onay Bekliyor'}
                        </span>
                    </div>
                `;
                approvedContainer.appendChild(div);
            }

            // Esnaf Status
            const eStatus = (this.state.user.esnafStatus || 'none').toLowerCase();
            if (eStatus === 'none' || eStatus === 'rejected') {
                if (esnafCta) esnafCta.style.display = 'block';
            } else {
                if (esnafCta) esnafCta.style.display = 'none';
                const div = document.createElement('div');
                div.style.cssText = 'background: white; padding: 16px; border-radius: 18px; border: 1px solid #f0fdfa; margin-bottom: 12px;';
                div.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: ${eStatus === 'approved' ? '12px' : '0'};">
                        <div style="width: 38px; height: 38px; background: ${eStatus === 'approved' ? '#f0fdfa' : '#fffbeb'}; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-store" style="color: ${eStatus === 'approved' ? '#0d9488' : '#b45309'};"></i>
                        </div>
                        <div style="flex: 1;">
                            <span style="display: block; font-weight: 800; font-size: 0.85rem; color: #1e293b;">Mahalle Esnafı</span>
                            <span style="font-size: 0.75rem; color: ${eStatus === 'approved' ? '#0d9488' : '#b45309'}; font-weight: 700;">
                                ${eStatus === 'approved' ? 'Aktif İşletme' : 'Onay Bekliyor'}
                            </span>
                        </div>
                    </div>
                    ${eStatus === 'approved' ? `
                        <button onclick="app.showScreen('esnaf-panel')" style="width: 100%; padding: 10px; border: 1.5px solid #0d9488; border-radius: 12px; background: white; color: #0d9488; font-weight: 800; font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
                            <i class="fas fa-external-link-alt"></i> Esnaf Paneline Git
                        </button>
                    ` : ''}
                `;
                approvedContainer.appendChild(div);
            }
        }
    },

    renderMyAds: function () {
        const c = document.getElementById('my-ads-list');
        if (!c) return;
        if (!this.state.user) return;
        const filtered = this.state.products.filter(p => (this.state.user && p.ownerId === this.state.user.uid) || (this.state.user && p.ownerPhone === this.state.user.phone));
        c.innerHTML = filtered.length ? filtered.map(p => {
            const isSold = p.status === 'sold' || this.state.offers.some(o => o.productId === p.id && o.status === 'accepted');
            const priceHTML = p.isFree ? `<span class="free-price" style="color: #10B981;">Ücretsiz</span>` : (p.isNegotiable ? `<span>TEKLİF 🤝</span>` : `<span>${p.price}₺</span>`);

            // Özellik İkonları (Çoklu)
            let featureIconsHtml = '<div class="card-features-wrapper">';
            if (p.isEsnaf) featureIconsHtml += `<div class="feature-icon-circle esnaf" title="Esnaf İlanı"><i class="fas fa-store"></i></div>`;
            if ((p.isFree || p.price === 0) && !p.isSwap) {
                featureIconsHtml += `<div class="feature-icon-circle paylas" title="Hediye/Paylaş"><i class="fas fa-leaf"></i></div>`;
            }
            if (p.isAskida || p.category === 'askida' || p.isAskida) {
                featureIconsHtml += `<div class="feature-icon-circle askida" title="Askıda"><i class="fas fa-hand-holding-heart"></i></div>`;
            }
            if (p.isSurprise || p.category === 'surpriz-paket') {
                const now = new Date();
                const isRescueHour = now.getHours() >= 21 || now.getHours() < 2;
                featureIconsHtml += `<div class="feature-icon-circle israf ${isRescueHour ? 'rescue-pulse' : ''}" title="${isRescueHour ? 'CANLI KURTARMA' : 'İsrafı Önle'}"><i class="fas fa-box"></i></div>`;
                if (isRescueHour) {
                    featureIconsHtml += `<span class="rescue-badge-mini">KURTAR</span>`;
                }
            }
            if (p.isService || p.category === 'Hizmetler') {
                featureIconsHtml += `<div class="feature-icon-circle hizmet" title="Hizmet"><i class="fas fa-tools"></i></div>`;
            }
            if (p.isBulk) {
                featureIconsHtml += `<div class="feature-icon-circle toplu" title="Toplu Satış"><i class="fas fa-boxes-stacked"></i></div>`;
            }
            if (p.isSwap) {
                featureIconsHtml += `<div class="feature-icon-circle takas" title="Takas Olur"><i class="fas fa-right-left"></i></div>`;
            }
            if (p.isNegotiable) {
                featureIconsHtml += `<div class="feature-icon-circle teklif" title="Teklif Bekliyorum"><i class="fas fa-handshake"></i></div>`;
            }
            featureIconsHtml += '</div>';

            return `
            <div class="product-card" onclick="app.showProductDetails('${p.id}')" style="background:var(--bg-card);border-radius:var(--radius-md);overflow:hidden;border:1px solid var(--border-color); position: relative;">
                <div style="height:120px;background:url('${this.utils.getProductImage(p)}') center/cover;"></div>
                ${isSold ? `
                    <div style="position: absolute; top: 8px; left: 8px; background: #FF5A5F; color: white; padding: 4px 10px; border-radius: 8px; font-size: 0.65rem; font-weight: 800; z-index: 10;">
                        <i class="fas fa-check-double"></i> SATILDI
                    </div>
                ` : ''}
                ${featureIconsHtml}
                <div style="padding:10px;">
                    <h3 style="font-size:0.8rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${this.utils.escapeHTML(p.title)}</h3>
                    <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px;">${this.utils.escapeHTML(p.city || '')}</div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-weight:800;color:var(--primary);">${priceHTML}</span>
                    </div>
                    ${!isSold ? `
                        <div style="display: flex; gap: 8px;">
                            <button onclick="event.stopPropagation(); app.handleVitrineButtonClick('${p.id}')" 
                                    style="flex: 1; padding: 6px; background: #fff7ed; border: 1px solid #FF8F1F; color: #FF8F1F; border-radius: 8px; font-size: 0.7rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
                                <i class="fas fa-bullhorn"></i> Vitrine
                            </button>
                            <button onclick="event.stopPropagation(); app.markAsSold('${p.id}')" 
                                    style="flex: 1; padding: 6px; background: #ecfdf5; border: 1px solid #10B981; color: #10B981; border-radius: 8px; font-size: 0.7rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
                                <i class="fas fa-check"></i> SatÄ±ldÄ±
                            </button>
                        </div>
                    ` : `
                        <button onclick="event.stopPropagation(); app.republishProduct('${p.id}')" 
                                style="width: 100%; padding: 8px; background: #eff6ff; border: 1px solid #3b82f6; color: #3b82f6; border-radius: 8px; font-size: 0.75rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
                            <i class="fas fa-undo"></i> Geri YÃ¼kle
                        </button>
                    `}
                </div>
            </div>
            `;
        }).join('') : '<p style="text-align:center;padding:40px;color:var(--text-muted);grid-column:1/-1;">HenÃ¼z ilanÄ±nÄ±z yok.</p>';
    },

    renderMyOffers: function () {
        const c = document.getElementById('my-offers-list');
        if (!c) return;
        if (!this.state.user) return;
        const filtered = this.state.offers.filter(o => (this.state.user && o.buyerId === this.state.user.uid) || (this.state.user && o.buyerPhone === this.state.user.phone));
        c.innerHTML = filtered.length ? filtered.map(o => this.offerTemplate(o, false)).join('') : '<p style="text-align:center;padding:40px;color:var(--text-muted);">HenÃ¼z teklif vermediniz.</p>';
    },

    renderFavorites: function () {
        const c = document.getElementById('favorites-list');
        if (!c || !this.state.user) return;
        const filtered = this.state.products.filter(p =>
            this.state.favorites.includes(p.id) &&
            p.status !== 'sold' &&
            !this.state.offers.some(o => o.productId === p.id && o.status === 'accepted')
        );
        c.innerHTML = filtered.length ? filtered.map(p => `
            <div class="product-card" onclick="app.showProductDetails('${p.id}')" style="background:var(--bg-card);border-radius:var(--radius-md);overflow:hidden;border:1px solid var(--border-color); position: relative;">
                <div style="height:120px;background:url('${this.utils.getProductImage(p)}') center/cover;"></div>
                ${p.isSurprise ? `
                    <div style="position: absolute; top: 8px; left: 8px; background: linear-gradient(135deg, #10B981, #059669); color: white; padding: 4px 8px; border-radius: 8px; font-size: 0.55rem; font-weight: 800; z-index: 10;">
                        İSRAFI ÖNLE
                    </div>
                ` : ''}
                <div style="padding:10px;">
                    <h3 style="font-size:0.8rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${this.utils.escapeHTML(p.title)}</h3>
                    <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px;">${this.utils.escapeHTML(p.city || '')}</div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight:800;color:var(--primary);">${p.isFree ? 'Ücretsiz' : (p.isNegotiable ? 'TEKLİF 🤝' : p.price + '₺')}</span>
                    </div>
                </div>
            </div>
        `).join('') : '<p style="text-align:center;padding:40px;color:var(--text-muted);grid-column:1/-1;">Favoriniz yok. âœ¨</p>';
    },

    renderSettings: function () {
        if (!this.state.user) return;

        // Partner Status (Settings)
        const pStatus = (this.state.user.partnerStatus || 'none').toLowerCase();
        const partnerCta = document.getElementById('settings-partner-cta');
        const partnerStatusBox = document.getElementById('settings-partner-status');
        const partnerStatusText = document.getElementById('partner-status-text');

        if (pStatus === 'none' || pStatus === 'rejected') {
            if (partnerCta) partnerCta.style.display = 'block';
            if (partnerStatusBox) partnerStatusBox.style.display = 'none';
        } else {
            if (partnerCta) partnerCta.style.display = 'none';
            if (partnerStatusBox) {
                partnerStatusBox.style.display = 'block';
                if (partnerStatusText) {
                    partnerStatusText.innerHTML = pStatus === 'approved'
                        ? '<i class="fas fa-check-circle"></i> GÃ¼venli Nokta Aktif'
                        : '<i class="fas fa-clock"></i> Partnerlik Ä°nceleniyor';
                    partnerStatusBox.style.background = pStatus === 'approved' ? '#f0fdf4' : '#fffbeb';
                    partnerStatusText.style.color = pStatus === 'approved' ? '#166534' : '#b45309';
                }
            }
        }

        // Esnaf Status (Settings)
        const eStatus = (this.state.user.esnafStatus || 'none').toLowerCase();
        const esnafCta = document.getElementById('settings-esnaf-cta');
        const esnafStatusBox = document.getElementById('settings-esnaf-status-box');
        const esnafStatusText = document.getElementById('esnaf-status-text-settings');
        const isEsnaf = eStatus === 'approved';

        if (eStatus === 'none' || eStatus === 'rejected') {
            if (esnafCta) esnafCta.style.display = 'block';
            if (esnafStatusBox) esnafStatusBox.style.display = 'none';
        } else {
            if (esnafCta) esnafCta.style.display = 'none';
            if (esnafStatusBox) {
                esnafStatusBox.style.display = 'block';
                if (esnafStatusText) {
                    esnafStatusText.innerHTML = isEsnaf
                        ? '<i class="fas fa-check-circle"></i> Esnaf HesabÄ± Aktif'
                        : '<i class="fas fa-clock"></i> Esnaf BaÅŸvurusu Ä°nceleniyor';
                    esnafStatusBox.style.background = isEsnaf ? '#f0fdfa' : '#fffbeb';
                    esnafStatusText.style.color = isEsnaf ? '#0d9488' : '#b45309';
                }
            }
        }

        // Populating inputs
        const nameEl = document.getElementById('settings-name');
        const phoneEl = document.getElementById('settings-phone-input');
        const emailEl = document.getElementById('settings-email');
        const locationNameEl = document.getElementById('settings-location-name');
        const latEl = document.getElementById('settings-lat');
        const lngEl = document.getElementById('settings-lng');
        const avatarImg = document.getElementById('settings-avatar-img');
        const avatarIcon = document.getElementById('settings-avatar-icon');

        if (nameEl) nameEl.value = this.state.user.displayName || "";
        if (phoneEl) phoneEl.value = this.state.user.phone || "";
        if (emailEl) emailEl.value = this.state.user.email || "";

        // Konum bilgilerini doldur
        if (locationNameEl) locationNameEl.value = this.state.user.locationName || "";
        if (latEl && this.state.user.location) latEl.value = this.state.user.location.lat || "";
        if (lngEl && this.state.user.location) lngEl.value = this.state.user.location.lng || "";

        if (avatarImg) {
            if (this.state.user.photoURL) {
                avatarImg.src = this.state.user.photoURL;
                avatarImg.style.display = 'block';
                if (avatarIcon) avatarIcon.style.display = 'none';
            } else {
                avatarImg.style.display = 'none';
                if (avatarIcon) avatarIcon.style.display = 'flex';
            }
        }

        // Toggles (Bildirim ve Konum) - GerÃ§ek kaydedilmiÅŸ deÄŸerleri oku
        const notifToggle = document.getElementById('settings-notif-toggle');
        const locToggle = document.getElementById('settings-loc-toggle');
        if (notifToggle) {
            // EÄŸer deÄŸer hiÃ§ kaydedilmemiÅŸse (undefined), false olarak baÅŸlat
            notifToggle.checked = this.state.user.notificationsEnabled === true;
        }
        if (locToggle) {
            // EÄŸer deÄŸer hiÃ§ kaydedilmemiÅŸse (undefined), false olarak baÅŸlat
            locToggle.checked = this.state.user.locationSharingEnabled === true;
        }
    },

    getTrustScoreHtml: function (userId, ownerData = {}) {
        // GÃ¼ven PuanÄ± Hesaplama MantÄ±ÄŸÄ± (Mock)
        let score = 50; // BaÅŸlangÄ±Ã§ puanÄ±
        const ratings = this.state.ratings.filter(r => r.userId === userId);
        const avgRating = ratings.length > 0 ? (ratings.reduce((s, r) => s + (r.rating || 0), 0) / ratings.length) : 0;

        score += Math.round(avgRating * 5); // Rating baÅŸÄ±na +5 (max 25)
        if (ownerData.isVerified) score += 15; // OnaylÄ± profil +15
        if (ownerData.isEsnaf) score += 10; // Esnaf +10

        // KatkÄ± puanlarÄ± (Ä°lan sayÄ±sÄ± vb.)
        const userProducts = this.state.products.filter(p => p.ownerId === userId).length;
        score += Math.min(userProducts * 2, 20); // Ä°lan baÅŸÄ±na +2 (max 20)

        // PuanÄ± sÄ±nÄ±rla (0-100)
        score = Math.min(Math.max(score, 0), 100);

        let level = "Mahalle KomÅŸusu";
        if (score > 90) level = "Mahalle KahramanÄ±";
        else if (score > 75) level = "GÃ¼venilir KomÅŸu";
        else if (score > 60) level = "Aktif Sakin";

        return `
            <div class="trust-badge-container" title="${level}">
                <i class="fas fa-shield-heart trust-score-sparkle"></i>
                <span>GÃœVEN PUANI: ${score}</span>
            </div>
        `;
    },

    shareProduct: async function () {
        if (!this.currentProductId) return;
        const product = this.state.products.find(p => p.id === this.currentProductId);
        if (!product) return;

        const productUrl = window.location.origin + window.location.pathname + '?p=' + product.id;
        const shareData = {
            title: product.title + ' - YanÄ±mdaki',
            text: `${product.title} - ${product.price}₺ fiyatıyla Yanımdaki'de seni bekliyor!`,
            url: productUrl
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                if (err.name !== 'AbortError') {
                    this.toast('PaylaÅŸÄ±m sÄ±rasÄ±nda bir hata oluÅŸtu.', 'error');
                }
            }
        } else {
            try {
                await navigator.clipboard.writeText(productUrl);
                this.toast('ÃœrÃ¼n baÄŸlantÄ±sÄ± kopyalandÄ±! ğŸ“‹');
            } catch (err) {
                this.toast('BaÄŸlantÄ± kopyalanamadÄ±.', 'error');
            }
        }
    },

    checkPhoneWarning: function () {
        const warning = document.getElementById('phone-warning');
        if (!warning) return;

        // KullanÄ±cÄ± giriÅŸ yapmamÄ±ÅŸsa uyarÄ±yÄ± gizle
        if (!this.state.user) {
            warning.style.display = 'none';
            return;
        }

        const phone = this.state.user.phone || "";
        const location = this.state.user.locationName || "";
        const emailVerified = this.state.user.emailVerified;

        let warningText = "";
        if (!emailVerified) {
            warningText = "LÃ¼tfen e-posta adresinizi doÄŸrulayÄ±n! Aktivasyon mailini kontrol edin.";
        } else if (!phone || !location) {
            warningText = "GÃ¼venliÄŸiniz iÃ§in telefon numaranÄ±zÄ± ve konumunuzu giriniz.";
        }

        if (warningText) {
            warning.querySelector('span').innerText = warningText;
            warning.style.display = 'flex';
        } else {
            warning.style.display = 'none';
        }
    },

    nextProductImage: function () {
        const product = this.state.products.find(p => p.id === this.currentProductId);
        if (!product) return;
        const images = product.images && product.images.length > 0 ? product.images : [product.image];
        if (images.length <= 1) return;

        this.currentProductImageIndex = (this.currentProductImageIndex + 1) % images.length;
        this.updateCarouselUI(images.length);
    },

    prevProductImage: function () {
        const product = this.state.products.find(p => p.id === this.currentProductId);
        if (!product) return;
        const images = product.images && product.images.length > 0 ? product.images : [product.image];
        if (images.length <= 1) return;

        this.currentProductImageIndex = (this.currentProductImageIndex - 1 + images.length) % images.length;
        this.updateCarouselUI(images.length);
    },

    setProductImage: function (index) {
        const product = this.state.products.find(p => p.id === this.currentProductId);
        if (!product) return;
        const images = product.images && product.images.length > 0 ? product.images : [product.image];

        this.currentProductImageIndex = index;
        this.updateCarouselUI(images.length);
    },

    updateCarouselUI: function (total) {
        const slides = document.getElementById('product-carousel-slides');
        const badge = document.querySelector('.carousel-index-badge');
        const dots = document.querySelectorAll('.carousel-dot');

        if (slides) slides.style.transform = `translateX(-${this.currentProductImageIndex * 100}%)`;
        if (badge) badge.textContent = `${this.currentProductImageIndex + 1} / ${total}`;

        dots.forEach((dot, idx) => {
            dot.classList.toggle('active', idx === this.currentProductImageIndex);
        });
    },

    openImagePreview: function (url) {
        const modal = document.getElementById('modal-image-preview');
        const img = document.getElementById('preview-img');
        if (!modal || !img) return;

        img.src = url;
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    },

    closeImagePreview: function () {
        const modal = document.getElementById('modal-image-preview');
        if (modal) modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    },

    openOfferSheet: function () {
        if (!this.checkAuth('Teklif vermek iÃ§in lÃ¼tfen kayÄ±t olun veya giriÅŸ yapÄ±n.')) return;
        const sheet = document.getElementById('offer-sheet');
        if (sheet) sheet.style.display = 'block';
    },

    closeOfferSheet: function () {
        const sheet = document.getElementById('offer-sheet');
        if (sheet) sheet.style.display = 'none';
    },

    closeProductDetails: function () {
        const modal = document.getElementById('product-detail-modal');
        if (modal) modal.style.display = 'none';
    },

    installApp: async function () {
        if (!this.state.deferredPrompt) return;
        this.state.deferredPrompt.prompt();
        const { outcome } = await this.state.deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            console.log('User accepted the PWA install prompt');
        }
        this.state.deferredPrompt = null;
        const installBtn = document.getElementById('pwa-install-btn');
        if (installBtn) installBtn.style.display = 'none';
    },

    // --- Campaign Popup Logic ---
    checkAndShowCampaign: function () {
        // Misafir modunda gÃ¶sterme
        if (!this.state.user) return;

        // Oturum baÅŸÄ±na bir kez gÃ¶ster
        if (sessionStorage.getItem('campaignShown')) return;

        // Aktif kampanya var mÄ± kontrol et
        const latestCampaign = this.state.campaigns && this.state.campaigns[0];
        if (latestCampaign && latestCampaign.active) {
            this.showCampaignModal(latestCampaign);
        }
    },

    showCampaignModal: function (campaign) {
        const modal = document.getElementById('modal-campaign');
        const content = modal?.querySelector('.modal-content');
        const imgContainer = document.getElementById('campaign-image-container');
        const titleEl = document.getElementById('campaign-title-text');
        const subtitleEl = document.getElementById('campaign-subtitle-text');
        const ctaEl = document.getElementById('campaign-cta-link');

        if (!modal || !content) return;

        imgContainer.style.background = '#f8fafc'; // GÃ¶rsel sÄ±ÄŸmazsa arka plan rengi
        imgContainer.innerHTML = `<img src="${campaign.image}" style="width: 100%; height: auto; max-width: 100%; display: block; max-height: 350px; object-fit: contain; margin: 0 auto;">`;
        titleEl.textContent = campaign.title;
        subtitleEl.textContent = campaign.subtitle || '';

        if (campaign.link) {
            ctaEl.href = campaign.link;
            ctaEl.style.display = 'inline-block';
            ctaEl.onclick = () => this.closeCampaignModal();
        } else {
            ctaEl.style.display = 'none';
        }

        // Merkezleme ve GÃ¶rÃ¼nÃ¼rlÃ¼k
        modal.style.display = 'block'; // Flex yerine block + transform
        content.style.position = 'fixed';
        content.style.left = '50%';
        content.style.top = '50%';
        content.style.transform = 'translate(-50%, -50%)';

        sessionStorage.setItem('campaignShown', 'true');
    },

    closeCampaignModal: function () {
        const modal = document.getElementById('modal-campaign');
        if (modal) modal.style.display = 'none';
    }
});
