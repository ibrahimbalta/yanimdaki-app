Object.assign(window.app, {
    // --- Data Sync & Firestore Operations ---

    // Real-time veri senkronizasyonu
    syncData: function () {
        // Eski dinleyicileri temizle (Çift bildirimi önlemek için)
        Object.values(this.subscriptions).forEach(unsub => unsub && unsub());
        this.subscriptions = {};

        let productsLoaded = false;
        let offersLoaded = false;
        let chatsLoaded = false;

        const checkCompletion = () => {
            // Sadece ürünler yüklendiğinde loader'ı kapat (offers arka planda yüklenebilir)
            if (productsLoaded) {
                this.renderCategoryBar();
                this.hideLoader();

                // Eğer bir deep link ile gelindiyse ürünü aç
                if (this.state.deepLinkProduct) {
                    const pid = this.state.deepLinkProduct;
                    this.state.deepLinkProduct = null; // Bir kez açılmasi yeterli

                    // Temiz bir URL için p'yi kaldır
                    const cleanUrl = window.location.origin + window.location.pathname;
                    window.history.replaceState({}, document.title, cleanUrl);

                    setTimeout(() => {
                        this.showProductDetails(pid);
                    }, 300);
                }
            }
        };

        // Eğer veri gelmezse loader'ı hızlıca kapat (Daha akıcı bir başlangıç için)
        setTimeout(() => this.hideLoader(), 300);

        // İlanları anlık dinle
        let productsInitialLoad = true;
        this.subscriptions.products = db.collection('products').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
            // Yeni ilan bildirimi (başlangıç yüklemesinden sonra)
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added' && !productsInitialLoad) {
                    const newProduct = { id: change.doc.id, ...change.doc.data() };
                    this.checkNearbyNewProduct(newProduct);
                }
            });

            this.state.products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.renderProducts();
            this.renderEsnafCarousel();
            this.renderMahallePazarı(); // Mahalle Pazarı'nı render et
            this.renderMyAds();
            this.renderProfile();
            this.checkExpiryNotifications(); // Bildirimleri kontrol et

            // Radarı da güncelle (Eğer anasayfadaysak)
            if (this.currentScreen === 'home' && typeof this.updateLiveRadar === 'function') {
                this.updateLiveRadar();
            }

            productsInitialLoad = false;
            productsLoaded = true;
            checkCompletion();
        }, err => {
            console.error("Products error:", err);
            productsLoaded = true; // Hata olsa da devam et
            checkCompletion();
        });

        // Teklifleri anlık dinle
        let offersInitialLoad = true;
        this.subscriptions.offers = db.collection('offers').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added' && !offersInitialLoad) {
                    const offer = change.doc.data();
                    if (offer.sellerId === this.state.user.uid && offer.status === 'pending') {
                        this.sendLocalNotification('Yeni Teklif! 💸', `${this.utils.escapeHTML(offer.buyerName)} size ${offer.price} teklif verdi.`, { type: 'offer', productId: offer.productId });
                    }
                }
            });

            this.state.offers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.renderMyOffers();
            this.renderOffers();
            this.renderProducts(); // Satılan ürünlerin ana sayfadan kalkması için tetikle
            this.renderProfile();

            const detailModal = document.getElementById('product-detail-modal');
            if (detailModal && detailModal.style.display === 'block' && this.currentProductId) {
                this.showProductDetails(this.currentProductId);
            }

            offersInitialLoad = false;
            offersLoaded = true;
            checkCompletion();
        }, err => {
            console.error("Offers error:", err);
            offersLoaded = true; // Hata olsa da devam et
            checkCompletion();
        });

        // İlk girişte skeleton göster
        this.renderSkeletons();

        // Puanları dinle
        this.subscriptions.ratings = db.collection('ratings').onSnapshot(snapshot => {
            this.state.ratings = snapshot.docs.map(doc => doc.data());
            this.renderProfile();
            this.renderProducts();
            this.renderEsnafCarousel();
        }, err => console.error("Ratings error:", err));

        // Güvenli Noktaları dinle
        this.subscriptions.safePoints = db.collection('safe_points').onSnapshot(snaps => {
            this.state.safePoints = snaps.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (this.liveMapInstance) this.renderMapMarkers();
        }, err => console.error("SafePoints error:", err));

        // Mesajları dinle
        let chatsInitialLoad = true;
        this.subscriptions.chats = db.collection('chats').orderBy('createdAt', 'asc').onSnapshot(snapshot => {
            this.state.chats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Gizlenen sohbetleri yeni mesaj gelince geri getir & Bildirim gönder
            snapshot.docChanges().forEach(change => {
                const msg = change.doc.data();
                const myPhoneNorm = this.state.user ? this.utils.normalizePhone(this.state.user.phone) : null;
                const buyerNorm = this.utils.normalizePhone(msg.buyerPhone);
                const sellerNorm = this.utils.normalizePhone(msg.sellerPhone);
                const isMe = myPhoneNorm && (buyerNorm === myPhoneNorm || sellerNorm === myPhoneNorm);

                if (change.type === 'added' && isMe) {
                    // Sadece yeni gelen mesajlarda (başlangıç yüklemesinden sonra) sohbeti aç
                    const otherPhoneNorm = buyerNorm === myPhoneNorm ? sellerNorm : buyerNorm;
                    const chatKey = `${msg.productId || 'general'}_${otherPhoneNorm}`;
                    if (!chatsInitialLoad && this.state.user && this.state.user.hiddenChats && this.state.user.hiddenChats.includes(chatKey)) {
                        db.collection('users').doc(this.state.user.uid).update({
                            hiddenChats: firebase.firestore.FieldValue.arrayRemove(chatKey)
                        });
                    }

                    // Yeni mesaj bildirimi (Eğer ben göndermediysem ve mesaj yeni ise)
                    const senderPhoneNorm = this.utils.normalizePhone(msg.senderPhone);
                    if (!chatsInitialLoad && senderPhoneNorm !== myPhoneNorm) {
                        const senderName = (buyerNorm === senderPhoneNorm ? msg.buyerName : msg.sellerName) || 'Bir komşunuz';
                        this.sendLocalNotification(`Yeni Mesaj: ${senderName} 💬`, msg.text || 'Yeni bir mesajınız var.', { type: 'message', productId: msg.productId, otherPhone: (buyerNorm === senderPhoneNorm ? msg.sellerPhone : msg.buyerPhone) });
                    }
                }
            });

            if (this.currentScreen === 'messages') this.renderMessages();
            if (this.currentScreen === 'chat') this.renderChatWindow();

            chatsInitialLoad = false;
            chatsLoaded = true;
            checkCompletion();
        }, err => {
            console.error("Chats error:", err);
            chatsLoaded = true;
            checkCompletion();
        });

        // Favorileri anlık dinle (UserID'ye göre)
        if (this.state.user && this.state.user.uid) {
            this.subscriptions.favorites = db.collection('favorites').where('userId', '==', this.state.user.uid).onSnapshot(snapshot => {
                this.state.favorites = snapshot.docs.map(doc => doc.data().productId);
                this.renderFavorites();

                const heart = document.getElementById('detail-heart');
                if (heart && this.currentProductId) {
                    const isFav = this.state.favorites.includes(this.currentProductId);
                    heart.className = isFav ? 'fas fa-heart' : 'far fa-heart';
                    heart.style.color = isFav ? 'var(--accent)' : 'inherit';
                }
            });
        }

        // Sponsorlu Galeri Verilerini Dinle
        this.subscriptions.gallery = db.collection('gallery').orderBy('order', 'asc').onSnapshot(snapshot => {
            this.state.galleryItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log('[Gallery Sync] galleryItems yüklendi:', this.state.galleryItems.length, 'adet');
            this.renderGallery();
            this.renderEsnafCarousel(); // Esnaf vitrinini de güncelle
        }, err => console.error("Gallery error:", err));

        // AdSense Linkini Dinle
        db.collection('config').doc('adsense').onSnapshot(doc => {
            if (doc.exists) {
                this.state.adsenseCode = doc.data().code;
            }
        });

        // Hero Slider Bannerlarını Dinle
        this.subscriptions.banners = db.collection('banners').orderBy('order', 'asc').onSnapshot(snapshot => {
            this.state.banners = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.renderHeroSlider();
        }, err => console.error("Banners error:", err));

        // Kampanya Modalı Verilerini Dinle
        this.subscriptions.campaigns = db.collection('campaigns').onSnapshot(snapshot => {
            this.state.campaigns = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(c => c.active !== false)
                .sort((a, b) => {
                    const timeA = a.createdAt?.seconds || a.createdAt?.toMillis?.() || 0;
                    const timeB = b.createdAt?.seconds || b.createdAt?.toMillis?.() || 0;
                    return timeB - timeA;
                });
            this.checkAndShowCampaign();
        }, err => console.error("Campaigns error:", err));
    },

    syncSubscriptions: function () {
        if (!this.state.user) return;
        db.collection('subscriptions').doc(this.state.user.uid).onSnapshot(doc => {
            if (doc.exists) {
                this.state.userSubscriptions = doc.data();
                this.renderSubscriptions();
                this.updateAddScreenVitrineOptions();
                this.updateQuickDealVitrineOptions();
            }
        });
    },

    publishProduct: async function () {
        try {
            // Kullanıcı kontrolü
            if (!this.state.user) {
                return this.toast('İlan yayınlayabilmek için giriş yapmalısınız.', 'warning');
            }

            // Telefon numarası kontrolü
            if (!this.state.user.phone) {
                return this.toast('İlan yayınlayabilmek için lütfen ayarlardan telefon numaranızı ekleyin. 📱', 'warning');
            }

            const titleInput = document.getElementById('add-title');
            const priceInput = document.getElementById('add-price');
            const categorySelect = document.getElementById('add-category');
            const descInput = document.getElementById('add-description');
            const citySelect = document.getElementById('add-city');
            const districtSelect = document.getElementById('add-district');
            const neighborhoodSelect = document.getElementById('add-neighborhood');
            const vitrineCheckbox = document.getElementById('add-is-vitrine-individual') || document.getElementById('add-is-vitrine-esnaf');

            const title = titleInput.value.trim();
            const price = priceInput.value.trim();
            const category = categorySelect.value;
            const desc = descInput.value.trim();
            const city = citySelect.value;
            const district = districtSelect.value;
            const neighborhood = neighborhoodSelect.value;
            // Hidden inputlardan oku (.value === 'true')
            const isFree = document.getElementById('add-is-free')?.value === 'true';
            const isNegotiable = document.getElementById('add-is-negotiable')?.value === 'true';
            const isBulk = document.getElementById('add-is-bulk')?.value === 'true';
            const isService = document.getElementById('add-is-service')?.value === 'true';
            const isSwap = document.getElementById('add-is-swap')?.value === 'true';
            const isSurprise = document.getElementById('add-is-surprise')?.value === 'true' || category === 'surpriz-paket';
            const useVitrine = vitrineCheckbox ? vitrineCheckbox.checked : false;
            const isEsnaf = document.getElementById('add-poster-profile')?.value === 'esnaf';
            const delivery = document.getElementById('add-delivery')?.value || 'kapidan';
            const dealType = document.getElementById('add-deal-type')?.value || 'none';
            const oldPriceValue = parseFloat(document.getElementById('add-old-price')?.value) || 0;
            const takasWish = document.getElementById('add-takas-wish')?.value.trim() || '';


            // GPS Koordinatları
            const lat = parseFloat(document.getElementById('add-lat').value);
            const lng = parseFloat(document.getElementById('add-lng').value);

            // Fiyat kontrolü: "Teklif Bekliyorum" veya "Ücretsiz" türlerinde fiyat zorunlu değil
            const priceRequired = !isNegotiable && !isFree;
            if (!title || (priceRequired && !price) || !category || !city || !district) {
                return this.toast('Lütfen tüm zorunlu alanları doldurun.', 'error');
            }

            // Vitrin Paketi Kontrolü (Güvenlik için yayınlama anında tekrar kontrol et)
            let finalVitrine = useVitrine;
            if (useVitrine) {
                const subs = this.state.subscriptions || [];
                const now = new Date();
                const requiredType = isEsnaf ? 'esnaf' : 'komsu';

                const hasActiveSub = subs.some(s => {
                    const expiresAt = s.expiresAt && s.expiresAt.toDate ? s.expiresAt.toDate() : new Date(s.expiresAt);
                    return s.vitrineType === requiredType && expiresAt > now;
                });

                if (!hasActiveSub) {
                    console.warn('Aktif vitrin paketi bulunamadı, vitrine ekleme iptal edildi.');
                    finalVitrine = false;
                }
            }

            // Moderasyon kontrolü
            const titleMod = this.utils.checkForbiddenContent(title);
            const descMod = this.utils.checkForbiddenContent(desc);
            if (titleMod.isForbidden) return this.toast(titleMod.message, 'warning');
            if (descMod.isForbidden) return this.toast(descMod.message, 'warning');

            this.toast('İlan yayınlanıyor...', 'info');

            const PLACEHOLDER_SVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect fill='%23e2e8f0' width='200' height='200'/%3E%3Cpath fill='%2394a3b8' d='M100 60c-11 0-20 9-20 20s9 20 20 20 20-9 20-20-9-20-20-20zm0 50c-22 0-40 12-40 27v8h80v-8c0-15-18-27-40-27z'/%3E%3Ctext x='100' y='155' text-anchor='middle' fill='%2364748b' font-family='Arial' font-size='12'%3EGörsel Yok%3C/text%3E%3C/svg%3E";

            // Görselleri doğrudan base64 olarak kullan (zaten compressImage ile sıkıştırılmış)
            // Bu yöntem ImgBB gibi harici API'lere bağımlılığı kaldırır
            const images = this.state.selectedImages.length > 0
                ? this.state.selectedImages.slice(0, 5)  // Max 5 görsel
                : [];

            console.log('Product images:', images.length, 'adet');

            const cityName = citySelect.options[citySelect.selectedIndex].text;
            const districtName = districtSelect.options[districtSelect.selectedIndex].text;
            const neighborhoodName = neighborhoodSelect.value;

            const defaultImage = isSurprise ? 'img/surprise-default.png' : PLACEHOLDER_SVG;


            const productData = {
                adNumber: this.utils.generateAdNumber(),
                title: this.utils.cleanText(title),
                price: parseFloat(price),
                category,
                isSurprise,
                description: this.utils.cleanText(desc),
                city: cityName,
                district: districtName,
                neighborhood: neighborhoodName,
                isFree,
                isNegotiable,
                isBulk,
                isService,
                isSwap,
                takasWish: isSwap ? takasWish : '',
                delivery: delivery,
                image: images[0] || defaultImage,
                images: images,
                ownerId: this.state.user.uid,
                ownerName: this.state.user.displayName,
                ownerPhone: this.state.user.phone,
                ownerVerified: this.state.user.verified || this.state.user.verifiedNeighbor || false,
                verifiedNeighbor: this.state.user.verifiedNeighbor || false,
                trustScore: this.state.user.trustScore || 0,
                status: 'active',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                views: 0,
                vitrine: finalVitrine,
                isEsnaf,
                dealType: dealType,
                oldPrice: oldPriceValue > 0 ? oldPriceValue : null,
                expiresAt: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
                lat: (!isNaN(lat) && lat !== 0) ? lat : null,
                lng: (!isNaN(lng) && lng !== 0) ? lng : null
            };

            // EĞER KATEGORİ ASKIDA İSE: shares koleksiyonuna yönlendir
            if (category === 'Askıda') {
                if (!app.pendingAskidaData) {
                    return this.toast('Askıda ürün için esnaf bilgisi bulunamadı. Lütfen esnaf profilinden tekrar deneyin.', 'error');
                }

                this.toast('Bağışınız ve paylaşımınız hazırlanıyor...', 'info');

                const donorName = this.state.user.displayName || 'Bir Hayırsever';
                const shopName = app.pendingAskidaData.esnafName;
                const shareContent = `${shopName} esnafına bir ürün askıya bırakıldı! 🧺\n\nÜrün: ${title}\nBağışçı: ${donorName}`;

                // shares koleksiyonuna ekle (Mahalle Akışı için)
                await app.submitShare(shareContent, 'paylas', false, title, 'Askıda', app.pendingAskidaData);

                // Formu temizle ve kilitleri aç
                app.pendingAskidaData = null;
                const adTypeSelect = document.getElementById('add-ad-type');
                if (adTypeSelect) adTypeSelect.disabled = false;

                this.toast('Askıda ürün paylaşıldı ve mahalle akışına eklendi! ✨', 'success');
                this.showScreen('share'); // Akışa yönlendir ki görsün
                return;
            }

            const docRef = await db.collection('products').add(productData);
            productData.id = docRef.id;

            // Arama alarmlarını kontrol et
            this.checkSearchAlerts(productData);
            // Vitrin Paket Kullanımı
            if (useVitrine && this.state.subscriptions && this.state.subscriptions.length > 0) {
                const isEsnaf = (this.state.user.esnafStatus || '').toLowerCase() === 'approved';
                const targetType = isEsnaf ? 'esnaf' : 'komsu';

                const now = new Date();
                const subIndex = this.state.subscriptions.findIndex(s => {
                    const expiresAt = s.expiresAt && s.expiresAt.toDate ? s.expiresAt.toDate() : new Date(s.expiresAt);
                    return s.vitrineType === targetType && s.status === 'active' && expiresAt > now;
                });

                if (subIndex > -1) {
                    const sub = this.state.subscriptions[subIndex];

                    // 1. Galeriye Ekle
                    await db.collection('gallery').add({
                        productId: docRef.id,
                        vitrineType: targetType,
                        expiresAt: sub.expiresAt,
                        order: 0,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    // 2. Aboneliği Kullandı Olarak İşaretle (Kaldırıldı - Süre tabanlı kullanım için)
                    // const updatedSubs = this.state.subscriptions.filter(s => s.id !== sub.id);
                    // await db.collection('users').doc(this.state.user.uid).update({
                    //     activeSubscriptions: updatedSubs
                    // });
                }
            }

            this.toast('İlan başarıyla yayınlandı! 🎉', 'success');

            // Formu temizle
            titleInput.value = '';
            priceInput.value = '';
            descInput.value = '';
            this.state.selectedImages = [];
            this.renderImagePreviews();

            this.showScreen('home');
        } catch (err) {
            console.error(err);
            this.toast('Hata: ' + err.message, 'error');
        }
    },

    sendOffer: async function () {
        const product = this.state.products.find(p => p.id === this.currentProductId);
        if (!product) return;

        const messageInput = document.getElementById('offer-message');
        const message = messageInput ? messageInput.value.trim() : '';

        let offerData = {
            productId: this.currentProductId,
            productTitle: product.title,
            productImage: product.image,
            buyerId: this.state.user.uid,
            buyerName: this.state.user.displayName,
            buyerPhone: this.state.user.phone,
            sellerId: product.ownerId,
            sellerPhone: product.ownerPhone, // Add sellerPhone here
            message: message,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (this.state.currentOfferType === 'swap') {
            const offeredProductId = document.getElementById('offered-product-id').value;
            if (!offeredProductId) return this.toast('Lütfen takas için bir ürün seçin.', 'error');

            const offeredProduct = this.state.products.find(p => p.id === offeredProductId);
            if (!offeredProduct) return this.toast('Seçilen ürün bulunamadı.', 'error');

            offerData.offeredProductId = offeredProductId;
            offerData.offeredProductTitle = offeredProduct.title;
            offerData.offeredProductImage = offeredProduct.image;
            offerData.offerType = 'swap';
            offerData.price = 0;
        } else {
            const priceInput = document.getElementById('offer-price');
            const price = priceInput ? priceInput.value.trim() : '';
            if (!price || isNaN(price)) return this.toast('Geçerli bir fiyat girin.', 'error');

            offerData.price = parseFloat(price);
            offerData.offerType = 'cash';
        }

        try {
            this.toast('Teklif gönderiliyor...', 'info');
            await db.collection('offers').add(offerData);

            // Eğer mesaj yazıldıysa veya otomatik bir başlangıç yapmak istiyorsak sohbete ekle
            let chatMessage;
            if (offerData.offerType === 'swap') {
                chatMessage = message || `Merhabalar, "${product.title}" ilanınız için "${offerData.offeredProductTitle}" ürünümle takas teklif ediyorum.`;
            } else {
                chatMessage = message || `Merhabalar, "${product.title}" ilanınız için ${offerData.price} TL değerinde bir teklif gönderdim.`;
            }
            this.sendInternalMessage(product.ownerPhone, product.ownerName, chatMessage, this.currentProductId, false);

            this.toast('Teklifiniz başarıyla gönderildi! 🎉', 'success');
            this.closeOfferSheet();
            if (document.getElementById('offer-price')) document.getElementById('offer-price').value = '';
            if (messageInput) messageInput.value = '';
        } catch (err) {
            this.toast('Hata: ' + err.message, 'error');
        }
    },

    updateOfferStatus: async function (id, status) {
        try {
            await db.collection('offers').doc(id).update({ status });
            this.toast(`Teklif ${status === 'accepted' ? 'kabul edildi' : 'reddedildi'}.`);

            // Eğer kabul edildiyse, ürünü satıldı olarak işaretleyelim ve otomatik mesaj gönderelim
            if (status === 'accepted') {
                const offer = this.state.offers.find(o => o.id === id);
                if (offer) {
                    // Ürünü güncelle
                    await db.collection('products').doc(offer.productId).update({ status: 'sold' });

                    // Mesaj gönder
                    this.sendInternalMessage(offer.buyerPhone, offer.buyerName, `Merhabalar, "${offer.productTitle}" ilanım için verdiğiniz ${offer.price} TL teklifi kabul ettim. Ne zaman buluşabiliriz?`, offer.productId);
                }
            }
        } catch (err) {
            this.toast('Hata: ' + err.message, 'error');
        }
    },

    toggleFavorite: async function (productId) {
        if (!this.checkAuth('Favoriye eklemek için lütfen giriş yapın.')) return;

        const isFav = this.state.favorites.includes(productId);
        const userUid = this.state.user.uid;

        try {
            if (isFav) {
                const snap = await db.collection('favorites')
                    .where('userId', '==', userUid)
                    .where('productId', '==', productId)
                    .get();
                const batch = db.batch();
                snap.docs.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
                this.toast('Favorilerden kaldırıldı.');
            } else {
                await db.collection('favorites').add({
                    userId: userUid,
                    productId: productId,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                this.toast('Favorilere eklendi! ❤️');
            }
        } catch (err) {
            this.toast('Hata: ' + err.message, 'error');
        }
    },

    deleteProduct: async function (productId) {
        if (!confirm('Bu ilanı silmek istediğinize emin misiniz?')) return;
        try {
            await db.collection('products').doc(productId).delete();
            this.toast('İlan silindi.');
            if (this.currentScreen === 'product-detail') this.showScreen('home');
        } catch (err) {
            this.toast('Hata: ' + err.message, 'error');
        }
    },

    markAsSold: async function (productId) {
        if (!confirm('Bu ilanı satıldı olarak işaretlemek istiyor musunuz? Bu işlem ilanı ana sayfadan kaldıracaktır.')) return;
        try {
            this.toast('İşleniyor...', 'info');
            await db.collection('products').doc(productId).update({
                status: 'sold',
                soldAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            this.toast('İlan satıldı olarak işaretlendi. ✨');
            this.renderMyAds(); // UI'ı güncelle
        } catch (err) {
            console.error('Mark as sold error:', err);
            this.toast('Hata: ' + err.message, 'error');
        }
    },

    republishProduct: async function (productId) {
        if (!this.state.user) return;

        // --- Kota Kontrolü ---
        const activeAdsCount = this.state.products.filter(p => p.ownerId === this.state.user.uid && (p.status || 'active') === 'active').length;
        const isEsnaf = (this.state.user.esnafStatus || 'none').toLowerCase() === 'approved';
        const defaultLimit = isEsnaf ? 30 : 50;
        const userLimit = Math.max(this.state.user.adLimit || 0, defaultLimit);

        if (activeAdsCount >= userLimit) {
            return this.toast(`İlan limitinize ulaştınız (${activeAdsCount}/${userLimit}). Lütfen mevcut ilanlarınızdan birini silin veya süresinin dolmasını bekleyin.`, 'warning');
        }

        if (!confirm('Bu ilanı tekrar yayına almak istiyor musunuz? Bu işlem ilan kotanızdan düşecektir.')) return;

        try {
            this.showLoader();
            const now = firebase.firestore.FieldValue.serverTimestamp();

            // expiresAt hesaplama: 24 saat sonrası
            const expiryDate = new Date();
            expiryDate.setHours(expiryDate.getHours() + 24);

            await db.collection('products').doc(productId).update({
                status: 'active',
                createdAt: now,
                republishedAt: now,
                expiresAt: firebase.firestore.Timestamp.fromDate(expiryDate)
            });

            this.toast('İlan başarıyla yenilendi ve yayına alındı! 🚀', 'success');

            // Verileri senkronize et ve kota sayacını güncelle
            if (typeof this.updateAdQuota === 'function') this.updateAdQuota();
            this.renderMyAds();
            this.hideLoader();
        } catch (err) {
            this.hideLoader();
            console.error('Republish error:', err);
            this.toast('Hata: ' + err.message, 'error');
        }
    },

    saveProductEdit: async function () {
        if (!this.currentEditProductId) return;

        const title = document.getElementById('edit-title').value.trim();
        const price = document.getElementById('edit-price').value.trim();
        const desc = document.getElementById('edit-description').value.trim();
        const citySelect = document.getElementById('edit-city');
        const districtSelect = document.getElementById('edit-district');
        const neighborhoodSelect = document.getElementById('edit-neighborhood');
        const fullAddress = document.getElementById('edit-full-address').value.trim();
        const category = document.getElementById('edit-category').value;
        const isSwap = document.getElementById('edit-is-swap').checked;
        const isSurprise = document.getElementById('edit-is-surprise') ? document.getElementById('edit-is-surprise').checked : false;
        const delivery = document.getElementById('edit-delivery')?.value || 'kapidan';
        const dealType = document.getElementById('edit-deal-type')?.value || 'none';
        const oldPriceValue = parseFloat(document.getElementById('edit-old-price')?.value) || 0;
        const takasWish = document.getElementById('edit-takas-wish')?.value.trim() || '';

        if (!title || !price) return this.toast('Lütfen zorunlu alanları doldurun.', 'error');

        try {
            this.toast('Güncelleniyor...', 'info');

            const cityName = citySelect.options[citySelect.selectedIndex].text;
            const districtName = districtSelect.options[districtSelect.selectedIndex].text;
            const neighborhoodName = neighborhoodSelect.value;

            // GPS Koordinatları (Yeni eklenen alanlar için de olabilir)
            const lat = parseFloat(document.getElementById('edit-lat')?.value);
            const lng = parseFloat(document.getElementById('edit-lng')?.value);

            const updateData = {
                title: this.utils.cleanText(title),
                price: parseFloat(price),
                description: this.utils.cleanText(desc),
                category: category,
                city: cityName,
                district: districtName,
                neighborhood: neighborhoodName,
                fullAddress: fullAddress,
                isSwap: isSwap,
                takasWish: isSwap ? takasWish : '',
                isSurprise: isSurprise,
                delivery: delivery,
                dealType: dealType,
                oldPrice: oldPriceValue > 0 ? oldPriceValue : null,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (!isNaN(lat) && !isNaN(lng)) {
                updateData.lat = lat;
                updateData.lng = lng;
            }

            // Eğer yeni bir görsel seçildiyse (base64)
            if (this.state.tempEditImage && this.state.tempEditImage.startsWith('data:image')) {
                updateData.image = this.state.tempEditImage;
                updateData.images = [this.state.tempEditImage]; // Şu anlık tek görsel edit desteği
            }

            await db.collection('products').doc(this.currentEditProductId).update(updateData);

            this.toast('İlan başarıyla güncellendi. ✅');
            this.showScreen('my-ads');
        } catch (err) {
            console.error(err);
            this.toast('Hata: ' + err.message, 'error');
        }
    },

    renewProduct: async function (id) {
        try {
            await db.collection('products').doc(id).update({
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            this.toast('İlan başarıyla güncellendi ve en başa taşındı! 🚀');
        } catch (err) {
            this.toast('Hata: ' + err.message, 'error');
        }
    },

    submitPazarProduct: async function () {
        const titleInput = document.getElementById('pazar-title');
        const priceInput = document.getElementById('pazar-price');
        const deliverySelect = document.getElementById('pazar-delivery');
        const descInput = document.getElementById('pazar-desc');
        const citySelect = document.getElementById('pazar-city');
        const distSelect = document.getElementById('pazar-district');
        const neighSelect = document.getElementById('pazar-neighborhood');

        const title = titleInput.value.trim();
        const price = priceInput.value.trim();
        const delivery = deliverySelect.value;
        const desc = descInput.value.trim();
        const city = citySelect.options[citySelect.selectedIndex]?.text || '';
        const district = distSelect.options[distSelect.selectedIndex]?.text || '';
        const neighborhood = neighSelect.value;
        const image = this.state.tempPazarImage;

        if (!title || !price || !image) {
            return this.toast('Lütfen fotoğraf, ürün adı ve fiyat giriniz. 🧺', 'warning');
        }

        if (!city || !district || !neighborhood) {
            return this.toast('Lütfen konum (il, ilçe, mahalle) seçiniz. 📍', 'warning');
        }

        try {
            this.toast('Pazar\'a ekleniyor...', 'info');

            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];

            const productData = {
                title: this.utils.cleanText(title),
                price: parseFloat(price),
                description: this.utils.cleanText(desc),
                category: 'Mahalle Pazarı',
                image: image,
                images: [image],
                ownerId: this.state.user.uid,
                ownerName: this.state.user.displayName,
                ownerPhoto: this.state.user.photoURL,
                city: city,
                district: district,
                neighborhood: neighborhood,
                delivery: delivery,
                status: 'active',
                isDailyPazar: true,
                pazarDate: todayStr,
                expiresAt: firebase.firestore.Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            const docRef = await db.collection('products').add(productData);
            productData.id = docRef.id;
            this.checkSearchAlerts(productData);

            this.toast('Ürününüz pazara eklendi! 🧺✨', 'success');
            this.closePazarAddModal();
        } catch (err) {
            console.error('Pazar error:', err);
            this.toast('Hata: ' + err.message, 'error');
        }
    },

    // Yakındaki yeni ilan bildirimi
    checkNearbyNewProduct: function (product) {
        // Kullanıcı giriş yapmamışsa veya kendi ilanıysa bildirim yapma
        if (!this.state.user) return;
        if (product.ownerId === this.state.user.uid) return;

        // Konum kontrolü
        const userLat = this.state.user.location?.lat;
        const userLng = this.state.user.location?.lng;
        if (!userLat || !userLng || !product.lat || !product.lng) return;

        // 2km mesafe içinde mi?
        const dist = this.utils.calculateDistance(userLat, userLng, product.lat, product.lng);
        if (dist <= 2) {
            const priceText = product.isFree ? 'Ücretsiz' : `${this.utils.formatPrice(product.price)}₺`;

            const now = new Date();
            const isRescueHour = now.getHours() >= 20;
            const isFood = product.isSurprise || product.category === 'surpriz-paket';

            const title = (isFood && isRescueHour) ? '🚨 ACİL: Gıda Kurtarma!' : '📍 Yakınında Yeni İlan!';
            const body = (isFood && isRescueHour)
                ? `${product.title} israf olmasın diye paylaşıldı! Hemen kurtar. 🥖`
                : `${product.title} - ${priceText} (${dist.toFixed(1)} km uzakta)`;

            this.sendLocalNotification(title, body, { productId: product.id, type: 'nearby' });
            console.log('[NearbyNotification] Sent for product:', product.id, 'distance:', dist.toFixed(2), 'km');
        }
    },

    // Arama alarmlarını kontrol et ve eşleşen kullanıcılara bildirim gönder
    checkSearchAlerts: async function (product, type = 'product') {
        try {
            const title = product.title || product.content || "";
            if (!title) return;

            const querySnapshot = await db.collection('user_alerts').get();
            const lowerTitle = title.toLowerCase();

            querySnapshot.forEach(doc => {
                const alert = doc.data();
                // Kendi ilanıysa bildirim gönderme
                if (alert.userId === this.state.user?.uid) return;

                // Alarm tipi ile ürün tipi eşleşmeli (veya genel)
                if (alert.type && alert.type !== type) return;

                if (lowerTitle.includes(alert.query)) {
                    const priceText = product.isFree ? 'ÜCRETSİZ 🎁' : `${this.utils.formatPrice(product.price)}₺`;
                    const notifyTitle = `🔔 Alarm: "${alert.query}" Bulundu!`;
                    const notifyBody = `Mahallende aradığın ürüne uygun yeni ilan: ${title} - ${priceText}`;

                    // Not: Bu demo sürümünde sadece aktif kullanıcıya local notification düşer. 
                    // Gerçek push notification için Cloud Functions gereklidir.
                    if (this.state.user?.uid === alert.userId) {
                        this.sendLocalNotification(notifyTitle, notifyBody, { productId: product.id, type: 'alert' });
                    }
                }
            });
        } catch (e) {
            console.error('Search Alerts check error:', e);
        }
    },

    // --- Strategic Feature: Live Neighborhood Radar (V4 Elegant & Airy) ---
    updateLiveRadar: function () {
        const container = document.getElementById('mini-radar-container');
        const pinsLayer = document.querySelector('.radar-pins-layer-v4');
        const statsGrid = document.querySelector('.m-stats-row-v4');
        const statusText = document.getElementById('mini-radar-status');

        if (!container || !pinsLayer || !statsGrid) return;

        // Clear existing elements
        pinsLayer.innerHTML = '';
        statsGrid.innerHTML = '';

        const userLoc = this.state.user?.location || { lat: 41.0082, lng: 28.9784 };
        const products = this.state.products || [];

        const currentCity = this.state.filters?.city || 'all';

        const filteredProducts = products.filter(p => {
            const isSold = p.status === 'sold' || this.state.offers.some(o => o.productId === p.id && o.status === 'accepted');
            const isExpired = this.utils.isProductExpired(p);

            // Eğer şehir filtresi 'all' değilse, ilanı şehre göre filtrele
            const cityMatch = currentCity === 'all' || p.city === currentCity;

            return !isSold && !isExpired && cityMatch;
        });

        if (filteredProducts.length === 0) {
            container.style.display = 'none';
            return;
        }
        container.style.display = 'flex';
        if (statusText) statusText.textContent = `${filteredProducts.length} aktif ilan çevrenizde`;

        const typeConfig = {
            'satilik': { name: 'Satılık', color: '#10b981', icon: 'fa-house-chimney', bg: '#f0fdf4' },
            'indirimli': { name: 'İndirimli', color: '#3b82f6', icon: 'fa-tags', bg: '#eff6ff' },
            'takas': { name: 'Takas', color: '#8b5cf6', icon: 'fa-scissors', bg: '#f5f3ff' },
            'askida': { name: 'Askıda', color: '#ef4444', icon: 'fa-circle-exclamation', bg: '#fef2f2' }
        };

        const counts = { satilik: 0, indirimli: 0, takas: 0, askida: 0 };

        // Process all filtered products (before slice for pins)
        filteredProducts.forEach(p => {
            let type = 'satilik';
            if (p.isAskida || p.category === 'askida' || p.category === 'Askıda') type = 'askida';
            else if (p.isSwap) type = 'takas';
            else if ((p.oldPrice && p.oldPrice > p.price) || p.dealType === 'indirim') type = 'indirimli';

            if (counts[type] !== undefined) counts[type]++;
        });

        // Limit pins for visual clarity but keep counts accurate
        // V4 Mini radar için max 12-15 pin yeterlidir, çok kalabalık olmasın
        const pinProducts = filteredProducts.slice(0, 15);

        pinProducts.forEach((p, index) => {
            let type = 'satilik';
            if (p.isAskida || p.category === 'askida' || p.category === 'Askıda') type = 'askida';
            else if (p.isSwap) type = 'takas';
            else if ((p.oldPrice && p.oldPrice > p.price) || p.dealType === 'indirim') type = 'indirimli';

            // Positioning (Tiny Dots in V4)
            const angle = (index * 137.5) % 360;
            const radiusPercent = 10 + (index * 4) % 38;
            const xOffset = Math.cos(angle * Math.PI / 180) * radiusPercent * 2.2;
            const yOffset = Math.sin(angle * Math.PI / 180) * radiusPercent * 1.05;

            const pin = document.createElement('div');
            pin.className = 'radar-pin-v4';
            pin.style.left = `calc(50% + ${xOffset}%)`;
            pin.style.top = `calc(50% + ${yOffset}%)`;
            pin.style.color = typeConfig[type]?.color || '#64748b';
            pin.title = p.title;

            const catIcon = this.utils.getCategoryIcon ? this.utils.getCategoryIcon(p.category) : 'fa-circle';
            pin.innerHTML = `<i class="fas ${catIcon}"></i>`;

            pin.onclick = (e) => {
                e.stopPropagation();
                app.showProductDetails(p.id);
            };

            pinsLayer.appendChild(pin);
        });

        // Add V4 Badges (Chips)
        Object.entries(counts).forEach(([type, count]) => {
            if (count > 0) {
                const config = typeConfig[type];
                const badge = document.createElement('div');
                badge.className = 'm-stat-badge-v4';
                badge.style.background = config.bg;
                badge.style.color = config.color;
                badge.style.border = `1px solid ${config.color}22`;
                badge.innerHTML = `<i class="fas ${config.icon}"></i> <span>${config.name} <strong>${count}</strong></span>`;
                statsGrid.appendChild(badge);
            }
        });
    },
});
