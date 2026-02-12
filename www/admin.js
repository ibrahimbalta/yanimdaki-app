const adminApp = {
    state: {
        ads: [],
        users: [],
        payments: [],
        reports: [],
        applications: [],
        partners: [],
        esnaf_applications: [],
        esnaflar: [],
        gallery: [],
        gallery_applications: [],
        notifications: [],
        adsense: null,
        banners: [],
        campaigns: [],
        tempBannerImage: null,
        tempCampaignImage: null,
        activeTab: 'dashboard'
    },

    init: function () {
        console.log("Admin Panel Başlatıldı...");

        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    const userDoc = await db.collection('users').doc(user.uid).get();
                    if (userDoc.exists && userDoc.data().isAdmin) {
                        document.getElementById('admin-login').style.display = 'none';
                        const adminName = userDoc.data().displayName || 'Yetkili';
                        document.getElementById('admin-name').textContent = adminName;
                        this.syncData();
                    } else {
                        this.showLoginError('Hata: Bu alana erişim yetkiniz yok.');
                        firebase.auth().signOut();
                    }
                } catch (err) {
                    this.showLoginError('Yetki kontrolü sırasında hata: ' + err.message);
                }
            } else {
                document.getElementById('admin-login').style.display = 'flex';
                this.showLoginError('Lütfen admin hesabınızla giriş yapın.');
            }
        });
    },

    showLoginError: function (msg) {
        const errorEl = document.getElementById('login-error') || document.createElement('p');
        errorEl.id = 'login-error';
        errorEl.style.color = 'var(--accent)';
        errorEl.style.fontSize = '0.9rem';
        errorEl.style.marginTop = '12px';
        errorEl.textContent = msg;
        document.querySelector('.login-card').appendChild(errorEl);
    },

    handleLogin: function () {
        window.location.href = 'index.html';
    },

    syncData: function () {
        db.collection('products').orderBy('createdAt', 'desc').onSnapshot(snap => {
            this.state.ads = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.updateStats();
            this.render();
        });

        db.collection('users').onSnapshot(snap => {
            this.state.users = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.updateStats();
            if (this.state.activeTab === 'users') this.render();
        });

        db.collection('payments').onSnapshot(snap => {
            this.state.payments = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.updateStats();
            if (this.state.activeTab === 'payments') this.render();
        });

        db.collection('reports').onSnapshot(snap => {
            this.state.reports = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.updateStats();
            if (this.state.activeTab === 'reports') this.render();
        });

        db.collection('partner_applications').orderBy('createdAt', 'desc').onSnapshot(snap => {
            this.state.applications = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.updateStats();
            if (this.state.activeTab === 'partners') this.render();
        });

        db.collection('safe_points').onSnapshot(snap => {
            this.state.partners = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.updateStats();
            if (this.state.activeTab === 'partners') this.render();
        });

        db.collection('esnaf_applications').onSnapshot(snap => {
            this.state.esnaf_applications = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.updateStats();
            if (this.state.activeTab === 'partners') this.render();
        });

        db.collection('contact_messages').orderBy('createdAt', 'desc').onSnapshot(snap => {
            const allMessages = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.state.contact_messages = allMessages.filter(m => m.type !== 'gallery_application');
            this.state.gallery_applications = allMessages.filter(m => m.type === 'gallery_application');

            this.updateStats();
            if (this.state.activeTab === 'contact_messages' || this.state.activeTab === 'gallery_applications') {
                this.render();
            }
        });

        db.collection('gallery').orderBy('order', 'asc').onSnapshot(snap => {
            this.state.gallery = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (this.state.activeTab === 'gallery') this.render();
        });

        db.collection('config').doc('adsense').onSnapshot(doc => {
            this.state.adsense = doc.exists ? doc.data() : { code: '' };
            if (this.state.activeTab === 'adsense') this.render();
        });

        db.collection('banners').orderBy('order', 'asc').onSnapshot(snap => {
            this.state.banners = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (this.state.activeTab === 'banners') this.render();
        });

        db.collection('campaigns').orderBy('createdAt', 'desc').onSnapshot(snap => {
            this.state.campaigns = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (this.state.activeTab === 'campaigns') this.render();
        });

        db.collection('notifications').where('userId', '==', 'admin').orderBy('timestamp', 'desc').onSnapshot(snap => {
            this.state.notifications = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (this.state.activeTab === 'dashboard') this.render();
        });
    },

    updateStats: function () {
        const activeAds = this.state.ads.filter(p => {
            const isSold = p.status === 'sold';
            const expiresAt = (() => {
                if (p.expiresAt) return (p.expiresAt.toDate) ? p.expiresAt.toDate() : new Date(p.expiresAt);
                if (p.createdAt) {
                    const created = (p.createdAt.toDate) ? p.createdAt.toDate() : new Date(p.createdAt);
                    return new Date(created.getTime() + 24 * 60 * 60 * 1000);
                }
                return new Date(Date.now() + 20 * 60 * 60 * 1000);
            })();
            const isExpired = expiresAt < new Date();
            return !isSold && !isExpired;
        });
        document.getElementById('stat-ads').textContent = activeAds.length;
        document.getElementById('stat-users').textContent = this.state.users.length;

        // Esnaf Sayısı
        const esnafCount = this.state.users.filter(u => (u.esnafStatus || '').toLowerCase() === 'approved').length;
        if (document.getElementById('stat-esnaf')) {
            document.getElementById('stat-esnaf').textContent = esnafCount;
        }

        // Vitrin Başvuruları (Bekleyen)
        const vitrinApps = this.state.gallery_applications.filter(a => a.status === 'pending').length;
        if (document.getElementById('stat-vitrin-apps')) {
            document.getElementById('stat-vitrin-apps').textContent = vitrinApps;
        }

        // Bekleyen Ödemeler (İlan Paketleri + Vitrin Başvuruları)
        const pendingPayments = this.state.payments.filter(p => p.status === 'pending').length;
        const totalPending = pendingPayments + vitrinApps;
        document.getElementById('stat-pending').textContent = totalPending;

        // Toplam Gelir (Onaylı İlan Paketleri + Onaylı Vitrin Başvuruları)
        const adRevenue = this.state.payments.filter(p => p.status === 'approved').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
        const vitrinRevenue = this.state.gallery_applications.filter(a => a.status === 'approved').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
        const totalRevenue = adRevenue + vitrinRevenue;
        document.getElementById('stat-revenue').textContent = totalRevenue.toLocaleString('tr-TR') + '₺';

        const partnerCount = this.state.partners.filter(p => p.isPartner).length;
        document.getElementById('stat-partners').textContent = partnerCount;
    },

    switchTab: function (tab) {
        this.state.activeTab = tab;
        document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
        if (event && event.currentTarget) {
            event.currentTarget.classList.add('active');
        }
        document.getElementById('tab-title').textContent = tab.charAt(0).toUpperCase() + tab.slice(1);

        // Mobilde sekme tıklandığında sidebar'ı kapat
        if (window.innerWidth <= 1024) {
            this.toggleSidebar();
        }

        this.render();
    },

    toggleSidebar: function () {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (sidebar && overlay) {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        }
    },

    render: function () {
        const area = document.getElementById('content-area');
        let html = '';
        switch (this.state.activeTab) {
            case 'dashboard': html = this.templates.dashboard(); break;
            case 'users': html = this.templates.users(); break;
            case 'ads': html = this.templates.ads(); break;
            case 'payments': html = this.templates.payments(); break;
            case 'reports': html = this.templates.reports(); break;
            case 'partners': html = this.templates.partners(); break;
            case 'gallery': html = this.templates.gallery(); break;
            case 'contact_messages': html = this.templates.contact_messages(); break;
            case 'gallery_applications': html = this.templates.gallery_applications(); break;
            case 'adsense': html = this.templates.adsense(); break;
            case 'banners': html = this.templates.banners(); break;
            case 'campaigns': html = this.templates.campaigns(); break;
            case 'reset': html = this.templates.reset(); break;
        }
        area.innerHTML = html;
    },

    templates: {
        dashboard: () => `
            ${adminApp.state.notifications.length > 0 ? `
                <div class="table-container" style="background: rgba(239, 68, 68, 0.02); border: 1px solid #fee2e2;">
                    <div class="table-header"><h2 style="color: #ef4444;"><i class="fas fa-triangle-exclamation"></i> Önemli Bildirimler</h2></div>
                    <div style="padding: 20px;">
                        ${adminApp.state.notifications.map(n => `
                            <div style="background: white; padding: 16px; border-radius: 16px; border: 1px solid #fee2e2; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                                <div>
                                    <div style="font-weight: 800; color: #991b1b; font-size: 1rem; margin-bottom: 4px;">${n.title}</div>
                                    <div style="font-size: 0.9rem; color: #475569; line-height: 1.4;">${n.body}</div>
                                    <div style="margin-top: 8px; font-size: 0.75rem; color: #94a3b8; font-weight: 600;"><i class="fas fa-clock"></i> ${n.timestamp ? new Date(n.timestamp.toDate ? n.timestamp.toDate() : n.timestamp).toLocaleString('tr-TR') : 'Yeni'}</div>
                                </div>
                                <button class="btn btn-danger" onclick="db.collection('notifications').doc('${n.id}').delete()" style="padding: 8px 16px;">
                                    <i class="fas fa-check"></i> Anladım
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px;">
                <div class="table-container">
                    <div class="table-header"><h2>Son Şikayetler</h2></div>
                    ${adminApp.templates.reports()}
                </div>
                <div class="table-container">
                    <div class="table-header"><h2>Bekleyen Ödemeler</h2></div>
                    ${adminApp.templates.payments()}
                </div>
            </div>
        `,
        users: () => `
            <div class="table-container">
                <div class="table-header">
                    <h2>Kayıtlı Kullanıcılar</h2>
                    <button class="btn btn-danger" onclick="adminApp.actions.deleteAllUsers()">
                        <i class="fas fa-trash-can"></i> Tümünü Sil
                    </button>
                </div>
                <div style="overflow-x: auto;">
                    <table>
                        <thead>
                            <tr>
                                <th>UID & İsim</th><th>Telefon</th><th>İlan Limiti</th><th>Yetki</th><th>İşlem</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${adminApp.state.users.map(u => {
            const isEsnaf = (u.esnafStatus || 'none').toLowerCase() === 'approved';
            const limit = u.adLimit || (isEsnaf ? 30 : 50);
            const userActiveAds = adminApp.state.ads.filter(ad => ad.ownerId === u.id && (ad.status || 'active') === 'active').length;
            const isAtLimit = userActiveAds >= limit;
            return `
                                <tr style="${isAtLimit ? 'background: rgba(239, 68, 68, 0.02);' : ''}">
                                    <td>
                                        <div style="display:flex; align-items:center; gap:12px;">
                                            <div style="width:36px; height:36px; background:#F1F5F9; border-radius:50%; display:flex; align-items:center; justify-content:center; color:var(--text-muted);">
                                                <i class="fas fa-user"></i>
                                            </div>
                                            <div>
                                                <div style="font-weight:800; color:var(--text-main);">${u.displayName || 'İsimsiz'}</div>
                                                <small style="color:var(--text-muted); font-size:0.7rem;">${u.id}</small>
                                            </div>
                                        </div>
                                    </td>
                                    <td><span style="font-weight:600;">${u.phone || '-'}</span></td>
                                    <td>
                                        <div style="display:flex; flex-direction:column; gap:4px;">
                                            <div class="badge" style="background:${isAtLimit ? '#FEE2E2' : '#E0F2FE'}; color:${isAtLimit ? '#DC2626' : '#0284C7'}; text-align:center;">
                                                ${userActiveAds} / ${limit}
                                            </div>
                                            <div style="width:100%; height:4px; background:#E2E8F0; border-radius:2px; overflow:hidden;">
                                                <div style="width:${Math.min((userActiveAds / limit) * 100, 100)}%; height:100%; background:${isAtLimit ? '#EF4444' : '#3B82F6'};"></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        ${u.isAdmin ? '<span class="badge" style="background:#EEF2FF; color:#4F46E5;">Admin</span>' :
                    isEsnaf ? '<span class="badge" style="background:#ECFDF5; color:#059669;">Esnaf</span>' :
                        '<span class="badge" style="background:#F8FAFC; color:var(--text-muted);">Standart</span>'}
                                    </td>
                                    <td>
                                        <button class="btn btn-primary" onclick="adminApp.actions.editLimit('${u.id}', ${limit})">
                                            <i class="fas fa-pen-to-square"></i> Limit
                                        </button>
                                    </td>
                                </tr>`;
        }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `,
        ads: () => `
            <div class="table-container">
                <div class="table-header"><h2>Tüm İlanlar</h2></div>
                <div style="overflow-x: auto;">
                    <table>
                        <thead>
                            <tr><th>İlan No / ID</th><th>Görsel</th><th>Başlık & Fiyat</th><th>Sahibi (Tel)</th><th>Durum</th><th>İşlem</th></tr>
                        </thead>
                <tbody>
                    ${adminApp.state.ads.map(p => {
            const isSold = p.status === 'sold';
            const expiresAt = (() => {
                if (p.expiresAt) return (p.expiresAt.toDate) ? p.expiresAt.toDate() : new Date(p.expiresAt);
                if (p.createdAt) {
                    const created = (p.createdAt.toDate) ? p.createdAt.toDate() : new Date(p.createdAt);
                    return new Date(created.getTime() + 24 * 60 * 60 * 1000);
                }
                return new Date(Date.now() + 20 * 60 * 60 * 1000);
            })();
            const isExpired = expiresAt < new Date();

            let statusHtml = '';
            if (isSold) {
                statusHtml = '<span class="badge" style="background:#F1F5F9; color:#64748B;">Satıldı</span>';
            } else if (isExpired) {
                statusHtml = '<span class="badge" style="background:#FEE2E2; color:#DC2626;">Süresi Doldu</span>';
            } else {
                statusHtml = '<span class="badge" style="background:#EEF2FF; color:#4F46E5;">Aktif</span>';
            }

            return `
                <tr>
                    <td>
                        <div style="font-weight:800; color:var(--primary); font-size:0.9rem;">#${p.adNumber || '---'}</div>
                        <small style="color:var(--text-muted); font-size:0.7rem;">${p.id}</small>
                    </td>
                    <td>
                        <div style="width:56px; height:56px; border-radius:12px; overflow:hidden; border:1px solid var(--border);">
                            <img src="${p.image}" style="width:100%; height:100%; object-fit:cover;">
                        </div>
                    </td>
                    <td>
                        <div style="font-weight:700; color:var(--text-main); margin-bottom:4px;">${p.title}</div>
                        <div class="badge" style="background:${p.isFree ? '#ECFDF5' : '#F1F5F9'}; color:${p.isFree ? '#059669' : 'var(--text-main)'};">
                            ${p.isFree ? '<i class="fas fa-gift"></i> Hediye' : (parseFloat(p.price) || 0).toLocaleString('tr-TR') + ' ₺'}
                        </div>
                    </td>
                    <td><span style="font-weight:600;">${p.ownerPhone || '-'}</span></td>
                    <td>${statusHtml}</td>
                    <td>
                        <button class="btn btn-danger" onclick="adminApp.actions.deleteAd('${p.id}')">
                            <i class="fas fa-trash-can"></i> Sil
                        </button>
                    </td>
                </tr>`;
        }).join('')}
                </tbody>
                    </table>
                </div>
            </div>
        `,
        payments: () => {
            const pending = adminApp.state.payments.filter(p => p.status === 'pending');
            if (pending.length === 0) return '<div style="padding:40px; text-align:center; color:var(--text-muted); font-weight:600;"><i class="fas fa-circle-check" style="color:#10B981; font-size:2rem; display:block; margin-bottom:12px;"></i> Bekleyen ödeme bulunmuyor.</div>';
            return `
                <div style="overflow-x: auto;">
                    <table>
                        <thead>
                            <tr><th>Kullanıcı</th><th>İlan Paketi</th><th>Tutar</th><th>Tarih</th><th>İşlem</th></tr>
                        </thead>
                        <tbody>
                            ${pending.map(p => `
                                <tr>
                                    <td>
                                        <div style="font-weight:800; color:var(--text-main);">${p.userName || 'Bilinmiyor'}</div>
                                        <small style="color:var(--text-muted);">${p.userPhone}</small>
                                    </td>
                                    <td><span class="badge" style="background:#EEF2FF; color:#4F46E5; font-weight:800;">${p.packageName || (p.packageCount + ' İlan')}</span></td>
                                    <td><b style="color:#059669; font-size:1.1rem;">${(parseFloat(p.amount) || 0).toLocaleString('tr-TR')} ₺</b></td>
                                    <td><span style="color:var(--text-muted); font-weight:500;">${new Date((p.createdAt && p.createdAt.toDate ? p.createdAt.toDate() : p.createdAt) || 0).toLocaleDateString('tr-TR')}</span></td>
                                    <td>
                                        <button class="btn btn-primary" onclick="adminApp.actions.approvePayment('${p.id}', '${p.userId}', ${p.packageCount})">
                                            <i class="fas fa-check"></i> Onayla
                                        </button>
                                    </td>
                                </tr>`).join('')}
                        </tbody>
                    </table>
                </div>`;
        },
        reports: () => {
            if (adminApp.state.reports.length === 0) return '<div style="padding:40px; text-align:center; color:var(--text-muted); font-weight:600;"><i class="fas fa-shield-check" style="color:#10B981; font-size:2rem; display:block; margin-bottom:12px;"></i> Şikayet bulunmuyor.</div>';
            return `
                <div style="overflow-x: auto;">
                    <table>
                        <thead>
                            <tr><th>İlan Bilgisi</th><th>Şikayet Nedeni</th><th>Bildiren</th><th>İşlem</th></tr>
                        </thead>
                        <tbody>
                            ${adminApp.state.reports.map(r => `
                                <tr>
                                    <td>
                                        <div style="font-weight:800; color:var(--text-main);">ID: ${r.productId}</div>
                                        <button class="btn btn-sm" style="padding:4px 8px; margin-top:4px;" onclick="window.open('index.html#product/${r.productId}', '_blank')">İlanı Gör</button>
                                    </td>
                                    <td>
                                        <div class="badge" style="background:#FEE2E2; color:#DC2626; margin-bottom:4px;">${r.reason}</div>
                                        ${r.note ? `<div style="font-size:0.85rem; color:var(--text-muted); line-height:1.4;">${r.note}</div>` : ''}
                                    </td>
                                    <td><span style="font-weight:600;">${r.userPhone}</span></td>
                                    <td>
                                        <button class="btn btn-danger" onclick="adminApp.actions.deleteReport('${r.id}')">
                                            <i class="fas fa-xmark"></i> Kapat
                                        </button>
                                    </td>
                                </tr>`).join('')}
                        </tbody>
                    </table>
                </div>`;
        },
        partners: () => {
            const pendingPartner = adminApp.state.applications.filter(a => a.status === 'pending');
            const pendingEsnaf = adminApp.state.esnaf_applications.filter(a => a.status === 'pending');
            const currentPartners = adminApp.state.partners;
            return `
                <div style="display: flex; flex-direction: column; gap: 32px; margin-bottom: 32px;">
                    <div class="table-container" style="border-top: 4px solid #F59E0B;">
                        <div class="table-header"><h2><i class="fas fa-handshake" style="color:#F59E0B;"></i> Partner Başvuruları</h2></div>
                        <div style="overflow-x: auto;">
                            <table>
                                <thead><tr><th>İşletme / Adres</th><th>Yetkili / İletişim</th><th>Kullanıcı</th><th>Dekont</th><th>Durum</th><th>İşlem</th></tr></thead>
                                <tbody>
                                    ${adminApp.state.applications.length ? adminApp.state.applications.map(a => `
                                        <tr style="${a.status === 'pending' ? 'background:rgba(245,158,11,0.02);' : ''}">
                                            <td>
                                                <div style="font-weight:800; color:var(--text-main);">${a.businessName}</div>
                                                <div style="font-size:0.75rem; color:var(--text-muted); max-width:180px; line-height:1.2;">${a.address || '---'}</div>
                                            </td>
                                            <td>
                                                <div style="font-weight:700; color:var(--text-main);">${a.contactName || '---'}</div>
                                                <div style="font-size:0.85rem; color:#0369a1; font-weight:600;">${a.contactPhone || '---'}</div>
                                            </td>
                                            <td><div style="font-weight:600;">${a.userName}</div><small style="color:var(--text-muted);">${a.userPhone}</small></td>
                                            <td>
                                                ${a.receiptImage ? `<img src="${a.receiptImage}" style="width:40px; height:40px; object-fit:cover; border-radius:8px; cursor:pointer;" onclick="window.open('${a.receiptImage}', '_blank')">` : '<span style="color:var(--text-muted);">---</span>'}
                                            </td>
                                            <td>
                                                ${a.status === 'approved' ? '<span class="badge" style="background:#D1FAE5; color:#065F46;">Onaylandı</span>' :
                    a.status === 'rejected' ? '<span class="badge" style="background:#FEE2E2; color:#991B1B;">Reddedildi</span>' :
                        '<span class="badge" style="background:#FEF3C7; color:#92400E;">Bekliyor</span>'}
                                            </td>
                                            <td>
                                                <div style="display:flex; gap:6px;">
                                                    ${a.status === 'pending' ? `
                                                        <button class="btn btn-primary btn-sm" onclick="adminApp.actions.approvePartner('${a.id}')"><i class="fas fa-check"></i></button>
                                                        <button class="btn btn-danger btn-sm" onclick="adminApp.actions.rejectPartner('${a.id}')"><i class="fas fa-times"></i></button>
                                                    ` : `<button class="btn btn-danger btn-sm" onclick="db.collection('partner_applications').doc('${a.id}').delete()"><i class="fas fa-trash"></i></button>`}
                                                </div>
                                            </td>
                                        </tr>`).join('') : '<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--text-muted);">Başvuru yok.</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="table-container" style="border-top: 4px solid #10B981;">
                        <div class="table-header"><h2><i class="fas fa-store" style="color:#10B981;"></i> Esnaf Başvuruları</h2></div>
                        <div style="overflow-x: auto;">
                            <table>
                                <thead><tr><th>İşletme / Açıklama</th><th>Yetkili / İletişim</th><th>Kullanıcı</th><th>Dekont</th><th>Durum</th><th>İşlem</th></tr></thead>
                                <tbody>
                                    ${adminApp.state.esnaf_applications.length ? adminApp.state.esnaf_applications.map(a => `
                                        <tr style="${a.status === 'pending' ? 'background:rgba(16,185,129,0.02);' : ''}">
                                            <td>
                                                <div style="font-weight:800; color:var(--text-main);">${a.businessName}</div>
                                                <div style="font-size:0.75rem; color:var(--text-muted); max-width:180px; line-height:1.2;">${a.businessDesc || '---'}</div>
                                            </td>
                                            <td>
                                                <div style="font-weight:700; color:var(--text-main);">${a.userName || '---'}</div>
                                                <div style="font-size:0.85rem; color:#0369a1; font-weight:600;">${a.userPhone || '---'}</div>
                                            </td>
                                            <td><div style="font-weight:600;">${a.userName}</div><small style="color:var(--text-muted);">${a.userPhone}</small></td>
                                            <td><span style="color:var(--text-muted);">---</span></td>
                                            <td>
                                                ${a.status === 'approved' ? '<span class="badge" style="background:#D1FAE5; color:#065F46;">Onaylandı</span>' :
                                a.status === 'rejected' ? '<span class="badge" style="background:#FEE2E2; color:#991B1B;">Reddedildi</span>' :
                                    '<span class="badge" style="background:#FEF3C7; color:#92400E;">Bekliyor</span>'}
                                            </td>
                                            <td>
                                                <div style="display:flex; gap:6px;">
                                                    ${a.status === 'pending' ? `
                                                        <button class="btn btn-primary btn-sm" style="background:#10B981;" onclick="adminApp.actions.approveEsnaf('${a.id}')"><i class="fas fa-check"></i></button>
                                                        <button class="btn btn-danger btn-sm" onclick="adminApp.actions.rejectEsnaf('${a.id}')"><i class="fas fa-times"></i></button>
                                                    ` : `<button class="btn btn-danger btn-sm" onclick="adminApp.actions.deleteEsnafApp('${a.id}')"><i class="fas fa-trash"></i></button>`}
                                                </div>
                                            </td>
                                        </tr>`).join('') : '<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--text-muted);">Bekleyen başvuru yok.</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div class="table-container">
                    <div class="table-header"><h2>Mevcut Noktalar & İş Ortakları</h2></div>
                    <div style="overflow-x: auto;">
                        <table>
                            <thead><tr><th>Nokta Adı</th><th>Tipi / Durumu</th><th>İşlem</th></tr></thead>
                            <tbody>
                                ${currentPartners.map(p => `
                                    <tr>
                                        <td><div style="font-weight:800; color:var(--text-main);">${p.name}</div></td>
                                        <td>
                                            ${p.isPartner ? '<span class="badge" style="background:#FEF3C7; color:#B45309;"><i class="fas fa-star"></i> Partner</span>' : '<span class="badge" style="background:#F1F5F9; color:var(--text-muted);">Standart Nokta</span>'}
                                        </td>
                                        <td>
                                            <div style="display:flex; gap:8px;">
                                                <button class="btn btn-primary btn-sm" onclick="adminApp.actions.togglePartnerStatus('${p.id}', ${p.isPartner})">
                                                    ${p.isPartner ? '<i class="fas fa-arrow-down"></i> Standart Yap' : '<i class="fas fa-arrow-up"></i> Partner Yap'}
                                                </button>
                                                <button class="btn btn-danger btn-sm" onclick="adminApp.actions.deletePartner('${p.id}')"><i class="fas fa-trash"></i></button>
                                            </div>
                                        </td>
                                    </tr>`).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>`;
        },
        gallery: () => {
            const komsugallery = adminApp.state.gallery.filter(g => g.vitrineType !== 'esnaf');
            const esnafGallery = adminApp.state.gallery.filter(g => g.vitrineType === 'esnaf');
            return `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                <div class="table-container" style="border: 2px solid #FF8F1F; padding:0;">
                    <div class="table-header" style="background: #fff7ed; padding: 15px 20px; border-bottom: 2px solid #FF8F1F;">
                        <h2 style="color: #FF8F1F; margin:0;"><i class="fas fa-users"></i> Bireysel Vitrin</h2>
                    </div>
                    <div style="overflow-x: auto;">
                        <table>
                            <thead><tr><th>Görsel</th><th>İlan Baslık</th><th>Bitiş</th><th>İşlem</th></tr></thead>
                            <tbody>
                                ${komsugallery.map(g => {
                const product = adminApp.state.ads.find(a => a.id === g.productId);
                return `<tr>
                                        <td><img src="${product && product.image ? product.image : ''}" style="width:40px; height:40px; border-radius:8px; object-fit:cover;"></td>
                                        <td><div style="font-weight:700; font-size:0.85rem; color:var(--text-main);">${(product && product.title) || '---'}</div></td>
                                        <td><span class="badge" style="background:#FEE2E2; color:#DC2626;">⌛ ${g.expiresAt ? new Date(g.expiresAt.seconds ? g.expiresAt.seconds * 1000 : g.expiresAt).toLocaleDateString('tr-TR') : '---'}</span></td>
                                        <td><button class="btn btn-danger btn-sm" onclick="adminApp.actions.removeFromGallery('${g.id}')">Kaldır</button></td></tr>`;
            }).join('') || '<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-muted);">İlan yok</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="table-container" style="border: 2px solid #14b8a6; padding:0;">
                    <div class="table-header" style="background: #f0fdfa; padding: 15px 20px; border-bottom: 2px solid #14b8a6;">
                        <h2 style="color: #14b8a6; margin:0;"><i class="fas fa-store"></i> Esnaf Vitrini</h2>
                    </div>
                    <div style="overflow-x: auto;">
                        <table>
                            <thead><tr><th>Görsel</th><th>İşletme / İlan</th><th>Bitiş</th><th>İşlem</th></tr></thead>
                            <tbody>
                                ${esnafGallery.map(g => {
                const product = adminApp.state.ads.find(a => a.id === g.productId);
                return `<tr>
                                        <td><img src="${product && product.image ? product.image : ''}" style="width:40px; height:40px; border-radius:8px; object-fit:cover;"></td>
                                        <td><div style="font-weight:700; font-size:0.85rem; color:var(--text-main);">${(product && product.title) || '---'}</div></td>
                                        <td><span class="badge" style="background:#FEE2E2; color:#DC2626;">⌛ ${g.expiresAt ? new Date(g.expiresAt.seconds ? g.expiresAt.seconds * 1000 : g.expiresAt).toLocaleDateString('tr-TR') : '---'}</span></td>
                                        <td><button class="btn btn-danger btn-sm" onclick="adminApp.actions.removeFromGallery('${g.id}')">Kaldır</button></td></tr>`;
            }).join('') || '<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-muted);">İlan yok</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>`;
        },
        gallery_applications: () => {
            if (adminApp.state.gallery_applications.length === 0) return '<div style="padding:60px; text-align:center; color:var(--text-muted); font-weight:600;"><i class="fas fa-gem" style="color:#F59E0B; font-size:3rem; display:block; margin-bottom:16px;"></i> Vitrin başvurusu bulunmuyor.</div>';
            return `
                <div class="table-container">
                    <div class="table-header"><h2><i class="fas fa-gem" style="color:#F59E0B;"></i> Vitrin Ödeme Başvuruları</h2></div>
                    <div style="overflow-x: auto;">
                        <table>
                            <thead><tr><th>Başvuran</th><th>İlan</th><th>Vitrin Tipi</th><th>Paket & Tutar</th><th>Dekont</th><th>Bitiş</th><th>Durum</th><th>İşlem</th></tr></thead>
                            <tbody>
                                ${adminApp.state.gallery_applications.map(m => {
                const product = adminApp.state.ads.find(a => a.id === m.productId);
                const duration = m.package || m.selectedPackage || 'haftalık';
                let days = 7;
                if (duration === 'günlük') days = 1;
                if (duration === 'aylık') days = 30;

                const expDate = new Date();
                expDate.setDate(expDate.getDate() + days);

                return `
                                    <tr style="${m.status === 'pending' ? 'background:rgba(245,158,11,0.02);' : ''}">
                                        <td>
                                            <div style="font-weight:800; color:var(--text-main);">${m.userName || m.name || 'İsimsiz'}</div>
                                            <small style="color:var(--text-muted);">${m.userPhone || m.email || '---'}</small>
                                        </td>
                                        <td>
                                            ${product ? `
                                                <div style="display:flex; align-items:center; gap:8px;">
                                                    <img src="${product.image}" style="width:36px; height:36px; border-radius:6px; object-fit:cover;">
                                                    <div style="font-size:0.8rem; font-weight:700;">${product.title.substring(0, 15)}..</div>
                                                </div>
                                            ` : '<span style="color:var(--text-muted);">İlan Belirlenmedi</span>'}
                                        </td>
                                        <td><span class="badge" style="background:${m.vitrineType === 'esnaf' ? '#ECFDF5' : '#FEF3C7'}; color:${m.vitrineType === 'esnaf' ? '#059669' : '#B45309'};">${m.vitrineType === 'esnaf' ? '🏪 ESNAF' : '👥 BİREYSEL'}</span></td>
                                        <td>
                                            <div class="badge" style="background:#EEF2FF; color:#4F46E5; margin-bottom:4px; display:inline-block; width:100%; text-align:center;">${duration}</div>
                                            <div style="font-weight:800; color:#059669; text-align:center;">${m.amount ? (parseFloat(m.amount) || 0).toLocaleString('tr-TR') + ' ₺' : '---'}</div>
                                        </td>
                                        <td>
                                            ${m.receiptImage ? `<img src="${m.receiptImage}" style="width:40px; height:40px; object-fit:cover; border-radius:8px; cursor:pointer;" onclick="window.open('${m.receiptImage}', '_blank')">` : '<span style="color:var(--text-muted);">Yüklenmedi</span>'}
                                        </td>
                                        <td>
                                            <span style="font-weight:700; color:#ef4444;">⌛ ${expDate.toLocaleDateString('tr-TR')}</span>
                                            <small style="display:block; font-size:0.65rem; color:var(--text-muted);">Onaylanırsa</small>
                                        </td>
                                        <td>
                                            ${m.status === 'approved' ? '<span class="badge" style="background:#D1FAE5; color:#065F46;">Onaylandı</span>' :
                        m.status === 'rejected' ? '<span class="badge" style="background:#FEE2E2; color:#991B1B;">Reddedildi</span>' :
                            '<span class="badge" style="background:#FEF3C7; color:#92400E;">Bekliyor</span>'}
                                        </td>
                                        <td>
                                            <div style="display:flex; gap:6px;">
                                                ${m.status === 'pending' ? `
                                                    <button class="btn btn-primary btn-sm" onclick="adminApp.actions.approveVitrine('${m.id}')"><i class="fas fa-check"></i></button>
                                                    <button class="btn btn-danger btn-sm" onclick="adminApp.actions.rejectVitrine('${m.id}')"><i class="fas fa-times"></i></button>
                                                ` : `<button class="btn btn-danger btn-sm" onclick="adminApp.actions.deleteGalleryApp('${m.id}')"><i class="fas fa-trash"></i></button>`}
                                            </div>
                                        </td>
                                    </tr>`;
            }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>`;
        },
        contact_messages: () => {
            if (adminApp.state.contact_messages.length === 0) return '<div style="padding:40px; text-align:center; color:var(--text-muted); font-weight:600;"><i class="fas fa-envelope-open" style="color:var(--primary); font-size:2rem; display:block; margin-bottom:12px;"></i> Mesaj kutusu boş.</div>';
            return `
                <div class="table-container">
                    <div class="table-header"><h2>İletişim Mesajları</h2></div>
                    <div style="overflow-x: auto;">
                        <table>
                            <thead><tr><th>Gönderen</th><th>Mesaj İçeriği</th><th>Tarih</th><th>İşlem</th></tr></thead>
                            <tbody>
                                ${adminApp.state.contact_messages.map(m => `
                                    <tr style="${m.status === 'unread' ? 'background:rgba(0,168,150,0.02);' : ''}">
                                        <td>
                                            <div style="font-weight:800; color:var(--text-main);">${m.name}</div>
                                            <small style="color:var(--text-muted);">${m.email}</small>
                                        </td>
                                        <td><div style="max-width:400px; font-size:0.9rem; line-height:1.4; color:var(--text-main);">${m.message}</div></td>
                                        <td>
                                            <div style="font-weight:600; color:var(--text-muted);">${new Date((m.createdAt && m.createdAt.toDate ? m.createdAt.toDate() : m.createdAt) || 0).toLocaleDateString('tr-TR')}</div>
                                            <small style="font-size:0.75rem;">${new Date((m.createdAt && m.createdAt.toDate ? m.createdAt.toDate() : m.createdAt) || 0).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</small>
                                        </td>
                                        <td>
                                            <div style="display:flex; gap:8px;">
                                                ${m.status === 'unread' ? `<button class="btn btn-primary" onclick="adminApp.actions.markAsRead('${m.id}')"><i class="fas fa-envelope-circle-check"></i> Okundu</button>` : '<span class="badge" style="background:#F1F5F9; color:var(--text-muted);">Okundu</span>'}
                                                <button class="btn btn-danger btn-sm" onclick="adminApp.actions.deleteMessage('${m.id}')"><i class="fas fa-trash"></i></button>
                                            </div>
                                        </td>
                                    </tr>`).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>`;
        },
        adsense: () => `
            <div class="table-container">
                <div class="table-header"><h2><i class="fas fa-ad"></i> Google AdSense Reklam Yönetimi</h2></div>
                <div style="padding: 20px;">
                    <p style="font-size: 0.9rem; color: #64748B; margin-bottom: 20px;">
                        AdSense reklam kodunu veya herhangi bir özel HTML/Script kodunu buraya yapıştırın. 
                        Bu kod, Mahalle Akışı'nda vitrinin altında görüntülenecektir.
                    </p>
                    <textarea id="adsense-code-input" style="width: 100%; height: 250px; padding: 15px; border-radius: 8px; border: 1px solid var(--border); font-family: monospace; font-size: 0.85rem; margin-bottom: 20px;">${(adminApp.state.adsense && adminApp.state.adsense.code) || ''}</textarea>
                    <button class="btn btn-primary" style="padding: 12px 24px;" onclick="adminApp.actions.saveAdsense()">
                        <i class="fas fa-save"></i> Değişiklikleri Kaydet
                    </button>
                </div>
            </div>`,
        banners: () => `
            <div style="display: grid; grid-template-columns: 1fr 350px; gap: 24px;">
                <div class="table-container">
                    <div class="table-header"><h2><i class="fas fa-images"></i> Mevcut Bannerlar</h2></div>
                    <table>
                        <thead><tr><th>Sıra</th><th>Görsel</th><th>Başlık</th><th>Link</th><th>İşlem</th></tr></thead>
                        <tbody>
                            ${adminApp.state.banners.map(b => `
                                <tr>
                                    <td><b>${b.order}</b></td>
                                    <td><img src="${b.image}" style="width:120px; height:50px; object-fit:cover; border-radius:8px; border: 1px solid var(--border);"></td>
                                    <td><b>${b.title || '---'}</b></td>
                                    <td><small>${b.link || '---'}</small></td>
                                    <td><button class="btn btn-danger btn-sm" onclick="adminApp.actions.deleteBanner('${b.id}')">Sil</button></td>
                                </tr>`).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="table-container" style="padding: 20px;">
                    <div class="table-header" style="padding: 0 0 15px 0; margin-bottom: 20px;"><h2><i class="fas fa-plus-circle"></i> Yeni Banner Ekle</h2></div>
                    <div style="display: flex; flex-direction: column; gap: 15px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <div>
                                <label style="display:block; font-size:0.85rem; margin-bottom:5px; font-weight:600;">Görsel Dosyası Seç</label>
                                <input type="file" id="banner-file" accept="image/*" class="login-input" style="margin:0; padding: 10px;" onchange="adminApp.actions.handleBannerFileUpload(this)">
                            </div>
                            <div>
                                <label style="display:block; font-size:0.85rem; margin-bottom:5px; font-weight:600;">Veya Görsel URL</label>
                                <input type="text" id="banner-image" class="login-input" style="margin:0;" placeholder="https://...">
                            </div>
                        </div>
                        <div id="banner-preview-container" style="display: none; margin-top: 10px;">
                            <label style="display:block; font-size:0.85rem; margin-bottom:5px; font-weight:600;">Görsel Önizleme</label>
                            <img id="banner-preview" src="" style="width:100%; height:120px; object-fit:cover; border-radius:8px; border: 1px solid var(--border);">
                        </div>
                        <div>
                            <label style="display:block; font-size:0.85rem; margin-bottom:5px; font-weight:600;">Başlık (Opsiyonel)</label>
                            <input type="text" id="banner-title" class="login-input" style="margin:0;" placeholder="Örn: %20 İndirim Fırsatı!">
                        </div>
                        <div>
                            <label style="display:block; font-size:0.85rem; margin-bottom:5px; font-weight:600;">Alt Başlık / Açıklama</label>
                            <input type="text" id="banner-subtitle" class="login-input" style="margin:0;" placeholder="Örn: Bluetooth hoparlörlerde indirim">
                        </div>
                        <div>
                            <label style="display:block; font-size:0.85rem; margin-bottom:5px; font-weight:600;">Yönlendirme Linki</label>
                            <input type="text" id="banner-link" class="login-input" style="margin:0;" placeholder="index.html#category/elektronik">
                        </div>
                        <div>
                            <label style="display:block; font-size:0.85rem; margin-bottom:5px; font-weight:600;">Sıralama (Sayı)</label>
                            <input type="number" id="banner-order" class="login-input" style="margin:0;" value="${adminApp.state.banners.length + 1}">
                        </div>
                        <button class="btn btn-primary" style="padding: 12px;" onclick="adminApp.actions.addBanner()">
                            <i class="fas fa-save"></i> Bannerı Yayınla
                        </button>
                    </div>
                </div>
            </div>`,
        campaigns: () => `
            <div style="display: grid; grid-template-columns: 1fr 350px; gap: 24px;">
                <div class="table-container">
                    <div class="table-header"><h2><i class="fas fa-bullhorn"></i> Aktif Kampanyalar</h2></div>
                    <table>
                        <thead><tr><th>Görsel</th><th>Başlık</th><th>Link</th><th>Durum</th><th>İşlem</th></tr></thead>
                        <tbody>
                            ${adminApp.state.campaigns.map(c => `
                                <tr>
                                    <td><img src="${c.image}" style="width:120px; height:60px; object-fit:cover; border-radius:8px; border: 1px solid var(--border);"></td>
                                    <td>
                                        <div style="font-weight:800; color:var(--text-main);">${c.title || '---'}</div>
                                        <small style="color:var(--text-muted);">${c.subtitle || ''}</small>
                                    </td>
                                    <td><small style="word-break:break-all;">${c.link || '---'}</small></td>
                                    <td><span class="badge" style="background:#ECFDF5; color:#059669;">Yayında</span></td>
                                    <td><button class="btn btn-danger btn-sm" onclick="adminApp.actions.deleteCampaign('${c.id}')">Sil</button></td>
                                </tr>`).join('')}
                            ${adminApp.state.campaigns.length === 0 ? '<tr><td colspan="5" style="text-align:center; padding:40px; color:var(--text-muted);">Henüz kampanya eklenmemiş.</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
                <div class="table-container" style="padding: 20px;">
                    <div class="table-header" style="padding: 0 0 15px 0; margin-bottom: 20px;"><h2><i class="fas fa-plus-circle"></i> Yeni Kampanya Modalı</h2></div>
                    <div style="display: flex; flex-direction: column; gap: 15px;">
                        <p style="font-size:0.8rem; color:var(--text-muted);">Bu alandan eklediğiniz görsel, uygulama açılışında kullanıcıların karşısına popup olarak çıkacaktır.</p>
                        
                        <div>
                            <label style="display:block; font-size:0.85rem; margin-bottom:5px; font-weight:600;">Kampanya Görseli (Dosya)</label>
                            <input type="file" id="campaign-file" accept="image/*" class="login-input" style="margin:0; padding: 10px;" onchange="adminApp.actions.handleCampaignFileUpload(this)">
                        </div>
                        
                        <div id="campaign-preview-container" style="display: none; margin-top: 10px;">
                            <label style="display:block; font-size:0.85rem; margin-bottom:5px; font-weight:600;">Önizleme</label>
                            <img id="campaign-preview" src="" style="width:100%; height:180px; object-fit:cover; border-radius:12px; border: 1px solid var(--border);">
                        </div>
                        
                        <div>
                            <label style="display:block; font-size:0.85rem; margin-bottom:5px; font-weight:600;">Başlık</label>
                            <input type="text" id="campaign-title" class="login-input" style="margin:0;" placeholder="Örn: Büyük Kış İndirimi Başladı!">
                        </div>
                        <div>
                            <label style="display:block; font-size:0.85rem; margin-bottom:5px; font-weight:600;">Kısa Açıklama</label>
                            <input type="text" id="campaign-subtitle" class="login-input" style="margin:0;" placeholder="Örn: Tüm ürünlerde geçerli %50 fırsat.">
                        </div>
                        <div>
                            <label style="display:block; font-size:0.85rem; margin-bottom:5px; font-weight:600;">Yönlendirme Linki (Opsiyonel)</label>
                            <input type="text" id="campaign-link" class="login-input" style="margin:0;" placeholder="index.html#category/elektronik">
                        </div>
                        <button class="btn btn-primary" style="padding: 12px; margin-top:10px;" onclick="adminApp.actions.addCampaign()">
                            <i class="fas fa-bullhorn"></i> Kampanyayı Başlat (Popup)
                        </button>
                    </div>
                </div>
            </div>`,
        reset: () => `
            <div class="table-container" style="border: 2px solid #ef4444;">
                <div class="table-header" style="background: #fef2f2;">
                    <h2 style="color: #b91c1c;"><i class="fas fa-radiation"></i> Tehlikeli Bölge: Sistemi Sıfırla</h2>
                </div>
                <div style="padding: 30px; text-align: center;">
                    <div style="background: #fff1f2; padding: 20px; border-radius: 12px; border: 1px solid #fecaca; margin-bottom: 24px; text-align: left;">
                        <h3 style="color: #991b1b; margin-bottom: 12px;">Bu işlem şunları silecek:</h3>
                        <ul style="color: #b91c1c; font-size: 0.95rem; line-height: 1.6; margin-left: 20px;">
                            <li>Tüm İlanlar (Products)</li>
                            <li>Tüm Teklifler (Offers)</li>
                            <li>Tüm Mahalle Akışı Paylaşımları (Shares)</li>
                            <li>Tüm Değerlendirmeler (Ratings)</li>
                            <li>Tüm Şikayetler (Reports)</li>
                            <li>Tüm Ödeme Kayıtları (Payments)</li>
                            <li>Tüm Uygulamalar ve Mesajlar</li>
                            <li><b>Kendi hesabınız dışındaki tüm kullanıcılar</b></li>
                        </ul>
                    </div>
                    
                    <p style="color: #64748B; font-weight: 600; margin-bottom: 24px;">
                        Bu işlem geri alınamaz. Uygulamayı test ortamında sıfırdan başlatmak için kullanılır.
                    </p>

                    <div style="display: flex; flex-direction: column; align-items: center; gap: 15px;">
                        <input type="text" id="reset-confirm-text" placeholder="ONAYLIYORUM yazın" style="padding: 12px; border: 2px solid #fecaca; border-radius: 8px; width: 250px; text-align: center; outline: none; font-weight: 800;">
                        <button class="btn btn-danger" style="padding: 15px 40px; font-size: 1rem; background: #ef4444; border-radius: 12px; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);" onclick="adminApp.actions.resetSystem()">
                            <i class="fas fa-trash-alt"></i> SİSTEMİ TAMAMEN SIFIRLA
                        </button>
                    </div>
                </div>
            </div>`
    },

    actions: {
        deleteAd: async (id) => confirm('Silinsin mi?') && await db.collection('products').doc(id).delete(),
        approvePayment: async (payId, userId, count) => {
            if (!confirm('Onayla?')) return;
            const ref = db.collection('users').doc(userId);
            const doc = await ref.get();
            const limit = ((doc.data() && doc.data().adLimit) || 50) + count;
            await ref.set({ adLimit: limit }, { merge: true });
            await db.collection('payments').doc(payId).update({ status: 'approved' });
        },
        editLimit: async (userId, current) => {
            const val = prompt("Yeni limit:", current);
            if (val) await db.collection('users').doc(userId).update({ adLimit: parseInt(val) });
        },
        approvePartner: async (appId) => {
            if (!confirm('Bu partnerlik başvurusunu onaylıyor musun? İşletme haritaya Güvenli Nokta olarak eklenecektir.')) return;
            const app = adminApp.state.applications.find(a => a.id === appId);
            if (!app) return;

            try {
                await db.collection('partner_applications').doc(appId).update({
                    status: 'approved',
                    approvedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                await db.collection('safe_points').add({
                    name: app.businessName,
                    address: app.address || '',
                    lat: app.lat,
                    lng: app.lng,
                    isPartner: true,
                    ownerId: app.userId,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                // Kullanıcı dökümanını güncelle
                const userId = app.userId || app.uid;
                console.log("[Admin Debug] Onaylanan kullanıcı ID:", userId);
                if (userId) {
                    await db.collection('users').doc(userId).set({
                        partnerStatus: 'approved'
                    }, { merge: true });
                    console.log(`[Admin Debug] User ${userId} partner status updated to approved.`);
                } else {
                    console.error("[Admin Debug] User ID not found in application:", app);
                    alert('Hata: Kullanıcı ID bulunamadı. Kullanıcı dökümanı güncellenemedi.');
                }

                alert('Partner onaylandı ve haritaya eklendi.');
            } catch (err) {
                alert('Hata: ' + err.message);
            }
        },
        rejectPartner: async (id) => {
            const reason = prompt('Reddetme nedeni (Opsiyonel):');
            if (reason === null) return;
            await db.collection('partner_applications').doc(id).update({
                status: 'rejected',
                rejectReason: reason,
                rejectedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            alert('Başvuru reddedildi.');
        },
        approveEsnaf: async (appId) => {
            if (!confirm('Bu esnaf başvurusunu onaylıyor musunuz?')) return;
            const app = adminApp.state.esnaf_applications.find(a => a.id === appId);
            await db.collection('esnaf_applications').doc(appId).update({
                status: 'approved',
                approvedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            await db.collection('users').doc(app.userId).update({ esnafStatus: 'approved' });
            alert('Esnaf başarıyla onaylandı.');
        },
        rejectEsnaf: async (appId) => {
            const reason = prompt('Reddetme nedeni (Opsiyonel):');
            if (reason === null) return;
            const app = adminApp.state.esnaf_applications.find(a => a.id === appId);
            await db.collection('esnaf_applications').doc(appId).update({
                status: 'rejected',
                rejectReason: reason,
                rejectedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            await db.collection('users').doc(app.userId).update({ esnafStatus: 'rejected' });
            alert('Esnaf başvurusu reddedildi.');
        },
        deleteEsnafApp: async (id) => {
            if (!confirm('Bu başvuru kaydını tamamen silmek istediğinize emin misiniz?')) return;
            await db.collection('esnaf_applications').doc(id).delete();
            alert('Başvuru kaydı silindi.');
        },
        togglePartnerStatus: async (id, status) => await db.collection('safe_points').doc(id).update({ isPartner: !status }),
        deletePartner: async (id) => confirm('Sil?') && await db.collection('safe_points').doc(id).delete(),
        markAsRead: async (id) => await db.collection('contact_messages').doc(id).update({ status: 'read' }),
        approveVitrine: async (appId) => {
            if (!confirm('Bu ödemeyi onaylıyor musunuz? İlan otomatik olarak galeriye eklenecek ve kullanıcıya paket tanımlanacaktır.')) return;

            try {
                const app = adminApp.state.gallery_applications.find(a => a.id === appId);
                if (!app) return;

                const duration = app.package || app.selectedPackage || 'haftalık';
                let days = 7;
                if (duration === 'günlük') days = 1;
                if (duration === 'aylık') days = 30;

                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + days);

                // 1. Başvuru durumunu güncelle
                await db.collection('contact_messages').doc(appId).update({
                    status: 'approved',
                    approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    expiresAt: firebase.firestore.Timestamp.fromDate(expiresAt)
                });

                // 2. Otomatik Galeriye Ekle
                if (app.productId) {
                    // Mevcut vitrin kayıtlarını kontrol et (mükerrerliği önle)
                    const existingVitrine = await db.collection('gallery')
                        .where('productId', '==', app.productId)
                        .get();

                    const batch = db.batch();
                    existingVitrine.docs.forEach(doc => {
                        batch.delete(doc.ref);
                    });

                    const newVitrineRef = db.collection('gallery').doc();
                    batch.set(newVitrineRef, {
                        productId: app.productId,
                        order: 0,
                        vitrineType: app.vitrineType || 'komsu',
                        expiresAt: firebase.firestore.Timestamp.fromDate(expiresAt),
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    await batch.commit();
                }

                // 3. Kullanıcıya aboneliği tanımla
                const userRef = db.collection('users').doc(app.userId);
                const userDoc = await userRef.get();
                let activeSubscriptions = [];

                if (userDoc.exists) {
                    activeSubscriptions = userDoc.data().activeSubscriptions || [];
                }

                activeSubscriptions.push({
                    package: duration,
                    vitrineType: app.vitrineType,
                    createdAt: new Date(),
                    expiresAt: expiresAt,
                    status: 'active'
                });

                await userRef.update({ activeSubscriptions });

                alert('Başvuru onaylandı. İlan galeriye eklendi ve paket kullanıcıya tanımlandı.');
            } catch (err) {
                console.error("Approval Error:", err);
                alert('Onaylama sırasında hata oluştu: ' + err.message);
            }
        },
        rejectVitrine: async (appId) => {
            const reason = prompt('Reddetme nedeni (opsiyonel):');
            if (reason === null) return;

            await db.collection('contact_messages').doc(appId).update({
                status: 'rejected',
                rejectReason: reason,
                rejectedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            alert('Başvuru reddedildi.');
        },
        deleteGalleryApp: async (id) => confirm('Silinsin mi?') && await db.collection('contact_messages').doc(id).delete(),
        deleteMessage: async (id) => confirm('Sil?') && await db.collection('contact_messages').doc(id).delete(),
        addToGallery: async (productId, vitrineType = 'komsu') => {
            const order = prompt("Sıra:", "1");
            if (!order) return;

            const duration = prompt("Süre (Gün):\n1: Günlük\n7: Haftalık\n30: Aylık", "7");
            if (!duration) return;

            const days = parseInt(duration);
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + days);

            await db.collection('gallery').add({
                productId,
                order: parseInt(order),
                days,
                vitrineType, // 'komsu' veya 'esnaf'
                expiresAt: firebase.firestore.Timestamp.fromDate(expiresAt),
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        },
        removeFromGallery: async (id) => await db.collection('gallery').doc(id).delete(),
        deleteAllUsers: async () => {
            if (!confirm('TÜMÜ SİLİNSİN Mİ?')) return;
            const snap = await db.collection('users').get();
            const batch = db.batch();
            snap.docs.forEach(doc => doc.id !== auth.currentUser.uid && batch.delete(doc.ref));
            await batch.commit();
        },
        saveAdsense: async () => {
            const code = document.getElementById('adsense-code-input').value;
            try {
                await db.collection('config').doc('adsense').set({
                    code: code,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                alert('Reklam ayarları başarıyla kaydedildi.');
            } catch (err) {
                alert('Kaydedilirken hata oluştu: ' + err.message);
            }
        },
        resetSystem: async function () {
            const confirmText = document.getElementById('reset-confirm-text').value;
            if (confirmText !== 'ONAYLIYORUM') {
                return alert('Lütfen kutucuğa ONAYLIYORUM yazın (Büyük harflerle).');
            }

            if (!confirm('TÜM VERİLER SİLİNECEK! Emin misiniz?')) return;
            if (!confirm('SON UYARI: Bu işlem geri döndürülemez. Devam edilsin mi?')) return;

            const collections = [
                'products', 'offers', 'shares', 'ratings', 'reports',
                'payments', 'partner_applications', 'esnaf_applications',
                'contact_messages', 'chats', 'notifications', 'gallery', 'safe_points'
            ];

            try {
                const btn = event.target;
                const originalText = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sıfırlanıyor...';

                // 1. Standart koleksiyonları temizle
                for (const col of collections) {
                    const snap = await db.collection(col).get();
                    const batch = db.batch();
                    snap.docs.forEach(doc => batch.delete(doc.ref));
                    await batch.commit();
                    console.log(`${col} temizlendi.`);
                }

                // 2. Kullanıcıları temizle (Kendisi hariç)
                const userSnap = await db.collection('users').get();
                const userBatch = db.batch();
                let deletedUsers = 0;
                userSnap.docs.forEach(doc => {
                    if (doc.id !== firebase.auth().currentUser.uid) {
                        userBatch.delete(doc.ref);
                        deletedUsers++;
                    }
                });
                await userBatch.commit();
                console.log(`${deletedUsers} kullanıcı temizlendi.`);

                alert('Sistem başarıyla sıfırlandı! Sizin hesabınız dışındaki tüm veriler temizlendi.');
                window.location.reload();
            } catch (err) {
                console.error('Reset error:', err);
                alert('Sıfırlama sırasında bir hata oluştu: ' + err.message);
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        },
        handleBannerFileUpload: function (input) {
            const file = input.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function (e) {
                const img = new Image();
                img.onload = function () {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Maksimum boyutları belirle (Örn: 1200px genişlik veya 450px yükseklik)
                    const MAX_WIDTH = 1200;
                    const MAX_HEIGHT = 450;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Görseli optimize et (webp veya jpeg)
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);

                    const previewImg = document.getElementById('banner-preview');
                    const previewContainer = document.getElementById('banner-preview-container');
                    const urlInput = document.getElementById('banner-image');

                    previewImg.src = dataUrl;
                    previewContainer.style.display = 'block';
                    urlInput.value = ''; // Manuel URL'yi temizle
                    adminApp.state.tempBannerImage = dataUrl;
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        },
        addBanner: async function () {
            let image = document.getElementById('banner-image').value;
            const title = document.getElementById('banner-title').value;
            const subtitle = document.getElementById('banner-subtitle').value;
            const link = document.getElementById('banner-link').value;
            const order = parseInt(document.getElementById('banner-order').value) || 0;

            // Eğer yüklenmiş bir dosya varsa onu kullan
            if (adminApp.state.tempBannerImage) {
                image = adminApp.state.tempBannerImage;
            }

            if (!image) return alert('Lütfen bir görsel seçin veya URL girin.');

            try {
                await db.collection('banners').add({
                    image, title, subtitle, link, order,
                    createdAt: firebase.firestore.Timestamp.now()
                });
                alert('Banner başarıyla eklendi.');

                // Formu temizle
                document.getElementById('banner-image').value = '';
                document.getElementById('banner-file').value = '';
                document.getElementById('banner-title').value = '';
                document.getElementById('banner-subtitle').value = '';
                document.getElementById('banner-link').value = '';
                document.getElementById('banner-preview-container').style.display = 'none';
                adminApp.state.tempBannerImage = null;

            } catch (err) {
                alert('Hata: ' + err.message);
            }
        },
        deleteBanner: async function (id) {
            if (!confirm('Bu banner silinsin mi?')) return;
            try {
                await db.collection('banners').doc(id).delete();
            } catch (err) {
                alert('Hata: ' + err.message);
            }
        },
        handleCampaignFileUpload: function (input) {
            const file = input.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function (e) {
                const img = new Image();
                img.onload = function () {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const MAX_WIDTH = 1000;
                    const MAX_HEIGHT = 1000;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                    const previewImg = document.getElementById('campaign-preview');
                    const previewContainer = document.getElementById('campaign-preview-container');

                    previewImg.src = dataUrl;
                    previewContainer.style.display = 'block';
                    adminApp.state.tempCampaignImage = dataUrl;
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        },
        addCampaign: async function () {
            const image = adminApp.state.tempCampaignImage;
            const title = document.getElementById('campaign-title').value;
            const subtitle = document.getElementById('campaign-subtitle').value;
            const link = document.getElementById('campaign-link').value;

            if (!image) return alert('Lütfen bir kampanya görseli seçin.');
            if (!title) return alert('Lütfen bir başlık girin.');

            try {
                await db.collection('campaigns').add({
                    image, title, subtitle, link,
                    createdAt: firebase.firestore.Timestamp.now(),
                    active: true
                });
                alert('Kampanya başarıyla oluşturuldu ve yayına alındı!');

                // Formu temizle
                document.getElementById('campaign-file').value = '';
                document.getElementById('campaign-title').value = '';
                document.getElementById('campaign-subtitle').value = '';
                document.getElementById('campaign-link').value = '';
                document.getElementById('campaign-preview-container').style.display = 'none';
                adminApp.state.tempCampaignImage = null;

            } catch (err) {
                alert('Hata: ' + err.message);
            }
        },
        deleteCampaign: async function (id) {
            if (!confirm('Bu paylaşılan kampanya kaldırılsın mı?')) return;
            try {
                await db.collection('campaigns').doc(id).delete();
            } catch (err) {
                alert('Hata: ' + err.message);
            }
        }
    }
};
