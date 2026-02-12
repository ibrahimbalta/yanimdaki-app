Object.assign(window.app, {
    // --- Auth UI Actions ---
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
            setTimeout(() => this.init(), 1000);
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

        // Strong Password Regex
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
                setTimeout(() => this.init(), 1000);
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
        // Daha güçlü native tespiti
        const isNative = (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) ||
            (window.Capacitor && window.Capacitor.platform !== 'web');

        console.log("[GoogleAuth] handleGoogleLogin called. isNative:", isNative);

        try {
            if (isNative) {
                // ===== NATIVE UYGULAMA (Android/iOS APK) =====
                this.toast('Google ile bağlanılıyor (Native)...', 'info');
                console.log("[GoogleAuth] Attempting native login...");

                const GoogleAuth = window.Capacitor.Plugins.GoogleAuth;

                if (!GoogleAuth) {
                    const msg = "GoogleAuth eklentisi bulunamadı! Lütfen uygulamayı yeniden derleyin.";
                    console.error("[GoogleAuth]", msg);
                    this.toast(msg, 'error');
                    return;
                }

                try {
                    const googleUser = await GoogleAuth.signIn();
                    console.log("[GoogleAuth] SignIn success, getting credential...");

                    if (googleUser && googleUser.authentication && googleUser.authentication.idToken) {
                        const credential = firebase.auth.GoogleAuthProvider.credential(googleUser.authentication.idToken);
                        const result = await auth.signInWithCredential(credential);

                        console.log("[GoogleAuth] Firebase login success:", result.user.email);
                        this.toast('Google ile giriş başarılı! ✨', 'success');
                        setTimeout(() => this.init(), 500);
                    } else {
                        throw new Error('Google token\'u alınamadı.');
                    }
                } catch (nativeError) {
                    console.error("[GoogleAuth] Native SignIn Error Full:", JSON.stringify(nativeError));
                    // Hata detayını kullanıcıya göster
                    let errorMsg = nativeError.message || JSON.stringify(nativeError);
                    if (nativeError.code === "12500") errorMsg = "Google Play Hizmetleri hatası (12500 - SHA-1 parmak izi uyuşmazlığı)";
                    if (nativeError.code === "10") errorMsg = "Geliştirici hatası (10 - ClientID veya SHA-1 yanlış)";

                    alert("Google Giriş Hatası Detayı: " + JSON.stringify(nativeError)); // Ekranın ortasında gösterelim
                    this.toast('Google girişi başarısız: ' + errorMsg, 'error');
                }
            } else {
                // ===== WEB TARAYICI =====
                this.toast('Google ile bağlanılıyor...', 'info');
                await this.handleGoogleLoginWeb();
            }
        } catch (err) {
            console.error("[GoogleAuth] Global Error:", err);
            this.toast('Google girişi hatası: ' + err.message, 'error');
        }
    },

    // Web tabanlı Google giriş (tarayıcı için)
    handleGoogleLoginWeb: async function () {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({
            prompt: 'select_account'
        });

        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        try {
            // Önce popup dene
            const result = await auth.signInWithPopup(provider);
            if (result && result.user) {
                console.log("Google Popup login success:", result.user.email);
                this.toast('Google ile giriş başarılı! ✨', 'success');
                setTimeout(() => this.init(), 500);
            }
        } catch (popupError) {
            console.warn("Popup failed, trying redirect:", popupError.code);

            // Popup başarısız olursa redirect dene
            if (popupError.code === 'auth/popup-blocked' ||
                popupError.code === 'auth/popup-closed-by-user' ||
                popupError.code === 'auth/cancelled-popup-request') {

                if (isMobile) {
                    this.toast('Popup engellenmiş, yönlendirme ile deneniyor...', 'info');
                    await auth.signInWithRedirect(provider);
                } else {
                    throw popupError;
                }
            } else {
                throw popupError;
            }
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
        if (!input) return;

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
        const strengthBar = document.getElementById('password-strength-bar');
        const strengthText = document.getElementById('password-strength-text');
        if (!strengthBar || !strengthText) return;

        let strength = 0;
        if (password.length >= 8) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;

        const colors = ['#FF4444', '#FF8800', '#FFBB00', '#88CC00', '#00AA00'];
        const labels = ['Çok Zayıf', 'Zayıf', 'Orta', 'Güçlü', 'Çok Güçlü'];

        strengthBar.style.width = (strength * 20) + '%';
        strengthBar.style.background = colors[strength - 1] || '#E2E8F0';
        strengthText.textContent = labels[strength - 1] || '';
        strengthText.style.color = colors[strength - 1] || 'var(--text-muted)';
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
            this.toast('Doğrulama maili tekrar gönderildi! 📧', 'success');
            if (btn) {
                let seconds = 60;
                const timer = setInterval(() => {
                    seconds--;
                    btn.textContent = `Tekrar Gönder (${seconds}s)`;
                    if (seconds <= 0) {
                        clearInterval(timer);
                        btn.disabled = false;
                        btn.textContent = 'Doğrulama Mailini Tekrar Gönder 📧';
                    }
                }, 1000);
            }
        } catch (err) {
            console.error("Resend error:", err);
            this.toast('Hata: ' + err.message, 'error');
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Doğrulama Mailini Tekrar Gönder 📧';
            }
        }
    },

    deleteAccount: async function () {
        if (!confirm('Hesabınızı silmek istediğinize emin misiniz? Bu işlem geri alınamaz ve tüm ilanlarınız, teklifleriniz silinecektir.')) {
            return;
        }

        const user = auth.currentUser;
        if (!user) return this.toast('Giriş yapmadan hesap silemezsiniz.', 'error');

        try {
            this.toast('Hesap ve veriler siliniyor...', 'info');

            // 1. Kullanıcının ürünlerini sil
            const productsSnapshot = await db.collection('products').where('ownerId', '==', user.uid).get();
            const deletePromises = productsSnapshot.docs.map(doc => doc.ref.delete());
            await Promise.all(deletePromises);

            // 2. Kullanıcının tekliflerini sil
            const offersSnapshot = await db.collection('offers').where('buyerId', '==', user.uid).get();
            const offerDeletePromises = offersSnapshot.docs.map(doc => doc.ref.delete());
            await Promise.all(offerDeletePromises);

            // 3. Users collection'dan sil
            await db.collection('users').doc(user.uid).delete();

            // 4. Firebase Auth'tan sil
            await user.delete();

            this.toast('Hesabınız başarıyla silindi. Hoşçakalın! 👋', 'success');
            setTimeout(() => window.location.reload(), 2000);
        } catch (err) {
            console.error("Delete account error:", err);
            if (err.code === 'auth/requires-recent-login') {
                this.toast('Güvenlik için lütfen tekrar giriş yapın ve tekrar deneyin.', 'error');
            } else {
                this.toast('Hesap silme hatası: ' + err.message, 'error');
            }
        }
    },

    checkAuth: function (message = 'Bu özelliği kullanmak için lütfen kayıt olun veya giriş yapın.') {
        if (!this.state.user) {
            this.toast(message, 'warning');
            this.showScreen('landing');
            return false;
        }
        return true;
    },
});
