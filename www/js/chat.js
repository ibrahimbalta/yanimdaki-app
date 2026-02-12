Object.assign(window.app, {
    // --- Chat Logic ---
    renderMessages: function () {
        const container = document.getElementById('messages-list');
        if (!container || !this.state.user) return;

        // Telefon numarası kontrolü
        if (!this.state.user.phone) {
            if (!this.state.userLoaded) {
                container.innerHTML = `<div style="text-align:center;padding:100px 20px;"><div class="skeleton-spinner"></div><p style="margin-top:20px;color:var(--text-muted);">Mesajlar yükleniyor...</p></div>`;
                return;
            }
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                    <i class="fas fa-phone-slash" style="font-size: 3rem; margin-bottom: 15px; display: block; color: var(--accent);"></i>
                    <h3 style="color: var(--text-main); margin-bottom: 8px;">Telefon Numarası Eksik</h3>
                    <p style="font-size: 0.9rem; margin-bottom: 24px;">Mesajlarınızı görebilmek için önce Ayarlar'dan telefon numaranızı eklemeniz gerekmektedir. 📱</p>
                    <button onclick="app.showScreen('settings')" class="btn btn-primary" style="padding: 12px 24px;">Profil Ayarlarına Git</button>
                </div>
            `;
            return;
        }

        const myPhoneNorm = this.utils.normalizePhone(this.state.user.phone);
        const hiddenChats = this.state.user.hiddenChats || [];

        // Filtrele: Benim dahil olduğum mesajlar
        const myChats = this.state.chats.filter(c => {
            const bPhone = this.utils.normalizePhone(c.buyerPhone);
            const sPhone = this.utils.normalizePhone(c.sellerPhone);
            return bPhone === myPhoneNorm || sPhone === myPhoneNorm;
        });

        // Grupla: Her sohbetten sadece son mesajı al
        const groups = {};
        myChats.forEach(c => {
            const bPhoneNorm = this.utils.normalizePhone(c.buyerPhone);
            const isBuyer = bPhoneNorm === myPhoneNorm;
            const otherPhoneNorm = isBuyer ? this.utils.normalizePhone(c.sellerPhone) : bPhoneNorm;

            // Ürün ID'si yoksa 'general' kabul et
            const pId = c.productId || 'general';
            const chatKey = `${pId}_${otherPhoneNorm}`;

            if (hiddenChats.includes(chatKey)) return;

            const currentTimestamp = c.createdAt && c.createdAt.toMillis ? c.createdAt.toMillis() : (c.createdAt instanceof Date ? c.createdAt.getTime() : 0);
            const existingTimestamp = groups[chatKey] ? (groups[chatKey].createdAt && groups[chatKey].createdAt.toMillis ? groups[chatKey].createdAt.toMillis() : (groups[chatKey].createdAt instanceof Date ? groups[chatKey].createdAt.getTime() : 0)) : -1;

            if (!groups[chatKey] || currentTimestamp > existingTimestamp) {
                groups[chatKey] = c;
            }
        });

        const sortedGroups = Object.values(groups).sort((a, b) => {
            const timeA = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : (a.createdAt instanceof Date ? a.createdAt.getTime() : 0);
            const timeB = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : (b.createdAt instanceof Date ? b.createdAt.getTime() : 0);
            return timeB - timeA;
        });

        container.innerHTML = sortedGroups.length ? sortedGroups.map(c => {
            const bPhoneStr = this.utils.normalizePhone(c.buyerPhone);
            const isBuyer = bPhoneStr === myPhoneNorm;
            const otherPhoneRaw = isBuyer ? c.sellerPhone : c.buyerPhone;
            const otherPhoneNorm = this.utils.normalizePhone(otherPhoneRaw);
            const otherName = isBuyer ? (c.sellerName || 'Satıcı') : (c.buyerName || 'Alıcı');
            const product = this.state.products.find(p => p.id === c.productId);
            const chatKey = `${c.productId || 'general'}_${otherPhoneNorm}`;

            const timeStr = c.createdAt ? (c.createdAt.toDate ? c.createdAt.toDate() : new Date(c.createdAt)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...';

            return `
                <div style="position: relative; background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-color); overflow: hidden;">
                    <div onclick="app.openChat('${c.productId}', '${otherPhoneRaw}', '${this.utils.escapeHTML(otherName)}')" 
                        style="padding: 16px; display: flex; align-items: center; gap: 12px; cursor: pointer;">
                        <div style="width: 50px; height: 50px; border-radius: 12px; background: url('${product ? this.utils.getProductImage(product) : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23e2e8f0' width='200' height='200'/%3E%3C/svg%3E"}') center/cover; flex-shrink: 0;"></div>
                        <div style="flex: 1; overflow: hidden;">
                            <div style="font-weight: 700; font-size: 0.95rem;">${this.utils.escapeHTML(otherName)}</div>
                            <div style="font-size: 0.75rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${this.utils.escapeHTML(c.text)}</div>
                            <div style="font-size: 0.65rem; color: var(--primary); font-weight: 700; margin-top: 2px;">
                                <i class="fas fa-shopping-bag"></i> ${this.utils.escapeHTML((product && product.title) || 'İlan Hakkında')}
                            </div>
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
                            <div style="font-size: 0.7rem; color: var(--text-muted);">${timeStr}</div>
                            <button onclick="event.stopPropagation(); app.deleteConversation('${c.productId}', '${otherPhoneNorm}')" 
                                style="border: none; background: #fee2e2; color: #ef4444; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; cursor: pointer;">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('') : '<div style="text-align:center;padding:60px 20px;color:var(--text-muted);"><i class="fas fa-comments" style="font-size:2.5rem;display:block;margin-bottom:12px;opacity:0.3;"></i>Henüz mesajınız yok. ✨</div>';
    },

    deleteConversation: async function (productId, otherPhone) {
        if (!confirm('Bu sohbeti silmek istediğinize emin misiniz?')) return;

        const myPhone = this.state.user.phone;
        const chatKey = `${productId || 'general'}_${otherPhone}`;

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
            ${this.utils.escapeHTML(product ? product.title : 'Mesajlaşma')}
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

        if (!this.state.user) return;
        const myPhoneNorm = this.utils.normalizePhone(this.state.user.phone);
        const otherPhoneNorm = this.utils.normalizePhone(this.currentChat.otherPhone);

        const messages = this.state.chats.filter(c =>
            c.productId === this.currentChat.productId &&
            ((this.utils.normalizePhone(c.buyerPhone) === myPhoneNorm && this.utils.normalizePhone(c.sellerPhone) === otherPhoneNorm) ||
                (this.utils.normalizePhone(c.sellerPhone) === myPhoneNorm && this.utils.normalizePhone(c.buyerPhone) === otherPhoneNorm))
        );

        container.innerHTML = messages.map(m => {
            const isMe = this.utils.normalizePhone(m.senderPhone) === myPhoneNorm;
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
                    <div style="background: ${isMe ? 'var(--primary)' : 'var(--bg-card)'}; color: ${isMe ? 'white' : 'var(--text-main)'}; 
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

        // Telefon kontrolü
        if (!this.state.user.phone) {
            return this.toast('Mesaj göndermek için önce Ayarlar\'dan telefon numaranızı ekleyin. 📱', 'error');
        }

        // Karşı taraf kontrolü
        if (!this.currentChat.otherPhone) {
            console.error('[sendMessage] otherPhone is missing!', this.currentChat);
            return this.toast('Alıcı bilgisi bulunamadı.', 'error');
        }

        // Debug log
        console.log('[sendMessage] Sending message...');
        console.log('[sendMessage] From:', this.state.user.phone, 'To:', this.currentChat.otherPhone);
        console.log('[sendMessage] ProductId:', this.currentChat.productId);

        const product = this.currentChat.productId ? this.state.products.find(p => p.id === this.currentChat.productId) : null;
        const myPhone = this.state.user.phone;
        const isBuyer = (product && product.ownerPhone) ? (this.utils.normalizePhone(product.ownerPhone) !== this.utils.normalizePhone(myPhone)) : true;

        console.log('[sendMessage] isBuyer:', isBuyer, 'product found:', !!product);

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

        console.log('[sendMessage] msgData:', JSON.stringify(msgData, null, 2));

        input.value = '';
        try {
            const otherPhoneNorm = this.utils.normalizePhone(this.currentChat.otherPhone);
            const chatKey = `${this.currentChat.productId || 'general'}_${otherPhoneNorm}`;

            // Eğer karşı taraf veya biz bu sohbeti gizlediysek, yeni mesajla tekrar görünür yapalım
            const batch = db.batch();

            // Kendi mesajımız için bizim tarafımızda unhide
            const myUserRef = db.collection('users').doc(this.state.user.uid);
            batch.update(myUserRef, {
                hiddenChats: firebase.firestore.FieldValue.arrayRemove(chatKey)
            });

            // Karşı taraf için unhide bilgisini Firestore dinleyicisi (data.js) otomatik halledecektir.
            // users state'i tam yüklü değilse bile dinleyici tetiklenecektir.

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

    sendInternalMessage: async function (toPhone, toName, text, productId = null, isSellerToBuyer = true) {
        if (!this.state.user) return;

        const myPhone = this.state.user.phone || '';
        const myName = this.state.user.displayName || 'Komşu';

        const msgData = {
            productId: productId,
            buyerPhone: isSellerToBuyer ? toPhone : myPhone,
            buyerName: isSellerToBuyer ? toName : myName,
            sellerPhone: isSellerToBuyer ? myPhone : toPhone,
            sellerName: isSellerToBuyer ? myName : toName,
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
});
