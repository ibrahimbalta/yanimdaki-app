// Yanımdaki - Professional Core App Logic (Firebase Integrated)
const app = {
    state: {
        user: null, // Firebase Auth ile dolacak
        products: [],
        offers: [],
        favorites: [],
        ratings: [],
        chats: [],
        notifications: [], // { id, title, type, timestamp, productId }
        selectedImages: [],
        currentSlide: 0,
        deferredPrompt: null,
        categories: [
            { id: 'all', name: 'Hepsi', icon: 'fa-th-large' },
            { id: 'ustayardim', name: 'Usta & Yardım', icon: 'fa-user-cog' },
            { id: 'depo', name: 'Depo / Ev Boşaltma', icon: 'fa-warehouse' },
            { id: 'motosiklet', name: 'Motosiklet', icon: 'fa-motorcycle' },
            { id: 'telefon', name: 'Telefon', icon: 'fa-mobile-alt' },
            { id: 'computer', name: 'Bilgisayar & Tablet', icon: 'fa-laptop' },
            { id: 'elektronik', name: 'Elektronik', icon: 'fa-plug' },
            { id: 'evesyasi', name: 'Ev Eşyası', icon: 'fa-couch' },
            { id: 'mobilya', name: 'Mobilya', icon: 'fa-chair' },
            { id: 'beyazesya', name: 'Beyaz Eşya', icon: 'fa-box' },
            { id: 'giyim', name: 'Giyim', icon: 'fa-tshirt' },
            { id: 'ayakkabi', name: 'Ayakkabı & Aksesuar', icon: 'fa-shoe-prints' },
            { id: 'bebek', name: 'Bebek & Çocuk', icon: 'fa-baby' },
            { id: 'spor', name: 'Spor & Hobi', icon: 'fa-running' },
            { id: 'oyun', name: 'Oyun & Konsol', icon: 'fa-gamepad' },
            { id: 'kitap', name: 'Kitap', icon: 'fa-book' },
            { id: 'diger', name: 'Diğer', icon: 'fa-ellipsis-h' }
        ],
        filters: { searchQuery: '', category: 'all', minPrice: null, maxPrice: null, condition: 'all', city: 'all', maxDistance: 'all', onlyFree: false, onlyBulk: false, onlyService: false },
        cities: ["Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Amasya", "Ankara", "Antalya", "Artvin", "Aydın", "Balıkesir", "Bilecik", "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum", "Denizli", "Diyarbakır", "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir", "Gaziantep", "Giresun", "Gümüşhane", "Hakkari", "Hatay", "Isparta", "Mersin", "İstanbul", "İzmir", "Kars", "Kastamonu", "Kayseri", "Kırklareli", "Kırşehir", "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa", "Kahramanmaraş", "Mardin", "Muğla", "Muş", "Nevşehir", "Niğde", "Ordu", "Rize", "Sakarya", "Samsun", "Siirt", "Sinop", "Sivas", "Tekirdağ", "Tokat", "Trabzon", "Tunceli", "Ã…Âanlıurfa", "Uşak", "Van", "Yozgat", "Zonguldak", "Aksaray", "Bayburt", "Karaman", "Kırıkkale", "Batman", "Ã…Âırnak", "Bartın", "Ardahan", "Iğdır", "Yalova", "Karabük", "Kilis", "Osmaniye", "Düzce"],
        safePoints: [],
        users: [],
        payments: [],
        reports: [],
        mapInstance: null,
        mapMarkers: [],
        selectedRatingTags: [],
        shareFilter: 'nearby',
        shareCategoryFilter: null,
        currentShares: [],
        adsenseCode: null,
        selectedGalleryPackage: 'haftalık', // Varsayılan seçim
        selectedVitrineType: 'komsu', // 'komsu' veya 'esnaf'
        shareViewMode: 'map', // 'list' veya 'map'
        lastShareBubbleTime: 0
    },

    subscriptions: {}, // Aktif Firestore dinleyicilerini tutar
    lastNotification: { title: '', body: '', time: 0 }, // Çift bildirimi önlemek için


    // --- Core Lifecycle ---
    init: function () {
        console.log("Yanımdaki app (Firebase) başlatılıyor...");

        // 0. Firestore Çevrimdışı Kalıcılık (Offline Persistence)
        if (typeof db !== 'undefined' && db.enablePersistence) {
            db.enablePersistence({ synchronizeTabs: true }).catch(err => {
                if (err.code == 'failed-precondition') {
                    console.warn("Persistence failed: Multiple tabs open.");
                } else if (err.code == 'unimplemented') {
                    console.warn("Persistence is not available in this browser.");
                }
            });
        }

        // --- URL Parametre Kontrolü (E-posta Doğrulama vb. için) ---
        const urlParams = new URLSearchParams(window.location.search);
        const mode = urlParams.get('mode');
        const oobCode = urlParams.get('oobCode');

        if (mode === 'verifyEmail' && oobCode) {
            this.toast('E-posta adresiniz doğrulanıyor...', 'info');
            auth.applyActionCode(oobCode).then(() => {
                this.toast('E-posta adresiniz başarıyla doğrulandı! Artık giriş yapabilirsiniz. ✨', 'success');
                window.history.replaceState({}, document.title, window.location.pathname);
            }).catch(err => {
                this.toast('Doğrulama hatası: ' + err.message, 'error');
            });
        }

        // --- PWA Installation Listener ---
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.state.deferredPrompt = e;
            console.log('beforeinstallprompt olayı yakalandı.');
        });

        window.addEventListener('appinstalled', (evt) => {
            this.state.deferredPrompt = null;
            console.log('Yanımdaki PWA olarak yüklendi!');
            this.closeAppDownloadPrompt(true);
        });

        // --- Forced Service Worker Update ---
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').then(reg => {
                reg.update(); // Her açılışta güncellemeyi kontrol et
            });
        }

        // --- Ürün Paylaşım Linki Kontrolü ---
        const productId = urlParams.get('p');
        if (productId) {
            this.state.deepLinkProduct = productId;
        }
        // ---------------------------------------------------------

        // Auth Listener: Kullanıcı giriş çıkışını takip eder
        auth.onAuthStateChanged(user => {
            if (user) {
                // Google kullanıcıları zaten doğrulanmış sayılır
                const isGoogle = user.providerData.some(p => p.providerId === 'google.com');

                if (!this.state.user || this.state.user.uid !== user.uid) {
                    this.state.user = {
                        uid: user.uid,
                        email: user.email,
                        emailVerified: user.emailVerified || isGoogle,
                        displayName: user.displayName || localStorage.getItem('lastLoginName') || 'Kullanıcı',
                        photoURL: user.photoURL,
                        location: { lat: 41.0082, lng: 28.9784 },
                        trustScore: 0,
                        neighborCount: 0,
                        verifiedNeighbor: false
                    };
                }

                // Firestore'dan ek kullanıcı bilgilerini (isAdmin, resim vb.) al
                const userRef = db.collection('users').doc(user.uid);
                userRef.onSnapshot(async doc => {
                    if (doc.exists) {
                        const data = doc.data();
                        this.state.user = { ...this.state.user, ...data };
                        this.renderProfile();
                        this.renderSettings();
                        this.checkPhoneWarning();

                        // Canlı Radar Aktivasyonu
                        this.updateLiveRadar();
                        if (!this._radarInterval) {
                            this._radarInterval = setInterval(() => {
                                this.updateLiveRadar();
                            }, 30000);
                        }
                    } else {
                        // Kullanıcı dokümanı yoksa oluştur
                        const lastName = user.displayName || localStorage.getItem('lastLoginName');
                        await userRef.set({
                            email: user.email || "",
                            displayName: lastName || "Kullanıcı",
                            photoURL: user.photoURL || "",
                            adLimit: 50, // Yeni varsayılan: Bireysel 50
                            isAdmin: false,
                            trustScore: 0,
                            neighborCount: 0,
                            verifiedNeighbor: false,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        }, { merge: true });
                    }
                });

                this.syncData();
                this.updateUserLocation(); // Viewer's gerçek konumunu al
                try {
                    this.initMessaging(); // Bildirimleri başlat
                } catch (e) {
                    console.error("Messaging init error:", e);
                }
                this.showScreen('home');
            } else {
                this.state.user = null;
                this.checkPhoneWarning();
                // Onboarding kontrolü
                if (!localStorage.getItem('onboardingCompleted')) {
                    this.showScreen('onboarding');
                } else {
                    this.syncData(); // Misafir için de verileri çek
                    this.showScreen('home'); // Login yerine Home göster
                }
                this.hideLoader();
            }
        });

        this.renderCityOptions();

        // Her dakika sayaçları güncellemek için zamanlayıcı
        setInterval(() => {
            if (this.state.products.length > 0) {
                this.renderProducts();
                const detailModal = document.getElementById('product-detail-modal');
                if (detailModal && detailModal.style.display === 'block' && this.currentProductId) {
                    this.showProductDetails(this.currentProductId);
                }
            }
        }, 60000);

        // --- PWA Install Logic ---
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.state.deferredPrompt = e;
            const installBtn = document.getElementById('pwa-install-btn');
            if (installBtn) installBtn.style.setProperty('display', 'flex', 'important');
        });

        window.addEventListener('appinstalled', () => {
            this.state.deferredPrompt = null;
            const installBtn = document.getElementById('pwa-install-btn');
            if (installBtn) installBtn.style.display = 'none';
            this.toast('Yanımdaki başarıyla yüklendi! ÄŸÅ¸Ââ€°');
        });

        this.setupOnboardingSwipe();
        this.initDarkMode();
        this.checkAppDownloadPrompt();
    },

    // --- App Download Prompt (Mobile) ---
    checkAppDownloadPrompt: function () {
        // Sadece mobilde ve PWA olarak açılmamışsa göster
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isPWA = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
        const isHidden = localStorage.getItem('hideAppPrompt');

        if (isMobile && !isPWA && !isHidden) {
            setTimeout(() => {
                const overlay = document.getElementById('app-download-overlay');
                if (overlay) {
                    overlay.style.display = 'flex';
                }
            }, 2000); // 2 saniye sonra göster
        }
    },

    closeAppDownloadPrompt: function (permanent = false) {
        const overlay = document.getElementById('app-download-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
        if (permanent) {
            localStorage.setItem('hideAppPrompt', 'true');
        }
    },

    downloadAPK: async function () {
        const isPWA = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

        if (isPWA) {
            this.toast('Yanımdaki zaten yüklü! ÄŸÅ¸Ââ€°', 'success');
            this.closeAppDownloadPrompt(true);
            return;
        }

        if (this.state.deferredPrompt) {
            this.state.deferredPrompt.prompt();
            const { outcome } = await this.state.deferredPrompt.userChoice;
            console.log(`User response to the install prompt: ${outcome}`);
            this.state.deferredPrompt = null;
            this.closeAppDownloadPrompt(outcome === 'accepted');
        } else {
            this.toast('Yükleme şu an başlatılamıyor. Tarayıcı menüsünden "Ana Ekrana Ekle"yi kullanabilirsiniz.', 'info');
            // Permanently hide if they got the message but can't install via button
            this.closeAppDownloadPrompt(true);
        }
    },

    initMessaging: function () {
        // --- Capacitor Native Support ---
        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            this.initCapacitorNotifications();
            return;
        }

        if (!messaging) return;

        // Ön planda mesaj gelince (Web)
        messaging.onMessage((payload) => {
            console.log("Foreground message received:", payload);
            this.sendLocalNotification(payload.notification.title, payload.notification.body, payload.data);
        });

        // İzin iste (Web)
        this.requestNotificationPermission();
    },

    initCapacitorNotifications: async function () {
        const { PushNotifications } = Capacitor.Plugins;

        // İzin kontrolü ve isteme
        let permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive === 'prompt') {
            permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
            return console.warn('User denied push permissions!');
        }

        // Kayıt ol
        await PushNotifications.register();

        // Token alındığında
        PushNotifications.addListener('registration', (token) => {
            console.log('Capacitor Push Token:', token.value);
            if (this.state.user) {
                db.collection('users').doc(this.state.user.uid).update({
                    fcmToken: token.value,
                    platform: Capacitor.getPlatform()
                });
            }
        });

        // Hata durumunda
        PushNotifications.addListener('registrationError', (err) => {
            console.error('Capacitor Registration Error:', err);
        });

        // Bildirim geldiğinde (Foreground)
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
            this.sendLocalNotification(notification.title, notification.body, notification.data);
        });

        // Bildirime tıklandığında
        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
            console.log('Push action performed:', notification.actionId);
            // Belirli bir ekrana yönlendirme yapılabilir
        });
    },

    requestNotificationPermission: function () {
        if (!messaging) return;

        Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
                console.log('Notification permission granted.');
                this.saveToken();
            } else {
                console.warn('Unable to get permission to notify.');
            }
        });
    },

    saveToken: function () {
        messaging.getToken({ vapidKey: 'BIsS-m_vH6X8Wp6m9C4yH7y_z-Rzq_Z8Wp6m9C4yH7y' }).then((currentToken) => {
            if (currentToken) {
                console.log('FCM Token:', currentToken);
                if (this.state.user) {
                    db.collection('users').doc(this.state.user.uid).update({
                        fcmToken: currentToken,
                        platform: 'web'
                    });
                }
            } else {
                console.warn('No registration token available. Request permission to generate one.');
            }
        }).catch((err) => {
            console.error('An error occurred while retrieving token. ', err);
        });
    },

    updateNotificationBadge: function () {
        const badge = document.getElementById('notification-badge');
        if (!badge) return;
        const count = this.state.notifications.length;
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    },

    sendLocalNotification: function (title, body, data = {}) {
        // Çıkış (Deduplication): Aynı bildirimi 2 saniye içinde tekrar gösterme
        const now = Date.now();
        if (this.lastNotification.title === title && this.lastNotification.body === body && (now - this.lastNotification.time < 2000)) {
            console.log("Deduplicated notification:", title);
            return;
        }
        this.lastNotification = { title, body, time: now };

        console.log("sendLocalNotification triggered:", { title, body, data });
        // Tarayıcı içi toast göster
        this.toast(`${title}: ${body}`, 'info');

        // State'e ekle (UI listesi için)
        this.state.notifications.unshift({
            id: Date.now(),
            title: title,
            text: body,
            type: data.type || 'info',
            timestamp: new Date(),
            productId: data.productId || null,
            otherPhone: data.otherPhone || null
        });
        this.updateNotificationBadge();

        // Eğer izin varsa browser seviyesinde bildirim (OS)
        if (window.Notification && Notification.permission === 'granted') {
            try {
                new Notification(title, {
                    body: body,
                    icon: '/icon.png',
                    tag: data.productId || 'general'
                });
            } catch (err) {
                console.warn("Notification error (might be on mobile browser):", err);
            }
        }
    },

    // Real-time veri senkronizasyonu
    syncData: function () {
        // Eski dinleyicileri temizle (Çift bildirimi önlemek için)
        Object.values(this.subscriptions).forEach(unsub => unsub && unsub());
        this.subscriptions = {};

        let productsLoaded = false;
        let offersLoaded = false;

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

        // Eğer 1.5 saniye içinde veri gelmezse loader'ı zorla kapat (Hata önleme)
        setTimeout(() => this.hideLoader(), 1500);

        // İlanları anlık dinle
        this.subscriptions.products = db.collection('products').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
            this.state.products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.renderProducts();
            this.renderMyAds();
            this.renderProfile();
            this.checkExpiryNotifications(); // Bildirimleri kontrol et
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
                    if (offer.sellerId === this.state.user?.uid && offer.status === 'pending') {
                        this.sendLocalNotification('Yeni Teklif! ÄŸÅ¸â€™Â¸', `${this.utils.escapeHTML(offer.buyerName)} size ${offer.price} teklif verdi.`, { type: 'offer', productId: offer.productId });
                    }
                }
            });

            this.state.offers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.renderMyOffers();
            this.renderOffers(); // Eksik olan çağrı eklendi
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
                const myPhone = this.state.user?.phone;
                const isMe = myPhone && (msg.buyerPhone === myPhone || msg.sellerPhone === myPhone);

                if (change.type === 'added' && isMe) {
                    // Sadece yeni gelen mesajlarda (başlangıç yüklemesinden sonra) sohbeti aç
                    const otherPhone = msg.buyerPhone === myPhone ? msg.sellerPhone : msg.buyerPhone;
                    const chatKey = `${msg.productId}_${otherPhone}`;
                    if (!chatsInitialLoad && this.state.user?.hiddenChats?.includes(chatKey)) {
                        db.collection('users').doc(this.state.user.uid).update({
                            hiddenChats: firebase.firestore.FieldValue.arrayRemove(chatKey)
                        });
                    }

                    // Yeni mesaj bildirimi (Eğer ben göndermediysem ve mesaj yeni ise)
                    const senderPhone = msg.senderPhone;
                    if (!chatsInitialLoad && senderPhone !== myPhone) {
                        const senderName = (msg.buyerPhone === senderPhone ? msg.buyerName : msg.sellerName) || 'Bir komşunuz';
                        this.sendLocalNotification(`Yeni Mesaj: ${senderName} ÄŸÅ¸â€™Â¬`, msg.text || 'Yeni bir mesajınız var.', { type: 'message', productId: msg.productId, otherPhone: otherPhone });
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
        if (this.state.user?.uid) {
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
            this.renderGallery();
        }, err => console.error("Gallery error:", err));

        // AdSense Linkini Dinle
        db.collection('config').doc('adsense').onSnapshot(doc => {
            if (doc.exists) {
                this.state.adsenseCode = doc.data().code;
            }
        });
    },

    // --- Navigation ---
    showScreen: function (screenId) {
        // Giriş gerektiren sayfalar için kontrol
        const protectedScreens = ['add', 'offers', 'profile', 'messages', 'settings', 'my-ads', 'my-offers', 'favorites'];
        if (protectedScreens.includes(screenId) && !this.state.user) {
            this.showScreen('login');
            this.switchLoginTab('register');
            const messages = {
                'add': 'İlan vermek için lütfen kayıt olun veya giriş yapın.',
                'messages': 'Mesajlarınızı görmek için lütfen giriş yapın.',
                'offers': 'Tekliflerinizi yönetmek için lütfen giriş yapın.',
                'profile': 'Profilinizi görmek için lütfen giriş yapın.'
            };
            this.toast(messages[screenId] || 'Bu sayfaya erişmek için lütfen giriş yapın.', 'info');
            return;
        }

        this.currentScreen = screenId;

        // İletişim ekranına başka yerden (örneğin galeri modalı) gelinmediyse origin'i sıfırla
        if (screenId === 'contact') {
            const adNumGroup = document.getElementById('contact-ad-number-group');
            if (adNumGroup) {
                adNumGroup.style.display = this.contactOrigin === 'gallery' ? 'block' : 'none';
            }
        } else if (this.contactOrigin) {
            this.contactOrigin = null;
        }

        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(`screen-${screenId}`);
        if (target) target.classList.add('active');

        const navBar = document.getElementById('main-nav');
        const header = document.querySelector('header');
        if (screenId === 'login' || screenId === 'onboarding') {
            if (navBar) navBar.style.setProperty('display', 'none', 'important');
            if (header) header.style.setProperty('display', 'none', 'important');
        } else {
            const isFullScreen = screenId === 'ar';
            if (navBar) {
                navBar.style.setProperty('display', isFullScreen ? 'none' : 'flex', 'important');
                navBar.style.setProperty('visibility', isFullScreen ? 'hidden' : 'visible', 'important');
                navBar.style.setProperty('opacity', isFullScreen ? '0' : '1', 'important');
                navBar.style.setProperty('pointer-events', isFullScreen ? 'none' : 'auto', 'important');
            }
            if (header) {
                header.style.setProperty('display', isFullScreen ? 'none' : 'flex', 'important');
                header.style.setProperty('visibility', isFullScreen ? 'hidden' : 'visible', 'important');
            }

            // Alt menü aktiflik durumu
            document.querySelectorAll('#main-nav a, #main-nav .nav-item').forEach(item => {
                item.classList.remove('active');
                if (item.getAttribute('onclick')?.includes(`'${screenId}'`)) {
                    item.classList.add('active');
                }
            });
        }

        // Ekran değiştiğinde loader'ın kapandığından emin ol
        this.hideLoader();

        if (screenId === 'home') {
            this.renderCategoryBar();
            this.renderProducts();
            this.updateSustainabilityStats();
        }

        if (screenId === 'ar') {
            console.log("AR Mode Triggered");
            this.initARMode();
            if (target) {
                target.style.display = 'block';
                target.style.zIndex = '20000';
            }
        }
        if (screenId === 'add') this.updateAdQuota();
        if (screenId === 'offers') this.renderOffers();
        if (screenId === 'profile') this.renderProfile();
        if (screenId === 'messages') this.renderMessages();
        if (screenId === 'settings') this.renderSettings();
        if (screenId === 'my-ads') this.renderMyAds();
        if (screenId === 'my-offers') this.renderMyOffers();
        if (screenId === 'map') this.initLiveMap();
        if (screenId === 'share') this.renderShareFeed();
        if (screenId === 'favorites') this.renderFavorites();

        if (target) target.scrollTop = 0;
    },

    // --- Gallery Logic ---
    renderGallery: function () {
        const wrapper = document.getElementById('gallery-wrapper');
        const esnafWrapper = document.getElementById('esnaf-carousel');
        const esnafContainer = document.getElementById('esnaf-carousel-container');
        if (!wrapper || !esnafWrapper) return;

        if (!this.state.galleryItems || this.state.galleryItems.length === 0) {
            wrapper.innerHTML = `<div class="empty-state" style="font-size: 0.75rem; padding: 20px; color: var(--text-muted); width: 100%; text-align: center; border: 1px dashed var(--border-color); border-radius: 16px;">Mahallenizden öne çıkan ilanlar burada görünecek!</div>`;
            if (esnafContainer) esnafContainer.style.display = 'none';
            return;
        }

        let komsuHtml = '';
        let esnafHtml = '';
        let hasEsnaf = false;

        this.state.galleryItems.forEach(item => {
            if (item.expiresAt && item.expiresAt.seconds < firebase.firestore.Timestamp.now().seconds) return;

            const product = this.state.products.find(p => p.id === item.productId);
            if (!product) return;

            const isEsnaf = item.vitrineType === 'esnaf';
            const cardHtml = `
                <div class="gallery-card" onclick="app.showProductDetails('${product.id}')" style="${isEsnaf ? 'min-width: 160px; scroll-snap-align: start;' : ''}">
                    <div class="gallery-img-wrapper">
                        <img loading="lazy" src="${product.image || (product.images && product.images[0])}" alt="${this.utils.escapeHTML(product.title)}">
                        <span class="gallery-premium-badge" style="background: ${isEsnaf ? '#14b8a6' : '#FF8F1F'}">${isEsnaf ? 'Esnaf' : 'Sponsorlu'}</span>
                        <div class="gallery-price-tag">${product.isFree ? 'Hediye' : this.utils.formatPrice(product.price) + '₺'}</div>
                    </div>
                    <div class="gallery-info">
                        <h4>${this.utils.escapeHTML(product.title)}</h4>
                        <p><i class="fas fa-location-dot"></i> ${this.utils.escapeHTML(product.city || 'Yakınında')}</p>
                    </div>
                </div>
            `;

            if (isEsnaf) {
                esnafHtml += cardHtml;
                hasEsnaf = true;
            } else {
                komsuHtml += cardHtml;
            }
        });

        wrapper.innerHTML = komsuHtml || `<div class="empty-state" style="font-size: 0.75rem; padding: 20px; color: var(--text-muted); width: 100%; text-align: center; border: 1px dashed var(--border-color); border-radius: 16px;">Mahallenizden öne çıkan ilanlar burada görünecek!</div>`;
        esnafWrapper.innerHTML = esnafHtml;
        if (esnafContainer) esnafContainer.style.display = hasEsnaf ? 'block' : 'none';
    },

    selectGalleryPackage: function (pkg, el) {
        this.state.selectedGalleryPackage = pkg;

        // UI Güncelleme
        document.querySelectorAll('.pricing-card').forEach(card => {
            card.classList.remove('selected');
        });
        el.classList.add('selected');

        // Buton metnini güncelle (opsiyonel)
        const cta = document.getElementById('gallery-info-cta');
        if (cta) cta.innerHTML = `Paketi Seç ve Devam Et (${pkg}) ÄŸÅ¸Å¡â‚¬`;
    },

    selectVitrineType: function (type, el) {
        this.state.selectedVitrineType = type;

        // UI Güncelleme
        document.querySelectorAll('.vitrine-type-card').forEach(card => {
            card.classList.remove('selected');
            card.style.border = '2px solid var(--border-color)';
            card.style.background = 'white';
        });
        el.classList.add('selected');
        if (type === 'komsu') {
            el.style.border = '2px solid #FF8F1F';
            el.style.background = '#fff7ed';
        } else {
            el.style.border = '2px solid #14b8a6';
            el.style.background = '#f0fdfa';
        }
    },

    handleGalleryReservation: function () {
        const pkg = this.state.selectedGalleryPackage || 'haftalık';
        const vitrineType = this.state.selectedVitrineType || 'komsu';
        const vitrineName = vitrineType === 'esnaf' ? 'Esnaf Vitrini' : 'Bireysel Vitrin';
        this.closeGalleryInfoModal();

        // İletişim sayfasına geç ve mesajı hazırla (kullanıcıya kolaylık)
        this.showScreen('contact');

        setTimeout(() => {
            const msgArea = document.querySelector('#contact-screen textarea');
            if (msgArea) {
                msgArea.value = `Merhaba, ilanımı ${pkg} süreyle ${vitrineName}'ne (Sponsorlu Galeri) ekletmek istiyorum. Süreç hakkında bilgi alabilir miyim?`;
            }
        }, 500);
    },

    openGalleryInfoModal: function (defaultType = 'komsu') {
        this.contactOrigin = 'gallery';
        document.getElementById('modal-gallery-info').style.display = 'flex';

        // Varsayılan türü seç (komsu veya esnaf)
        setTimeout(() => {
            const targetId = defaultType === 'esnaf' ? 'vitrine-esnaf' : 'vitrine-komsu';
            const el = document.getElementById(targetId);
            if (el) this.selectVitrineType(defaultType, el);
        }, 100);
    },

    closeGalleryInfoModal: function () {
        document.getElementById('modal-gallery-info').style.display = 'none';
    },

    // --- Live Map (Radar) Logic ---
    initLiveMap: function () {
        const mapContainer = document.getElementById('live-map');
        if (!mapContainer) return;

        // Harita zaten yüklüyse tekrar yükleme
        if (this.liveMapInstance) {
            setTimeout(() => this.liveMapInstance.invalidateSize(), 100);
            return;
        }

        const userLoc = this.state.user?.location || { lat: 41.0082, lng: 28.9784 };
        this.liveMapInstance = L.map('live-map').setView([userLoc.lat, userLoc.lng], 14);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(this.liveMapInstance);

        // İlanları haritaya bas
        this.renderMapMarkers();
    },

    renderMapMarkers: function () {
        if (!this.liveMapInstance) return;

        // Eski markerları temizle
        if (this.liveMapMarkers) {
            this.liveMapMarkers.forEach(m => this.liveMapInstance.removeLayer(m));
        }
        this.liveMapMarkers = [];

        this.state.products.forEach(p => {
            const lat = p.lat || p.location?.lat;
            const lng = p.lng || p.location?.lng;

            if (lat && lng) {
                const customIcon = L.divIcon({
                    html: `
                    <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-location-dot" style="font-size: 2.2rem; color: var(--primary); filter: drop-shadow(0 2px 5px rgba(0,0,0,0.2));"></i>
                        <div style="position: absolute; top: 12px; width: 7px; height: 7px; background: white; border-radius: 50%; box-shadow: inset 0 1px 2px rgba(0,0,0,0.2);"></div>
                    </div>
                `,
                    className: 'custom-ad-marker',
                    iconSize: [32, 32],
                    iconAnchor: [16, 32],
                    popupAnchor: [0, -32]
                });

                const marker = L.marker([lat, lng], { icon: customIcon }).addTo(this.liveMapInstance);

                const productImg = p.image || (p.images && p.images.length > 0 ? p.images[0] : 'https://via.placeholder.com/150?text=Görsel+Yok');

                marker.bindPopup(`
            <div style="font-family: inherit; padding: 5px; min-width: 160px;">
                <div style="width: 100%; height: 110px; overflow: hidden; border-radius: 12px; margin-bottom: 10px; background: var(--bg-card);">
                    <img loading="lazy" src="${productImg}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <h4 style="margin: 0; font-size: 1rem; font-weight: 800; color: var(--text-main); line-height: 1.2;">${p.title}</h4>
                <p style="margin: 6px 0 12px; font-size: 0.9rem; font-weight: 800; color: var(--primary);">${p.isFree ? 'ÜCRETSİZ ÄŸÅ¸Å’Â±' : p.price + ' TL'}</p>
                <button onclick="app.showProductDetails('${p.id}')" 
                        style="width: 100%; background: var(--primary); color: white; border: none; border-radius: 12px; padding: 10px; font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 10px rgba(0, 168, 150, 0.2);">
                    İncele
                </button>
            </div>
        `);
                this.liveMapMarkers.push(marker);
            }
        });

        // Güvenli Noktaları Haritaya Bas
        this.state.safePoints.forEach(sp => {
            const lat = sp.lat;
            const lng = sp.lng;

            if (lat && lng) {
                const isPartner = sp.isPartner === true;
                const markerColor = isPartner ? '#FFD700' : '#4CAF50'; // Partner: Altın Sarısı, Normal: Yeşil
                const iconClass = isPartner ? 'fa-star' : 'fa-shield-halved';

                const safeIcon = L.divIcon({
                    html: `
                    <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-location-dot" style="font-size: 2.2rem; color: ${markerColor}; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.3));"></i>
                        <div style="position: absolute; top: 10px; width: 14px; height: 14px; display: flex; align-items: center; justify-content: center; color: white;">
                            <i class="fas ${iconClass}" style="font-size: 0.6rem;"></i>
                        </div>
                    </div>
                `,
                    className: 'safe-point-marker',
                    iconSize: [32, 32],
                    iconAnchor: [16, 32],
                    popupAnchor: [0, -32]
                });

                const marker = L.marker([lat, lng], { icon: safeIcon }).addTo(this.liveMapInstance);

                marker.bindPopup(`
                    <div style="font-family: inherit; padding: 8px; min-width: 180px; text-align: center;">
                        <div style="font-size: 0.7rem; font-weight: 800; color: ${markerColor}; text-transform: uppercase; margin-bottom: 4px;">
                            ${isPartner ? 'Ã¢Â­Â PARTNER GÜVENLİ NOKTA' : 'ÄŸÅ¸â€ºÂ¡Ã¯Â¸Â GÜVENLİ BULUÃ…ÂMA NOKTASI'}
                        </div>
                        <h4 style="margin: 0 0 8px; font-size: 1rem; font-weight: 800; color: var(--text-main);">${this.utils.escapeHTML(sp.name)}</h4>
                        <p style="margin: 0 0 12px; font-size: 0.8rem; color: var(--text-muted);">${this.utils.escapeHTML(sp.address || 'Güvende buluşun ve alışveriş yapın.')}</p>
                        <div style="font-size: 0.75rem; background: #f8f9fa; padding: 8px; border-radius: 8px; border: 1px dashed ${markerColor}; color: #555;">
                            ${isPartner ? 'Bu işletme Yanımdaki resmi partneridir. Güvenle alışveriş yapabilirsiniz.' : 'Halka açık, güvenli bir buluşma alanıdır.'}
                        </div>
                    </div>
                `);
                this.liveMapMarkers.push(marker);
            }
        });
    },

    // --- Share (Mahalle Akışı) Logic ---
    renderShareFeed: async function () {
        const feedEl = document.getElementById('share-feed');
        if (!feedEl) return;

        try {
            // Initial setup for view mode visibility
            const mapEl = document.getElementById('share-map-view');
            const btnEl = document.getElementById('share-view-toggle-btn');
            if (this.state.shareViewMode === 'map') {
                if (mapEl) mapEl.style.display = 'block';
                if (feedEl) feedEl.style.display = 'none';
                if (btnEl) btnEl.innerHTML = '<i class="fas fa-list"></i> Liste Modu';
            } else {
                if (mapEl) mapEl.style.display = 'none';
                if (feedEl) feedEl.style.display = 'flex';
                if (btnEl) btnEl.innerHTML = '<i class="fas fa-map"></i> Harita Modu';
            }

            // Fetch needs board once
            this.renderNeighborhoodNeeds();
            this.renderAskidaEsnafVitrin();

            const snapshot = await db.collection('shares').orderBy('createdAt', 'desc').get();
            this.state.currentShares = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // --- Lazy Cleanup: Delete shares older than 24h ---
            const now = new Date();
            const expiredIds = this.state.currentShares
                .filter(data => {
                    const created = data.createdAt ? new Date(data.createdAt.seconds * 1000) : new Date();
                    const expiresAt = new Date(created.getTime() + 24 * 60 * 60 * 1000);
                    return expiresAt < now;
                })
                .map(s => s.id);

            if (expiredIds.length > 0) {
                expiredIds.forEach(id => this.deleteShare(id, true));
                // Remove from state immediately for UI consistency
                this.state.currentShares = this.state.currentShares.filter(s => !expiredIds.includes(s.id));
            }
            // ------------------------------------------------

            if (this.state.currentShares.length === 0) {
                feedEl.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-heart" style="font-size: 3rem; color: #ffebef; margin-bottom: 16px;"></i>
                        <p>Henüz mahallenizde bir paylaşım yok. İlk adımı siz atın!</p>
                    </div>`;
                return;
            }

            this.applyShareFilters();
        } catch (e) {
            console.error(e);
            this.toast('Akış yüklenemedi.', 'error');
        }

        this.injectAdsenseCode();
    },

    toggleShareViewMode: function () {
        this.state.shareViewMode = this.state.shareViewMode === 'map' ? 'list' : 'map';
        const mapEl = document.getElementById('share-map-view');
        const listEl = document.getElementById('share-feed');
        const btnEl = document.getElementById('share-view-toggle-btn');

        if (this.state.shareViewMode === 'map') {
            if (mapEl) mapEl.style.display = 'block';
            if (listEl) listEl.style.display = 'none';
            if (btnEl) btnEl.innerHTML = '<i class="fas fa-list"></i> Liste Modu';
            this.applyShareFilters();
        } else {
            if (mapEl) mapEl.style.display = 'none';
            if (listEl) listEl.style.display = 'flex';
            if (btnEl) btnEl.innerHTML = '<i class="fas fa-map"></i> Harita Modu';
            this.applyShareFilters();
        }
    },

    renderShareBubbles: function (posts) {
        const bubbleContainer = document.getElementById('share-map-bubbles');
        if (!bubbleContainer) return;

        bubbleContainer.innerHTML = '';
        posts.forEach((share, index) => {
            const bubble = document.createElement('div');
            bubble.className = 'bubble-post pop-in';

            const left = 5 + Math.random() * 85;
            const duration = 20 + Math.random() * 20;
            const delay = Math.random() * -30;

            bubble.style.left = `${left}%`;
            bubble.style.setProperty('--float-duration', `${duration}s`);
            bubble.style.animationDelay = `${delay}s, ${Math.random() * 5}s`;

            let icon = 'fa-comment';
            if (share.type === 'paylas') icon = 'fa-hand-holding-heart';
            else if (share.type === 'ihtiyac') icon = 'fa-search';
            else if (share.type === 'takas') icon = 'fa-right-left';
            if (share.category === 'Askıda') icon = 'fa-leaf';

            let tagLabel = share.type === 'paylas' ? 'Paylaş' : (share.type === 'ihtiyac' ? 'İhtiyaç' : 'Takas');
            let tagColor = share.type === 'paylas' ? '#10b981' : (share.type === 'ihtiyac' ? '#3b82f6' : '#f59e0b');
            if (share.isUrgent) tagColor = '#ef4444';

            bubble.innerHTML = `
                <div class="bubble-icon">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="bubble-content">
                    <div class="bubble-title">${this.utils.escapeHTML(share.title || share.content)}</div>
                    <div class="bubble-tag" style="color: ${tagColor}">${tagLabel}</div>
                </div>
            `;

            bubble.onclick = () => this.showShareDetailModal(share);
            bubbleContainer.appendChild(bubble);
        });

        if (posts.length === 0) {
            bubbleContainer.innerHTML = '<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: var(--text-muted); font-weight: 700; text-align: center; width: 80%;">Mahalle sakinleşmiş...<br><small>Hala bir paylaşım yok.</small></div>';
        }
    },

    showShareDetailModal: function (share) {
        const modalHtml = `
            <div id="modal-bubble-detail" class="modal-overlay" onclick="this.remove()" style="z-index: 10002;">
                <div class="modal-content game-modal pop-in" onclick="event.stopPropagation()" style="max-width: 400px; padding: 0; overflow: hidden;">
                    <div class="modal-header" style="border-radius: 28px 28px 0 0;">
                         <div style="display: flex; gap: 8px; align-items: center;">
                            <span class="share-tag tag-${share.type || 'paylas'}" style="font-size: 0.7rem;">${share.type === 'paylas' ? 'PAYLAŞIYOR' : 'İHTİYAÇ'}</span>
                            ${share.category ? `<span class="share-tag tag-category" style="font-size: 0.7rem;">${share.category}</span>` : ''}
                        </div>
                        <i class="fas fa-times" onclick="document.getElementById('modal-bubble-detail').remove()" style="cursor: pointer; color: var(--text-muted); font-size: 1.4rem;"></i>
                    </div>
                    <div class="game-modal-body" style="padding: 24px;">
                        <div class="share-body" style="margin-bottom: 20px;">
                            <p style="font-size: 1.1rem; color: var(--text-main); line-height: 1.6; font-weight: 800; font-family: 'Outfit', sans-serif;">
                                ${this.utils.escapeHTML(share.content)}
                            </p>
                        </div>
                        <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 16px; border-top: 2px dashed #e2e8f0;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div class="share-user-avatar" style="width: 40px; height: 40px; background: #e0f2f1; border-radius: 12px; display: flex; align-items: center; justify-content: center; border: 2px solid #b2dfdb;">
                                    <i class="fas fa-user" style="color: var(--primary);"></i>
                                </div>
                                <div style="display: flex; flex-direction: column;">
                                    <span class="share-username" style="font-weight: 800; color: var(--text-main); font-size: 0.95rem;">${this.utils.escapeHTML(share.userName || 'Komşu')}</span>
                                    <span style="font-size: 0.7rem; color: var(--text-muted);">Mahalle Sakini</span>
                                </div>
                            </div>
                            <button onclick="app.openChat(null, '${share.ownerPhone}', '${this.utils.escapeHTML(share.userName)}'); document.getElementById('modal-bubble-detail').remove();" class="game-btn-primary" style="padding: 10px 16px; font-size: 0.85rem; min-height: unset; width: auto;">
                                <i class="fas fa-comment"></i> Mesaj
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    injectAdsenseCode: function () {
        const container = document.getElementById('adsense-container');
        if (!container) return;

        if (!this.state.adsenseCode || this.state.adsenseCode.trim() === '') {
            container.style.display = 'none';
            return;
        }

        // Eğer kod zaten enjekte edilmişse ve değişmemişse tekrar yapma (sonsuz döngü/titremeyi önlemek için)
        const currentCodeHash = btoa(unescape(encodeURIComponent(this.state.adsenseCode)));
        if (container.getAttribute('data-last-code') === currentCodeHash) {
            container.style.display = 'block';
            return;
        }

        try {
            container.innerHTML = this.state.adsenseCode;

            // Script taglarını manuel olarak çalıştır (AdSense için gerekli)
            const scripts = container.querySelectorAll('script');
            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
                if (oldScript.innerHTML) {
                    newScript.appendChild(document.createTextNode(oldScript.innerHTML));
                }
                oldScript.parentNode.replaceChild(newScript, oldScript);
            });

            container.setAttribute('data-last-code', currentCodeHash);
            container.style.display = 'block';
        } catch (e) {
            console.error('AdSense injection error:', e);
            container.style.display = 'none';
        }
    },

    applyShareFilters: function () {
        const feedEl = document.getElementById('share-feed');
        if (!feedEl || !this.state.currentShares) return;

        let filtered = this.state.currentShares;
        const now = new Date();

        // 1. Expiry Check (24h)
        filtered = filtered.filter(data => {
            const created = data.createdAt ? new Date(data.createdAt.seconds * 1000) : new Date();
            const expiresAt = new Date(created.getTime() + 24 * 60 * 60 * 1000);
            return expiresAt > now;
        });

        // 2. Filter by Category
        if (this.state.shareCategoryFilter) {
            filtered = filtered.filter(s => s.category === this.state.shareCategoryFilter);
        }

        // 3. Filter by Type
        if (this.state.shareFilter === 'urgent') {
            filtered = filtered.filter(s => s.isUrgent);
        } else if (this.state.shareFilter === 'favorites') {
            filtered = filtered.filter(s => s.savedBy && s.savedBy.includes(this.state.user?.uid));
        } else if (this.state.shareFilter === 'nearby') {
            const uLat = this.state.user?.location?.lat || 41.0082;
            const uLng = this.state.user?.location?.lng || 28.9784;
            const uUid = this.state.user?.uid || null;

            filtered = filtered.filter(s => {
                // Her zaman kendi paylaşımlarını gör
                if (uUid && s.userId === uUid) return true;

                // Eğer paylaşımın konumu yoksa veya (0,0) ise, ama şehri eşleşiyorsa göster
                if (!s.lat || !s.lng || (s.lat === 0 && s.lng === 0)) {
                    const uCity = this.state.user ? (this.state.user.cityName || this.state.user.city) : '';
                    if (s.city && uCity && s.city === uCity) return true;
                    return false;
                }

                const dist = this.utils.calculateDistance(
                    uLat,
                    uLng,
                    s.lat,
                    s.lng
                );
                return dist <= 10; // 10km limit for "nearby"
            });
        } else if (this.state.shareFilter === 'suggested') {
            filtered = filtered.filter(s => {
                if (s.userId === this.state.user?.uid) return false;
                const dist = this.utils.calculateDistance(
                    this.state.user?.location?.lat || 0,
                    this.state.user?.location?.lng || 0,
                    s.lat || 0,
                    s.lng || 0
                );
                // Suggested: within 2km OR has 5+ thanks
                return dist <= 2 || (s.thanks && s.thanks >= 5);
            });
        }

        // 4. Default Fallback for Nearby: If nearby is empty, show all but sorted by distance
        if (this.state.shareFilter === 'nearby' && filtered.length === 0 && this.state.currentShares.length > 0) {
            filtered = [...this.state.currentShares];
            // No more filtering, just sorting by distance (already done implicitly by showing all, but let's be explicit if needed)
        }

        if (filtered.length === 0) {
            if (this.state.shareViewMode === 'map') {
                this.renderShareBubbles([]);
            } else {
                feedEl.innerHTML = '<div class="empty-state"><p>Bu filtreye uygun paylaşım bulunamadı.</p></div>';
            }
            return;
        }

        if (this.state.shareViewMode === 'map') {
            this.renderShareBubbles(filtered);
            return;
        }

        let html = '<div class="share-posts">';
        filtered.forEach(data => {
            const created = data.createdAt ? new Date(data.createdAt.seconds * 1000) : new Date();
            const dist = this.utils.calculateDistance(
                this.state.user?.location?.lat || 0,
                this.state.user?.location?.lng || 0,
                data.lat || 0,
                data.lng || 0
            );

            const time = created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            let tagClass = `tag-${data.type || 'paylas'}`;
            let tagLabel = data.type === 'paylas' ? 'PAYLAÃ…ÂIYOR' : (data.type === 'ihtiyac' ? 'ARAÃ…ÂTIRIYOR' : 'TAKAS EDİYOR');
            if (data.isUrgent) {
                tagClass = 'tag-urgent';
                tagLabel = 'ÄŸÅ¸â€Â´ ACİL İHTİYAÇ';
            }

            if (data.category === 'Askıda') {
                tagClass = 'tag-askida';
                tagLabel = 'ÄŸÅ¸Â§Âº ASKIDA';
            }

            const isSaved = data.savedBy && data.savedBy.includes(this.state.user?.uid);
            const thanksCount = data.thanks || 0;

            // Countdown Calculation (24h)
            const expiresAt = new Date(created.getTime() + 24 * 60 * 60 * 1000);
            const diffMs = expiresAt - now;
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

            let timeLeftStr = diffHours > 0 ? `Son ${diffHours} saat` : `Son ${diffMins} dakika`;
            if (diffMs < 0) timeLeftStr = "Süresi doldu";

            html += `
                <div class="share-card ${data.isUrgent ? 'urgent-border' : ''}">
                    <div class="share-card-header">
                        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                            <span class="share-tag ${tagClass}">${tagLabel}</span>
                            ${data.category ? `<span class="share-tag tag-category">${data.category}</span>` : ''}
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="share-countdown"><i class="fas fa-hourglass-half"></i> ${timeLeftStr}</span>
                            ${(data.userId === this.state.user?.uid) ? `
                                <div onclick="app.deleteShare('${data.id}')" style="color: #ef4444; cursor: pointer; font-size: 0.8rem; opacity: 0.6;">
                                    <i class="fas fa-trash"></i>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="share-body">
                        ${(data.category === 'Askıda') ? `
                            <div onclick="app.showSellerProfile('${data.esnafId}')" style="background: rgba(245, 158, 11, 0.1); padding: 12px; border-radius: 12px; border: 1px dashed #f59e0b; margin-bottom: 12px; display: flex; align-items: center; gap: 10px; cursor: pointer;">
                                <i class="fas fa-store" style="color: #f59e0b; font-size: 1.2rem;"></i>
                                <div>
                                    <div style="font-size: 0.75rem; color: #b45309; font-weight: 800; text-transform: uppercase;">Teslim Noktası</div>
                                    <div style="font-weight: 800; color: var(--text-main);">${this.utils.escapeHTML(data.esnafName || 'Mahalle Esnafı')}</div>
                                </div>
                            </div>
                        ` : ''}
                        ${(data.title && data.title !== data.content && !data.content.startsWith(data.title.replace('...', ''))) ? `
                            <div style="font-weight: 800; font-size: 1.05rem; margin-bottom: 6px; color: var(--text-main);">
                                ${this.utils.escapeHTML(data.title)}
                            </div>
                        ` : ''}
                        <p style="font-size: 0.9rem; color: var(--text-main); line-height: 1.5; font-weight: 700">
                            ${this.utils.escapeHTML(data.content)}
                        </p>
                        ${(data.category === 'Askıda' && data.status === 'reserved') ? `
                            <div style="margin-top: 10px; background: #f1f5f9; color: #475569; padding: 8px 12px; border-radius: 8px; font-size: 0.8rem; font-weight: 700; display: inline-flex; align-items: center; gap: 6px;">
                                <i class="fas fa-handshake"></i> Rezerve Edildi
                            </div>
                            
                            ${(this.state.user?.uid === data.reservedBy || this.state.user?.uid === data.esnafId) ? `
                                <div style="margin-top: 10px; background: var(--secondary); border: 2px dashed var(--primary); padding: 10px; border-radius: 12px; text-align: center;">
                                    <div style="font-size: 0.65rem; font-weight: 800; color: var(--primary); margin-bottom: 2px;">ALIM KODU</div>
                                    <div style="font-size: 1.5rem; font-weight: 900; letter-spacing: 2px; color: var(--text-main);">${data.claimCode || '----'}</div>
                                    <div style="font-size: 0.6rem; color: var(--text-muted); margin-top: 2px;">${this.state.user?.uid === data.esnafId ? 'Bu kodu rezervasyon sahibinden isteyin' : 'Bu kodu esnafa gösterin'}</div>
                                </div>
                            ` : ''}
                        ` : ''}
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 4px; margin: 12px 0;">
                        <div style="display: flex; align-items: center; gap: 12px; font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">
                            <span><i class="fas fa-location-dot"></i> ${this.utils.formatDistance(dist)}</span>
                            <span><i class="fas fa-clock"></i> Bugün, ${time}</span>
                        </div>
                        ${(data.city || data.locationText) ? `
                            <div style="font-size: 0.75rem; color: var(--primary); font-weight: 700; display: flex; align-items: center; gap: 4px;">
                                <i class="fas fa-map-pin"></i> ${data.neighborhood ? data.neighborhood + ', ' : ''}${data.district || ''}
                            </div>
                        ` : ''}
                    </div>

                    <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--border-color);">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div class="share-user-avatar">
                                <i class="fas fa-user"></i>
                            </div>
                            <div style="display: flex; flex-direction: column;">
                                <span class="share-username">${this.utils.escapeHTML(data.userName || 'Komşu')}</span>
                                <span style="font-size: 0.65rem; color: var(--primary); font-weight: 700;">ÄŸÅ¸Å’Å¸ ${thanksCount} teşekkür</span>
                            </div>
                        </div>
                        
                        <div style="display: flex; gap: 8px;">
                            ${(data.userId !== this.state.user?.uid) ? `
                                ${(data.category === 'Askıda') ? `
                                    ${(data.status === 'available') ? `
                                        <button onclick="app.reserveAskida('${data.id}')" class="filter-chip active" style="padding: 6px 16px; border-radius: 12px; background: #f59e0b; color: white; border-color: #f59e0b;">
                                            <i class="fas fa-hand-holding-heart"></i> İhtiyacım Var
                                        </button>
                                    ` : `
                                        <button class="filter-chip" style="padding: 6px 16px; border-radius: 12px; opacity: 0.5; cursor: not-allowed;" disabled>
                                            <i class="fas fa-lock"></i> Rezerve Edildi
                                        </button>
                                    `}
                                ` : `
                                    <button onclick="app.thankShare('${data.id}')" class="filter-chip" style="padding: 6px 12px; border-radius: 12px;">
                                        <i class="fas fa-heart" style="color: #ef4444;"></i> Teşekkür
                                    </button>
                                    <button onclick="app.openChat(null, '${data.ownerPhone}', '${this.utils.escapeHTML(data.userName)}')" class="filter-chip active" style="padding: 6px 12px; border-radius: 12px;">
                                        <i class="fas fa-comment"></i> Mesaj
                                    </button>
                                `}
                            ` : ''}
                            <button onclick="app.saveShare('${data.id}', ${!isSaved})" class="filter-chip" style="padding: 6px 12px; border-radius: 12px; border: 1px solid ${isSaved ? 'var(--primary)' : 'var(--border-color)'};">
                                <i class="${isSaved ? 'fas' : 'far'} fa-bookmark" style="color: ${isSaved ? 'var(--primary)' : 'inherit'};"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        feedEl.innerHTML = html;
    },

    setShareFilter: function (filter, el) {
        this.state.shareFilter = filter;
        this.state.shareCategoryFilter = null; // Clear category filter when type filter is clicked
        document.querySelectorAll('.share-filter-scroll .filter-chip').forEach(c => c.classList.remove('active'));
        if (el) el.classList.add('active');
        this.applyShareFilters();
    },

    toggleShareCategorySelect: function () {
        const categories = ['Eşya', 'Ödünç', 'Hizmet', 'Duyuru', 'Eğitim', 'Askıda', 'Diğer'];
        const current = this.state.shareCategoryFilter || 'Kategori';

        let options = categories.map(cat =>
            `<div onclick="app.setShareCategoryFilter('${cat}')" class="category-option ${cat === current ? 'active' : ''}">${cat}</div>`
        ).join('');

        // Clear filter option
        options = `<div onclick="app.setShareCategoryFilter(null)" class="category-option text-danger" style="color: #e11d48 !important; border-bottom: 2px dashed #f1f5f9; margin-bottom: 8px;">Filtreyi Temizle</div>` + options;

        const modalHtml = `
            <div id="category-filter-modal" class="modal-overlay" onclick="this.remove()" style="z-index: 10005;">
                <div class="modal-content game-modal pop-in" onclick="event.stopPropagation()" style="max-width: 350px;">
                    <div class="modal-header">
                        <h3 class="game-modal-title">Kategori Seçin</h3>
                        <i class="fas fa-times" onclick="document.getElementById('category-filter-modal').remove()" style="cursor: pointer; font-size: 1.4rem; color: var(--text-muted);"></i>
                    </div>
                    <div class="game-modal-body" style="padding: 15px;">
                        <div class="category-select-list">
                            ${options}
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    setShareCategoryFilter: function (category) {
        this.state.shareCategoryFilter = category;
        const modal = document.getElementById('category-filter-modal');
        if (modal) modal.remove();

        const catBtn = document.querySelector('[onclick="app.toggleShareCategorySelect()"]');
        if (catBtn) {
            if (category) {
                catBtn.classList.add('active');
                catBtn.innerHTML = `<i class="fas fa-layer-group"></i> ${category}`;
            } else {
                catBtn.classList.remove('active');
                catBtn.innerHTML = `<i class="fas fa-layer-group"></i> Kategori`;
            }
        }

        this.applyShareFilters();
    },

    showShareModal: function (type) {
        if (!this.checkAuth('Paylaşım yapmak için lütfen giriş yapın.')) return;

        this.state.currentShareType = type;
        const modal = document.getElementById('modal-share-post');
        const titleEl = document.getElementById('share-modal-title');
        const urgentContainer = document.getElementById('share-urgent-container');
        const contentInput = document.getElementById('share-input-content');

        const titles = { paylas: 'Yeni Paylaşım ÄŸÅ¸ÂÂ', ihtiyac: 'İhtiyacım Var ÄŸÅ¸â„¢â€¹', takas: 'Takas Teklifi ÄŸÅ¸â€â€' };
        const placeholders = {
            paylas: 'Eşyanızı kısaca tanıtın (Örn: Sağlam durumda çalışma masası)',
            ihtiyac: 'Neye ihtiyacınız var? (Örn: Bebek arabasına ihtiyacım var)',
            takas: 'Ne ile neyi takas etmek istersiniz? (Örn: PS4 konsolumu Bisiklet ile takas edebilirim)'
        };

        if (titleEl) titleEl.textContent = titles[type];
        if (contentInput) {
            contentInput.placeholder = placeholders[type];
            contentInput.value = '';
        }
        if (urgentContainer) urgentContainer.style.display = (type === 'ihtiyac' ? 'flex' : 'none');

        if (modal) modal.style.display = 'flex';

        // Load locations if not loaded
        this.loadLocationData();
    },

    closeShareModal: function () {
        const modal = document.getElementById('modal-share-post');
        if (modal) modal.style.display = 'none';
    },

    loadLocationData: async function () {
        if (this.state.trProvinces) return;

        try {
            // TurkiyeAPI - Kapsamlı il/ilçe/mahalle verileri
            const resp = await fetch('https://turkiyeapi.dev/api/v1/provinces');
            if (!resp.ok) throw new Error('API hatası');
            const result = await resp.json();
            this.state.trProvinces = result.data || [];
            this.renderShareCities();
        } catch (e) {
            console.error('TurkiyeAPI error:', e);
            this.toast('Lokasyon verileri yüklenemedi, tekrar deneyin.', 'warning');
            // Fallback: Temel şehir listesi
            this.state.trProvinces = this.state.cities.map((c, i) => ({
                id: i + 1,
                name: c,
                districts: []
            }));
            this.renderShareCities();
        }
    },

    renderShareCities: function () {
        const citySelect = document.getElementById('share-select-city');
        if (!citySelect || !this.state.trProvinces) return;

        let html = '<option value="">İl Seçin</option>';
        this.state.trProvinces.forEach(province => {
            html += `<option value="${province.id}">${province.name}</option>`;
        });
        citySelect.innerHTML = html;
        document.getElementById('share-select-district').innerHTML = '<option value="">İlçe Seçin</option>';
        document.getElementById('share-select-neighborhood').innerHTML = '<option value="">Mahalle Seçin</option>';
    },

    handleShareCityChange: async function () {
        const provinceId = document.getElementById('share-select-city').value;
        const districtSelect = document.getElementById('share-select-district');
        const neighborhoodSelect = document.getElementById('share-select-neighborhood');
        if (!districtSelect) return;

        districtSelect.innerHTML = '<option value="">Yükleniyor...</option>';
        neighborhoodSelect.innerHTML = '<option value="">Mahalle Seçin</option>';

        if (provinceId === "") {
            districtSelect.innerHTML = '<option value="">İlçe Seçin</option>';
            return;
        }

        try {
            // TurkiyeAPI - İlçeleri çek
            const resp = await fetch(`https://turkiyeapi.dev/api/v1/provinces/${provinceId}`);
            if (!resp.ok) throw new Error('İlçe verisi alınamadı');
            const result = await resp.json();
            const districts = result.data?.districts || [];

            this.state.currentDistricts = districts;

            let html = '<option value="">İlçe Seçin</option>';
            districts.forEach(dist => {
                html += `<option value="${dist.id}">${dist.name}</option>`;
            });
            districtSelect.innerHTML = html;
        } catch (e) {
            console.error('District fetch error:', e);
            districtSelect.innerHTML = '<option value="">İlçe yüklenemedi</option>';
        }
    },

    handleShareDistrictChange: async function () {
        const districtId = document.getElementById('share-select-district').value;
        const neighborhoodSelect = document.getElementById('share-select-neighborhood');
        if (!neighborhoodSelect) return;

        neighborhoodSelect.innerHTML = '<option value="">Yükleniyor...</option>';

        if (districtId === "") {
            neighborhoodSelect.innerHTML = '<option value="">Mahalle Seçin</option>';
            return;
        }

        try {
            // TurkiyeAPI - Mahalleleri çek
            const resp = await fetch(`https://turkiyeapi.dev/api/v1/districts/${districtId}`);
            if (!resp.ok) throw new Error('Mahalle verisi alınamadı');
            const result = await resp.json();
            const neighborhoods = result.data?.neighborhoods || [];
            const villages = result.data?.villages || [];

            // Mahalle ve köyleri birleştir
            const allLocations = [...neighborhoods, ...villages];

            let html = '<option value="">Mahalle Seçin</option>';
            allLocations.forEach(loc => {
                html += `<option value="${loc.name}">${loc.name}</option>`;
            });
            neighborhoodSelect.innerHTML = html;
        } catch (e) {
            console.error('Neighborhood fetch error:', e);
            neighborhoodSelect.innerHTML = '<option value="">Mahalle yüklenemedi</option>';
        }
    },

    submitSharePost: async function () {
        const content = document.getElementById('share-input-content').value.trim();
        const cityEl = document.getElementById('share-select-city');
        const districtEl = document.getElementById('share-select-district');
        const neighborhoodEl = document.getElementById('share-select-neighborhood');
        const isUrgent = document.getElementById('share-input-urgent').checked;

        if (!content) return this.toast('Lütfen bir açıklama yazın.', 'error');
        if (cityEl.value === "" || districtEl.value === "" || neighborhoodEl.value === "") {
            return this.toast('Lütfen İl, İlçe ve Mahalle seçin.', 'error');
        }

        const cityName = cityEl.options[cityEl.selectedIndex].text;
        const districtName = districtEl.options[districtEl.selectedIndex].text;
        const neighborhoodName = neighborhoodEl.value;

        try {
            this.toast('Yayınlanıyor...');
            const type = this.state.currentShareType || 'paylas';
            const title = content.length > 25 ? content.substring(0, 25) + '...' : content;

            const shareObj = {
                userId: this.state.user.uid,
                userName: this.state.user.displayName,
                userPhoto: this.state.user.photoURL || '',
                title: title,
                content: content,
                type: type,
                category: 'Genel',
                isUrgent: isUrgent,
                city: cityName,
                district: districtName,
                neighborhood: neighborhoodName,
                locationText: `${neighborhoodName}, ${districtName}`,
                lat: this.state.user.location?.lat || 0,
                lng: this.state.user.location?.lng || 0,
                ownerPhone: this.state.user.phone,
                thanks: 0,
                savedBy: [],
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Eğer kullanıcının GPS konumu yoksa (0,0) yerine null bırak
            if (!shareObj.lat || !shareObj.lng || (shareObj.lat === 0 && shareObj.lng === 0)) {
                shareObj.lat = null;
                shareObj.lng = null;
            }

            await db.collection('shares').add(shareObj);
            this.toast('Başarıyla paylaşıldı! ✨', 'success');
            this.closeShareModal();
            this.renderShareFeed();
        } catch (e) {
            console.error(e);
            this.toast('Hata oluştu, tekrar deneyin.', 'error');
        }
    },

    submitShare: async function (content, type = 'paylas', isUrgent = false, title = '', category = 'Diğer', askidaData = null) {
        try {
            this.toast('Paylaşılıyor...');
            const shareObj = {
                userId: this.state.user.uid,
                userName: this.state.user.displayName,
                title: title,
                content: content,
                type: type,
                category: category,
                isUrgent: isUrgent,
                lat: this.state.user.location?.lat || 0,
                lng: this.state.user.location?.lng || 0,
                ownerPhone: this.state.user.phone,
                thanks: 0,
                savedBy: [],
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Eğer kullanıcının GPS konumu yoksa (0,0) yerine null bırak
            if (!shareObj.lat || !shareObj.lng || (shareObj.lat === 0 && shareObj.lng === 0)) {
                shareObj.lat = null;
                shareObj.lng = null;
            }

            if (category === 'Askıda' && askidaData) {
                shareObj.esnafId = askidaData.esnafId;
                shareObj.esnafName = askidaData.esnafName;
                shareObj.status = 'available';
                // 4 haneli rastgele kod üret (ASK-1234 formatında)
                shareObj.claimCode = 'ASK-' + Math.floor(1000 + Math.random() * 9000);
            }

            const docRef = await db.collection('shares').add(shareObj);

            // Yeni: Esnafa otomatik mesaj gönder
            if (category === 'Askıda' && askidaData && askidaData.esnafPhone) {
                const messageText = `Merhaba! İşletmenize "Askıda" bir ürün bıraktım: "${content}". Teslim alacak kişi için kod: ${shareObj.claimCode}. Hayırlı işler!`;
                this.sendInternalMessage(askidaData.esnafPhone, askidaData.esnafName, messageText);
            }
            this.toast('Başarıyla paylaşıldı!', 'success');
            this.renderShareFeed(); // Refresh feed
        } catch (e) {
            console.error(e);
            this.toast('Paylaşım yapılamadı.', 'error');
        }
    },

    thankShare: async function (docId) {
        if (!this.checkAuth('Teşekkür etmek için lütfen giriş yapın.')) return;
        try {
            const ref = db.collection('shares').doc(docId);
            await db.runTransaction(async (transaction) => {
                const doc = await transaction.get(ref);
                const thanks = (doc.data().thanks || 0) + 1;
                transaction.update(ref, { thanks: thanks });
            });
            this.toast('Teşekkür edildi! Ã¢ÂÂ¤Ã¯Â¸Â');
        } catch (e) { console.error(e); }
    },

    saveShare: async function (docId, state) {
        if (!this.checkAuth('Kaydetmek için lütfen giriş yapın.')) return;
        try {
            const ref = db.collection('shares').doc(docId);
            if (state) {
                await ref.update({ savedBy: firebase.firestore.FieldValue.arrayUnion(this.state.user.uid) });
                this.toast('Kaydedildi!');
            } else {
                await ref.update({ savedBy: firebase.firestore.FieldValue.arrayRemove(this.state.user.uid) });
                this.toast('Kaydedilenlerden çıkarıldı.');
            }
        } catch (e) { console.error(e); }
    },

    renderNeighborhoodNeeds: async function () {
        const needsListEl = document.getElementById('neighborhood-needs-list');
        if (!needsListEl) return;

        try {
            // Fetch top "ihtiyac" type shares to show as needs
            const snapshot = await db.collection('shares')
                .where('type', '==', 'ihtiyac')
                .orderBy('createdAt', 'desc')
                .limit(3)
                .get();

            if (snapshot.empty) {
                needsListEl.innerHTML = '<div class="need-item-placeholder">Mahallenin acil bir ihtiyacı yok. Harika!</div>';
                return;
            }

            let html = '';
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const id = doc.id;
                html += `
                    <div class="need-item">
                        <div class="need-content">
                            <span class="need-dot"></span>
                            <div style="display: flex; flex-direction: column;">
                                <span class="need-text">${data.title || data.content.substring(0, 30)}</span>
                                ${(data.district) ? `<span style="font-size: 0.65rem; color: var(--text-muted); font-weight: 700;">ÄŸÅ¸â€œÂ ${data.neighborhood ? data.neighborhood + ', ' : ''}${data.district}</span>` : ''}
                            </div>
                        </div>
                        <button class="need-action-btn" onclick="app.messageShareOwner('${id}')">
                            <i class="fas fa-hand-holding-heart"></i> Yardım Et
                        </button>
                    </div>
`;
            });
            needsListEl.innerHTML = html;
        } catch (e) {
            console.error(e);
            if (needsListEl) needsListEl.innerHTML = '<div class="need-item-placeholder">Bilgi alınamadı.</div>';
        }
    },

    renderAskidaEsnafVitrin: async function () {
        const container = document.getElementById('askida-vitrin-container');
        const listEl = document.getElementById('askida-esnaf-list');
        if (!container || !listEl) return;

        try {
            // Fetch shares where category is 'Askıda' and status is 'available'
            const snapshot = await db.collection('shares')
                .where('category', '==', 'Askıda')
                .where('status', '==', 'available')
                .orderBy('createdAt', 'desc')
                .get();

            if (snapshot.empty) {
                container.style.display = 'none';
                return;
            }

            // Map unique esnafs
            const esnafMap = new Map();
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.esnafId && !esnafMap.has(data.esnafId)) {
                    esnafMap.set(data.esnafId, {
                        id: data.esnafId,
                        name: data.esnafName || 'Mahalle Esnafı',
                        count: 1
                    });
                } else if (data.esnafId) {
                    esnafMap.get(data.esnafId).count++;
                }
            });

            if (esnafMap.size === 0) {
                container.style.display = 'none';
                return;
            }

            container.style.display = 'block';
            let html = '';

            const esnafs = Array.from(esnafMap.values());

            for (const esnaf of esnafs) {
                const userData = this.state.users.find(u => u.id === esnaf.id);
                const avatar = userData?.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(esnaf.name) + '&background=f59e0b&color=fff';

                html += `
                    <div onclick="app.showSellerProfile('${esnaf.id}')" class="askida-esnaf-card">
                        <div class="askida-avatar-container">
                            <img loading="lazy" src="${avatar}">
                            <div class="askida-badge-count">
                                ${esnaf.count}
                            </div>
                        </div>
                        <div class="askida-esnaf-name">
                            ${this.utils.escapeHTML(esnaf.name)}
                        </div>
                        <div class="askida-card-footer">
                            ${esnaf.count} Askıda
                        </div>
                    </div>
                `;
            }
            listEl.innerHTML = html;
        } catch (e) {
            console.error('Askida vitrin error:', e);
            container.style.display = 'none';
        }
    },

    deleteShare: async function (id, silent = false) {
        if (!silent && !confirm('Bu paylaşımı silmek istediğinizden emin misiniz?')) return;

        try {
            if (!silent) this.toast('Siliniyor...');
            await db.collection('shares').doc(id).delete();
            if (!silent) {
                this.toast('Paylaşım silindi.', 'success');
                // Refresh local state and feed
                this.state.currentShares = this.state.currentShares.filter(s => s.id !== id);
                this.renderShareFeed();
            }
        } catch (err) {
            if (!silent) this.toast('Silme hatası: ' + err.message, 'error');
            else console.error('Share deletion error:', err);
        }
    },

    messageShareOwner: async function (shareId) {
        try {
            const doc = await db.collection('shares').doc(shareId).get();
            if (!doc.exists) return;
            const data = doc.data();
            this.openChat(null, data.ownerPhone, data.userName);
        } catch (e) {
            console.error(e);
        }
    },

    toggleSideMenu: function () {
        const overlay = document.getElementById('side-menu-overlay');
        if (!overlay) return;

        if (overlay.classList.contains('active')) {
            overlay.classList.remove('active');
            document.body.style.overflow = 'auto';
        } else {
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
            this.renderSideMenu();
        }
    },

    toggleDarkMode: function () {
        const isDark = document.documentElement.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');

        // Update icon
        const icon = document.getElementById('dark-mode-icon-side');
        if (icon) icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
        if (icon) icon.style.color = isDark ? '#f59e0b' : 'inherit';

        this.toast(isDark ? 'Karanlık mod aktif ÄŸÅ¸Å’â„¢' : 'Açık mod aktif Ã¢Ëœâ‚¬Ã¯Â¸Â');
    },

    initDarkMode: function () {
        const savedMode = localStorage.getItem('darkMode');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        // Apply dark mode if saved or system prefers
        if (savedMode === 'enabled' || (savedMode === null && prefersDark)) {
            document.documentElement.classList.add('dark-mode');
            const icon = document.getElementById('dark-mode-icon-side');
            if (icon) {
                icon.className = 'fas fa-sun';
                icon.style.color = '#f59e0b';
            }
        }
    },

    renderSideMenu: function () {
        const nameEl = document.getElementById('side-user-name');
        const emailEl = document.getElementById('side-user-email');
        const avatarImg = document.getElementById('side-user-avatar');
        const authBtn = document.getElementById('side-menu-auth-btn');

        if (this.state.user) {
            nameEl.textContent = this.state.user.displayName || 'Kullanıcı';
            emailEl.textContent = this.state.user.email || '';
            if (this.state.user.photoURL) {
                avatarImg.innerHTML = `<img loading="lazy" src="${this.state.user.photoURL}" style="width:100%; height:100%; object-fit:cover;">`;
            } else {
                avatarImg.innerHTML = `<i class="fas fa-user-circle"></i>`;
            }
            authBtn.innerHTML = `<i class="fas fa-sign-out-alt"></i> <span>Çıkış Yap</span>`;
            authBtn.onclick = () => { this.logout(); this.toggleSideMenu(); };
        } else {
            nameEl.textContent = 'Giriş Yapılmadı';
            emailEl.textContent = 'Misafir Kullanıcı';
            avatarImg.innerHTML = `<i class="fas fa-user-circle"></i>`;
            authBtn.innerHTML = `<i class="fas fa-sign-in-alt"></i> <span>Giriş Yap / Kaydol</span>`;
            authBtn.onclick = () => { this.showScreen('login'); this.toggleSideMenu(); };
        }
    },

    togglePlusMenu: function (e) {
        if (e) e.preventDefault();
        if (!this.state.user) {
            this.showScreen('login');
            this.toast('İlan vermek için lütfen giriş yapın.', 'info');
            return;
        }

        const overlay = document.getElementById('plus-menu-overlay');
        const icon = document.getElementById('nav-add-icon');

        if (overlay && overlay.classList.contains('active')) {
            overlay.classList.remove('active');
            if (icon) icon.style.transform = 'rotate(0deg)';
        } else if (overlay) {
            overlay.classList.add('active');
            if (icon) icon.style.transform = 'rotate(45deg)';
        }
    },

    startAdFlow: function (type) {
        this.togglePlusMenu();
        // Restriction for Esnaf Ad Flow
        if (type === 'esnaf') {
            const esnafStatus = (this.state.user?.esnafStatus || 'none').toLowerCase();
            if (esnafStatus !== 'approved') {
                this.toast('Yalnızca onaylı mahalle esnafları bu alanı kullanabilir. Lütfen profilden başvuru yapın.', 'warning');
                return;
            }
        }

        this.state.currentAdFlow = type; // 'individual' or 'esnaf'
        this.showScreen('add');

        const esnafFields = document.getElementById('esnaf-extra-fields');
        if (esnafFields) {
            esnafFields.style.display = type === 'esnaf' ? 'flex' : 'none';
        }

        const standardLocContainer = document.getElementById('standard-location-container');
        if (standardLocContainer) {
            standardLocContainer.style.display = type === 'esnaf' ? 'none' : 'block';
        }

        const individualOptionsContainer = document.getElementById('individual-options-container');
        if (individualOptionsContainer) {
            individualOptionsContainer.style.display = type === 'esnaf' ? 'none' : 'block';
        }

        if (type === 'esnaf') {
            this.toast('Esnaf Fırsatı moduna geçildi. Kampanya detaylarını eklemeyi unutmayın!', 'info');
            // Reset price type to fixed
            this.setEsnafPriceType('fixed');
        }
    },

    setEsnafPriceType: function (type) {
        const hiddenInput = document.getElementById('add-esnaf-price-type');
        const btnFixed = document.getElementById('btn-fixed-price');
        const btnOffer = document.getElementById('btn-offer-price');

        if (hiddenInput) hiddenInput.value = type;

        if (type === 'fixed') {
            if (btnFixed) {
                btnFixed.style.background = '#14b8a6';
                btnFixed.style.color = 'white';
                btnFixed.style.borderColor = '#14b8a6';
            }
            if (btnOffer) {
                btnOffer.style.background = 'white';
                btnOffer.style.color = '#0d9488';
                btnOffer.style.borderColor = '#99f6e4';
            }
        } else {
            if (btnOffer) {
                btnOffer.style.background = '#14b8a6';
                btnOffer.style.color = 'white';
                btnOffer.style.borderColor = '#14b8a6';
            }
            if (btnFixed) {
                btnFixed.style.background = 'white';
                btnFixed.style.color = '#0d9488';
                btnFixed.style.borderColor = '#99f6e4';
            }
        }
    },

    updateAdQuota: function () {
        if (!this.state.user) return;
        const activeAdsCount = this.state.products.filter(p => p.ownerId === this.state.user.uid && (p.status || 'active') === 'active').length;

        // Yeni Limit Mantığı: Esnaf 30, Bireysel 50 (Eski 20 olanları da yukarı çek)
        const isEsnaf = (this.state.user.esnafStatus || 'none').toLowerCase() === 'approved';
        const defaultLimit = isEsnaf ? 30 : 50;
        const userLimit = Math.max(this.state.user.adLimit || 0, defaultLimit);

        const badge = document.getElementById('ad-quota-badge');
        const text = document.getElementById('ad-quota-text');

        if (badge && text) {
            badge.style.display = 'flex';
            text.textContent = `${activeAdsCount} / ${userLimit}`;

            // Limit dolmak üzereyse veya dolduysa renk değiştir
            if (activeAdsCount >= userLimit) {
                badge.style.background = '#FEE2E2';
                badge.style.color = '#EF4444';
            } else if (activeAdsCount >= userLimit * 0.8) {
                badge.style.background = '#FEF3C7';
                badge.style.color = '#F59E0B';
            } else {
                badge.style.background = 'var(--secondary)';
                badge.style.color = 'var(--primary)';
            }
        }

        // İlan ekleme ekranındaki il listesini yükle
        this.loadAddLocationData();
    },

    loadAddLocationData: async function () {
        const citySelect = document.getElementById('add-city');
        if (!citySelect) return;

        // İller zaten yüklüyse tekrar yükleme
        if (citySelect.options.length > 1) return;

        try {
            if (!this.state.trProvinces) {
                const resp = await fetch('https://turkiyeapi.dev/api/v1/provinces?limit=82');
                if (!resp.ok) throw new Error('API hatası: ' + resp.status);
                const result = await resp.json();
                let provinces = result.data || [];

                // Alfabetik sırala
                provinces.sort((a, b) => a.name.localeCompare(b.name, 'tr'));

                this.state.trProvinces = provinces;
            }

            let html = '<option value="">İl Seçin</option>';
            this.state.trProvinces.forEach(province => {
                html += `<option value="${province.id}">${province.name}</option>`;
            });
            citySelect.innerHTML = html;
        } catch (e) {
            console.error('Add location data error:', e);
            this.toast('İl listesi yüklenemedi, lütfen tekrar deneyin.', 'error');
        }
    },

    handleAddCityChange: async function () {
        let provinceId = document.getElementById('add-city').value;
        const districtSelect = document.getElementById('add-district');
        const neighborhoodSelect = document.getElementById('add-neighborhood');
        if (!districtSelect) return;

        districtSelect.innerHTML = '<option value="">Yükleniyor...</option>';
        neighborhoodSelect.innerHTML = '<option value="">Mahalle Seçin</option>';

        if (provinceId === "") {
            districtSelect.innerHTML = '<option value="">İlçe Seçin</option>';
            return;
        }

        // Eğer provinceId sayı değilse (il adı olarak gelmiş), ID'yi bul
        if (isNaN(parseInt(provinceId)) && this.state.trProvinces) {
            const foundProvince = this.state.trProvinces.find(p => p.name === provinceId);
            if (foundProvince) {
                provinceId = foundProvince.id;
            } else {
                console.warn('Province not found by name:', provinceId);
                districtSelect.innerHTML = '<option value="">İlçe bulunamadı</option>';
                return;
            }
        }

        try {
            const resp = await fetch(`https://turkiyeapi.dev/api/v1/provinces/${provinceId}`);
            if (!resp.ok) throw new Error('İlçe verisi alınamadı: ' + resp.status);
            const result = await resp.json();

            const provinceData = Array.isArray(result.data) ? result.data[0] : result.data;
            const districts = provinceData?.districts || [];

            this.state.addDistricts = districts;

            let html = '<option value="">İlçe Seçin</option>';
            districts.forEach(dist => {
                html += `<option value="${dist.id}">${dist.name}</option>`;
            });
            districtSelect.innerHTML = html;
        } catch (e) {
            console.error('Add district fetch error for province ' + provinceId + ':', e);
            districtSelect.innerHTML = '<option value="">İlçe yüklenemedi</option>';
            this.toast('İlçeler yüklenirken bir hata oluştu.', 'error');
        }
    },

    handleAddDistrictChange: async function () {
        const districtId = document.getElementById('add-district').value;
        const neighborhoodSelect = document.getElementById('add-neighborhood');
        if (!neighborhoodSelect) return;

        neighborhoodSelect.innerHTML = '<option value="">Yükleniyor...</option>';

        if (districtId === "") {
            neighborhoodSelect.innerHTML = '<option value="">Mahalle Seçin</option>';
            return;
        }

        try {
            const resp = await fetch(`https://turkiyeapi.dev/api/v1/districts/${districtId}`);
            if (!resp.ok) throw new Error('Mahalle verisi alınamadı: ' + resp.status);
            const result = await resp.json();

            const districtData = Array.isArray(result.data) ? result.data[0] : result.data;
            const neighborhoods = districtData?.neighborhoods || [];
            const villages = districtData?.villages || [];

            const allLocations = [...neighborhoods, ...villages];
            allLocations.sort((a, b) => a.name.localeCompare(b.name, 'tr'));

            let html = '<option value="">Mahalle Seçin</option>';
            allLocations.forEach(loc => {
                html += `<option value="${loc.name}">${loc.name}</option>`;
            });
            neighborhoodSelect.innerHTML = html;
        } catch (e) {
            console.error('Add neighborhood fetch error for district ' + districtId + ':', e);
            neighborhoodSelect.innerHTML = '<option value="">Mahalle yüklenemedi</option>';
            this.toast('Mahalleler yüklenirken bir hata oluştu.', 'error');
        }
    },

    // Merkezi yetkilendirme kontrolü
    checkAuth: function (message = 'Bu özelliği kullanmak için lütfen kayıt olun veya giriş yapın.') {
        if (!this.state.user) {
            this.showScreen('login');
            this.switchLoginTab('register');
            this.toast(message, 'info');
            return false;
        }
        return true;
    },

    showLanding: function () {
        // "Ana Sayfa" tıklandığında her zaman home ekranına git
        this.showScreen('home');

        // Sidebar içeriğini sıfırla
        document.getElementById('sidebar-static-content').style.display = 'block';
        document.getElementById('sidebar-dynamic-content').style.display = 'none';

        // Menü aktifliğini güncelle
        document.querySelectorAll('.nav-item-h').forEach(el => el.classList.remove('active'));
        document.querySelector('.nav-item-h:nth-child(1)').classList.add('active');
    },

    showStaticPage: function (pageId) {
        const isDesktop = window.innerWidth > 1024;
        const dynamicArea = document.getElementById('sidebar-dynamic-content');
        const staticArea = document.getElementById('sidebar-static-content');

        if (isDesktop) {
            // Masaüstünde sol tarafta aç
            staticArea.style.display = 'none';
            dynamicArea.style.display = 'block';

            // İçeriği index.html'den çek veya oluştur
            const sourceScreen = document.getElementById(`screen-${pageId}`);
            if (sourceScreen) {
                dynamicArea.innerHTML = `
                    <div class="sidebar-back-btn" onclick="app.showLanding()">
                        <i class="fas fa-arrow-left"></i> Geri Dön
                    </div>
                    ${sourceScreen.innerHTML}
                `;
            }

            // Menü aktifliğini güncelle
            document.querySelectorAll('.nav-item-h').forEach(el => el.classList.remove('active'));
            if (pageId === 'about') document.querySelector('.nav-item-h:nth-child(2)').classList.add('active');
            if (pageId === 'contact') document.querySelector('.nav-item-h:nth-child(3)').classList.add('active');
        } else {
            // Mobilde normal ekran olarak aç
            this.showScreen(pageId);
        }
    },

    updateSustainabilityStats: async function () {
        const freeAds = this.state.products.filter(p => p.isFree);
        document.getElementById('total-gifts').innerText = freeAds.length;
        document.getElementById('total-co2').innerText = (freeAds.length * 5) + "kg";
    },

    submitContactForm: async function () {
        const name = document.getElementById('contact-name').value.trim();
        const email = document.getElementById('contact-email').value.trim();
        const message = document.getElementById('contact-message').value.trim();

        if (!name || !email || !message) return this.toast('Lütfen tüm alanları doldurun.', 'error');

        try {
            this.showLoader();
            const adNumber = document.getElementById('contact-ad-number').value.trim();
            const messageData = {
                name,
                email,
                message,
                type: this.contactOrigin === 'gallery' ? 'gallery_application' : 'general',
                status: 'unread',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (this.contactOrigin === 'gallery') {
                if (adNumber) messageData.adNumber = adNumber;
                messageData.selectedPackage = this.state.selectedGalleryPackage || 'haftalık';
                messageData.vitrineType = this.state.selectedVitrineType || 'komsu';
            }

            await db.collection('contact_messages').add(messageData);

            if (this.contactOrigin === 'gallery') {
                this.toast('Galeri başvurunuz alındı! En kısa sürede size ulaşacağız. ÄŸÅ¸Å¡â‚¬', 'success');
            } else {
                this.toast('Mesajınız başarıyla gönderildi! ✨', 'success');
            }
            this.contactOrigin = null;
            this.state.selectedGalleryPackage = 'haftalık';
            this.state.selectedVitrineType = 'komsu'; // Reset to default
            document.getElementById('contact-name').value = '';
            document.getElementById('contact-email').value = '';
            document.getElementById('contact-message').value = '';
            document.getElementById('contact-ad-number').value = '';
            this.showScreen('home');
        } catch (err) {
            this.toast('Hata: ' + err.message, 'error');
        } finally {
            this.hideLoader();
        }
    },

    // --- Askıda Ürün Mantığı ---
    handleCategorySelection: function (content, type, isUrgent, title, category) {
        if (category === 'Askıda') {
            this.showEsnafPickerForAskida(content, type, isUrgent, title, category);
        } else {
            this.submitShare(content, type, isUrgent, title, category);
        }
    },

    showEsnafPickerForAskida: async function (content, type, isUrgent, title, category) {
        try {
            this.showLoader();
            const snapshot = await db.collection('users').where('esnafStatus', '==', 'approved').get();
            const approvedEsnaf = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));

            if (approvedEsnaf.length === 0) {
                this.toast('Ã…Âu an mahallenizde onaylı esnaf bulunmuyor. Lütfen başka bir kategori seçin.', 'info');
                return;
            }


            const optionsHtml = approvedEsnaf.map(esnaf => `
            <div onclick="app.submitShare('${this.utils.escapeHTML(content)}', '${type}', ${isUrgent}, '${this.utils.escapeHTML(title)}', '${category}', {esnafId: '${esnaf.uid}', esnafName: '${this.utils.escapeHTML(esnaf.shopName || esnaf.displayName)}', esnafPhone: '${esnaf.phone}'}); document.getElementById('esnaf-picker').remove();" 
                 class="category-option" style="display: flex; align-items: center; gap: 10px; padding: 15px; border-bottom: 1px solid var(--border-color);">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--secondary); display: flex; align-items: center; justify-content: center; color: var(--primary);">
                    <i class="fas fa-store"></i>
                </div>
                <div>
                    <div style="font-weight: 800; font-size: 1rem;">${this.utils.escapeHTML(esnaf.shopName || esnaf.displayName)}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${this.utils.escapeHTML(esnaf.address || 'Mahalle Esnafı')}</div>
                </div>
            </div>
        `).join('');

            const modalHtml = `
            <div id="esnaf-picker" class="modal-overlay" onclick="this.remove()" style="z-index: 10005;">
                <div class="modal-content game-modal pop-in" onclick="event.stopPropagation()" style="max-width: 450px;">
                    <div class="modal-header">
                        <h3 class="game-modal-title">Esnafı Seçin</h3>
                        <i class="fas fa-times" onclick="document.getElementById('esnaf-picker').remove()" style="cursor: pointer; font-size: 1.4rem; color: var(--text-muted);"></i>
                    </div>
                    <div class="game-modal-body" style="max-height: 450px; overflow-y: auto; padding: 20px;">
                        <p style="font-size: 0.9rem; color: var(--text-muted); font-weight: 600; margin-bottom: 15px;">Ürünü bırakacağınız mahallemizin esnafını seçin.</p>
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            ${optionsHtml}
                        </div>
                    </div>
                </div>
            </div>
        `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        } catch (e) {
            console.error(e);
            this.toast('Esnaf listesi alınamadı.', 'error');
        } finally {
            this.hideLoader();
        }
    },





    reserveAskida: async function (shareId) {
        if (!this.checkAuth('Rezerve etmek için lütfen giriş yapın.')) return;

        if (!confirm('Bu ürünü rezerve etmek istediğinizden emin misiniz? Lütfen sadece gerçekten ihtiyacınız varsa rezerve edin.')) return;

        try {
            this.showLoader();
            const ref = db.collection('shares').doc(shareId);
            const doc = await ref.get();
            if (!doc.exists) return;
            const data = doc.data();

            if (data.status === 'reserved') {
                this.toast('Bu ürün daha önce rezerve edilmiş.', 'info');
                return;
            }

            await ref.update({
                status: 'reserved',
                reservedBy: this.state.user.uid,
                reservedByName: this.state.user.displayName,
                reservedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            this.toast('Ürün rezerve edildi! Kodunuz: ' + (data.claimCode || 'Hata'), 'success');

            // Kullanıcıya kodu gösteren özel bir modal
            const modalHtml = `
                <div id="claim-code-modal" class="modal-overlay" onclick="this.remove()" style="z-index: 10005;">
                    <div class="modal-content game-modal pop-in" onclick="event.stopPropagation()" style="max-width: 400px; text-align: center;">
                        <div class="game-modal-body" style="padding: 30px;">
                            <div style="width: 80px; height: 80px; background: #ecfdf5; border-radius: 24px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; border: 3px solid #10b981;">
                                <i class="fas fa-check" style="font-size: 2.5rem; color: #10b981;"></i>
                            </div>
                            <h2 class="game-modal-title" style="margin-bottom: 15px;">Rezervasyon Başarılı!</h2>
                            <p style="color: var(--text-muted); font-weight: 600; margin-bottom: 25px;">
                                Gidip <b>${this.utils.escapeHTML(data.esnafName)}</b> dükkanından alabilirsiniz.
                            </p>
                            <div style="background: #f8fafc; padding: 25px; border-radius: 24px; border: 3px dashed var(--primary); margin-bottom: 25px; position: relative;">
                                <span style="font-size: 0.8rem; font-weight: 800; color: var(--primary); letter-spacing: 1px; text-transform: uppercase;">Teslimat Kodunuz</span>
                                <div style="font-size: 2.5rem; font-weight: 900; color: var(--text-main); letter-spacing: 6px; margin-top: 8px;">${data.claimCode}</div>
                            </div>
                            <button onclick="document.getElementById('claim-code-modal').remove()" class="game-btn-primary">Harika, Anladım!</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            this.renderShareFeed();
        } catch (e) {
            console.error(e);
            this.toast('Rezervasyon yapılamadı.', 'error');
        } finally {
            this.hideLoader();
        }
    },



    handleSearch: function (val) {
        this.state.filters.searchQuery = val;
        this.renderProducts();
    },



    openFilterSheet: function () {
        document.getElementById('modal-filters').style.display = 'block';
        document.body.style.overflow = 'hidden';

        // Mevcut filtreleri yükle
        document.getElementById('filter-min-price').value = this.state.filters.minPrice || '';
        document.getElementById('filter-max-price').value = this.state.filters.maxPrice || '';
        document.getElementById('filter-condition').value = this.state.filters.condition || 'all';
        document.getElementById('filter-city').value = this.state.filters.city || 'all';
        document.getElementById('filter-distance').value = this.state.filters.maxDistance === 'all' ? 251 : this.state.filters.maxDistance;
        this.updateDistanceLabel(this.state.filters.maxDistance === 'all' ? 251 : this.state.filters.maxDistance);

        // Yeni checkboxlar
        document.getElementById('filter-only-free').checked = this.state.filters.onlyFree;
        document.getElementById('filter-only-bulk').checked = this.state.filters.onlyBulk;
        document.getElementById('filter-only-service').checked = this.state.filters.onlyService;
    },




    updateDistanceLabel: function (val) {
        const label = document.getElementById('distance-value');
        if (!label) return;
        if (parseInt(val) >= 251) {
            label.innerText = 'Sınırsız (Her Yer)';
        } else {
            label.innerText = val + ' km';
        }
    },



    handleFilterCityChange: function (city) {
        if (city === 'all') {
            const distInput = document.getElementById('filter-distance');
            if (distInput) {
                distInput.value = 251;
                this.updateDistanceLabel(251);
            }
        }
    },

    closeFilterSheet: function () {
        document.getElementById('modal-filters').style.display = 'none';
        document.body.style.overflow = 'auto';
    },

    applyFilters: function () {
        const min = document.getElementById('filter-min-price').value;
        const max = document.getElementById('filter-max-price').value;
        const condition = document.getElementById('filter-condition').value;
        const city = document.getElementById('filter-city').value;
        const distance = document.getElementById('filter-distance').value;

        const onlyFree = document.getElementById('filter-only-free').checked;
        const onlyBulk = document.getElementById('filter-only-bulk').checked;
        const onlyService = document.getElementById('filter-only-service').checked;

        this.state.filters.minPrice = min ? parseInt(min) : null;
        this.state.filters.maxPrice = max ? parseInt(max) : null;
        this.state.filters.condition = condition;
        this.state.filters.city = city;
        this.state.filters.maxDistance = (parseInt(distance) >= 251) ? 'all' : parseInt(distance);

        this.state.filters.onlyFree = onlyFree;
        this.state.filters.onlyBulk = onlyBulk;
        this.state.filters.onlyService = onlyService;

        this.renderProducts();
        this.closeFilterSheet();
        this.toast('Filtreler uygulandı. ✨');
    },

    clearFilters: function () {
        this.state.filters = { searchQuery: '', category: 'all', minPrice: null, maxPrice: null, condition: 'all', city: 'all', maxDistance: 'all', onlyFree: false, onlyBulk: false, onlyService: false };

        // UI'ı temizle
        const minPrice = document.getElementById('filter-min-price');
        const maxPrice = document.getElementById('filter-max-price');
        const condition = document.getElementById('filter-condition');
        const city = document.getElementById('filter-city');
        const distance = document.getElementById('filter-distance');
        const free = document.getElementById('filter-only-free');
        const bulk = document.getElementById('filter-only-bulk');
        const service = document.getElementById('filter-only-service');

        if (minPrice) minPrice.value = '';
        if (maxPrice) maxPrice.value = '';
        if (condition) condition.value = 'all';
        if (city) city.value = 'all';
        if (distance) distance.value = '251';
        if (free) free.checked = false;
        if (bulk) bulk.checked = false;
        if (service) service.checked = false;
        this.updateDistanceLabel(251);

        this.renderProducts();
        this.closeFilterSheet();
        this.toast('Filtreler temizlendi.');
    },

    renderCityOptions: function () {
        // NOT: add-city artık loadAddLocationData tarafından API'den yükleniyor (il ID'leri ile)
        const editCity = document.getElementById('edit-city');
        const filterCity = document.getElementById('filter-city');
        const options = this.state.cities.map(city => `<option value="${city}">${city}</option>`).join('');
        if (editCity) editCity.innerHTML += options;
        if (filterCity) filterCity.innerHTML += options;
    },

    renderSkeletons: function () {
        const container = document.getElementById('product-list');
        if (!container) return;

        const skeletonHtml = `
            <div class="product-card" style="border: 1px solid var(--border-color); border-radius: var(--radius-md); overflow: hidden; background: white;">
                <div class="skeleton" style="height: 150px; border-radius: 0;"></div>
                <div style="padding: 12px;">
                    <div class="skeleton" style="height: 14px; width: 70%; margin-bottom: 8px;"></div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <div class="skeleton" style="height: 16px; width: 30%;"></div>
                        <div class="skeleton" style="height: 12px; width: 20%;"></div>
                    </div>
                    <div class="skeleton" style="height: 12px; width: 50%;"></div>
                </div>
            </div>
        `.repeat(6);

        container.innerHTML = skeletonHtml;
    },

    // --- Renderers ---
    renderCategoryBar: function () {
        const bar = document.getElementById('category-bar');
        if (!bar) return;

        // Ana sayfadaki barda ilk 6 kategoriyi göster + "Daha Fazla" butonu
        const previewCats = this.state.categories.slice(0, 7);
        let html = previewCats.map(cat => `
            <div class="category-pill ${this.state.filters.category === cat.id ? 'active' : ''}" 
                 onclick="app.setCategory('${cat.id}')">
                <i class="fas ${cat.icon}"></i>
                <span>${cat.name}</span>
            </div>
        `).join('');

        html += `
            <div class="category-pill" onclick="app.openCategoryModal()" style="border-style: dashed; opacity: 0.8;">
                <i class="fas fa-plus"></i>
                <span>Daha Fazla</span>
            </div>
        `;

        bar.innerHTML = html;
    },

    openCategoryModal: function () {
        const modal = document.getElementById('modal-categories');
        const grid = document.getElementById('category-grid-full');
        if (!modal || !grid) return;

        grid.innerHTML = this.state.categories.map(cat => `
            <div class="category-item" onclick="app.selectCategoryAndClose('${cat.id}')">
                <i class="fas ${cat.icon}"></i>
                <span>${cat.name}</span>
            </div>
        `).join('');

        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    },

    closeCategoryModal: function () {
        document.getElementById('modal-categories').style.display = 'none';
        document.body.style.overflow = 'auto';
    },

    selectCategoryAndClose: function (catId) {
        this.setCategory(catId);
        this.closeCategoryModal();
    },

    setCategory: function (catId) {
        this.state.filters.category = catId;
        this.renderCategoryBar();
        this.renderProducts();
    },

    renderProducts: function () {
        const container = document.getElementById('product-list');
        if (!container) return;

        const userLat = this.state.user?.location?.lat || 0;
        const userLng = this.state.user?.location?.lng || 0;

        // Performans Optimizasyonu: Mesafeleri memoize et
        if (!this._distanceCache) this._distanceCache = {};
        const cacheKey = `${userLat}_${userLng}_${this.state.products.length}`;

        const productsWithDistance = this.state.products.map(p => {
            const pKey = `${p.id}_${p.lat}_${p.lng}`;
            if (this._distanceCache[cacheKey] && this._distanceCache[cacheKey][pKey]) {
                return { ...p, _calculatedDistance: this._distanceCache[cacheKey][pKey] };
            }
            const dist = this.utils.calculateDistance(userLat, userLng, p.lat, p.lng);
            if (!this._distanceCache[cacheKey]) this._distanceCache[cacheKey] = {};
            this._distanceCache[cacheKey][pKey] = dist;
            return { ...p, _calculatedDistance: dist };
        });

        const filtered = productsWithDistance.filter(p => {
            // Ürün satıldı mı kontrolü
            const isSold = p.status === 'sold' || this.state.offers.some(o => o.productId === p.id && o.status === 'accepted');
            const searchLower = this.state.filters.searchQuery.toLowerCase();
            const matchesSearch = p.title.toLowerCase().includes(searchLower) || (p.adNumber && p.adNumber.toString().includes(searchLower));
            const matchesCategory = this.state.filters.category === 'all' || p.category === this.state.filters.category;

            const exp = p.expiresAt?.toDate ? p.expiresAt.toDate() : (p.expiresAt ? new Date(p.expiresAt) : null);
            const isExpired = exp ? (exp < new Date()) : false;
            const isOwner = p.ownerId === this.state.user?.uid || (p.ownerPhone && p.ownerPhone === this.state.user?.phone);

            const f = this.state.filters;
            const matchesPrice = (!f.minPrice || p.price >= f.minPrice) && (!f.maxPrice || p.price <= f.maxPrice);
            const matchesCondition = f.condition === 'all' || p.condition === f.condition;

            let matchesLocation = true;
            if (f.city !== 'all') {
                matchesLocation = (p.city === f.city);
            } else if (f.maxDistance !== 'all') {
                matchesLocation = p._calculatedDistance <= f.maxDistance;
            }

            const matchesOnlyFree = !f.onlyFree || p.isFree === true;
            const matchesOnlyBulk = !f.onlyBulk || p.isBulk === true;
            const matchesOnlyService = !f.onlyService || p.isService === true;

            return !isSold && (!isExpired || isOwner) && matchesSearch && matchesCategory && matchesPrice && matchesCondition && matchesLocation && matchesOnlyFree && matchesOnlyBulk && matchesOnlyService;
        }).sort((a, b) => a._calculatedDistance - b._calculatedDistance);

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
                        <p style="font-weight: 600;">Aramanızla eşleşen ürün bulunamadı.</p>
                        <button onclick="app.clearFilters()" style="background: none; border: 1px solid var(--primary); color: var(--primary); padding: 8px 16px; border-radius: 20px; margin-top: 12px; font-size: 0.8rem; font-weight: 700;">Filtreleri Temizle</button>
                    </div>
                `;
            }
            return;
        }
        // Kullanıcının en az bir 'Paylaş' ilanı olup olmadığını kontrol et
        const userHasSharingAd = this.state.user ? this.state.products.some(p => p.ownerId === this.state.user.uid && p.isFree === true) : false;

        container.innerHTML = filtered.map(p => {
            const d = p._calculatedDistance;

            // Bu ürün için yapılan tüm teklifleri bul ve en yükseğini al
            const productOffers = this.state.offers.filter(o => o.productId === p.id);
            let lastOffer = null;
            if (productOffers.length > 0) {
                // Rakamları sayıya çevirerek karşılaştır
                lastOffer = Math.max(...productOffers.map(o => parseInt(o.price) || parseInt(o.amount) || 0));
            }

            const expiresAtResult = (() => {
                if (p.expiresAt) return p.expiresAt.toDate ? p.expiresAt.toDate() : (p.expiresAt ? new Date(p.expiresAt) : null);
                if (p.createdAt) {
                    const created = p.createdAt.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
                    return new Date(created.getTime() + 24 * 60 * 60 * 1000);
                }
                return null;
            })();

            const expiresAt = expiresAtResult;
            let countdownText = '';
            let countdownColor = 'var(--accent)';
            if (expiresAt) {
                const now = new Date();
                const diff = expiresAt - now;
                if (diff > 0) {
                    const hours = Math.floor(diff / (1000 * 60 * 60));
                    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    countdownText = `${hours}sa ${mins}dk kaldı`;
                } else {
                    countdownText = `Süresi Doldu`;
                    countdownColor = 'var(--text-muted)';
                }
            }

            let badgesHtml = '<div class="card-badge-container">';

            if (lastOffer) {
                badgesHtml += `
                    <div class="card-badge badge-teklif">
                        <i class="fas fa-hand-holding-dollar"></i>
                        <span>${lastOffer}₺ Teklif</span>
                    </div>
                `;
            }

            if (p.isFree && !p.isSwap) {
                badgesHtml += `
                    <div class="card-badge badge-paylas">
                        <i class="fas fa-leaf"></i>
                        <span>Paylaş</span>
                    </div>
                `;
            } else if (p.isService) {
                badgesHtml += `
                    <div class="card-badge badge-usta">
                        <i class="fas fa-tools"></i>
                        <span>${p.category === 'Durağan Hizmetler' ? 'Usta' : 'Hizmet'}</span>
                    </div>
                `;
            } else if (p.initialPrice && p.price < p.initialPrice) {
                const discount = Math.round(((p.initialPrice - p.price) / p.initialPrice) * 100);
                badgesHtml += `
                    <div class="card-badge badge-indirim">
                        <i class="fas fa-fire"></i>
                        <span>-%${discount}</span>
                    </div>
                `;
            }

            if (p.isBulk) {
                badgesHtml += `
                    <div class="card-badge badge-toplu">
                        <i class="fas fa-boxes-stacked"></i>
                        <span>Toplu</span>
                    </div>
                `;
            }

            if (p.isSwap) {
                badgesHtml += `
                    <div class="card-badge badge-takas">
                        <i class="fas fa-sync-alt"></i>
                        <span>Takas</span>
                    </div>
                `;
            }

            if (p.isEsnaf) {
                badgesHtml += `
                    <div class="card-badge badge-esnaf">
                        <i class="fas fa-store"></i>
                        <span>ESNAF</span>
                    </div>
                `;

                if (p.dealType && p.dealType !== 'none') {
                    const labels = { indirim: 'İNDİRİM', serisonu: 'SERİ SONU', teshir: 'TEÃ…ÂHİR' };
                    badgesHtml += `
                        <div class="card-badge badge-${p.dealType}">
                            <i class="fas fa-tag"></i>
                            <span>${labels[p.dealType]}</span>
                        </div>
                    `;
                }
            }

            badgesHtml += '</div>';

            return `
                <div class="product-card compact" onclick="${p.isFree && !userHasSharingAd ? `app.toast('Bu hizmetten faydalanmak için siz de paylaş ilanı yüklemelisiniz.', 'info')` : `app.showProductDetails('${p.id}')`}" style="${expiresAt && (expiresAt - new Date() < 0) ? 'opacity: 0.6;' : ''}">
                    ${badgesHtml}
                    
                    <div class="compact-img-wrapper" style="background-image: url('${p.image}');">
                    </div>

                    <div class="compact-info-row">
                        <span class="compact-ad-no">İlan No: #${p.adNumber || (p.id ? p.id.substring(0, 8).toUpperCase() : '---')}</span>
                        <span class="compact-time" style="color: ${countdownColor};">
                            <i class="fas ${countdownText === 'Süresi Doldu' ? 'fa-times-circle' : 'fa-clock'}"></i> ${countdownText}
                        </span>
                    </div>

                    <div class="compact-body">
                        <h3 class="compact-title">${this.utils.escapeHTML(p.title)}</h3>
                        
                        <div class="compact-price-section">
                            <span class="compact-price">
                                ${p.isEsnaf && p.oldPrice > 0 ? `<span class="old-price" style="font-size: 0.75rem; margin-right: 4px;">${this.utils.formatPrice(p.oldPrice)}₺</span>` : ''}
                                ${p.isFree ? 'Ücretsiz' : (p.isNegotiable ? 'Teklif Alınır' : this.utils.formatPrice(p.price) + '₺')}
                            </span>
                        </div>

                        <div class="compact-footer">
                        <div class="compact-meta">
                            <i class="fas fa-location-dot"></i>
                            <span>${this.utils.escapeHTML(p.neighborhood || '')}${p.neighborhood && p.district ? ', ' : ''}${this.utils.escapeHTML(p.district || '')}${(p.neighborhood || p.district) ? ' / ' : ''}${this.utils.escapeHTML(p.city || 'Belirtilmemiştir')}</span>
                            <span style="margin-left: auto; color: var(--primary);">${this.utils.formatDistance(d)}</span>
                        </div>
                        
                        <div class="compact-meta" onclick="event.stopPropagation(); app.showSellerProfile('${p.ownerId}')" style="cursor: pointer;">
                            <i class="fas ${p.isEsnaf ? 'fa-store' : 'fa-user-circle'}"></i>
                            <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; font-weight: 700; color: var(--primary);">
                                ${p.isEsnaf ? this.utils.escapeHTML(p.shopName || p.ownerName) : this.utils.escapeHTML(p.ownerName)}
                            </span>
                        </div>

                         ${p.isFree ? `
                            <button class="compact-offer-btn" onclick="event.stopPropagation(); if(${userHasSharingAd}){ app.showProductDetails('${p.id}') } else { app.utils.toast('Bu hizmetten faydalanmak için siz de paylaş ilanı yüklemelisiniz.', 'info'); }">İhtiyacım Var</button>
                        ` : (p.isNegotiable !== false ? `
                            <button class="compact-offer-btn">Teklif Ver</button>
                        ` : `
                            <button class="compact-offer-btn" style="background: var(--secondary); color: var(--primary); border: 1px solid var(--primary);">İncele</button>
                        `)}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        this.renderEsnafCarousel();
    },

    renderEsnafCarousel: function () {
        const container = document.getElementById('esnaf-carousel');
        const section = document.getElementById('esnaf-carousel-container');
        if (!container || !section) return;

        const esnafAds = this.state.products.filter(p => {
            const isSold = p.status === 'sold' || this.state.offers.some(o => o.productId === p.id && o.status === 'accepted');
            const exp = (() => {
                if (p.expiresAt) return p.expiresAt.toDate ? p.expiresAt.toDate() : new Date(p.expiresAt);
                if (p.createdAt) {
                    const created = p.createdAt.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
                    return new Date(created.getTime() + 24 * 60 * 60 * 1000);
                }
                return null;
            })();
            const isExpired = exp ? (exp < new Date()) : false;
            const isOwner = p.ownerId === this.state.user?.uid || (p.ownerPhone && p.ownerPhone === this.state.user?.phone);

            return p.isEsnaf === true && (p.status || 'active') === 'active' && !isSold && (!isExpired || isOwner);
        });

        if (esnafAds.length === 0) {
            section.style.display = 'none';
            return;
        }

        // Kullanıcının en az bir 'Paylaş' ilanı olup olmadığını kontrol et
        const userHasSharingAd = this.state.user ? this.state.products.some(p => p.ownerId === this.state.user.uid && p.isFree === true) : false;

        section.style.display = 'block';
        container.innerHTML = esnafAds.map(p => {
            const d = this.utils.calculateDistance(this.state.user?.location.lat || 0, this.state.user?.location.lng || 0, p.lat, p.lng);

            // Teklif ve süre bilgilerini hesapla
            const productOffers = this.state.offers.filter(o => o.productId === p.id);
            let lastOffer = productOffers.length > 0 ? Math.max(...productOffers.map(o => parseInt(o.price) || parseInt(o.amount) || 0)) : null;

            const expiresAt = p.expiresAt?.toDate ? p.expiresAt.toDate() : (p.expiresAt ? new Date(p.expiresAt) : null);
            let countdownText = 'Süresi Doldu';
            let countdownColor = 'var(--text-muted)';

            if (expiresAt) {
                const now = new Date();
                const diff = expiresAt - now;
                if (diff > 0) {
                    const hours = Math.floor(diff / (1000 * 60 * 60));
                    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    countdownText = `${hours}sa ${mins}dk kaldı`;
                    countdownColor = 'var(--accent)';
                }
            }

            // Etiketleri hazırla
            let badgesHtml = '<div class="card-badge-container">';
            if (lastOffer) {
                badgesHtml += `<div class="card-badge badge-teklif"><i class="fas fa-hand-holding-dollar"></i><span>${lastOffer}₺ Teklif</span></div>`;
            }
            if (p.isEsnaf) {
                badgesHtml += `<div class="card-badge badge-esnaf"><i class="fas fa-store"></i><span>ESNAF</span></div>`;
                if (p.dealType && p.dealType !== 'none') {
                    const labels = { indirim: 'İNDİRİM', serisonu: 'SERİ SONU', teshir: 'TEÃ…ÂHİR' };
                    badgesHtml += `<div class="card-badge badge-${p.dealType}"><i class="fas fa-tag"></i><span>${labels[p.dealType]}</span></div>`;
                }
            }
            if (p.initialPrice && p.price < p.initialPrice) {
                const discount = Math.round(((p.initialPrice - p.price) / p.initialPrice) * 100);
                badgesHtml += `<div class="card-badge badge-indirim"><i class="fas fa-fire"></i><span>-%${discount}</span></div>`;
            }
            badgesHtml += '</div>';

            return `
                <div class="product-card compact" onclick="${p.isFree && !userHasSharingAd ? `app.utils.toast('Bu hizmetten faydalanmak için siz de paylaş ilanı yüklemelisiniz.', 'info')` : `app.showProductDetails('${p.id}')`}" style="min-width: 200px; width: 200px; scroll-snap-align: start; flex-shrink: 0; margin-bottom: 20px;">
                    ${badgesHtml}
                    <div class="compact-img-wrapper" style="background-image: url('${p.image}'); height: 130px;"></div>

                    <div class="compact-info-row">
                        <span class="compact-ad-no">İlan No: #${p.adNumber || (p.id ? p.id.substring(0, 8).toUpperCase() : '---')}</span>
                        <span class="compact-time" style="color: ${countdownColor};">
                            <i class="fas ${countdownText === 'Süresi Doldu' ? 'fa-times-circle' : 'fa-clock'}"></i> ${countdownText}
                        </span>
                    </div>

                    <div class="compact-body">
                        <h3 class="compact-title">${this.utils.escapeHTML(p.title)}</h3>
                        <div class="compact-price-section">
                            <span class="compact-price">
                                ${p.oldPrice > 0 ? `<span class="old-price" style="font-size: 0.7rem;">${p.oldPrice}₺</span>` : ''}
                                ${p.price}₺
                            </span>
                        </div>
                        <div class="compact-footer">
                            <div class="compact-meta">
                                <i class="fas fa-location-dot"></i>
                                <span>${this.utils.escapeHTML(p.city || '')} ${this.utils.escapeHTML(p.district || '')}</span>
                                <span style="margin-left: auto; color: var(--primary);">${this.utils.formatDistance(d)}</span>
                            </div>
                            <div class="compact-meta" onclick="event.stopPropagation(); app.showSellerProfile('${p.ownerId}')" style="cursor: pointer;">
                            <i class="fas fa-store"></i>
                            <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; font-weight: 700; color: var(--primary);">${this.utils.escapeHTML(p.shopName || p.ownerName)}</span>
                        </div>

                            ${p.isFree ? `
                                <button class="compact-offer-btn" onclick="event.stopPropagation(); if(${userHasSharingAd}){ app.showProductDetails('${p.id}') } else { app.toast('Bu hizmetten faydalanmak için siz de paylaş ilanı yüklemelisiniz.', 'info'); }">İhtiyacım Var</button>
                            ` : (p.isNegotiable !== false ? `
                                <button class="compact-offer-btn">Teklif Ver</button>
                            ` : `
                                <button class="compact-offer-btn" style="background: var(--secondary); color: var(--primary); border: 1px solid var(--primary);">İncele</button>
                            `)}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
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

    // --- Rating Logic ---
    openRatingModal: function (offerId) {
        this.currentRatingOfferId = offerId;
        this.currentRatingValue = 0;
        this.state.selectedRatingTags = [];
        document.getElementById('modal-rating').style.display = 'block';
        document.getElementById('rating-comment').value = '';
        this.setRatingValue(0);
        this.renderRatingTags();
    },

    closeRatingModal: function () {
        document.getElementById('modal-rating').style.display = 'none';
        this.currentRatingOfferId = null;
    },

    setRatingValue: function (val) {
        this.currentRatingValue = val;
        document.querySelectorAll('.star-btn').forEach((star, idx) => {
            if (idx < val) {
                star.className = 'fas fa-star star-btn';
            } else {
                star.className = 'far fa-star star-btn';
            }
        });
    },

    submitRating: async function () {
        if (!this.currentRatingValue) return this.toast('Lütfen bir puan seçin.', 'error');

        const offer = this.state.offers.find(o => o.id === this.currentRatingOfferId);
        if (!offer) return;

        try {
            this.toast('Puanınız gönderiliyor...');
            // 1. Puanı kaydet
            await db.collection('ratings').add({
                offerId: offer.id,
                productId: offer.productId,
                buyerId: this.state.user.uid,
                buyerPhone: this.state.user.phone,
                sellerId: offer.sellerId,
                sellerPhone: offer.sellerPhone,
                score: this.currentRatingValue,
                tags: this.state.selectedRatingTags,
                comment: document.getElementById('rating-comment').value,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // 2. Teklifi güncellendi (puanlandı) olarak işaretle
            await db.collection('offers').doc(offer.id).update({
                isRated: true
            });

            this.toast('Değerlendirmeniz için teşekkürler! ⭐');
            this.closeRatingModal();
        } catch (err) {
            this.toast('Hata: ' + err.message, 'error');
        }
    },

    toggleRatingTag: function (tag) {
        const idx = this.state.selectedRatingTags.indexOf(tag);
        if (idx > -1) {
            this.state.selectedRatingTags.splice(idx, 1);
        } else {
            this.state.selectedRatingTags.push(tag);
        }
        this.renderRatingTags();
    },

    renderRatingTags: function () {
        const container = document.getElementById('rating-tags-container');
        if (!container) return;

        const tags = container.querySelectorAll('.rating-tag');
        tags.forEach(tagEl => {
            const tagName = tagEl.innerText;
            if (this.state.selectedRatingTags.includes(tagName)) {
                tagEl.classList.add('active');
            } else {
                tagEl.classList.remove('active');
            }
        });
    },

    // --- Actions ---
    switchLoginTab: function (tab) {
        const loginForm = document.getElementById('form-login');
        const registerForm = document.getElementById('form-register');
        const loginTab = document.getElementById('tab-login');
        const registerTab = document.getElementById('tab-register');

        if (tab === 'login') {
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
            loginTab.classList.add('active');
            registerTab.classList.remove('active');
        } else {
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
            loginTab.classList.remove('active');
            registerTab.classList.add('active');
        }

        // Reset Auth state
        this.confirmationResult = null;
        document.getElementById('btn-login-action').innerHTML = 'Giriş Yap <i class="fas fa-sign-in-alt" style="margin-left: 8px;"></i>';
        document.getElementById('btn-register-action').innerHTML = 'Hesap Oluştur <i class="fas fa-user-plus" style="margin-left: 8px;"></i>';
    },

    handleLogin: async function () {
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value.trim();

        if (!email) return this.toast('Lütfen e-posta adresinizi girin.', 'error');
        if (password.length < 8) return this.toast('Lütfen şifrenizi girin.', 'error');

        try {
            this.toast('Giriş yapılıyor...', 'info');
            await auth.signInWithEmailAndPassword(email, password);
            this.toast('Giriş başarılı! ✨', 'success');
            setTimeout(() => window.location.reload(), 1500);
        } catch (err) {
            let msg = 'Giriş hatası. Lütfen bilgilerini kontrol edin.';
            if (err.code === 'auth/user-not-found') msg = 'Bu e-posta ile kayıtlı bir hesap bulunamadı.';
            if (err.code === 'auth/wrong-password') msg = 'Hatalı şifre! Lütfen tekrar deneyin.';
            this.toast(msg, 'error');
        }
    },

    handleForgotPassword: async function () {
        const email = document.getElementById('login-email').value.trim();

        if (!email) {
            return this.toast('Lütfen şifresini sıfırlamak istediğiniz e-posta adresini girin.', 'error');
        }

        try {
            this.toast('Şifre sıfırlama bağlantısı gönderiliyor...', 'info');
            await auth.sendPasswordResetEmail(email);
            this.toast('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi! Lütfen gelen kutunuzu kontrol edin. 📧', 'success');
        } catch (err) {
            let msg = 'Şifre sıfırlama hatası: ' + err.message;
            if (err.code === 'auth/user-not-found') msg = 'Bu e-posta ile kayıtlı bir hesap bulunamadı.';
            if (err.code === 'auth/invalid-email') msg = 'Geçersiz bir e-posta adresi girdiniz.';
            this.toast(msg, 'error');
        }
    },

    handleRegister: async function () {
        const name = document.getElementById('register-name').value.trim();
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value.trim();

        if (!name || name.length < 2) return this.toast('Lütfen adınızı soyadınızı girin.', 'error');
        if (!email) return this.toast('Lütfen geçerli bir e-posta girin.', 'error');

        // Strong Password Regex: En az 8 karakter, 1 Büyük, 1 Küçük, 1 Sayı, 1 Özel Karakter (Geniş kapsamlı)
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!"#$%&'()*+,\-./:;<=>?@[\\\]^_{|}~])[A-Za-z\d!"#$%&'()*+,\-./:;<=>?@[\\\]^_{|}~]{8,}$/;
        if (!passwordRegex.test(password)) {
            return this.toast('Şifre en az 8 karakter, bir büyük harf, bir küçük harf, bir sayı ve bir özel karakter içermelidir.', 'error');
        }

        try {
            this.toast('Hesap oluşturuluyor...', 'info');
            localStorage.setItem('lastLoginName', name);
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // E-posta doğrulama maili gönder
            try {
                const actionCodeSettings = {
                    url: window.location.origin,
                    handleCodeInApp: false
                };
                await user.sendEmailVerification(actionCodeSettings);
                this.toast('Hesabınız oluşturuldu! Lütfen e-postanızı (ve spam kutusunu) kontrol edin. 📧', 'success');
                setTimeout(() => window.location.reload(), 1500);
            } catch (mailErr) {
                console.error("Verification email error:", mailErr);
                this.toast('Hesap oluşturuldu ama doğrulama maili gönderilemedi. Lütfen profilden tekrar gönderin.', 'warning');
            }
        } catch (err) {
            let msg = 'Kayıt hatası: ' + err.message;
            if (err.code === 'auth/email-already-in-use') msg = 'Bu e-posta zaten kullanımda!';
            this.toast(msg, 'error');
        }
    },

    handleGoogleLogin: async function () {
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            this.toast('Google ile bağlanılıyor...', 'info');
            await auth.signInWithPopup(provider);
            this.toast('Google ile giriş başarılı! ✨', 'success');
            setTimeout(() => window.location.reload(), 1500);
        } catch (err) {
            this.toast('Google girişi başarısız: ' + err.message, 'error');
        }
    },

    logout: function () {
        // Tüm aktif Firebase dinleyicilerini temizle (Memory leak önleme)
        Object.values(this.subscriptions).forEach(unsub => unsub && unsub());
        this.subscriptions = {};

        auth.signOut().then(() => this.toast('Çıkış yapıldı.'));
    },

    togglePasswordVisibility: function (inputId, iconEl) {
        const input = document.getElementById(inputId);
        if (!input || !iconEl) return;

        if (input.type === 'password') {
            input.type = 'text';
            iconEl.classList.remove('fa-eye');
            iconEl.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            iconEl.classList.remove('fa-eye-slash');
            iconEl.classList.add('fa-eye');
        }
    },

    updatePasswordStrength: function () {
        const password = document.getElementById('register-password').value;
        const meter = document.getElementById('strength-bar');
        const text = document.getElementById('strength-text');

        if (!password) {
            meter.className = 'password-strength-bar';
            text.innerText = '';
            return;
        }

        let strength = 0;
        if (password.length >= 8) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[!"#$%&'()*+,\-./:;<=>?@[\\\]^_{|}~]/.test(password)) strength++;

        const levels = [
            { class: 'strength-weak', text: 'Çok Zayıf', textClass: 'text-weak' },
            { class: 'strength-weak', text: 'Zayıf', textClass: 'text-weak' },
            { class: 'strength-medium', text: 'Orta', textClass: 'text-medium' },
            { class: 'strength-good', text: 'Güçlü', textClass: 'text-good' },
            { class: 'strength-strong', text: 'Çok Güçlü', textClass: 'text-strong' }
        ];

        const level = levels[strength];
        meter.className = 'password-strength-bar ' + level.class;
        text.innerText = 'Şifre Gücü: ' + level.text;
        text.className = 'password-strength-text ' + level.textClass;
    },

    openTermsModal: function () {
        document.getElementById('modal-terms').style.display = 'block';
        document.body.style.overflow = 'hidden';
    },

    closeTermsModal: function () {
        document.getElementById('modal-terms').style.display = 'none';
        document.body.style.overflow = 'auto';
    },

    openReportModal: function (productId) {
        if (!this.checkAuth('İlan şikayet etmek için lütfen giriş yapın.')) return;
        this.currentReportProductId = productId;
        document.getElementById('modal-report').style.display = 'block';
        const noteEl = document.getElementById('report-note');
        if (noteEl) noteEl.value = '';
        document.body.style.overflow = 'hidden';
    },

    closeReportModal: function () {
        document.getElementById('modal-report').style.display = 'none';
        document.body.style.overflow = 'auto';
    },

    submitReport: async function () {
        const reason = document.querySelector('input[name="report-reason"]:checked')?.value;
        if (!reason) return this.toast('Lütfen bir sebep seçin.', 'error');

        try {
            this.toast('Şikayetiniz gönderiliyor...', 'info');
            await db.collection('reports').add({
                productId: this.currentReportProductId,
                userId: this.state.user?.uid || 'anonymous',
                userPhone: this.state.user?.phone || 'unknown',
                reason: reason,
                note: document.getElementById('report-note')?.value || '',
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            this.toast('Şikayetiniz alındı, incelenecektir. Teşekkürler.', 'success');
            this.closeReportModal();
        } catch (err) {
            this.toast('Hata: ' + err.message, 'error');
        }
    },

    deleteAccount: async function () {
        if (!this.state.user) return this.toast('Giriş yapmalısınız.', 'error');

        const confirmed = confirm('DİKKAT: Hesabınız ve tüm verileriniz (ilanlar, profil, mesajlar) kalıcı olarak silinecektir. Bu işlemin geri dönüşü yoktur.\n\nEmin misiniz?');
        if (!confirmed) return;

        try {
            this.toast('Hesabınız siliniyor...');
            const userId = this.state.user.uid;

            // 1. Kullanıcının tüm ilanlarını sil
            const productsSnap = await db.collection('products').where('ownerId', '==', userId).get();
            const batch = db.batch();
            productsSnap.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();

            // 2. Kullanıcının tüm tekliflerini sil (Yapılan teklifler)
            const offersSnap = await db.collection('offers').where('fromId', '==', userId).get();
            const offerBatch = db.batch();
            offersSnap.docs.forEach(doc => {
                offerBatch.delete(doc.ref);
            });
            await offerBatch.commit();

            // 3. Kullanıcının aldığı teklifleri sil? (İlanları silindiği için ilana bağlı teklifler havada kalabilir)
            // Not: Genelde ilana bağlı bir yapı olduğu için ilanlar silinince bunlar da geçersiz olur.

            // 4. Kullanıcı profil dokümanını sil
            await db.collection('users').doc(userId).delete();

            // 5. Oturumu kapat ve temizle
            localStorage.clear();
            await auth.signOut();
            this.toast('Hesabınız başarıyla silindi. Hoşçakalın.');

            // Uygulamayı yenileyerek giriş ekranına yönlendir
            setTimeout(() => window.location.reload(), 2000);

        } catch (err) {
            console.error("Delete account error:", err);
            this.toast('Hata: ' + err.message, 'error');
        }
    },

    handleCategoryChange: function () {
        const categorySelect = document.getElementById('add-category');
        const conditionSelect = document.getElementById('add-condition');
        if (!categorySelect || !conditionSelect) return;

        if (categorySelect.value === 'surpriz-paket') {
            conditionSelect.value = 'gun-sonu-tazeligi';
            this.toast('Sürpriz Paket kategorisi seçildi! 🌱', 'success');
        } else if (categorySelect.value === 'Askıda') {
            const priceInput = document.getElementById('add-price');
            if (priceInput) {
                priceInput.value = '0';
                priceInput.disabled = true;
                this.toast('Askıda Ürün kategorisinde fiyat 0 TL olarak belirlenir. 🤝', 'info');
            }
            conditionSelect.disabled = true;
            conditionSelect.style.opacity = '0.5';
        } else {
            const priceInput = document.getElementById('add-price');
            const adType = document.getElementById('add-ad-type')?.value || 'normal';
            if (priceInput && adType !== 'free' && adType !== 'negotiable' && adType !== 'swap') {
                priceInput.disabled = false;
            }
            if (conditionSelect) {
                conditionSelect.disabled = false;
                conditionSelect.style.opacity = '1';
                if (conditionSelect.value === 'gun-sonu-tazeligi') conditionSelect.value = 'Az kullanılmış';
            }
        }
    },

    handleAdTypeChange: function () {
        const adType = document.getElementById('add-ad-type')?.value || 'normal';
        const priceInput = document.getElementById('add-price');
        const priceLabel = document.getElementById('label-add-price');
        const conditionSelect = document.getElementById('add-condition');
        const priceContainer = document.getElementById('container-add-price');
        const takasContainer = document.getElementById('container-add-takas-wish');

        // Reset fields
        if (priceInput) {
            priceInput.disabled = false;
            priceInput.value = '';
        }
        if (priceContainer) priceContainer.style.display = 'block';
        if (takasContainer) takasContainer.style.display = 'none';
        if (priceLabel) priceLabel.innerText = 'Fiyat (₺)';
        if (conditionSelect) {
            conditionSelect.disabled = false;
            conditionSelect.style.opacity = '1';
        }

        switch (adType) {
            case 'free':
                if (priceInput) { priceInput.value = 0; priceInput.disabled = true; }
                break;
            case 'negotiable':
                if (priceInput) { priceInput.value = ''; priceInput.disabled = true; }
                break;
            case 'swap':
                if (priceContainer) priceContainer.style.display = 'none';
                if (takasContainer) takasContainer.style.display = 'block';
                if (priceInput) priceInput.value = 0;
                break;
            case 'surprise':
                if (conditionSelect) {
                    conditionSelect.value = 'gun-sonu-tazeligi';
                    conditionSelect.disabled = true;
                    conditionSelect.style.opacity = '0.5';
                }
                break;
            case 'service':
                if (priceLabel) priceLabel.innerText = 'Bütçe (₺)';
                if (conditionSelect) {
                    conditionSelect.disabled = true;
                    conditionSelect.style.opacity = '0.5';
                }
                break;
        }
    },

    publishProduct: async function () {
        if (!this.state.user.phone) {
            return this.toast('İlan yayınlayabilmek için lütfen ayarlardan telefon numaranızı ekleyin. 📱', 'warning');
        }

        const title = document.getElementById('add-title').value.trim();
        const price = parseFloat(document.getElementById('add-price').value) || 0;
        const category = document.getElementById('add-category').value;
        const condition = document.getElementById('add-condition').value;
        const adType = document.getElementById('add-ad-type').value;

        const cityEl = document.getElementById('add-city');
        const districtEl = document.getElementById('add-district');
        const neighborhoodEl = document.getElementById('add-neighborhood');
        const cityName = cityEl.options[cityEl.selectedIndex]?.text || '';
        const districtName = districtEl?.options[districtEl.selectedIndex]?.text || '';
        const neighborhoodName = neighborhoodEl?.value || '';

        const isFree = adType === 'free';
        const isNegotiable = adType === 'negotiable';
        const isSwap = adType === 'swap';
        const isBulk = adType === 'bulk';
        const isService = adType === 'service';
        const isSurprise = adType === 'surprise';
        const takasWish = document.getElementById('add-takas-wish')?.value || '';

        const description = this.utils.cleanText(document.getElementById('add-description').value);
        const locationName = document.getElementById('add-location-name').value;
        const customLat = parseFloat(document.getElementById('add-lat').value);
        const customLng = parseFloat(document.getElementById('add-lng').value);

        if (!title || !category || !cityEl.value || this.state.selectedImages.length === 0 || (!isFree && !isNegotiable && !isSwap && !price)) {
            return this.toast('Lütfen tüm zorunlu alanları doldurun (Ürün Adı, Kategori, İl) ve en az bir fotoğraf ekleyin.', 'error');
        }

        // Esnaf Specific Location - Ayarlardan al
        const isEsnafAd = this.state.currentAdFlow === 'esnaf';
        const shopLocationName = this.state.user.locationName || '';
        const shopLat = this.state.user.shopLat || 0;
        const shopLng = this.state.user.shopLng || 0;

        // İlan sınırı kontrolü
        const activeAdsCount = this.state.products.filter(p => p.ownerId === this.state.user.uid && (p.status || 'active') === 'active').length;
        const isEsnaf = (this.state.user.esnafStatus || 'none').toLowerCase() === 'approved';
        const defaultLimit = isEsnaf ? 30 : 50;
        const userLimit = Math.max(this.state.user.adLimit || 0, defaultLimit);

        if (activeAdsCount >= userLimit) {
            return this.showPricingModal();
        }

        // Yasaklı kategori/içerik kontrolü (EİDS mevzuatı gereği)
        const prohibitedKeywords = ['daire', 'konut', 'emlak', 'gayrimenkul', 'arsa', 'otomobil', 'satılık ev', 'kiralık ev'];
        const checkText = (title + ' ' + description).toLowerCase();
        if (prohibitedKeywords.some(kw => checkText.includes(kw))) {
            return this.toast('EİDS mevzuatı gereği Emlak ve Otomobil ilanlarına bu platformda izin verilmemektedir. Lütfen kurallara uygun ilan verin.', 'warning');
        }

        this.toast('İlanınız yayınlanıyor...');

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        try {
            const docRef = await db.collection('products').add({
                title,
                price: (isFree || isSwap || isNegotiable) ? 0 : price,
                initialPrice: (isFree || isSwap || isNegotiable) ? 0 : price,
                isFree: !!isFree,
                isNegotiable: !!isNegotiable,
                isBulk: !!isBulk,
                isService: !!isService,
                isSurprise: !!isSurprise,
                isSwap: !!isSwap,
                takasWish: takasWish,
                description,
                category,
                city: cityName,
                district: districtName,
                neighborhood: neighborhoodName,
                locationName,
                condition,
                image: this.state.selectedImages[0],
                ownerId: this.state.user.uid,
                ownerName: this.state.user.displayName || 'İsimsiz Satıcı',
                ownerPhone: this.state.user.phone || "",
                lat: customLat || (this.state.user.location.lat + (Math.random() - 0.5) * 0.05),
                lng: customLng || (this.state.user.location.lng + (Math.random() - 0.5) * 0.05),
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                expiresAt: firebase.firestore.Timestamp.fromDate(expiresAt),
                status: 'active',
                autoRenew: document.getElementById('add-auto-renew').checked,
                isEsnaf: isEsnafAd,
                shopName: this.state.user.shopName || '',
                dealType: document.getElementById('add-deal-type').value || 'none',
                oldPrice: parseFloat(document.getElementById('add-old-price').value) || 0,
                shopLocationName: shopLocationName,
                shopLat: shopLat,
                shopLng: shopLng,
                adNumber: this.utils.generateAdNumber()
            });
            this.toast('İlanınız yayında! 24 saat sonra süresi dolacaktır.');

            // Chat context check
            if (this.state.chatContext) {
                const ctx = this.state.chatContext;
                const adLinkMsg = `Yeni bir ilan ekledim, inceleyebilirsin: ${title}`;

                // Update share feed link if exists
                if (ctx.shareId) {
                    await db.collection('shares').doc(ctx.shareId).update({
                        linkedProductId: docRef.id
                    });
                }

                // Switch back to chat to send message
                this.currentChat = { ...ctx, productId: docRef.id };
                document.getElementById('chat-input').value = adLinkMsg;
                await this.sendMessage();

                this.state.chatContext = null;
                this.showScreen('chat');
            } else {
                this.showScreen('home');
            }

            this.state.selectedImages = [];
            // Temizlik
            document.getElementById('add-title').value = '';
            document.getElementById('add-price').value = '';
            document.getElementById('add-description').value = '';
            document.getElementById('add-city').value = '';
            document.getElementById('add-district').innerHTML = '<option value="">Önce İl Seçin</option>';
            document.getElementById('add-neighborhood').innerHTML = '<option value="">Önce İlçe Seçin</option>';
            document.getElementById('add-location-name').value = '';
            document.getElementById('add-lat').value = '';
            document.getElementById('add-lng').value = '';
            document.getElementById('add-is-free').checked = false;
            document.getElementById('add-is-negotiable').checked = false;
            document.getElementById('add-is-bulk').checked = false;
            document.getElementById('add-is-service').checked = false;
            document.getElementById('add-is-swap').checked = false;
            document.getElementById('add-deal-type').value = 'none';
            document.getElementById('add-old-price').value = '';

            document.getElementById('esnaf-extra-fields').style.display = 'none';
            const standardLocContainer = document.getElementById('standard-location-container');
            if (standardLocContainer) standardLocContainer.style.display = 'block';

            const individualOptionsContainer = document.getElementById('individual-options-container');
            if (individualOptionsContainer) individualOptionsContainer.style.display = 'block';

            this.renderProducts();
            this.updateAdQuota();
            this.state.currentAdFlow = 'individual';
            document.getElementById('label-add-price').innerText = 'Fiyat (₺)';
            document.getElementById('add-price').disabled = false;
            this.showScreen('home');
        } catch (err) { this.toast('Hata: ' + err.message, 'error'); }
    },

    getShopLocation: function () {
        if (!navigator.geolocation) {
            return this.toast('Tarayıcınız konum özelliğini desteklemiyor.', 'error');
        }

        this.toast('Dükkan konumu belirleniyor...', 'info');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                document.getElementById('add-shop-lat').value = lat;
                document.getElementById('add-shop-lng').value = lng;

                fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`)
                    .then(r => r.json())
                    .then(data => {
                        const city = data.address.city || data.address.town || data.address.village || data.address.province || '';
                        const district = data.address.district || data.address.county || data.address.suburb || '';
                        const finalAddr = (district && city) ? `${district}, ${city}` : (city || district || 'Konum Belirlendi');

                        const input = document.getElementById('add-shop-location-name');
                        if (input) {
                            input.value = finalAddr;
                            this.toast('Dükkan adresi bulundu: ' + finalAddr);
                        }
                    })
                    .catch(() => this.toast('Adres çözümlenemedi ama koordinatlar alındı.', 'warning'));
            },
            () => this.toast('Konum izni reddedildi.', 'error'),
            { enableHighAccuracy: true }
        );
    },

    openGoogleMaps: function (lat, lng, label) {
        const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        window.open(url, '_blank');
    },

    getCurrentLocation: function () {
        if (!this.checkAuth('Konumunuzu kullanabilmemiz için lütfen giriş yapın.')) return;
        if (!navigator.geolocation) {
            return this.toast('Tarayıcınız konum özelliğini desteklemiyor.', 'error');
        }

        this.toast('Konumunuz belirleniyor...', 'info');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                document.getElementById('add-lat').value = lat;
                document.getElementById('add-lng').value = lng;

                // Nominatim API ile koordinatları gerçek adrese dönüştür
                fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`)
                    .then(r => r.json())
                    .then(data => {
                        const city = data.address.city || data.address.town || data.address.village || data.address.province || '';
                        const district = data.address.district || data.address.county || data.address.suburb || '';
                        const finalAddr = (district && city) ? `${district}, ${city}` : (city || district || 'Konum Belirlendi');

                        const input = document.getElementById('add-location-name');
                        if (input) {
                            input.value = finalAddr;
                            this.toast('Adres bulundu: ' + finalAddr);
                        }
                    })
                    .catch(err => {
                        console.error("Geocoding error:", err);
                        document.getElementById('add-location-name').value = 'İlan Konumu';
                        this.toast('Koordinatlar alındı, adres yazılamadı.');
                    });
            },
            (err) => {
                this.toast('Konum alınamadı: ' + err.message, 'error');
            }
        );
    },

    sendOffer: async function () {
        if (!this.checkAuth('Teklif göndermek için lütfen kayıt olun veya giriş yapın.')) return;

        const type = this.state.currentOfferType || 'cash';
        const priceInput = document.getElementById('offer-price');
        const messageInput = document.getElementById('offer-message');
        const message = messageInput ? messageInput.value.trim() : '';

        let offerData = {
            productId: this.currentProductId,
            buyerId: this.state.user.uid,
            buyerName: this.state.user.displayName || 'İsimsiz Alıcı',
            buyerPhone: this.state.user.phone || "",
            buyerEmail: this.state.user.email || "",
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            offerType: type
        };

        const prod = this.state.products.find(p => p.id === this.currentProductId);
        offerData.sellerId = prod.ownerId;
        offerData.sellerPhone = prod.ownerPhone || '';

        if (type === 'cash') {
            const price = parseInt(priceInput?.value);
            if (!price) return this.toast('Lütfen bir fiyat teklifi girin.', 'error');
            offerData.price = price;
        } else {
            if (!this.state.selectedSwapProductId) return this.toast('Lütfen takas edilecek bir ürün seçin.', 'error');
            const swapProd = this.state.products.find(p => p.id === this.state.selectedSwapProductId);
            offerData.offeredProductId = swapProd.id;
            offerData.offeredProductTitle = swapProd.title;
            offerData.offeredProductImage = swapProd.image;
            offerData.price = 0;
        }

        // Telefon numarası zorunluluğu kontrolü
        const userPhone = this.state.user?.phone;
        if (!userPhone || userPhone.trim() === "" || userPhone === "undefined") {
            return this.toast('Teklif verebilmek için lütfen ayarlarınızdan telefon numaranızı kaydedin. 📱', 'warning');
        }

        try {
            this.toast('Teklifiniz gönderiliyor...', 'info');
            await db.collection('offers').add(offerData);

            // Mesaj gönder
            const chatMessage = message || (type === 'cash'
                ? `Merhabalar, "${prod.title}" ilanınız için ${offerData.price} TL değerinde bir teklif gönderdim.`
                : `Merhabalar, "${prod.title}" ilanınız için "${offerData.offeredProductTitle}" ürünümle takas teklif ettim.`);

            this.sendInternalMessage(prod.ownerPhone, prod.ownerName || 'Satıcı', chatMessage, this.currentProductId, false);

            this.toast('Teklif Başarıyla Gönderildi! ✨', 'success');

            if (priceInput) priceInput.value = '';
            if (messageInput) messageInput.value = '';

            setTimeout(() => {
                this.closeOfferSheet();
                this.closeProductDetails();
                this.showScreen('offers');
            }, 500);

        } catch (err) {
            console.error("Offer error:", err);
            this.toast('Hata: ' + err.message, 'error');
        }
    },

    updateOfferStatus: async function (id, status) {
        try {
            await db.collection('offers').doc(id).update({ status });

            // Eğer teklif kabul edildiyse, ürünü de satıldı olarak işaretle
            if (status === 'accepted') {
                const offer = this.state.offers.find(o => o.id === id);
                if (offer && offer.productId) {
                    await db.collection('products').doc(offer.productId).update({ status: 'sold' });
                }
            }

            this.toast(status === 'accepted' ? 'Kabul edildi!' : 'Reddedildi.');
        } catch (err) { this.toast('Hata: ' + err.message, 'error'); }
    },

    hideOffer: async function (id) {
        if (!confirm('Bu teklifi listenizden kaldırmak istediğinize emin misiniz? Bu işlem geri alınamaz.')) return;

        try {
            const uid = this.state.user.uid;
            await db.collection('offers').doc(id).update({
                hiddenBy: firebase.firestore.FieldValue.arrayUnion(uid)
            });
            this.toast('Teklif listenizden kaldırıldı.');
        } catch (err) {
            console.error("Hide offer error:", err);
            this.toast('Hata: ' + err.message, 'error');
        }
    },

    toggleFavorite: async function (productId) {
        if (!this.checkAuth('Favorilere eklemek için lütfen kayıt olun veya giriş yapın.')) return;
        const isFav = this.state.favorites.includes(productId);

        // Animasyon efektini tetikle
        const heartIcons = document.querySelectorAll(`[onclick*="toggleFavorite('${productId}')"] i, #detail-heart`);
        heartIcons.forEach(icon => {
            icon.classList.add('pulse-active');
            setTimeout(() => icon.classList.remove('pulse-active'), 400);
        });

        try {
            if (isFav) {
                const snapshot = await db.collection('favorites').where('userId', '==', this.state.user.uid).where('productId', '==', productId).get();
                snapshot.forEach(doc => doc.ref.delete());
                this.toast('Favorilerden çıkarıldı.');
            } else {
                await db.collection('favorites').add({
                    userId: this.state.user.uid,
                    phone: this.state.user.phone || "",
                    productId: productId,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                this.toast('Favorilere eklendi! Ã¢ÂÂ¤Ã¯Â¸Â');
            }
        } catch (err) {
            console.error("Toggle favorite error:", err);
            this.toast('Hata: ' + err.message, 'error');
        }
    },

    deleteProduct: async function (productId) {
        if (!confirm('İlanı silmek istediğinize emin misiniz?')) return;
        try {
            await db.collection('products').doc(productId).delete();
            this.toast('İlan başarıyla silindi.');
            this.closeProductDetails();
        } catch (err) { this.toast('Hata: ' + err.message, 'error'); }
    },

    resendVerificationEmail: function () {
        if (!auth.currentUser) return;
        auth.currentUser.sendEmailVerification().then(() => {
            this.toast('Doğrulama e-postası tekrar gönderildi. ÄŸÅ¸â€œÂ§');
        }).catch(err => this.toast('Hata: ' + err.message, 'error'));
    },

    startAdFlowFromShare: function (shareId, otherPhone, otherName) {
        if (!this.checkAuth('İlan eklemek için giriş yapmalısınız.')) return;
        this.currentChat = { productId: null, otherPhone, otherName, shareId };
        this.state.chatContext = { ...this.currentChat };
        this.startAdFlow('individual');
    },
    // startAdFlowFromChat kaldırıldı (kullanıcı isteği üzerine)

    // --- Onboarding Logic ---
    nextSlide: function () {
        if (this.state.currentSlide < 3) {
            this.state.currentSlide++;
            this.updateOnboardingDots();
        } else {
            this.completeOnboarding();
        }
    },

    prevSlide: function () {
        if (this.state.currentSlide > 0) {
            this.state.currentSlide--;
            this.updateOnboardingDots();
        }
    },

    setupOnboardingSwipe: function () {
        const slider = document.querySelector('.onboarding-slider');
        if (!slider) return;

        let touchStartX = 0;
        let touchEndX = 0;

        slider.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        slider.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe();
        }, { passive: true });

        this.handleSwipe = () => {
            const swipeThreshold = 50;
            if (touchEndX < touchStartX - swipeThreshold) {
                // Sola kaydırma - Sonraki
                this.nextSlide();
            }
            if (touchEndX > touchStartX + swipeThreshold) {
                // Sağa kaydırma - Önceki
                this.prevSlide();
            }
        };
    },

    updateOnboardingDots: function () {
        const slides = document.getElementById('onboarding-slides');
        const dots = document.querySelectorAll('.dot');
        const nextBtn = document.getElementById('onboarding-next');

        if (slides) slides.style.transform = `translateX(-${this.state.currentSlide * 100}%)`;
        dots.forEach((dot, idx) => {
            dot.classList.toggle('active', idx === this.state.currentSlide);
        });

        if (nextBtn) {
            nextBtn.textContent = this.state.currentSlide === 3 ? 'Hemen Başla' : 'Sonraki';
        }
    },

    completeOnboarding: function () {
        localStorage.setItem('onboardingCompleted', 'true');
        this.showScreen('login');
    },

    // --- Utils ---
    utils: typeof utils !== 'undefined' ? utils : {},

    toast: function (m, t = 'success') {
        const c = document.getElementById('toast-container');
        if (!c) return;
        const el = document.createElement('div');
        el.className = `toast toast-${t}`;
        el.innerHTML = `<span>${m}</span>`;
        c.appendChild(el);
        setTimeout(() => el.remove(), 3000);
    },

    handleImageSelect: async function (e) {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        this.toast('Görseller işleniyor...', 'info');

        for (let f of files) {
            try {
                const base64 = await new Promise((resolve, reject) => {
                    const r = new FileReader();
                    r.onload = ev => resolve(ev.target.result);
                    r.onerror = err => reject(err);
                    r.readAsDataURL(f);
                });

                const compressed = await this.utils.compressImage(base64);
                this.state.selectedImages.push(compressed);
            } catch (err) {
                console.error("Görsel işleme hatası:", err);
            }
        }

        this.renderImagePreviews();
        this.toast('Görseller eklendi. ✨');
    },

    renderImagePreviews: function () {
        const c = document.getElementById('image-previews');
        if (!c) return;

        // Galeri butonu her zaman başta
        let html = `
            <div onclick="document.getElementById('file-input').click()"
                style="width: 80px; height: 80px; border: 2px dashed var(--border-color); border-radius: 14px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted); flex-shrink: 0; background: #F8FAFC;">
                <i class="fas fa-images" style="font-size: 1.5rem;"></i>
                <span style="font-size: 0.7rem; margin-top: 4px;">Galeri</span>
            </div>
        `;

        // Seçilen resimleri ekle
        html += this.state.selectedImages.map((s, i) => `
            <div style="position:relative;width:80px;height:80px;flex-shrink:0;">
                <img loading="lazy" src="${s}" style="width:100%;height:100%;object-fit:cover;border-radius:14px;">
                <div onclick="app.removeImage(${i})" style="position:absolute;top:-5px;right:-5px;background:var(--accent);color:white;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;cursor:pointer;box-shadow: 0 2px 6px rgba(0,0,0,0.2); border: 2px solid white;">Ãƒâ€”</div>
            </div>
        `).join('');

        c.innerHTML = html;
    },

    removeImage: function (i) { this.state.selectedImages.splice(i, 1); this.renderImagePreviews(); },

    showProductDetails: function (id) {
        this.currentProductId = id;
        const product = this.state.products.find(p => p.id === id);
        if (!product) return;
        const userLat = this.state.user?.location?.lat || 0;
        const userLng = this.state.user?.location?.lng || 0;
        const d = this.utils.calculateDistance(userLat, userLng, product.lat, product.lng);
        const productOffers = this.state.offers.filter(o => o.productId === id);
        const acceptedOffer = productOffers.find(o => o.status === 'accepted');
        const hasAcceptedOffer = !!acceptedOffer;
        const isOwner = product.ownerId === this.state.user?.uid || (product.ownerPhone && product.ownerPhone === this.state.user?.phone);
        const isBuyer = acceptedOffer && (acceptedOffer.buyerId === this.state.user?.uid || acceptedOffer.buyerPhone === this.state.user?.phone);

        const heart = document.getElementById('detail-heart');
        if (heart) {
            const isFav = this.state.favorites.includes(id);
            heart.className = isFav ? 'fas fa-heart' : 'far fa-heart';
            heart.style.color = isFav ? 'var(--accent)' : 'inherit';
        }

        const ownerActions = document.getElementById('owner-actions');
        if (ownerActions) ownerActions.style.display = isOwner ? 'flex' : 'none';

        const content = document.getElementById('detail-content');
        // Teslimat Bilgisi (Android için de geçerli)
        const deliveryIcons = {
            'kapidan': { icon: 'fa-door-open', label: 'Kapıdan Teslim' },
            'kapiya-birak': { icon: 'fa-box', label: 'Kapıya Bırak (Curb-side)' },
            'ortak-nokta': { icon: 'fa-map-pin', label: 'Ortak Nokta' },
            'gel-al': { icon: 'fa-shop', label: 'Gel-Al (Dükkan)' }
        };
        const del = deliveryIcons[product.delivery] || deliveryIcons['kapidan'];

        // Kalan Süre Hesaplama (Android için yerelleştirilmiş)
        let timeInfo = '';
        let realExp = null;
        if (product.expiresAt) {
            realExp = product.expiresAt.toDate ? product.expiresAt.toDate() : new Date(product.expiresAt);
        } else if (product.createdAt) {
            const created = product.createdAt.toDate ? product.createdAt.toDate() : new Date(product.createdAt);
            realExp = new Date(created.getTime() + 24 * 60 * 60 * 1000);
        } else {
            realExp = new Date(Date.now() + 24 * 60 * 60 * 1000);
        }

        const now = new Date();
        const diff = realExp - now;
        const oneDay = 24 * 60 * 60 * 1000;
        exp = realExp;

        if (diff > oneDay) {
            const displayDiff = diff % oneDay || oneDay;
            exp = new Date(now.getTime() + displayDiff);
        }

        if (exp) {
            const displayDiff = exp - now;
            if (displayDiff > 0) {
                const hours = Math.floor(displayDiff / (1000 * 60 * 60));
                const mins = Math.floor((displayDiff % (1000 * 60 * 60)) / (1000 * 60));
                const label = 'Kalan Süre';
                const bgColor = '#e0f2fe';
                const textColor = '#0369a1';

                timeInfo = `<div style="display: flex; align-items: center; gap: 6px; background: ${bgColor}; color: ${textColor}; padding: 6px 12px; border-radius: 12px; font-size: 0.8rem; font-weight: 700; width: fit-content;">
                            <i class="fas fa-clock"></i> ${label}: ${hours}sa ${mins}dk
                        </div>`;
            }
        }

        content.innerHTML = `
                <div onclick="app.openImagePreview('${product.image}')" 
                     style="height: 300px; background: url('${product.image}') center/cover no-repeat; cursor: zoom-in; position: relative;">
                     <div style="position: absolute; bottom: 12px; right: 12px; background: rgba(0,0,0,0.5); color: white; padding: 6px 10px; border-radius: 20px; font-size: 0.7rem; backdrop-filter: blur(4px);">
                        <i class="fas fa-search-plus"></i> Büyütmek için tıkla
                     </div>
                </div>
                <div style="padding: 16px;">
                    <!-- Modern Cohesive Card (Android Optimized) -->
                    <div style="background: white; border-radius: 28px; border: 1px solid var(--border-color); overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05); margin-bottom: 24px;">
                        
                        <!-- Header: Title and Price Badge -->
                        <div style="padding: 24px; padding-bottom: 16px; border-bottom: 1px solid #f8fafc;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
                                <div style="flex: 1;">
                                    <h2 style="font-size: 1.35rem; font-weight: 800; line-height: 1.25; color: #1e293b; margin: 0;">
                                        ${this.utils.escapeHTML(product.title)}
                                    </h2>
                                    <div style="font-size: 0.65rem; color: #94a3b8; font-weight: 700; margin-top: 6px; letter-spacing: 0.5px;">#${product.adNumber || (product.id ? product.id.substring(0, 8).toUpperCase() : '---')}</div>
                                </div>
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <div style="width: 1px; height: 30px; background: #e2e8f0;"></div>
                                    <div style="background: #00ADEF; color: white; padding: 10px 18px; border-radius: 16px; font-weight: 800; font-size: 1.1rem; box-shadow: 0 4px 12px rgba(0, 173, 239, 0.25); white-space: nowrap;">
                                        ${product.isFree ? 'Ücretsiz' : `${product.price}₺`}
                                    </div>
                                </div>
                            </div>
                            
                            <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 12px;">
                                <span style="font-size: 0.65rem; background: #f1f5f9; color: #64748b; padding: 4px 10px; border-radius: 20px; font-weight: 700;">${product.condition || 'Yeni'}</span>
                                ${product.isBulk ? `<span style="font-size: 0.65rem; background: #fee2e2; color: #ef4444; padding: 4px 10px; border-radius: 20px; font-weight: 700;">TOPLU</span>` : ''}
                                ${product.isEsnaf ? `<span style="font-size: 0.65rem; background: #e0f2fe; color: #00ADEF; padding: 4px 10px; border-radius: 20px; font-weight: 700;">ESNAF</span>` : ''}
                                ${product.isSwap ? `<span style="font-size: 0.65rem; background: #f5f3ff; color: #5b20b6; padding: 4px 10px; border-radius: 20px; font-weight: 700; border: 1px solid #ddd6fe;"><i class="fas fa-sync-alt"></i> TAKAS</span>` : ''}
                            </div>
                        </div>

                        <!-- Info Bar: Icons and Details -->
                            <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1.2;">
                                <i class="fas fa-clock" style="color: #00ADEF; font-size: 0.9rem;"></i>
                                <span id="detail-countdown-text" style="font-size: 0.7rem; font-weight: 700; color: #475569;">
                                    ${exp && (exp - new Date() > 0) ? `Kalan: ${Math.floor((exp - new Date()) / 3600000)}sa ${Math.floor(((exp - new Date()) % 3600000) / 60000)}dk` : 'Süresi Doldu'}
                                </span>
                            </div>
                            <div style="width: 1px; height: 20px; background: #e2e8f0; opacity: 0.5;"></div>
                            <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1.5; padding: 0 8px;">
                                <i class="fas fa-map-pin" style="color: #ef4444; font-size: 0.9rem;"></i>
                                <span style="font-size: 0.7rem; font-weight: 700; color: #475569; text-align: center; display: block; width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                    ${product.city || ''} ${product.district || ''}
                                </span>
                            </div>
                            <div style="width: 1px; height: 20px; background: #e2e8f0; opacity: 0.5;"></div>
                            <div style="display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1;">
                                <i class="fas ${del.icon}" style="color: #10b981; font-size: 0.9rem;"></i>
                                <span style="font-size: 0.7rem; font-weight: 700; color: #475569;">${del.label.split(' ')[0]}</span>
                            </div>
                        </div>

                        <!-- Description Section -->
                        <div style="padding: 24px;">
                            <h3 style="font-size: 0.9rem; font-weight: 800; color: #1e293b; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px;">Ürün Açıklaması</h3>
                            <p style="color: #64748b; font-size: 0.95rem; line-height: 1.6; margin: 0;">${this.utils.escapeHTML(product.description) || 'Açıklama belirtilmemiş.'}</p>
                        </div>

                        <!-- Cohesive Action Buttons -->
                        <div style="padding: 0 24px 24px; display: grid; grid-template-columns: 1.2fr 1fr; gap: 12px;">
                            ${!isOwner && !hasAcceptedOffer && !product.isFree ? `
                                <button onclick="app.openOfferSheet()" 
                                    style="background: #00ADEF; border: none; color: white; padding: 16px; border-radius: 18px; font-weight: 800; font-size: 1rem; box-shadow: 0 6px 15px rgba(0, 173, 239, 0.2); cursor: pointer; transition: all 0.3s; width: 100%;">
                                    <i class="fas fa-hand-holding-dollar"></i> Teklif Ver
                                </button>
                            ` : ''}

                            ${!isOwner ? `
                                <button onclick="app.closeProductDetails(); app.openChat('${id}', '${product.ownerPhone}', '${product.ownerName}')" 
                                    style="background: white; border: 2.5px solid #00ADEF; color: #00ADEF; padding: 14px; border-radius: 18px; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: 0.3s; font-size: 0.95rem; width: 100%;">
                                    <i class="fas fa-comment-dots"></i> Soru Sor
                                </button>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Seller Card -->
                    <div style="background: #f8fafc; border-radius: 24px; padding: 16px; border: 1px solid #f1f5f9; display: flex; align-items: center; gap: 14px; margin-bottom: 30px; cursor: pointer;" 
                         onclick="app.showSellerProfile('${product.ownerId || ''}')">
                        <div style="width: 48px; height: 48px; border-radius: 12px; background: ${product.isEsnaf ? '#14b8a6' : 'var(--primary)'}; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem;">
                            <i class="fas ${product.isEsnaf ? 'fa-store' : 'fa-user'}"></i>
                        </div>
                        <div style="flex: 1;">
                            <div style="font-size: 0.9rem; font-weight: 800; color: #1e293b;">${this.utils.escapeHTML(product.ownerName || 'Satıcı')}</div>
                            <div style="font-size: 0.65rem; color: #94a3b8; font-weight: 700; text-transform: uppercase;">Satıcı Profilini Gör <i class="fas fa-chevron-right" style="font-size: 0.5rem; margin-left: 2px;"></i></div>
                        </div>
                    </div>
                <div style="margin: 20px 0 0; padding: 0 16px;">
                    <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-map-marked-alt" style="color: var(--primary);"></i> Konum ve Güvenli Noktalar
                    </h3>
                    <div id="detail-map" style="width: 100%; height: 200px; border-radius: 16px; border: 1px solid var(--border-color); z-index: 5;"></div>
                    <div id="safe-points-list" style="margin-top: 12px; display: flex; flex-direction: column; gap: 8px;"></div>
                </div>

                <!-- Güvenlik Uyarısı -->
                <div style="background: #FFF9E6; border: 1px solid #FFE58F; border-radius: 12px; padding: 12px; margin: 20px 16px; display: flex; gap: 12px; align-items: flex-start;">
                    <i class="fas fa-shield-halved" style="color: #FAAD14; font-size: 1.2rem; margin-top: 2px;"></i>
                    <div style="flex: 1;">
                        <h4 style="font-size: 0.85rem; font-weight: 800; color: #856404; margin-bottom: 4px;">Güvenli Alışveriş İpucu</h4>
                        <p style="font-size: 0.8rem; color: #856404; line-height: 1.4; font-weight: 500;">Ürünü görmeden, incelemeden ve teslim almadan asla **EFT/Havale ile ödeme yapmayınız.**</p>
                    </div>
                </div>

                <!-- Kalan Süre / Yenileme (Android logic) -->
                <div style="padding: 0 16px;">
                    ${(() => {
                if (!exp) return '';
                const now = new Date();
                const diff = exp - now;
                if (diff > 0) {
                    const hours = Math.floor(diff / (1000 * 60 * 60));
                    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const label = product.vitrine ? 'Vitrin Süresi' : 'Kalan Süre';
                    return `
                                <div style="background: var(--secondary); padding: 12px; border-radius: var(--radius-md); margin-bottom: 20px; border: 1px solid var(--border-color); display: flex; align-items: center; gap: 10px;">
                                    <i class="fas fa-clock" style="color: var(--primary);"></i>
                                    <div style="flex: 1;">
                                        <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-main);">${label}: ${hours}sa ${mins}dk</div>
                                        ${isOwner ? `<div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 2px;">Süre dolunca ilanı tekrar yayınlamak için fiyat düşürmeniz gerekecektir.</div>` : ''}
                                    </div>
                                </div>
                            `;
                } else if (isOwner) {
                    return `
                                <div style="background: #FFF3CD; padding: 16px; border-radius: var(--radius-md); margin-bottom: 20px; border: 1px solid #FFEeba;">
                                    <p style="font-size: 0.85rem; color: #856404; font-weight: 600; margin-bottom: 12px;"><i class="fas fa-exclamation-triangle"></i> İlanınızın süresi dolmuş. Yenilemek için fiyatı düşürmeniz gerekmektedir.</p>
                                    <div style="display: flex; gap: 8px; align-items: center;">
                                        <input type="number" id="renew-price" placeholder="Yeni Fiyat (Mevcut: ${product.price}₺)" style="flex: 1; padding: 10px; border: 1px solid var(--border-color); border-radius: 8px; outline: none;">
                                        <button class="btn btn-primary" onclick="app.renewProduct('${product.id}')" style="padding: 10px 16px;">Yenile</button>
                                    </div>
                                </div>
                            `;
                } else {
                    return `
                                <div style="background: var(--bg-card); padding: 12px; border-radius: var(--radius-md); margin-bottom: 20px; border: 1px solid var(--border-color); text-align: center; color: var(--text-muted); font-size: 0.85rem; font-weight: 600;">
                                    <i class="fas fa-times-circle"></i> Bu ilanın süresi dolmuştur.
                                </div>
                            `;
                }
            })()}
                </div>

                <div style="padding: 0 16px 100px 16px; border-top: 10px solid var(--bg-card);">
                      ${hasAcceptedOffer ? `
                        <div style="background: #D4EDDA; padding: 12px; border-radius: 14px; margin-top: 10px; border: 1px solid #c3e6cb;">
                            <div style="text-align: center; margin-bottom: 8px; font-weight: 700; color: #155724; font-size: 0.7rem;">
                                <i class="fas fa-check-circle"></i> Teklif kabul edildi. İletişime geçin:
                            </div>
                            <div style="background: white; padding: 12px; border-radius: 12px; border: 1px solid #e2e8f0;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-size: 0.8rem;">
                                    <span style="font-weight: 700; color: #000;">${this.utils.escapeHTML((isOwner ? acceptedOffer.buyerName : product.ownerName) || 'Bilinmiyor')}</span>
                                    <span style="color: #64748B; font-weight: 600;">${(isOwner ? acceptedOffer.buyerPhone : product.ownerPhone) || '-'}</span>
                                </div>
                                <div style="display: flex; gap: 8px;">
                                    <button onclick="app.whatsappRedirect('${isOwner ? acceptedOffer.buyerPhone : product.ownerPhone}', '${this.utils.escapeHTML(product.title)}')" 
                                        style="flex: 1; height: 38px; background: #25D366; color: white; border: none; font-size: 0.8rem; border-radius: 8px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer;">
                                        <i class="fab fa-whatsapp"></i> WhatsApp
                                    </button>
                                    <button onclick="app.closeProductDetails(); app.openChat('${product.id}', '${isOwner ? acceptedOffer.buyerPhone : product.ownerPhone}', '${this.utils.escapeHTML((isOwner ? acceptedOffer.buyerName : product.ownerName) || (isOwner ? 'Alıcı' : 'Satıcı'))}')" 
                                        style="flex: 1; height: 38px; background: var(--bg-card); color: var(--primary); border: 1px solid var(--border-color); font-size: 0.8rem; border-radius: 8px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer;">
                                        <i class="fas fa-comment-dots"></i> Mesaj
                                    </button>
                                </div>
                            </div>
                        </div>
                    ` : `
                        <h3 style="font-size: 1rem; font-weight: 700; margin: 20px 0 12px;"><i class="fas fa-hand-holding-dollar" style="color: var(--primary);"></i> Gelen Teklifler (${productOffers.length})</h3>
                        <div id="product-detail-offers">${productOffers.filter(o => !(o.hiddenBy || []).includes(this.state.user?.uid)).length ? productOffers.filter(o => !(o.hiddenBy || []).includes(this.state.user?.uid)).map(o => this.offerTemplate(o, isOwner)).join('') : '<p style="font-size: 0.85rem; color: var(--text-muted); text-align: center; padding: 20px;">Henüz teklif gelmedi.</p>'}</div>
                    `}

                    <div style="margin-top: 24px; border-top: 1px solid var(--border-color); padding-top: 16px; margin-bottom: 80px; text-align: center;">
                        ${!isOwner ? `
                            <button class="btn" style="color: var(--text-muted); font-size: 0.75rem; background: transparent; border: none; font-weight: 600;" 
                                onclick="app.openReportModal('${product.id}')">
                                <i class="fas fa-flag"></i> İlanı Şikayet Et
                            </button>
                        ` : ''}
                        ${isOwner ? `
                            <div style="margin-top: 10px; font-size: 0.7rem; color: var(--text-muted);">
                                Otomatik Yenile: ${product.autoRenew ? 'Açık' : 'Kapalı'}<br>
                                <span id="detail-quota-info">Kalan İlan Hakkınız: ...</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;

        document.getElementById('product-detail-modal').style.display = 'block';
        const detailNav = document.querySelector('#product-detail-modal .nav-bar');
        if (detailNav) detailNav.style.display = (isOwner || hasAcceptedOffer) ? 'none' : 'flex';

        // İnteraktif haritayı render et
        const safeLat = parseFloat(product.lat);
        const safeLng = parseFloat(product.lng);
        this.renderSafeMap(safeLat, safeLng, product.id);

        // Legacy/Eski tekliflerde isim eksikse users tablosundan çek
        if (isOwner && hasAcceptedOffer && !acceptedOffer.buyerName && acceptedOffer.buyerId) {
            db.collection('users').doc(acceptedOffer.buyerId).get().then(doc => {
                if (doc.exists) {
                    const name = doc.data().displayName || 'İsimsiz Alıcı';
                    const nameEl = document.getElementById('accepted-buyer-name');
                    if (nameEl) nameEl.innerText = name;
                    // Tekrar sorgu yapmamak için teklifi kalıcı güncelleyelim
                    db.collection('offers').doc(acceptedOffer.id).update({ buyerName: name });
                }
            });
        }

        // Legacy/Eski ürünlerde satıcı ismi eksikse users tablosundan çek
        if (isBuyer && hasAcceptedOffer && !product.ownerName && product.ownerId) {
            db.collection('users').doc(product.ownerId).get().then(doc => {
                if (doc.exists) {
                    const name = doc.data().displayName || 'İsimsiz Satıcı';
                    const nameEl = document.getElementById('accepted-owner-name');
                    if (nameEl) nameEl.innerText = name;
                    // Kalıcı güncelleme
                    db.collection('products').doc(product.id).update({ ownerName: name });
                }
            });
        }

        // Kotaları güncelle
        if (isOwner) {
            const activeAdsCount = this.state.products.filter(p => p.ownerId === (this.state.user?.uid) && (p.status || 'active') === 'active').length;
            const isEsnaf = (this.state.user?.esnafStatus || 'none').toLowerCase() === 'approved';
            const defaultLimit = isEsnaf ? 30 : 50;
            const userLimit = Math.max(this.state.user?.adLimit || 0, defaultLimit);
            const quotaEl = document.getElementById('detail-quota-info');
            if (quotaEl) quotaEl.innerText = `Kalan İlan Hakkınız: ${userLimit - activeAdsCount} / ${userLimit}`;
        }
    },

    closeProductDetails: function () { document.getElementById('product-detail-modal').style.display = 'none'; document.body.style.overflow = 'auto'; },
    openOfferSheet: function () {
        if (!this.checkAuth('Teklif vermek için lütfen kayıt olun veya giriş yapın.')) return;
        const prod = this.state.products.find(p => p.id === this.currentProductId);

        // Eğer ürün sadece takaslıksa veya takas destekliyorsa arayüzü ayarla
        const offerSheet = document.getElementById('offer-sheet');
        if (offerSheet) {
            offerSheet.style.display = 'block';
            this.setOfferType(prod.isSwap ? 'swap' : 'cash');
        }
    },

    setOfferType: function (type) {
        this.state.currentOfferType = type;
        const cashFields = document.getElementById('cash-offer-fields');
        const swapFields = document.getElementById('swap-offer-fields');
        const cashBtn = document.getElementById('btn-offer-type-cash');
        const swapBtn = document.getElementById('btn-offer-type-swap');

        if (type === 'cash') {
            if (cashFields) cashFields.style.display = 'block';
            if (swapFields) swapFields.style.display = 'none';
            if (cashBtn) {
                cashBtn.style.background = 'var(--primary)';
                cashBtn.style.color = 'white';
            }
            if (swapBtn) {
                swapBtn.style.background = '#f1f5f9';
                swapBtn.style.color = 'var(--text-main)';
            }
        } else {
            if (cashFields) cashFields.style.display = 'none';
            if (swapFields) swapFields.style.display = 'block';
            if (swapBtn) {
                swapBtn.style.background = 'var(--primary)';
                swapBtn.style.color = 'white';
            }
            if (cashBtn) {
                cashBtn.style.background = '#f1f5f9';
                cashBtn.style.color = 'var(--text-main)';
            }
        }
    },

    closeOfferSheet: function () {
        document.getElementById('offer-sheet').style.display = 'none';
        this.state.selectedSwapProductId = null;
        const selectedArea = document.getElementById('selected-swap-product');
        if (selectedArea) selectedArea.style.display = 'none';
    },

    renderSwapProductPicker: function () {
        const picker = document.getElementById('modal-swap-picker');
        const list = document.getElementById('swap-product-list');
        if (!picker || !list) return;

        // Kullanıcının kendi ilanlarını getir (aktif olanlar ve şu anki ürün hariç)
        const myAds = this.state.products.filter(p =>
            (p.ownerId === this.state.user.uid || p.ownerPhone === this.state.user.phone) &&
            p.id !== this.currentProductId &&
            p.status === 'active'
        );

        if (myAds.length === 0) {
            list.innerHTML = `
                <div style="text-align: center; padding: 40px 20px;">
                    <i class="fas fa-box-open" style="font-size: 2.5rem; color: #cbd5e1; margin-bottom: 12px;"></i>
                    <p style="color: #64748b; font-weight: 600;">Takas edebileceğiniz aktif bir ilanınız bulunmuyor.</p>
                    <button onclick="app.closeSwapPicker(); app.closeProductDetails(); app.showScreen('publish')" 
                            style="margin-top: 16px; background: var(--primary); color: white; border: none; padding: 10px 20px; border-radius: 12px; font-weight: 700;">
                        Yeni İlan Oluştur
                    </button>
                </div>
            `;
        } else {
            list.innerHTML = myAds.map(p => `
                <div onclick="app.selectProductForSwap('${p.id}')" 
                     style="display: flex; align-items: center; gap: 12px; padding: 12px; background: white; border: 1px solid #e2e8f0; border-radius: 16px; cursor: pointer;">
                    <img src="${p.image}" style="width: 50px; height: 50px; border-radius: 10px; object-fit: cover;">
                    <div style="flex: 1;">
                        <div style="font-weight: 700; font-size: 0.9rem; color: #1e293b;">${this.utils.escapeHTML(p.title)}</div>
                        <div style="font-size: 0.75rem; color: #64748b;">${p.price}₺</div>
                    </div>
                    <i class="fas fa-chevron-right" style="color: #cbd5e1;"></i>
                </div>
            `).join('');
        }

        picker.style.display = 'flex';
    },

    selectProductForSwap: function (id) {
        const product = this.state.products.find(p => p.id === id);
        if (!product) return;

        this.state.selectedSwapProductId = id;

        const selectedArea = document.getElementById('selected-swap-product');
        if (selectedArea) {
            selectedArea.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="${product.image}" style="width: 40px; height: 40px; border-radius: 8px; object-fit: cover;">
                    <div style="flex: 1;">
                        <div style="font-weight: 800; font-size: 0.8rem; color: #1e293b;">${this.utils.escapeHTML(product.title)}</div>
                        <div style="font-size: 0.7rem; color: #64748b;">Takas Teklifi Olarak Seçildi</div>
                    </div>
                    <button onclick="app.state.selectedSwapProductId = null; document.getElementById('selected-swap-product').style.display='none';" 
                            style="background: #fee2e2; border: none; color: #ef4444; width: 24px; height: 24px; border-radius: 50%; font-size: 0.6rem;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            selectedArea.style.display = 'block';
        }

        this.closeSwapPicker();
    },

    closeSwapPicker: function () {
        const picker = document.getElementById('modal-swap-picker');
        if (picker) picker.style.display = 'none';
    },
    whatsappRedirect: function (phone, product) {
        if (!this.checkAuth('WhatsApp üzerinden iletişim kurmak için lütfen giriş yapın.')) return;
        if (!phone) return this.toast('Telefon numarası bulunamadı.', 'error');
        window.open(`https://wa.me/90${phone.replace(/\D/g, '')}?text=${encodeURIComponent(product + " ürünü için yazıyorum.")}`, '_blank');
    },
    openInMaps: function (lat, lng) {
        if (!lat || !lng) return this.toast('Konum bilgisi bulunamadı.', 'error');
        window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
    },

    renderProfile: function () {
        if (!this.state.user) return;

        // İlan sayısı
        const myAdsCount = this.state.products.filter(p =>
            p.ownerId === this.state.user.uid ||
            (p.ownerEmail && p.ownerEmail === this.state.user.email) ||
            (p.ownerPhone && p.ownerPhone === this.state.user.phone)
        ).length;

        // Puan hesaplama (Satıcı olarak alınan puanlar - UID veya Telefon eşleşmesi)
        const myRatings = this.state.ratings.filter(r =>
            (r.sellerId && r.sellerId === this.state.user.uid) ||
            (this.state.user.email && r.sellerEmail && r.sellerEmail === this.state.user.email) ||
            (this.state.user.phone && r.sellerPhone && r.sellerPhone === this.state.user.phone)
        );
        const avgRating = myRatings.length > 0
            ? (myRatings.reduce((acc, curr) => acc + curr.score, 0) / myRatings.length).toFixed(1)
            : '0.0';

        const nameEl = document.querySelector('#screen-profile h2');
        const phoneEl = document.querySelector('#screen-profile p');
        const countEl = document.getElementById('stat-ads-count');
        const ratingEl = document.getElementById('stat-rating');
        const isAdmin = this.state.user.isAdmin === true || this.state.user.isAdmin === 'true';

        if (nameEl) {
            nameEl.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                    ${this.utils.escapeHTML(this.state.user.displayName)}
                    ${isAdmin ? '<span style="font-size: 0.65rem; background: var(--primary); color: white; padding: 3px 10px; border-radius: 20px; font-weight: 800; letter-spacing: 0.5px; box-shadow: 0 2px 6px rgba(0,168,150,0.2);">YÖNETİCİ</span>' : ''}
                </div>
            `;
        }
        if (phoneEl) phoneEl.textContent = this.state.user.phone;

        if (countEl) countEl.textContent = myAdsCount;
        if (ratingEl) ratingEl.textContent = avgRating;

        // Fotoğraf güncelleme
        const avatarImg = document.getElementById('profile-avatar-img');
        const avatarIcon = document.getElementById('profile-avatar-icon');
        if (this.state.user.photoURL && avatarImg) {
            avatarImg.src = this.state.user.photoURL;
            avatarImg.style.display = 'block';
            if (avatarIcon) avatarIcon.style.display = 'none';
        }

        const adminBtn = document.getElementById('admin-button');
        if (isAdmin) {
            if (adminBtn) adminBtn.style.setProperty('display', 'flex', 'important');
        } else {
            if (adminBtn) adminBtn.style.setProperty('display', 'none', 'important');
        }

        // Partner Status (Profile)
        const approvedContainer = document.getElementById('profile-approved-buttons');
        const partnerCta = document.getElementById('profile-partner-cta');
        const pStatus = (this.state.user?.partnerStatus || 'none').toString().trim().toLowerCase();

        if (approvedContainer) {
            // Sadece bu bölümü güncellemek için temizlemiyoruz, partnerCta'ya göre ekliyoruz
            if (pStatus === 'none' || pStatus === 'rejected') {
                if (partnerCta) partnerCta.style.display = 'block';
            } else {
                if (partnerCta) partnerCta.style.display = 'none';
                // Eski statik box'ları temizle ve yeni dinamik yapıyı kur (veya mevcutu güncelle)
                let statusDiv = document.getElementById('dynamic-partner-status');
                if (!statusDiv) {
                    statusDiv = document.createElement('div');
                    statusDiv.id = 'dynamic-partner-status';
                    approvedContainer.appendChild(statusDiv);
                }
                statusDiv.style.cssText = 'background: white; padding: 14px 16px; border-radius: 18px; border: 1px solid #f0f0f0; margin-bottom: 12px; display: flex; align-items: center; gap: 12px;';
                statusDiv.innerHTML = `
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
            }
        }

        // Esnaf Status (Profile)
        const esnafCta = document.getElementById('profile-esnaf-cta');
        const esnafStatusBox = document.getElementById('profile-esnaf-status');
        const esnafStatusText = document.getElementById('profile-esnaf-status-text');

        const eStatus = (this.state.user?.esnafStatus || 'none').toLowerCase();
        if (eStatus === 'none' || eStatus === 'rejected') {
            if (esnafCta) esnafCta.style.display = 'block';
            if (esnafStatusBox) esnafStatusBox.style.display = 'none';
        } else {
            if (esnafCta) esnafCta.style.display = 'none';
            if (esnafStatusBox) {
                esnafStatusBox.style.display = 'block';
                if (esnafStatusText) {
                    esnafStatusText.innerHTML = eStatus === 'approved'
                        ? '<i class="fas fa-check-circle"></i> Onaylı Mahalle Esnafı'
                        : '<i class="fas fa-clock"></i> Esnaf Başvurusu Beklemede';
                    esnafStatusBox.style.background = eStatus === 'approved' ? '#f0fdfa' : '#fffbeb';
                    esnafStatusBox.style.borderColor = eStatus === 'approved' ? '#99f6e4' : '#fef3c7';
                    esnafStatusText.style.color = eStatus === 'approved' ? '#0d9488' : '#b45309';
                }
            }
        }

        // E-posta Doğrulama Uyarısı
        const verifyWarn = document.getElementById('email-verify-warning');
        // Firebase auth'tan taze veriyi çekmek için reload yapabiliriz ama şimdilik state'e güvenelim
        if (this.state.user && !this.state.user.emailVerified) {
            if (!verifyWarn) {
                const warnHtml = `
                    <div id="email-verify-warning" style="background: #fff8e1; border: 1.5px dashed #f57c00; padding: 16px; border-radius: 16px; margin: 16px 0; text-align: left; display: flex; flex-direction: column; gap: 8px;">
                        <div style="display: flex; gap: 12px; align-items: flex-start;">
                            <i class="fas fa-envelope-circle-check" style="color: #f57c00; font-size: 1.2rem; margin-top: 2px;"></i>
                            <div style="flex: 1;">
                                <h4 style="margin: 0; font-size: 0.85rem; font-weight: 800; color: #e65100;">E-posta Onayı Gerekli</h4>
                                <p style="margin: 4px 0 0; font-size: 0.75rem; color: #ef6c00; line-height: 1.4;">Yeni ilan vermek ve güvenilir satıcı rozeti almak için mail adresinizi onaylamanız gerekmektedir.</p>
                            </div>
                        </div>
                        <button id="resend-email-btn" onclick="app.resendVerificationEmail()" style="width: 100%; padding: 10px; border: none; border-radius: 12px; background: #f57c00; color: white; font-weight: 800; font-size: 0.75rem; cursor: pointer; transition: 0.3s; margin-top: 4px;">
                            Doğrulama Mailini Tekrar Gönder ÄŸÅ¸â€œÂ§
                        </button>
                        <p style="font-size: 0.65rem; color: #fb8c00; text-align: center; margin: 0;">(Spam/Gereksiz klasörünü kontrol etmeyi unutmayın)</p>
                    </div>
                `;
                const profileContainer = document.querySelector('#screen-profile > div');
                const targetEl = document.querySelector('#screen-profile h2').nextElementSibling.nextElementSibling; // stats-grid'den önce
                targetEl.insertAdjacentHTML('beforebegin', warnHtml);
            }
        } else if (verifyWarn) {
            verifyWarn.remove();
        }
    },

    shareProduct: async function () {
        if (!this.currentProductId) return;
        const product = this.state.products.find(p => p.id === this.currentProductId);
        if (!product) return;

        const productUrl = window.location.origin + window.location.pathname + '?p=' + product.id;
        const shareData = {
            title: product.title + ' - Yanımdaki',
            text: `${product.title} - ${product.price}₺ fiyatıyla Yanımdaki'de seni bekliyor!`,
            url: productUrl
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                if (err.name !== 'AbortError') {
                    this.toast('Paylaşım sırasında bir hata oluştu.', 'error');
                }
            }
        } else {
            try {
                await navigator.clipboard.writeText(productUrl);
                this.toast('Ürün bağlantısı kopyalandı! ÄŸÅ¸â€œâ€¹');
            } catch (err) {
                this.toast('Bağlantı kopyalanamadı.', 'error');
            }
        }
    },

    checkPhoneWarning: function () {
        const warning = document.getElementById('phone-warning');
        if (!warning) return;

        // Kullanıcı giriş yapmamışsa uyarıyı gizle
        if (!this.state.user) {
            warning.style.display = 'none';
            return;
        }

        const phone = this.state.user.phone || "";
        const location = this.state.user.locationName || "";
        const emailVerified = this.state.user.emailVerified;

        let warningText = "";
        if (!emailVerified) {
            warningText = "Lütfen e-posta adresinizi doğrulayın! Aktivasyon mailini kontrol edin.";
        } else if (!phone || !location) {
            warningText = "Güvenliğiniz için telefon numaranızı ve konumunuzu giriniz.";
        }

        if (warningText) {
            warning.querySelector('span').innerText = warningText;
            warning.style.display = 'flex';
        } else {
            warning.style.display = 'none';
        }
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

    renderMyAds: function () {
        const c = document.getElementById('my-ads-list');
        if (!c) return;
        const filtered = this.state.products.filter(p => p.ownerId === this.state.user?.uid || p.ownerPhone === this.state.user?.phone);
        c.innerHTML = filtered.length ? filtered.map(p => {
            const isSold = p.status === 'sold' || this.state.offers.some(o => o.productId === p.id && o.status === 'accepted');
            const priceHTML = p.isFree ?
                `<span class="free-price" style="color: #10B981;">Ücretsiz</span>` :
                `<span>${p.price}₺</span>`; // Assuming p.price already includes '₺' or you format it here

            const freeBadge = (p.isFree && !p.isSwap) ? `
                <div style="position: absolute; top: 8px; left: 8px; display: flex; flex-direction: column; align-items: center; z-index: 10; background: rgba(255,255,255,0.95); padding: 4px 2px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); width: 44px; border: 1px solid #E2E8F0;">
                    <i class="fas fa-leaf" style="color: #64748B; font-size: 0.9rem; margin-bottom: 1px;"></i>
                    <span style="color: #475569; font-weight: 800; font-size: 0.5rem; text-transform: uppercase;">Paylaş</span>
                </div>
            ` : '';

            return `
            <div class="product-card" onclick="app.showProductDetails('${p.id}')" style="background:var(--bg-card);border-radius:var(--radius-md);overflow:hidden;border:1px solid var(--border-color); position: relative;">
                <div style="height:120px;background:url('${p.image}') center/cover;"></div>
                ${isSold ? `
                    <div style="position: absolute; top: 8px; left: 8px; background: #FF5A5F; color: white; padding: 4px 10px; border-radius: 8px; font-size: 0.65rem; font-weight: 800; z-index: 10;">
                        <i class="fas fa-check-double"></i> SATILDI
                    </div>
                ` : ''}
                ${freeBadge}
                <div style="padding:10px;">
                    <h3 style="font-size:0.8rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${this.utils.escapeHTML(p.title)}</h3>
                    <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px;">${this.utils.escapeHTML(p.city || '')}</div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight:800;color:var(--primary);">${priceHTML}</span>
                        ${(() => {
                    const realExp = p.expiresAt?.toDate ? p.expiresAt.toDate() : (p.expiresAt ? new Date(p.expiresAt) : null);
                    if (realExp) {
                        const now = new Date();
                        const diff = realExp - now;
                        const oneDay = 24 * 60 * 60 * 1000;
                        let exp = realExp;
                        if (diff > oneDay) {
                            const displayDiff = diff % oneDay || oneDay;
                            exp = new Date(now.getTime() + displayDiff);
                        }

                        const displayDiff = exp - now;
                        if (displayDiff > 0) {
                            const hours = Math.floor(displayDiff / (1000 * 60 * 60));
                            const mins = Math.floor((displayDiff % (1000 * 60 * 60)) / (1000 * 60));
                            return `<span style="font-size: 0.6rem; color: var(--accent); font-weight: 700;"><i class="fas fa-clock"></i> ${hours}sa ${mins}dk</span>`;
                        }
                    }
                    return '';
                })()}
                    </div>
                </div>
            </div>
            `;
        }).join('') : '<p style="text-align:center;padding:40px;color:var(--text-muted);grid-column:1/-1;">Henüz ilanınız yok.</p>';
    },


    renderMyOffers: function () {
        const c = document.getElementById('my-offers-list');
        if (!c) return;
        const filtered = this.state.offers.filter(o => o.buyerId === this.state.user?.uid || o.buyerPhone === this.state.user?.phone);
        c.innerHTML = filtered.length ? filtered.map(o => this.offerTemplate(o, false)).join('') : '<p style="text-align:center;padding:40px;color:var(--text-muted);">Henüz teklif vermediniz.</p>';
    },

    renderFavorites: function () {
        const c = document.getElementById('favorites-list');
        if (!c) return;
        const filtered = this.state.products.filter(p =>
            this.state.favorites.includes(p.id) &&
            p.status !== 'sold' &&
            !this.state.offers.some(o => o.productId === p.id && o.status === 'accepted')
        );
        c.innerHTML = filtered.length ? filtered.map(p => `
            <div class="product-card" onclick="app.showProductDetails('${p.id}')" style="background:var(--bg-card);border-radius:var(--radius-md);overflow:hidden;border:1px solid var(--border-color);">
                <div style="height:120px;background:url('${p.image}') center/cover;"></div>
                <div style="padding:10px;">
                    <h3 style="font-size:0.8rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${this.utils.escapeHTML(p.title)}</h3>
                    <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px;">${this.utils.escapeHTML(p.city || '')}</div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight:800;color:var(--primary);">${p.price}₺</span>
                        ${(() => {
                const exp = (() => {
                    if (p.expiresAt) return p.expiresAt.toDate ? p.expiresAt.toDate() : new Date(p.expiresAt);
                    if (p.createdAt) {
                        const created = p.createdAt.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
                        return new Date(created.getTime() + 24 * 60 * 60 * 1000);
                    }
                    return null;
                })();
                if (exp) {
                    const now = new Date();
                    const diff = exp - now;
                    if (diff > 0) {
                        const hours = Math.floor(diff / (1000 * 60 * 60));
                        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                        return `<span style="font-size: 0.6rem; color: var(--accent); font-weight: 700;"><i class="fas fa-clock"></i> ${hours}sa</span>`;
                    }
                }
                return '';
            })()}
                    </div>
                </div>
            </div>
        `).join('') : '<p style="text-align:center;padding:40px;color:var(--text-muted);grid-column:1/-1;">Favoriniz yok. ✨</p>';
    },

    renderSettings: function () {
        if (!this.state.user) return;

        // Partner Status (Settings)
        const partnerCta = document.getElementById('settings-partner-cta');
        const partnerStatusBox = document.getElementById('settings-partner-status');
        const partnerStatusText = document.getElementById('partner-status-text');

        const pStatus = (this.state.user?.partnerStatus || 'none').toLowerCase();
        if (pStatus === 'none' || pStatus === 'rejected') {
            if (partnerCta) partnerCta.style.display = 'block';
            if (partnerStatusBox) partnerStatusBox.style.display = 'none';
        } else {
            if (partnerCta) partnerCta.style.display = 'none';
            if (partnerStatusBox) {
                partnerStatusBox.style.display = 'block';
                if (partnerStatusText) {
                    partnerStatusText.innerHTML = pStatus === 'approved'
                        ? '<i class="fas fa-check-circle"></i> Güvenli Nokta Aktif'
                        : '<i class="fas fa-clock"></i> Partnerlik İnceleniyor';
                    partnerStatusBox.style.background = pStatus === 'approved' ? '#f0fdf4' : '#fffbeb';
                    partnerStatusText.style.color = pStatus === 'approved' ? '#166534' : '#b45309';
                }
            }
        }

        // Esnaf Status (Settings)
        const esnafCta = document.getElementById('settings-esnaf-cta');
        const esnafStatusBox = document.getElementById('settings-esnaf-status-box');
        const esnafStatusText = document.getElementById('esnaf-status-text-settings');

        const eStatus = (this.state.user?.esnafStatus || 'none').toLowerCase();
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
                        ? '<i class="fas fa-check-circle"></i> Esnaf Hesabı Aktif'
                        : '<i class="fas fa-clock"></i> Esnaf Başvurusu İnceleniyor';
                    esnafStatusBox.style.background = isEsnaf ? '#f0fdfa' : '#fffbeb';
                    esnafStatusText.style.color = isEsnaf ? '#0d9488' : '#b45309';
                }
            }
        }

        // Esnaf Specific Fields (Ayarlar)
        const esnafFields = document.getElementById('settings-esnaf-fields');
        if (esnafFields) {
            esnafFields.style.display = isEsnaf ? 'flex' : 'none';
            if (isEsnaf) {
                const shopNameEl = document.getElementById('settings-shop-name');
                if (shopNameEl) shopNameEl.value = this.state.user.shopName || "";
                document.getElementById('settings-shop-location').value = this.state.user.shopLocation || "";
                document.getElementById('settings-working-hours').value = this.state.user.workingHours || "";
            }
        }

        const nameEl = document.getElementById('settings-name');
        const phoneEl = document.getElementById('settings-phone-input');
        const emailEl = document.getElementById('settings-email');
        const locNameEl = document.getElementById('settings-location-name');
        const latEl = document.getElementById('settings-lat');
        const lngEl = document.getElementById('settings-lng');

        if (this.state.user) {
            if (nameEl) nameEl.value = this.state.user.displayName || "";
            if (phoneEl) phoneEl.value = this.state.user.phone || "";
            if (emailEl) emailEl.value = this.state.user.email || "";
            if (locNameEl) locNameEl.value = this.state.user.locationName || "";
            if (latEl && this.state.user.location) latEl.value = this.state.user.location.lat || "";
            if (lngEl && this.state.user.location) lngEl.value = this.state.user.location.lng || "";

            // Esnaf specific population
            if (isEsnaf) {
                const sLoc = document.getElementById('settings-shop-location');
                const sHours = document.getElementById('settings-working-hours');
                const sLat = document.getElementById('settings-shop-lat');
                const sLng = document.getElementById('settings-shop-lng');
                const sCoords = document.getElementById('settings-shop-coords');

                if (sLoc) sLoc.value = this.state.user.shopLocation || "";
                if (sHours) sHours.value = this.state.user.workingHours || "";
                if (sLat) sLat.value = this.state.user.shopLat || "";
                if (sLng) sLng.value = this.state.user.shopLng || "";
                if (sCoords) {
                    sCoords.value = (this.state.user.shopLat && this.state.user.shopLng)
                        ? `${this.state.user.shopLat}, ${this.state.user.shopLng}`
                        : "Konum seçilmedi";
                }
            }
        }

        const avatarImg = document.getElementById('settings-avatar-img');
        const avatarContainer = document.getElementById('settings-avatar-container');
        const avatarIcon = avatarContainer ? avatarContainer.querySelector('i') : null;
        if (this.state.user?.photoURL && avatarImg) {
            avatarImg.src = this.state.user.photoURL;
            avatarImg.style.display = 'block';
            if (avatarIcon) avatarIcon.style.display = 'none';
        }
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

                fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`)
                    .then(r => r.json())
                    .then(data => {
                        const city = data.address.city || data.address.town || data.address.village || data.address.province || '';
                        const district = data.address.district || data.address.county || data.address.suburb || '';
                        const finalAddr = (district && city) ? `${district}, ${city}` : (city || district || 'Konum Belirlendi');

                        const input = document.getElementById('settings-location-name');
                        if (input) {
                            input.value = finalAddr;
                            this.toast('Konum bulundu: ' + finalAddr);
                        }
                    })
                    .catch(err => {
                        console.error("Geocoding error:", err);
                        document.getElementById('settings-location-name').value = 'Kaydedilen Konum';
                        this.toast('Koordinatlar alındı, adres çözümlenemedi.');
                    });
            },
            (err) => {
                this.toast('Konum alınamadı: ' + err.message, 'error');
            }
        );
    },

    getShopLocation: function () {
        if (!navigator.geolocation) return this.toast('Desteklenmiyor.', 'error');
        this.toast('Konum alınıyor...', 'info');
        navigator.geolocation.getCurrentPosition((pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const latEl = document.getElementById('settings-shop-lat');
            const lngEl = document.getElementById('settings-shop-lng');
            const coordsEl = document.getElementById('settings-shop-coords');
            if (latEl) latEl.value = lat;
            if (lngEl) lngEl.value = lng;
            if (coordsEl) coordsEl.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            this.toast('İşletme konumu alındı. ✨');
        }, (err) => this.toast(err.message, 'error'));
    },

    saveSettings: async function () {
        if (!this.state.user) return;

        const newName = document.getElementById('settings-name').value.trim();
        const newPhone = document.getElementById('settings-phone-input').value.trim().replace(/\s/g, '').slice(-10);
        const newLocName = document.getElementById('settings-location-name').value.trim();
        const newLat = parseFloat(document.getElementById('settings-lat').value);
        const newLng = parseFloat(document.getElementById('settings-lng').value);

        // Esnaf Fields
        const isEsnaf = this.state.user.esnafStatus === 'approved';
        let shopLocation = "";
        let workingHours = "";
        if (isEsnaf) {
            shopLocation = document.getElementById('settings-shop-location').value.trim();
            workingHours = document.getElementById('settings-working-hours').value.trim();
        }

        if (!newName || newName.length < 2) return this.toast('Lütfen geçerli bir ad soyad girin.', 'error');
        if (newPhone && newPhone.length < 10) return this.toast('Lütfen geçerli bir telefon numarası girin.', 'error');

        try {
            this.toast('Ayarlar kaydediliyor...', 'info');

            // Telefon numarası benzersizlik kontrolü
            if (newPhone) {
                const phoneQuery = await db.collection('users').where('phone', '==', newPhone).get();
                // Eğer numara başka bir kullanıcıda varsa (mevcut kullanıcı dışında)
                const isUsedByOther = phoneQuery.docs.some(doc => doc.id !== this.state.user.uid);

                if (isUsedByOther) {
                    return this.toast('Bu telefon numarası başka bir hesap tarafından kullanılıyor! ÄŸÅ¸Å¡Â«', 'error');
                }
            }

            const updateData = {
                displayName: newName,
                phone: newPhone,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (newLocName) updateData.locationName = newLocName;
            if (!isNaN(newLat) && !isNaN(newLng)) {
                updateData.location = { lat: newLat, lng: newLng };
            }

            // Esnaf Verileri
            const eStatus = (this.state.user.esnafStatus || '').toLowerCase();
            if (eStatus === 'approved') {
                const shopName = document.getElementById('settings-shop-name')?.value?.trim() || '';
                const shopLocation = document.getElementById('settings-shop-location').value.trim();
                const workingHours = document.getElementById('settings-working-hours').value.trim();
                const shopLat = parseFloat(document.getElementById('settings-shop-lat').value);
                const shopLng = parseFloat(document.getElementById('settings-shop-lng').value);

                updateData.shopName = shopName;
                updateData.shopLocation = shopLocation;
                updateData.workingHours = workingHours;
                if (!isNaN(shopLat)) updateData.shopLat = shopLat;
                if (!isNaN(shopLng)) updateData.shopLng = shopLng;

                // Local state
                this.state.user.shopName = shopName;
                this.state.user.shopLocation = shopLocation;
                this.state.user.workingHours = workingHours;
                if (!isNaN(shopLat)) this.state.user.shopLat = shopLat;
                if (!isNaN(shopLng)) this.state.user.shopLng = shopLng;
            }

            await db.collection('users').doc(this.state.user.uid).update(updateData);

            // Local State güncelle
            this.state.user.displayName = newName;
            this.state.user.phone = newPhone;
            if (newLocName) this.state.user.locationName = newLocName;
            if (!isNaN(newLat) && !isNaN(newLng)) {
                this.state.user.location = { lat: newLat, lng: newLng };
            }

            this.toast('Ayarlar başarıyla kaydedildi! ✨', 'success');
            this.renderProfile();
            this.checkPhoneWarning();
        } catch (err) {
            this.toast('Hata: ' + err.message, 'error');
        }
    },

    handleProfilePicSelect: function (e) {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            return this.toast('Resim boyutu 2MB dan küçük olmalıdır.', 'error');
        }

        const reader = new FileReader();
        reader.onload = async (ev) => {
            const base64 = ev.target.result;
            this.toast('Profil resmi güncelleniyor...');

            try {
                await db.collection('users').doc(this.state.user.uid).set({
                    photoURL: base64,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                this.toast('Profil resmi güncellendi! ✨');
            } catch (err) {
                this.toast('Hata: ' + err.message, 'error');
            }
        };
        reader.readAsDataURL(file);
    },

    openUsageModal: function () {
        document.getElementById('modal-usage').style.display = 'flex';
        document.body.style.overflow = 'hidden';
    },

    closeUsageModal: function () {
        document.getElementById('modal-usage').style.display = 'none';
        document.body.style.overflow = 'auto';
    },

    // --- Chat Logic ---
    // --- Chat Logic ---
    renderMessages: function () {
        const container = document.getElementById('messages-list');
        if (!container) return;

        const myPhone = this.state.user?.phone;
        const hiddenChats = this.state.user?.hiddenChats || [];

        const myChats = this.state.chats.filter(c => c.buyerPhone === myPhone || c.sellerPhone === myPhone);

        const groups = {};
        myChats.forEach(c => {
            const otherPhone = c.buyerPhone === myPhone ? c.sellerPhone : c.buyerPhone;
            const chatKey = `${c.productId}_${otherPhone}`;

            // Gizlenen sohbetleri gösterme
            if (hiddenChats.includes(chatKey)) return;

            if (!groups[chatKey] || groups[chatKey].createdAt < c.createdAt) {
                groups[chatKey] = c;
            }
        });

        const sortedGroups = Object.values(groups).sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0));

        container.innerHTML = sortedGroups.length ? sortedGroups.map(c => {
            const isBuyer = c.buyerPhone === myPhone;
            const otherPhone = isBuyer ? c.sellerPhone : c.buyerPhone;
            const otherName = isBuyer ? c.sellerName : c.buyerName;
            const product = this.state.products.find(p => p.id === c.productId);
            const chatKey = `${c.productId}_${otherPhone}`;

            return `
                <div style="position: relative; background: white; border-radius: 16px; border: 1px solid var(--border-color); overflow: hidden;">
                    <div onclick="app.openChat('${c.productId}', '${otherPhone}', '${this.utils.escapeHTML(otherName)}')" 
                        style="padding: 16px; display: flex; align-items: center; gap: 12px; cursor: pointer;">
                        <div style="width: 50px; height: 50px; border-radius: 12px; background: url('${product?.image || 'placeholder.png'}') center/cover; flex-shrink: 0;"></div>
                        <div style="flex: 1; overflow: hidden;">
                            <div style="font-weight: 700; font-size: 0.95rem;">${this.utils.escapeHTML(otherName)}</div>
                            <div style="font-size: 0.75rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${this.utils.escapeHTML(c.text)}</div>
                            <div style="font-size: 0.65rem; color: var(--primary); font-weight: 700; margin-top: 2px;">
                                <i class="fas fa-shopping-bag"></i> ${this.utils.escapeHTML(product?.title || 'İlan')}
                            </div>
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
                            <div style="font-size: 0.7rem; color: var(--text-muted);">${c.createdAt ? new Date(c.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                            <button onclick="event.stopPropagation(); app.deleteConversation('${c.productId}', '${otherPhone}')" 
                                style="border: none; background: #fee2e2; color: #ef4444; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; cursor: pointer;">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('') : '<p style="text-align:center;padding:40px;color:var(--text-muted);">Henüz mesajınız yok. ✨</p>';
    },

    deleteConversation: async function (productId, otherPhone) {
        if (!confirm('Bu sohbeti silmek istediğinize emin misiniz?')) return;

        const myPhone = this.state.user?.phone;
        const chatKey = `${productId}_${otherPhone}`;

        try {
            const userRef = db.collection('users').doc(this.state.user.uid);
            await userRef.update({
                hiddenChats: firebase.firestore.FieldValue.arrayUnion(chatKey)
            });

            // Yerelde de güncelle (hızlı tepki için)
            if (!this.state.user.hiddenChats) this.state.user.hiddenChats = [];
            this.state.user.hiddenChats.push(chatKey);

            this.toast('Sohbet silindi');
            this.renderMessages();
        } catch (error) {
            console.error('Delete error:', error);
            this.toast('İşlem başarısız.', 'error');
        }
    },

    openChat: function (productId, otherPhone, otherName) {
        if (!this.checkAuth('Sohbet başlatmak için lütfen kayıt olun veya giriş yapın.')) return;
        this.currentChat = { productId, otherPhone, otherName };
        this.showScreen('chat');
        this.renderChatWindow();
    },

    renderChatWindow: function () {
        const container = document.getElementById('chat-messages-container');
        if (!container || !this.currentChat) return;

        const product = this.state.products.find(p => p.id === this.currentChat.productId);
        document.getElementById('chat-recipient-name').textContent = this.utils.escapeHTML(this.currentChat.otherName);
        document.getElementById('chat-product-title').innerHTML = `
            ${this.utils.escapeHTML(product?.title) || 'Mesajlaşma'}
            <div style="display: flex; gap: 12px; margin-top: 4px;">
                <div id="chat-safe-point-suggest" onclick="app.suggestSafePoint()" 
                     style="font-size: 0.7rem; color: var(--primary); font-weight: 700; cursor: pointer; text-decoration: underline;">
                     <i class="fas fa-shield-halved"></i> Güvenli Nokta Öner
                </div>
                ${this.currentChat.productId ? `
                <div onclick="app.showProductDetails('${this.currentChat.productId}')" 
                     style="font-size: 0.7rem; color: #f59e0b; font-weight: 700; cursor: pointer; text-decoration: underline;">
                     <i class="fas fa-external-link-alt"></i> İlan Linki
                </div>
                ` : ''}
            </div>
        `;

        const myPhone = this.state.user?.phone;
        const messages = this.state.chats.filter(c =>
            c.productId === this.currentChat.productId &&
            ((c.buyerPhone === myPhone && c.sellerPhone === this.currentChat.otherPhone) ||
                (c.sellerPhone === myPhone && c.buyerPhone === this.currentChat.otherPhone))
        );

        container.innerHTML = messages.map(m => {
            const isMe = m.senderPhone === myPhone;
            if (m.type === 'safe-point') {
                return `
                    <div style="align-self: ${isMe ? 'flex-end' : 'flex-start'}; max-width: 85%; margin-bottom: 8px;">
                        <div class="safe-point-card">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                <i class="fas fa-shield-halved" style="color: var(--primary);"></i>
                                <span style="font-size: 0.8rem; font-weight: 800; color: var(--text-main);">Buluşma Noktası Önerisi</span>
                            </div>
                            <h4 style="font-size: 0.85rem; font-weight: 700; margin-bottom: 2px;">${this.utils.escapeHTML(m.pointName)}</h4>
                            <p style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 8px;">${this.utils.escapeHTML(m.pointDesc)}</p>
                            <button onclick="app.openInMaps(${m.lat}, ${m.lng})" 
                                    style="width: 100%; padding: 8px; background: var(--primary); color: white; border: none; border-radius: 8px; font-size: 0.75rem; font-weight: 700; cursor: pointer;">
                                <i class="fas fa-location-arrow"></i> Haritada Gör
                            </button>
                        </div>
                    </div>
                `;
            }
            return `
                <div style="align-self: ${isMe ? 'flex-end' : 'flex-start'}; max-width: 80%;">
                    <div style="background: ${isMe ? 'var(--primary)' : 'white'}; color: ${isMe ? 'white' : 'var(--text-main)'}; 
                        padding: 10px 14px; border-radius: 18px; border-bottom-${isMe ? 'right' : 'left'}-radius: 4px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.05); font-size: 0.9rem; line-height: 1.4;">
                        ${this.utils.escapeHTML(m.text)}
                    </div>
                </div>
            `;
        }).join('');
        container.scrollTop = container.scrollHeight;
    },

    sendMessage: async function () {
        const input = document.getElementById('chat-input');
        const text = input.value.trim();
        if (!text || !this.currentChat) return;

        const product = this.currentChat.productId ? this.state.products.find(p => p.id === this.currentChat.productId) : null;
        const myPhone = this.state.user?.phone;
        const isBuyer = product ? (product.ownerPhone !== myPhone) : true;

        const msgData = {
            productId: this.currentChat.productId,
            buyerPhone: isBuyer ? myPhone : this.currentChat.otherPhone,
            buyerName: isBuyer ? this.state.user.displayName : this.currentChat.otherName,
            sellerPhone: isBuyer ? this.currentChat.otherPhone : myPhone,
            sellerName: isBuyer ? this.currentChat.otherName : this.state.user.displayName,
            senderPhone: myPhone,
            senderId: this.state.user.uid,
            text: this.utils.cleanText(text),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        input.value = '';
        try {
            const chatKey = `${this.currentChat.productId}_${this.currentChat.otherPhone}`;

            // Eğer karşı taraf veya biz bu sohbeti gizlediysek, yeni mesajla tekrar görünür yapalım
            const batch = db.batch();

            // Kendi mesajımız için bizim tarafımızda unhide
            const myUserRef = db.collection('users').doc(this.state.user.uid);
            batch.update(myUserRef, {
                hiddenChats: firebase.firestore.FieldValue.arrayRemove(chatKey)
            });

            // Karşı taraf için de unhide (eğer onlar gizlediyse)
            // Bu kısım normalde güvenlik kuralları gereği daha karmaşıktır ama MVP'de direkt deniyoruz
            // Karşı tarafın ID'sini bulmak için state.users kullanıyoruz
            const otherUser = this.state.users.find(u => u.phone === this.currentChat.otherPhone);
            if (otherUser) {
                const otherUserRef = db.collection('users').doc(otherUser.id);
                batch.update(otherUserRef, {
                    hiddenChats: firebase.firestore.FieldValue.arrayRemove(chatKey)
                });
            }

            const chatRef = db.collection('chats').doc();
            batch.set(chatRef, msgData);

            await batch.commit();

            // Yerelde bizim tarafımızı temizle
            if (this.state.user.hiddenChats) {
                this.state.user.hiddenChats = this.state.user.hiddenChats.filter(k => k !== chatKey);
            }
        } catch (err) {
            this.toast('Mesaj gönderilemedi: ' + err.message, 'error');
        }
    },

    sendInternalMessage: async function (toPhone, toName, text, productId = null) {
        if (!this.state.user) return;

        const myPhone = this.state.user.phone || '';
        const myName = this.state.user.displayName || 'Komşu';

        const msgData = {
            productId: productId,
            buyerPhone: myPhone,
            buyerName: myName,
            sellerPhone: toPhone,
            sellerName: toName,
            senderPhone: myPhone,
            senderId: this.state.user.uid,
            text: text,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            await db.collection('chats').add(msgData);
            console.log('Internal automated message sent.');
        } catch (err) {
            console.error('Internal message error:', err);
        }
    },

    seedSampleData: async function () {
        if (!confirm('Örnek veriler yüklensin mi?')) return;

        // Seed Safe Points
        const safePointSamples = [
            { name: "Beşiktaş Meydan - Starbucks", lat: 41.0428, lng: 29.0075, description: "7/24 Kameralı ve Kalabalık", type: "cafe" },
            { name: "Akaretler - Minoa", lat: 41.0402, lng: 29.0016, description: "Aydınlık ve Güvenli Kafe", type: "cafe" },
            { name: "İstanbul Deniz Müzesi Girişi", lat: 41.0416, lng: 29.0058, description: "Güvenlikli Kamu Alanı", type: "public" }
        ];
        try {
            for (const s of safePointSamples) {
                await db.collection('safe_points').add(s);
            }
            this.toast('Örnek güvenli noktalar eklendi.');
        } catch (err) {
            this.toast('Güvenli nokta eklenirken hata: ' + err.message, 'error');
        }

        // Seed Products
        const productSamples = [
            { title: 'Çalışma Masası', price: 450, image: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=300&q=80', description: 'Temiz masa.' },
            { title: 'Vintage Lamba', price: 120, image: 'https://images.unsplash.com/photo-1507473884658-c7a3dc34d2e7?auto=format&fit=crop&w=300&q=80', description: 'Retro.' }
        ];
        try {
            for (const s of productSamples) {
                await db.collection('products').add({ ...s, condition: 'İyi', ownerId: 'system', lat: 41.0082, lng: 28.9784, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
            }
            this.toast('Yüklendi!');
        } catch (err) { this.toast('Hata: ' + err.message, 'error'); }
    },

    // --- Edit logic ---
    openEditProduct: function (id) {
        const product = this.state.products.find(p => p.id === id);
        if (!product) return;

        this.closeProductDetails();
        this.showScreen('edit');

        document.getElementById('edit-title').value = product.title;
        document.getElementById('edit-price').value = product.price;
        document.getElementById('edit-category').value = product.category || '';
        document.getElementById('edit-city').value = product.city || '';
        document.getElementById('edit-full-address').value = product.fullAddress || '';
        document.getElementById('edit-description').value = product.description || '';
        document.getElementById('edit-is-swap').checked = !!product.isSwap;

        const preview = document.getElementById('edit-image-preview');
        if (preview) {
            preview.innerHTML = `<img loading="lazy" src="${product.image}" style="width:100%;height:100%;object-fit:cover;">`;
            this.state.tempEditImage = product.image;
        }
    },

    handleEditImageSelect: function (e) {
        const file = e.target.files[0];
        if (!file) return;
        const r = new FileReader();
        r.onload = (ev) => {
            this.state.tempEditImage = ev.target.result;
            const preview = document.getElementById('edit-image-preview');
            if (preview) preview.innerHTML = `<img loading="lazy" src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
        };
        r.readAsDataURL(file);
    },

    saveProductEdit: async function () {
        const title = this.utils.cleanText(document.getElementById('edit-title').value);
        const price = parseInt(document.getElementById('edit-price').value);
        const category = document.getElementById('edit-category').value;
        const city = document.getElementById('edit-city').value;
        const fullAddress = this.utils.cleanText(document.getElementById('edit-full-address').value);
        const description = this.utils.cleanText(document.getElementById('edit-description').value);
        const isSwap = document.getElementById('edit-is-swap').checked;

        if (!title || !price || !category || !city) return this.toast('Lütfen zorunlu alanları doldurun.', 'error');

        const product = this.state.products.find(p => p.id === this.currentProductId);
        if (price > (product.initialPrice || product.price)) {
            return this.toast(`Fiyat ilk girilen tutarı (${product.initialPrice || product.price}₺) geçemez!`, 'error');
        }

        this.toast('Güncelleniyor...');
        try {
            await db.collection('products').doc(this.currentProductId).update({
                title, price, category, city, fullAddress,
                description: description,
                image: this.state.tempEditImage,
                autoRenew: document.getElementById('edit-auto-renew').checked,
                isSwap: !!isSwap
            });
            this.toast('İlan güncellendi!');
            this.showScreen('profile');
        } catch (err) { this.toast('Hata: ' + err.message, 'error'); }
    },

    renewProduct: async function (id) {
        const product = this.state.products.find(p => p.id === id);
        if (!product) return;

        const newPrice = parseInt(document.getElementById('renew-price').value);
        if (!newPrice || newPrice >= product.price) {
            return this.toast('Yenilemek için fiyatı düşürmelisiniz!', 'error');
        }

        if (newPrice > (product.initialPrice || product.price)) {
            return this.toast('Fiyat ilk girdiğiniz fiyattan yüksek olamaz!', 'error');
        }

        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        // %5 indirim kuralı
        const maxPrice = Math.floor(product.price * 0.95);
        if (newPrice > maxPrice) {
            return this.toast(`Yenilemek için fiyatı en az %5 düşürmelisiniz (Max: ${maxPrice}₺).`, 'error');
        }

        try {
            this.toast('İlan yenileniyor...');
            await db.collection('products').doc(id).update({
                price: newPrice,
                previousPrice: product.price,
                expiresAt: firebase.firestore.Timestamp.fromDate(expiresAt),
                status: 'active',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            this.toast('İlanınız 24 saat daha yayına alındı! ✨');
            this.closeProductDetails();
            this.showScreen('home');
        } catch (err) { this.toast('Hata: ' + err.message, 'error'); }
    },

    showPricingModal: function () {
        const container = document.getElementById('pricing-packages-container');
        if (!container) return;

        const isEsnaf = (this.state.user?.esnafStatus || 'none').toLowerCase() === 'approved';
        const defaultLimit = isEsnaf ? 30 : 50;

        // Modal başlığı ve açıklamasını güncelle
        const pricingTitle = document.querySelector('#modal-pricing h2');
        const pricingDesc = document.querySelector('#modal-pricing p');
        if (pricingTitle) pricingTitle.textContent = isEsnaf ? 'Esnaf İlan Limitine Ulaştınız' : 'İlan Limitine Ulaştınız';
        if (pricingDesc) pricingDesc.textContent = `Ücretsiz ${defaultLimit} ilan limitiniz doldu. Yeni ilan vermek için uygun paketi seçebilirsiniz.`;

        let packages = [];

        if (isEsnaf) {
            // Esnaf Özel Paketleri
            packages = [
                { name: 'Gümüş Esnaf', count: 100, amount: 500, desc: 'Başlangıç için 100 ilan hakkı' },
                { name: 'Altın Esnaf', count: 300, amount: 1200, desc: 'Daha fazla kampanya için 300 ilan' },
                { name: 'Pro Esnaf', count: 1000, amount: 3000, desc: 'Sınırsız gibi! 1000 ilan hakkı' }
            ];
        } else {
            // Bireysel Paketler
            packages = [
                { name: '10\'lu Paket', count: 10, amount: 100, desc: 'Ekstra ilan verme hakkı' },
                { name: '25\'li Paket', count: 25, amount: 200, desc: 'Daha avantajlı paket' },
                { name: '50\'li Paket', count: 50, amount: 350, desc: 'Sık satış yapanlar için' }
            ];
        }

        container.innerHTML = packages.map(pkg => `
            <div class="pricing-card" onclick="app.selectPackage(${pkg.count}, ${pkg.amount}, '${pkg.name}')"
                style="padding: 16px; border: 2px solid var(--border-color); border-radius: var(--radius-md); display: flex; justify-content: space-between; align-items: center; cursor: pointer; background: white; transition: 0.2s;">
                <div style="text-align: left;">
                    <span style="display: block; font-weight: 800; font-size: 1rem; color: var(--text-main);">${pkg.name} (${pkg.count} İlan)</span>
                    <span style="font-size: 0.8rem; color: var(--text-muted);">${pkg.desc}</span>
                </div>
                <span style="font-weight: 800; color: var(--primary); font-size: 1.1rem;">${pkg.amount}₺</span>
            </div>
        `).join('');

        document.getElementById('modal-pricing').style.display = 'block';
        document.body.style.overflow = 'hidden';
    },

    closePricingModal: function () {
        document.getElementById('modal-pricing').style.display = 'none';
        document.body.style.overflow = 'auto';
    },

    selectPackage: function (count, amount, packageName = 'Standart Paket') {
        this.selectedPackage = { count, amount, name: packageName };
        this.closePricingModal();

        // Ödeme talebi oluştur
        db.collection('payments').add({
            userId: this.state.user.uid,
            userName: this.state.user.displayName,
            userPhone: this.state.user.phone,
            packageName: packageName,
            packageCount: count,
            amount: amount,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        document.getElementById('transfer-amount').textContent = amount + '₺';
        document.getElementById('modal-bank-transfer').style.display = 'block';
    },

    closeBankTransferModal: function () {
        document.getElementById('modal-bank-transfer').style.display = 'none';
        document.body.style.overflow = 'auto';
        this.toast('Ödemeniz kontrol edildikten sonra limitiniz tanımlanacaktır.', 'info');
    },

    checkExpiryNotifications: function () {
        if (!this.state.user) return;
        const now = new Date();
        const myAds = this.state.products.filter(p => p.ownerId === this.state.user.uid && (p.status || 'active') === 'active');

        let newNotifications = false;

        myAds.forEach(p => {
            let exp = null;
            if (p.expiresAt) {
                exp = p.expiresAt.toDate ? p.expiresAt.toDate() : new Date(p.expiresAt);
            } else if (p.createdAt) {
                const created = p.createdAt.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
                exp = new Date(created.getTime() + 24 * 60 * 60 * 1000);
            }

            if (exp) {
                const diff = exp - now;
                const twoHours = 2 * 60 * 60 * 1000;

                // 1. Otomatik Yenileme Kontrolü
                if (diff <= 0 && p.autoRenew) {
                    const newPrice = Math.floor(p.price * 0.95);
                    this.autoRenewProduct(p.id, newPrice);
                }
                // 2. 2 saatten az kalmışsa ve bu bildirim henüz eklenmemişse
                else if (diff > 0 && diff < twoHours) {
                    const notificationId = `expiry_${p.id}`;
                    if (!this.state.notifications.some(n => n.id === notificationId)) {
                        this.state.notifications.unshift({
                            id: notificationId,
                            title: `"${p.title}" ilanınızın süresi dolmak üzere!`,
                            type: 'expiry',
                            timestamp: new Date(),
                            productId: p.id
                        });
                        newNotifications = true;
                    }
                }
            }
        });

        if (newNotifications) {
            this.updateNotificationBadge();
        }
    },

    updateNotificationBadge: function () {
        const badge = document.getElementById('notification-badge');
        if (!badge) return;

        const count = this.state.notifications.length;
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    },

    toggleNotifications: function () {
        const dropdown = document.getElementById('notification-dropdown');
        if (!dropdown) return;

        const isVisible = dropdown.style.display === 'flex';
        if (!isVisible) {
            this.renderNotifications();
            dropdown.style.display = 'flex';

            // Dışına tıklandığında kapatmak için listener ekle
            const closeHandler = (e) => {
                if (!e.target.closest('.notification-wrapper')) {
                    dropdown.style.display = 'none';
                    document.removeEventListener('click', closeHandler);
                }
            };
            setTimeout(() => document.addEventListener('click', closeHandler), 10);
        } else {
            dropdown.style.display = 'none';
        }
    },

    renderNotifications: function () {
        const container = document.getElementById('notification-list');
        if (!container) return;

        if (this.state.notifications.length === 0) {
            container.innerHTML = '<div class="empty-state">Henüz bildirim yok.</div>';
            return;
        }

        container.innerHTML = this.state.notifications.map(n => `
            <div class="notification-item" onclick="app.handleNotificationClick('${n.id}', '${n.productId}', '${n.type}', '${n.otherPhone || ''}')">
                <div class="notification-icon">
                    <i class="fas ${n.type === 'expiry' ? 'fa-clock' : (n.type === 'message' ? 'fa-comment' : 'fa-bell')}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-title">${this.utils.escapeHTML(n.title)}</div>
                    <div class="notification-time">${this.utils.formatRelativeTime(n.timestamp)}</div>
                </div>
            </div>
        `).join('');
    },

    handleNotificationClick: function (id, productId, type, otherPhone) {
        if (type === 'offer') {
            this.showScreen('offers');
        } else if (type === 'message') {
            if (otherPhone) {
                this.openChat(otherPhone);
            } else {
                this.showScreen('messages');
            }
        } else if (productId) {
            this.showProductDetails(productId);
        }
        this.toggleNotifications(); // Menüyü kapat
    },

    clearNotifications: function () {
        this.state.notifications = [];
        this.updateNotificationBadge();
        this.renderNotifications();
    },

    autoRenewProduct: async function (id, newPrice) {
        try {
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24);
            await db.collection('products').doc(id).update({
                price: newPrice,
                previousPrice: newPrice + (newPrice * 0.05), // Yaklaşık eski fiyat
                expiresAt: firebase.firestore.Timestamp.fromDate(expiresAt),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log(`İlan ${id} otomatik yenilendi.`);
        } catch (err) { console.error("Auto renew error:", err); }
    },

    // --- Admin Logic Removed for External Dashboard ---


    suggestSafePoint: async function () {
        if (!this.currentChat) return;
        const product = this.state.products.find(p => p.id === this.currentChat.productId);
        if (!product) return;

        // Eğer kullanıcı bir nokta SEÇTİYSE onu öner, seçmediyse en yakını bul
        let sp = this.state.selectedSafePoint;

        if (!sp) {
            this.toast('Yakın mekanlar taranıyor...', 'info');
            const nearby = await this.fetchNearbySafePoints(product.lat, product.lng);
            const all = [...(this.state.safePoints || []), ...nearby];
            sp = all
                .map(p => ({
                    ...p,
                    distance: this.utils.calculateDistance(product.lat, product.lng, p.lat, p.lng)
                }))
                .sort((a, b) => a.distance - b.distance)[0];
        }

        if (!sp) return this.toast('Yakınlarda kayıtlı güvenli nokta veya kafe bulunamadı.', 'error');

        const myPhone = this.state.user?.phone;
        const chatData = {
            productId: this.currentChat.productId,
            buyerPhone: this.currentChat.buyerPhone || (this.currentChat.otherPhone === myPhone ? 'Unknown' : this.currentChat.otherPhone),
            sellerPhone: this.currentChat.sellerPhone || (this.currentChat.otherPhone === myPhone ? 'Unknown' : this.currentChat.otherPhone),
            senderPhone: myPhone,
            text: `ÄŸÅ¸â€œÂ Güvenli Buluşma Noktası Önerisi: ${sp.name}`,
            type: 'safe-point',
            pointId: sp.id,
            pointName: sp.name,
            pointDesc: sp.description || 'Popüler Buluşma Noktası',
            lat: sp.lat,
            lng: sp.lng,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Alıcı ve satıcı telefonlarını düzgün eşle
        if (myPhone === product.ownerPhone) {
            chatData.sellerPhone = myPhone;
            chatData.buyerPhone = this.currentChat.otherPhone;
        } else {
            chatData.buyerPhone = myPhone;
            chatData.sellerPhone = this.currentChat.otherPhone;
        }

        db.collection('chats').add(chatData)
            .then(() => {
                this.toast('Buluşma noktası önerildi. ✨');
                this.state.selectedSafePoint = null; // Sıfırla
            })
            .catch(err => this.toast('Hata: ' + err.message, 'error'));
    },

    updateUserLocation: function () {
        if (!navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                this.state.user.location = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude
                };
                console.log("Viewer location updated:", this.state.user.location);
                // Konum gelince listeleri yenile
                this.renderProducts();
                const detailModal = document.getElementById('product-detail-modal');
                if (detailModal && detailModal.style.display === 'block' && this.currentProductId) {
                    this.showProductDetails(this.currentProductId);
                }
            },
            (err) => console.warn("Could not get viewer location:", err.message),
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    },

    showLoader: function () {
        const loader = document.getElementById('loading-overlay');
        if (loader) {
            loader.style.display = 'flex';
            loader.style.opacity = '1';
        }
    },

    hideLoader: function () {
        const loader = document.getElementById('loading-overlay');
        if (loader && loader.style.display !== 'none') {
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.display = 'none';
            }, 300);
        }
    },

    renderSafeMap: async function (lat, lng, productId) {
        const mapContainer = document.getElementById('detail-map');
        if (!mapContainer) return;

        // Eski haritayı temizle
        if (this.state.mapInstance) {
            this.state.mapInstance.remove();
        }

        // Dinamik olarak yakınlardaki mekanları çek
        const dynamicPoints = await this.fetchNearbySafePoints(lat, lng);

        // Haritayı başlat
        this.state.mapInstance = L.map('detail-map', {
            zoomControl: false,
            attributionControl: false
        }).setView([lat, lng], 14);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.state.mapInstance);

        // İlan konumu marker'ı
        const productIcon = L.divIcon({
            html: `<i class="fas fa-location-dot" style="font-size: 1.5rem; color: var(--accent); filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));"></i>`,
            className: 'product-map-icon',
            iconSize: [24, 24],
            iconAnchor: [12, 24]
        });
        L.marker([lat, lng], { icon: productIcon }).addTo(this.state.mapInstance);

        // Yakındaki güvenli noktaları bul ve göster (Dinamik + Sabit)
        const safePointsList = document.getElementById('safe-points-list');
        if (safePointsList) safePointsList.innerHTML = '';

        const allPoints = [...(this.state.safePoints || []), ...dynamicPoints];

        // Partnerleri ayır ve en başa al
        const nearbyPoints = allPoints
            .map(sp => ({
                ...sp,
                distance: this.utils.calculateDistance(lat, lng, sp.lat, sp.lng)
            }))
            .sort((a, b) => {
                // Önce partnerlik (isPartner), sonra mesafe
                if (a.isPartner && !b.isPartner) return -1;
                if (!a.isPartner && b.isPartner) return 1;
                return a.distance - b.distance;
            })
            .slice(0, 6);

        nearbyPoints.forEach(sp => {
            const isPartner = sp.isPartner;

            // Haritaya marker ekle
            const markerIcon = L.divIcon({
                html: `<i class="fas fa-shield-halved" style="font-size: ${isPartner ? '1.5rem' : '1.2rem'}; color: ${isPartner ? '#fbbf24' : 'var(--primary)'}; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));"></i>`,
                className: isPartner ? 'partner-map-icon' : 'safe-map-icon',
                iconSize: [20, 20],
                iconAnchor: [10, 20]
            });

            L.marker([sp.lat, sp.lng], { icon: markerIcon })
                .addTo(this.state.mapInstance)
                .bindPopup(`<b>${isPartner ? 'Ã¢Â­Â ' : ''}${sp.name}</b><br>${sp.description || 'Güvenli Buluşma Noktası'}`);

            // Listeye ekle
            if (safePointsList) {
                const item = document.createElement('div');
                item.className = `safe-point-item ${isPartner ? 'is-partner' : ''}`;
                item.innerHTML = `
                    <div class="safe-point-icon ${isPartner ? 'partner-icon' : ''}">
                        <i class="fas fa-shield-halved"></i>
                    </div>
                    <div class="safe-point-info" style="flex: 1;">
                        ${isPartner ? '<span class="partner-badge">Ã¢Â­Â Partner İşletme</span>' : ''}
                        <h4 style="color: var(--text-main);">${sp.name}</h4>
                        <p style="color: var(--text-muted);">${sp.description || 'Popüler Buluşma Noktası'}</p>
                    </div>
                    <div class="safe-point-distance ${isPartner ? 'is-partner' : ''}">
                        ${this.utils.formatDistance(sp.distance)}
                    </div>
                `;
                item.onclick = () => {
                    this.state.mapInstance.setView([sp.lat, sp.lng], 16);
                    this.toast(`${sp.name} seçildi. Sohbetten önerebilirsiniz.`, 'info');
                    // Seçilen noktayı state'e kaydet (sohbette önermek için)
                    this.state.selectedSafePoint = sp;
                };
                safePointsList.appendChild(item);
            }
        });

        // Harita geç render edildiği için boyutunu tazele
        setTimeout(() => this.state.mapInstance.invalidateSize(), 300);
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

    openImagePreview: function (url) {
        const modal = document.getElementById('modal-image-preview');
        const img = document.getElementById('preview-img');
        if (!modal || !img) return;

        img.src = url;
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Scroll'u kilitle
    },

    closeImagePreview: function () {
        const modal = document.getElementById('modal-image-preview');
        if (modal) modal.style.display = 'none';
        document.body.style.overflow = 'auto'; // Scroll'u aç
    },

    openPartnerModal: function () {
        const modal = document.getElementById('modal-partner-app');
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            // Formu temizle
            const nameEl = document.getElementById('partner-apply-name');
            const descEl = document.getElementById('partner-apply-desc');
            const locEl = document.getElementById('partner-apply-loc-name');
            const latEl = document.getElementById('partner-apply-lat');
            const lngEl = document.getElementById('partner-apply-lng');
            if (nameEl) nameEl.value = '';
            if (descEl) descEl.value = '';
            if (locEl) locEl.value = '';
            if (latEl) latEl.value = '';
            if (lngEl) lngEl.value = '';
        }
    },

    closePartnerModal: function () {
        const modal = document.getElementById('modal-partner-app');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
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
                document.getElementById('partner-apply-loc-name').value = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                icon.className = originalClass;
                this.toast('Konum başarıyla alındı. ÄŸÅ¸â€œÂ');
            },
            (err) => {
                icon.className = originalClass;
                this.toast('Konum alınamadı: ' + err.message, 'error');
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    },

    submitPartnerApplication: async function () {
        const name = document.getElementById('partner-apply-name').value.trim();
        const desc = document.getElementById('partner-apply-desc').value.trim();
        const lat = document.getElementById('partner-apply-lat').value;
        const lng = document.getElementById('partner-apply-lng').value;

        if (!name || !desc || !lat || !lng) {
            this.toast('Lütfen tüm alanları doldurun ve konumunuzu alın.', 'warning');
            return;
        }

        const user = firebase.auth().currentUser;
        if (!user) {
            this.toast('Başvuru için giriş yapmalısınız.', 'error');
            return;
        }

        try {
            const btn = document.getElementById('btn-partner-submit');
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gönderiliyor...';
            }

            await db.collection('partner_applications').add({
                userId: user.uid,
                userName: this.state.user.displayName || user.displayName || 'İsimsiz Kullanıcı',
                userPhone: this.state.user.phone || '',
                businessName: name,
                businessDesc: desc,
                lat: parseFloat(lat),
                lng: parseFloat(lng),
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Local State Update
            if (this.state.user) {
                this.state.user.partnerStatus = 'pending';
            }

            this.toast('Başvurunuz alındı! Admin onayından sonra haritada güvenli nokta olarak yer alacaksınız. ÄŸÅ¸Å¡â‚¬', 'success');
            this.closePartnerModal();
            this.renderProfile();
            this.renderSettings();
        } catch (err) {
            console.error("Partner application error:", err);
            this.toast('Başvuru gönderilirken bir hata oluştu: ' + err.message, 'error');
            const btn = document.getElementById('btn-partner-submit');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = 'Başvuruyu Gönder ÄŸÅ¸Å¡â‚¬';
            }
        }
    },

    openEsnafModal: function () {
        const modal = document.getElementById('modal-esnaf-app');
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            // Formu temizle
            document.getElementById('esnaf-apply-name').value = '';
            document.getElementById('esnaf-apply-desc').value = '';
            document.getElementById('esnaf-apply-loc-name').value = '';
            document.getElementById('esnaf-apply-lat').value = '';
            document.getElementById('esnaf-apply-lng').value = '';
        }
    },

    closeEsnafModal: function () {
        const modal = document.getElementById('modal-esnaf-app');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
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
                document.getElementById('esnaf-apply-loc-name').value = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                icon.className = originalClass;
                this.toast('Konum başarıyla alındı. ÄŸÅ¸â€œÂ');
            },
            (err) => {
                icon.className = originalClass;
                this.toast('Konum alınamadı: ' + err.message, 'error');
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    },

    submitEsnafApplication: async function () {
        const name = document.getElementById('esnaf-apply-name').value.trim();
        const desc = document.getElementById('esnaf-apply-desc').value.trim();
        const lat = document.getElementById('esnaf-apply-lat').value;
        const lng = document.getElementById('esnaf-apply-lng').value;

        if (!name || !desc || !lat || !lng) {
            this.toast('Lütfen tüm alanları doldurun ve konumunuzu alın.', 'warning');
            return;
        }

        const user = firebase.auth().currentUser;
        if (!user) {
            this.toast('Başvuru için giriş yapmalısınız.', 'error');
            return;
        }

        try {
            const btn = document.getElementById('btn-esnaf-submit');
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gönderiliyor...';
            }

            await db.collection('esnaf_applications').add({
                userId: user.uid,
                userName: this.state.user.displayName || user.displayName || 'İsimsiz Kullanıcı',
                userPhone: this.state.user.phone || '',
                businessName: name,
                businessDesc: desc,
                lat: parseFloat(lat),
                lng: parseFloat(lng),
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Local State Update
            if (this.state.user) {
                this.state.user.esnafStatus = 'pending';
            }

            this.toast('Esnaf başvurunuz alındı! Onaydan sonra vitrini tam yetkiyle kullanabilirsiniz. ÄŸÅ¸Å¡â‚¬', 'success');
            this.closeEsnafModal();
            this.renderProfile();
            this.renderSettings();
        } catch (err) {
            console.error("Esnaf application error:", err);
            this.toast('Başvuru gönderilirken bir hata oluştu: ' + err.message, 'error');
            const btn = document.getElementById('btn-esnaf-submit');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = 'Başvuruyu Gönder ÄŸÅ¸Å¡â‚¬';
            }
        }
    },

    resendVerificationEmail: async function () {
        const user = auth.currentUser;
        if (!user) return;

        const btn = document.getElementById('resend-email-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Gönderiliyor...';
        }

        try {
            const actionCodeSettings = {
                url: window.location.origin,
                handleCodeInApp: false
            };
            await user.sendEmailVerification(actionCodeSettings);
            this.toast('Doğrulama maili tekrar gönderildi! ÄŸÅ¸â€œÂ§', 'success');
            if (btn) {
                let seconds = 60;
                const timer = setInterval(() => {
                    seconds--;
                    btn.textContent = `Tekrar Gönder (${seconds}s)`;
                    if (seconds <= 0) {
                        clearInterval(timer);
                        btn.disabled = false;
                        btn.textContent = 'Doğrulama Mailini Tekrar Gönder ÄŸÅ¸â€œÂ§';
                    }
                }, 1000);
            }
        } catch (err) {
            console.error("Resend error:", err);
            this.toast('Hata: ' + err.message, 'error');
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Doğrulama Mailini Tekrar Gönder ÄŸÅ¸â€œÂ§';
            }
        }
    },

    // --- Quick Deal Functions ---
    quickDealImage: null,

    handleQuickImageSelect: function (event) {
        const file = event.target.files[0];
        if (file) {
            this.quickDealImage = file;
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.getElementById('quick-photo-preview');
                const placeholder = document.getElementById('quick-photo-placeholder');
                if (preview) {
                    preview.src = e.target.result;
                    preview.style.display = 'block';
                }
                if (placeholder) placeholder.style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    },

    calculateQuickDiscount: function () {
        const oldPrice = parseFloat(document.getElementById('quick-old-price')?.value) || 0;
        const newPrice = parseFloat(document.getElementById('quick-price')?.value) || 0;
        const badge = document.getElementById('quick-discount-badge');

        if (oldPrice > 0 && newPrice > 0 && oldPrice > newPrice) {
            const discount = Math.round(((oldPrice - newPrice) / oldPrice) * 100);
            if (badge) {
                badge.textContent = `-%${discount}`;
                badge.style.display = 'block';
            }
        } else {
            if (badge) badge.style.display = 'none';
        }
    },

    setQuickDealType: function (type, btn) {
        document.getElementById('quick-deal-type').value = type;
        document.querySelectorAll('.quick-type-chip').forEach(chip => chip.classList.remove('active'));
        if (btn) btn.classList.add('active');
    },

    uploadImage: async function (file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const compressed = await this.utils.compressImage(e.target.result);
                    resolve(compressed);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
        });
    },

    submitQuickDeal: async function () {
        if (!this.checkAuth()) return;

        const title = document.getElementById('quick-title')?.value?.trim();
        const price = parseFloat(document.getElementById('quick-price')?.value) || 0;
        const oldPrice = parseFloat(document.getElementById('quick-old-price')?.value) || 0;
        const dealType = document.getElementById('quick-deal-type')?.value || 'indirim';

        if (!title) {
            this.toast('Lütfen ürün adı girin.', 'error');
            return;
        }
        if (!this.quickDealImage) {
            this.toast('Lütfen bir fotoğraf ekleyin.', 'error');
            return;
        }
        if (price <= 0) {
            this.toast('Lütfen geçerli bir fiyat girin.', 'error');
            return;
        }

        const btn = document.getElementById('btn-quick-submit');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Paylaşılıyor...';
        }

        try {
            // Upload image
            const imageUrl = await this.uploadImage(this.quickDealImage);

            // Get user's esnaf info
            const shopName = this.state.user.shopName || this.state.user.displayName;
            const shopLocationName = this.state.user.shopLocation || this.state.user.locationName || '';
            const shopLat = this.state.user.shopLat || this.state.user.lat || 41.0082;
            const shopLng = this.state.user.shopLng || this.state.user.lng || 28.9784;
            const city = this.state.user.shopCity || this.state.user.city || 'İstanbul';

            const productData = {
                title,
                description: `${shopName} tarafından paylaşılan ${dealType === 'indirim' ? 'indirimli' : dealType === 'serisonu' ? 'seri sonu' : 'teşhir'} ürün.`,
                price,
                oldPrice: oldPrice > 0 ? oldPrice : null,
                dealType,
                category: 'diger',
                condition: 'Yeni gibi',
                image: imageUrl,
                images: [imageUrl],
                ownerId: this.state.user.uid,
                ownerName: this.state.user.displayName,
                ownerPhone: this.state.user.phone || '',
                ownerEmail: this.state.user.email || '',
                shopName,
                shopLocationName,
                lat: shopLat,
                lng: shopLng,
                city,
                locationName: shopLocationName,
                isEsnaf: true,
                isFree: false,
                isBulk: false,
                isService: false,
                status: 'active',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 saat
            };

            await db.collection('products').add(productData);

            this.toast('Fırsat başarıyla paylaşıldı! ÄŸÅ¸Ââ€°', 'success');

            // Reset form
            this.quickDealImage = null;
            document.getElementById('quick-title').value = '';
            document.getElementById('quick-price').value = '';
            document.getElementById('quick-old-price').value = '';
            document.getElementById('quick-photo-preview').style.display = 'none';
            document.getElementById('quick-photo-placeholder').style.display = 'block';
            document.getElementById('quick-discount-badge').style.display = 'none';
            document.getElementById('quick-deal-type').value = 'indirim';
            document.querySelectorAll('.quick-type-chip').forEach((chip, i) => {
                chip.classList.toggle('active', i === 0);
            });

            this.showScreen('home');

        } catch (err) {
            console.error('Quick deal error:', err);
            this.toast('Hata: ' + err.message, 'error');
        } finally {
        }
    },

    // --- Seller Profile Logic ---
    showSellerProfile: async function (userId) {
        if (!userId || userId === 'undefined' || userId === 'null') {
            this.toast('Kullanıcı bilgisi eksik.', 'warning');
            return;
        }

        this.currentSellerId = userId;
        this.currentSellerTab = 'ads';
        this.currentSellerName = 'Komşu';
        this.currentSellerShopName = null;
        this.currentSellerPhone = null;

        const modal = document.getElementById('seller-profile-modal');
        if (modal) modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        try {
            // 1. Satıcı Bilgilerini Çek
            const userDoc = await db.collection('users').doc(userId).get();
            if (!userDoc.exists) return this.toast('Kullanıcı bulunamadı.', 'error');
            const userData = userDoc.data();

            const isEsnaf = (userData.esnafStatus === 'approved');
            const shopName = userData.shopName || userData.businessName;

            // UI Güncelle
            const sNameEl = document.getElementById('seller-name');
            const sLocEl = document.getElementById('seller-location');

            if (sNameEl) {
                if (isEsnaf && shopName) {
                    // Esnafsa hem kişi adını hem işletme adını göster
                    sNameEl.innerHTML = `${userData.displayName || 'İsimsiz Satıcı'} <span style="display: block; font-size: 0.75rem; font-weight: 600; color: #0d9488; margin-top: 2px;">ÄŸÅ¸ÂÂª ${shopName}</span>`;
                } else {
                    sNameEl.innerText = userData.displayName || 'İsimsiz Satıcı';
                }
            }

            // Store for contact buttons
            this.currentSellerName = userData.displayName || shopName || 'Komşu';
            this.currentSellerShopName = shopName || null;
            this.currentSellerPhone = userData.phone || null;

            const locName = userData.locationName || 'Konum Belirtilmemiş';
            if (sLocEl) {
                sLocEl.innerHTML = `<i class="fas fa-location-dot"></i> ${locName}`;
                sLocEl.style.display = isEsnaf ? 'none' : 'block'; // Esnafsa mükerrer olmasın
            }

            // Banner ve Header Ayarı
            const banner = document.getElementById('seller-banner');
            const simpleHeader = document.getElementById('seller-header-simple');
            const avatarDiv = document.getElementById('seller-avatar');
            const identityContainer = document.getElementById('seller-identity-container');
            const esnafBadge = document.getElementById('esnaf-badge-main');

            if (isEsnaf) {
                // Esnaf Görünümü (Professional)
                if (banner) {
                    banner.style.display = 'block';
                    banner.classList.remove('seller-banner-hidden');
                    if (userData.bannerURL) {
                        banner.style.backgroundImage = `url('${userData.bannerURL}')`;
                    } else {
                        banner.style.backgroundImage = 'linear-gradient(135deg, #00ADEF 0%, #0d9488 100%)';
                    }
                }
                if (simpleHeader) simpleHeader.style.display = 'none';
                if (avatarDiv) avatarDiv.classList.add('seller-avatar-offset');
                if (identityContainer) identityContainer.style.marginTop = '-24px';
                if (esnafBadge) esnafBadge.style.display = 'inline-flex';

                // Show Askida tab for Esnaf
                const askidaTab = document.getElementById('seller-tab-askida');
                if (askidaTab) askidaTab.style.display = 'block';

                // Show decorative awning for Esnaf
                const awning = document.getElementById('seller-awning');
                if (awning) awning.style.display = 'block';
            } else {
                // Standart Profil (Simple)
                if (banner) banner.style.display = 'none';

                // Hide awning for regular users
                const awning = document.getElementById('seller-awning');
                if (awning) awning.style.display = 'none';

                if (simpleHeader) {
                    simpleHeader.style.display = 'block';
                    simpleHeader.style.height = '40px';
                }
                if (avatarDiv) avatarDiv.classList.remove('seller-avatar-offset');
                if (identityContainer) identityContainer.style.marginTop = '0';
                if (esnafBadge) esnafBadge.style.display = 'none';

                // Hide Askida tab for regular users
                const askidaTab = document.getElementById('seller-tab-askida');
                if (askidaTab) askidaTab.style.display = 'none';
            }

            // Ekstra Bilgiler (Esnafsa)
            const extraInfo = document.getElementById('seller-info-extra');
            if (extraInfo) {
                if (isEsnaf) {
                    extraInfo.style.display = 'block';
                    const addrText = document.getElementById('seller-address-text');
                    if (addrText) addrText.innerText = 'ÄŸÅ¸â€œÂ İşletme Konumuna Git'; // Sabit yönlendirme metni

                    const hoursText = document.getElementById('seller-hours-text');
                    if (hoursText) {
                        hoursText.innerText = userData.workingHours ? `Açık: ${userData.workingHours}` : 'Çalışma saatleri belirtilmemiş';
                    }

                    // Adres tıklama (Maps)
                    const addressDiv = document.getElementById('seller-address');
                    if (addressDiv) {
                        addressDiv.onclick = () => {
                            const targetLat = userData.shopLat || userData.lat || userData.location?.lat;
                            const targetLng = userData.shopLng || userData.lng || userData.location?.lng;
                            if (targetLat && targetLng) {
                                this.openGoogleMaps(targetLat, targetLng, shopName || userData.displayName);
                            } else {
                                this.toast('İşletme konumu tanımlanmamış.', 'warning');
                            }
                        };
                    }
                } else {
                    extraInfo.style.display = 'none';
                }
            }

            // Profil Resmi
            const avatar = document.getElementById('seller-avatar');
            if (avatar) {
                if (userData.photoURL) {
                    avatar.innerHTML = `<img loading="lazy" src="${userData.photoURL}" style="width:100%; height:100%; object-fit:cover;">`;
                } else {
                    avatar.innerHTML = `<i class="fas fa-user" style="font-size: 2rem; color: white;"></i>`;
                }
            }

            // WhatsApp Butonu
            const waBtn = document.getElementById('seller-whatsapp-btn');
            if (waBtn) {
                waBtn.style.display = userData.phone ? 'flex' : 'none';
            }

            // Askıda Butonu (Esnafsa ve başkası bakıyorsa)
            const askidaBtn = document.getElementById('seller-askida-btn');
            if (askidaBtn) {
                if (isEsnaf && userId !== this.state.user?.uid) {
                    askidaBtn.style.display = 'flex';
                } else {
                    askidaBtn.style.display = 'none';
                }
            }

            // 2. Satıcının ilanlarını doğrudan Firebase'den çek
            const productsSnapshot = await db.collection('products')
                .where('ownerId', '==', userId)
                .where('status', '==', 'active')
                .get();

            const sellerAds = [];
            productsSnapshot.forEach(doc => {
                sellerAds.push({ id: doc.id, ...doc.data() });
            });
            this.state.currentSellerAds = sellerAds; // İlanları geçici olarak sakla

            const sellerRatings = this.state.ratings.filter(r => r.sellerId === userId);

            const avgRating = sellerRatings.length > 0
                ? (sellerRatings.reduce((acc, curr) => acc + curr.score, 0) / sellerRatings.length).toFixed(1)
                : '0.0';

            const positiveRatings = sellerRatings.filter(r => r.score >= 4).length;
            const positivePercent = sellerRatings.length > 0
                ? Math.round((positiveRatings / sellerRatings.length) * 100)
                : 100;

            const adsCountEl = document.getElementById('seller-ad-count');
            const ratingScoreEl = document.getElementById('seller-rating-score');
            const positiveRateEl = document.getElementById('seller-positive-rate');

            if (adsCountEl) adsCountEl.innerText = sellerAds.length;
            if (ratingScoreEl) ratingScoreEl.innerText = avgRating;
            if (positiveRateEl) positiveRateEl.innerText = positivePercent + '%';

            // 3. Rozetleri Render Et
            this.renderSellerBadges(userData);

            // 4. İlanları Render Et (Varsayılan Sekme)
            this.switchSellerTab('ads');

            // 5. Kendisiyse mesaj butonunu gizle
            const msgBtn = document.getElementById('seller-message-btn');
            if (msgBtn) {
                msgBtn.style.display = (this.state.user && this.state.user.uid === userId) ? 'none' : 'flex';
            }

        } catch (err) {
            console.error("Seller profile error:", err);
            this.toast('Profil yüklenirken hata oluştu.', 'error');
        }
    },

    closeSellerProfile: function () {
        const modal = document.getElementById('seller-profile-modal');
        if (modal) modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    },

    renderSellerBadges: function (user) {
        const container = document.getElementById('seller-badges');
        if (!container) return;

        let html = '';
        const badges = user.badges || {};

        if (user.emailVerified) html += `<span class="badge-mini" title="E-posta Doğrulandı" style="background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; gap: 4px;"><i class="fas fa-check-circle"></i> E-posta</span>`;
        if (badges.phone_verified || user.phone) {
            const phoneNumber = user.phone || '';
            html += `<a href="tel:${phoneNumber}" class="badge-mini" title="Telefonu Ara" style="background: #f0fdf4; color: #166534; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; gap: 4px; text-decoration: none;"><i class="fas fa-phone"></i> ${phoneNumber || 'Telefon'}</a>`;
        }
        if (user.esnafStatus === 'approved') html += `<span class="badge-mini" title="Onaylı Esnaf" style="background: #f0fdfa; color: #0d9488; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; gap: 4px;"><i class="fas fa-store"></i> Esnaf</span>`;
        if (badges.is_founder) html += `<span class="badge-mini" title="Kurucu Üye" style="background: #fff1f2; color: #9f1239; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; gap: 4px;"><i class="fas fa-medal"></i> Kurucu</span>`;

        container.innerHTML = html || '<p style="font-size: 0.75rem; color: var(--text-muted);">Henüz rozet yok</p>';
    },

    switchSellerTab: function (tab) {
        this.currentSellerTab = tab;
        const adsBtn = document.getElementById('seller-tab-ads');
        const revBtn = document.getElementById('seller-tab-reviews');
        const askBtn = document.getElementById('seller-tab-askida');
        const content = document.getElementById('seller-content');
        if (!content) return;

        if (tab === 'ads') {
            if (adsBtn) {
                adsBtn.style.color = 'var(--primary)';
                adsBtn.style.borderBottomColor = 'var(--primary)';
            }
            if (revBtn) {
                revBtn.style.color = 'var(--text-muted)';
                revBtn.style.borderBottomColor = 'transparent';
            }

            const sellerAds = this.state.currentSellerAds || [];
            if (sellerAds.length === 0) {
                content.innerHTML = `<div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
                    <i class="fas fa-box-open" style="font-size: 2.5rem; margin-bottom: 12px; opacity: 0.2;"></i>
                    <p>Aktif ilanı bulunmuyor.</p>
                </div>`;
            } else {
                let adsHtml = '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">';
                sellerAds.forEach(p => {
                    adsHtml += `
                        <div onclick="app.closeSellerProfile(); app.showProductDetails('${p.id}')" style="background: white; border-radius: 14px; overflow: hidden; border: 1px solid var(--border-color); cursor: pointer;">
                            <div style="height: 100px; background: url('${p.image}') center/cover no-repeat;"></div>
                            <div style="padding: 10px;">
                                <div style="font-size: 0.8rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.title}</div>
                                <div style="font-size: 0.85rem; font-weight: 800; color: var(--primary); margin-top: 4px;">${p.price}₺</div>
                            </div>
                        </div>
                    `;
                });
                adsHtml += '</div>';
                content.innerHTML = adsHtml;
            }
        } else if (tab === 'askida') {
            if (askBtn) {
                askBtn.style.color = 'var(--primary)';
                askBtn.style.borderBottomColor = 'var(--primary)';
            }
            [adsBtn, revBtn].forEach(btn => {
                if (btn) {
                    btn.style.color = 'var(--text-muted)';
                    btn.style.borderBottomColor = 'transparent';
                }
            });

            // Fetch shares where esnafId matches currentSellerId and category is 'Askıda'
            this.renderSellerAskidaContent(content);
        } else {
            if (revBtn) {
                revBtn.style.color = 'var(--primary)';
                revBtn.style.borderBottomColor = 'var(--primary)';
            }
            if (adsBtn) {
                adsBtn.style.color = 'var(--text-muted)';
                adsBtn.style.borderBottomColor = 'transparent';
            }

            const sellerReviews = this.state.ratings.filter(r => r.sellerId === this.currentSellerId);
            if (sellerReviews.length === 0) {
                content.innerHTML = `<div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
                    <i class="fas fa-star" style="font-size: 2.5rem; margin-bottom: 12px; opacity: 0.2;"></i>
                    <p>Henüz değerlendirme yapılmamış.</p>
                </div>`;
            } else {
                let revHtml = '<div style="display: flex; flex-direction: column; gap: 12px;">';
                sellerReviews.forEach(r => {
                    const time = this.utils.formatRelativeTime(r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt));
                    revHtml += `
                        <div style="background: #f8fafc; padding: 12px; border-radius: 12px; border: 1px solid var(--border-color);">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <div style="font-weight: 700; font-size: 0.85rem;">${r.buyerName || 'İsimsiz Kullanıcı'}</div>
                                <div style="color: #f59e0b; font-size: 0.8rem;">${'Ã¢Ëœâ€¦'.repeat(r.score)}${'Ã¢Ëœâ€ '.repeat(5 - r.score)}</div>
                            </div>
                            <p style="font-size: 0.8rem; color: var(--text-main); margin: 0; line-height: 1.4;">${r.comment || 'Yorum belirtilmemiş.'}</p>
                            ${r.tags && r.tags.length > 0 ? `
                                <div class="review-tags-display">
                                    ${r.tags.map(tag => `<span class="review-badge">${tag}</span>`).join('')}
                                </div>
                            ` : ''}
                            <div style="font-size: 0.65rem; color: var(--text-muted); margin-top: 8px; text-align: right;">${time}</div>
                        </div>
                    `;
                });
                revHtml += '</div>';
                content.innerHTML = revHtml;
            }
        }
    },

    renderSellerAskidaContent: async function (container) {
        if (!this.currentSellerId) return;
        container.innerHTML = '<div style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Yükleniyor...</div>';

        try {
            const snapshot = await db.collection('shares')
                .where('esnafId', '==', this.currentSellerId)
                .where('category', '==', 'Askıda')
                .get();

            if (snapshot.empty) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
                        <i class="fas fa-hand-holding-heart" style="font-size: 2.5rem; margin-bottom: 12px; opacity: 0.2;"></i>
                        <p>Bu dükkanda şu an askıda ürün bulunmuyor.</p>
                    </div>`;
                return;
            }

            let html = '<div style="display: flex; flex-direction: column; gap: 12px;">';
            snapshot.forEach(doc => {
                const data = doc.data();
                const time = this.utils.formatRelativeTime(data.createdAt?.toDate ? data.createdAt.toDate() : new Date());
                html += `
                    <div style="background: white; padding: 16px; border-radius: 16px; border: 1px solid #99f6e4; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                            <div style="font-weight: 800; color: #0d9488; font-size: 1rem;">${this.utils.escapeHTML(data.content)}</div>
                            <div style="background: #f0fdfa; color: #0d9488; font-size: 0.7rem; font-weight: 800; padding: 2px 8px; border-radius: 6px; border: 1px solid #99f6e4;">${data.claimCode || 'KODSUZ'}</div>
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
                            <i class="fas fa-user-circle"></i> Bırakan: ${this.utils.escapeHTML(data.userName || 'Komşu')}
                        </div>
                        <div style="font-size: 0.65rem; color: var(--text-muted); margin-top: 8px; text-align: right;">${time}</div>
                    </div>
                `;
            });
            html += '</div>';
            container.innerHTML = html;
        } catch (e) {
            console.error('Askida load error:', e);
            container.innerHTML = '<p style="text-align: center; padding: 20px; color: var(--accent);">Yüklenemedi.</p>';
        }
    },

    messageSellerFromProfile: function () {
        if (!this.currentSellerId) return;

        // Try to find a reference product, but don't block if not found
        const product = this.state.products.find(p => p.ownerId === this.currentSellerId);

        this.closeSellerProfile();
        this.openChat(product ? product.id : null, this.currentSellerPhone, this.currentSellerName);
    },

    callSellerFromProfile: async function () {
        if (!this.currentSellerPhone) return this.toast('Telefon numarası bulunamadı.', 'error');
        window.location.href = `tel:${this.currentSellerPhone}`;
    },

    whatsappSellerFromProfile: async function () {
        if (!this.currentSellerPhone) return this.toast('WhatsApp numarası bulunamadı.', 'error');

        const phone = this.currentSellerPhone.replace(/\D/g, '');
        const message = encodeURIComponent('Merhaba, Yanımdaki profilinizi gördüm, sizinle iletişime geçmek istiyorum.');
        window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    },

    // --- AR (Artırılmış Gerçeklik) Modu Fonksiyonları ---
    arLog: function (msg) {
        console.log("[AR Debug]", msg);
        const logEl = document.getElementById('ar-debug-log');
        if (logEl) {
            const time = new Date().toLocaleTimeString().split(' ')[0];
            logEl.innerHTML += `<br>[${time}] > ${msg}`;
            if (logEl.innerHTML.split('<br>').length > 15) {
                logEl.innerHTML = logEl.innerHTML.split('<br>').slice(-15).join('<br>');
            }
        }
    },

    startARVideoManual: function () {
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
    },

    initARMode: async function () {
        this.toast('AR Modu Hazırlanıyor...', 'info');

        const logEl = document.getElementById('ar-debug-log');
        if (logEl) logEl.innerHTML = 'AR v4: Starting...';
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
                    facingMode: 'environment', // Veya specific constraints
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
            let errMsg = 'Kamera erişimi sağlanamadı.';
            if (err.name === 'NotAllowedError') errMsg = 'Kamera izni reddedildi. Lütfen ayarlardan izin verin.';
            else if (err.name === 'NotFoundError') errMsg = 'Kamera bulunamadı.';
            else if (err.name === 'NotReadableError') errMsg = 'Kamera şu an başka bir uygulama tarafından kullanılıyor olabilir.';
            else if (err.name === 'SecurityError') errMsg = 'Güvenlik hatası: Kamera erişimi engellendi (HTTPS gerekli).';

            this.toast(errMsg, 'error');
            setTimeout(() => this.showScreen('home'), 2000);
        }
    },

    stopARMode: function () {
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
    },

    updateARView: function () {
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
        const radius = 5000; // 5km içindeki ilanlar (daha geniş alan)

        // Yakındaki ilanları filtrele
        const allProducts = this.state.products || [];
        const nearbyProducts = allProducts.filter(p => {
            if (!p.lat || !p.lng) return false;
            const dist = this.calculateDistance(userLat, userLng, p.lat, p.lng);
            return dist <= radius;
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
                    pin.className = `ar-pin ${p.category === 'Askıda' ? 'type-askida' : (p.isFree && !p.isSwap ? 'type-free' : '')}`;
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
                const priceText = p.price > 0 ? p.price + ' TL' : (p.category === 'Askıda' ? 'ASKIDA' : 'Ücretsiz');

                pin.innerHTML = `
                    <div class="ar-pin-card" style="background: white; padding: 8px; border-radius: 12px; border: ${isMine ? '3px solid #7c3aed' : '2px solid var(--primary)'}; box-shadow: 0 8px 20px rgba(0,0,0,0.3); width: 110px; text-align: center; position: relative;">
                        ${isMine ? '<div style="position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: #7c3aed; color: white; font-size: 0.5rem; font-weight: 800; padding: 2px 8px; border-radius: 10px; white-space: nowrap; z-index: 10;">SENİN İLANIN</div>' : ''}
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
    },

    calculateBearing: function (lat1, lon1, lat2, lon2) {
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const lat1Rad = lat1 * Math.PI / 180;
        const lat2Rad = lat2 * Math.PI / 180;
        const y = Math.sin(dLon) * Math.cos(lat2Rad);
        const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
        const brng = Math.atan2(y, x) * 180 / Math.PI;
        return (brng + 360) % 360;
    },

    calculateDistance: function (lat1, lon1, lat2, lon2) {
        const R = 6371000; // Dünya yarıçapı (metre)
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());



