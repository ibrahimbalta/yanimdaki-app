/**
 * Yanımdaki - Utility Functions
 * Bu dosya uygulama genelinde kullanılan yardımcı fonksiyonları içerir.
 */

const utils = {
    /**
     * İki koordinat arasındaki mesafeyi KM cinsinden hesaplar (Haversine formülü)
     */
    calculateDistance: function (lat1, lon1, lat2, lon2) {
        if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
        const R = 6371; // Dünya yarıçapı (km)
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    },

    /**
     * Mesafeyi okunabilir formatta döndürür
     */
    formatDistance: function (d) {
        return d < 1 ? Math.round(d * 1000) + ' m' : d.toFixed(1) + ' km';
    },

    /**
     * Fiyatı binlik ayraçlı (nokta) ve Türk Lirası formatında (virgül kuruş) döndürür
     */
    formatPrice: function (num) {
        if (num === undefined || num === null || num === "") return "0";
        let val = typeof num === 'number' ? num : parseFloat(num);
        if (isNaN(val)) return "0";
        return val.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    },

    /**
     * Basit bir küfür/argo temizleme filtresi
     */
    cleanText: function (text) {
        if (!text) return "";
        const badWords = ["küfür1", "argo1", "hakaret1"]; // Gerçek projede genişletilebilir
        let cleaned = text;
        badWords.forEach(word => {
            const regex = new RegExp(word, "gi");
            cleaned = cleaned.replace(regex, "***");
        });
        return cleaned;
    },

    /**
     * HTML karakterlerini kaçırarak XSS saldırılarını önler
     */
    escapeHTML: function (str) {
        if (!str) return "";
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    /**
     * Telefon numarasını karşılaştırmalar için normalize eder (Son 10 hane)
     */
    normalizePhone: function (phone) {
        if (!phone) return "";
        return phone.toString().replace(/\s/g, '').slice(-10);
    },

    /**
     * Tarihi "X dakika önce" gibi okunabilir bağıl zamana çevirir
     */
    formatRelativeTime: function (date) {
        if (!date) return "";
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Az önce';
        if (diffMins < 60) return `${diffMins} dakika önce`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} saat önce`;
        return date.toLocaleDateString();
    },

    /**
     * 8 haneli rastgele bir ilan numarası üretir
     */
    generateAdNumber: function () {
        return Math.floor(10000000 + Math.random() * 90000000);
    },

    /**
     * Ürün görselini döndürür, yoksa placeholder SVG data URI kullanır
     */
    getProductImage: function (product) {
        // Sürpriz paket için varsayılan görsel kontrolü
        if (product.isSurprise && (!product.image || product.image.startsWith('data:image/svg+xml'))) {
            return 'img/surprise-default.png';
        }
        // Önce product.image kontrol et
        if (product.image && product.image.length > 10 && !product.image.includes('undefined')) {
            return product.image;
        }
        // Sonra product.images dizisini kontrol et
        if (product.images && Array.isArray(product.images) && product.images.length > 0 && product.images[0] && product.images[0].length > 10) {
            return product.images[0];
        }
        // Fallback: SVG placeholder (her zaman çalışır)
        return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect fill='%23e2e8f0' width='200' height='200'/%3E%3Cpath fill='%2394a3b8' d='M100 60c-11 0-20 9-20 20s9 20 20 20 20-9 20-20-9-20-20-20zm0 50c-22 0-40 12-40 27v8h80v-8c0-15-18-27-40-27z'/%3E%3Ctext x='100' y='155' text-anchor='middle' fill='%2364748b' font-family='Arial' font-size='12'%3EGörsel Yok%3C/text%3E%3C/svg%3E";
    },

    /**
     * Görselleri istemci tarafında sıkıştırır
     */
    compressImage: function (base64Str, maxWidth = 1024, maxHeight = 1024, quality = 0.7) {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = base64Str;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
        });
    },

    /**
     * Metin içerisinde yasaklı kelime kontrolü yapar. (Moderasyon)
     */
    checkForbiddenContent: function (text) {
        if (!text) return { isForbidden: false };
        const lowerText = text.toLowerCase();

        // Bu liste genişletilebilir veya Firestore'dan çekilebilir
        const forbiddenWords = [
            "küfür1", "argo1", "hakaret1", // Örnek kelimeler
            "uyuşturucu", "silah", "kumar" // Örnek yasaklı ürünler/temalar
        ];

        for (const word of forbiddenWords) {
            if (lowerText.includes(word)) {
                return {
                    isForbidden: true,
                    message: `İçeriğinizde uygunsuz veya yasaklı kelimeler tespit edildi: "${word}". Lütfen politikalarımıza uygun bir açıklama yazın.`
                };
            }
        }

        return { isForbidden: false };
    },

    /**
     * Ürünün 24 saatlik geçerlilik süresini hesaplar
     */
    getProductExpiry: function (product) {
        if (product.expiresAt) {
            return (product.expiresAt.toDate) ? product.expiresAt.toDate() : new Date(product.expiresAt);
        }

        // Önemli: createdAt veya republishedAt henüz sunucudan dönmemiş (null) olabilir.
        // Bu durumda 1970 yılına yuvarlanmasını önlemek için mevcut zamanı (Date.now()) baz alıyoruz.
        const baseTime = (product.republishedAt || product.createdAt);

        if (baseTime) {
            const date = (baseTime.toDate) ? baseTime.toDate() : new Date(baseTime);
            // Eğer Firebase Timestamp henüz null ise (latency), mevcut zamanı kullan
            const finalDate = isNaN(date.getTime()) ? new Date() : date;
            return new Date(finalDate.getTime() + 24 * 60 * 60 * 1000);
        }

        // Hiç tarih yoksa 24 saatlik fallback (Örn: İlan yeni butonuna basıldı ama henüz kaydedilmedi)
        return new Date(Date.now() + 24 * 60 * 60 * 1000);
    },

    /**
     * Ürünün süresinin dolup dolmadığını kontrol eder
     */
    isProductExpired: function (product) {
        const expiry = this.getProductExpiry(product);
        return expiry < new Date();
    },

    /**
     * Vitrin öğesi için en yakın bitiş süresini (ürün vs vitrin paketi) döner
     */
    getShortestExpiry: function (item, product) {
        const productExpiry = this.getProductExpiry(product);
        const vitrineExpiry = item.expiresAt && item.expiresAt.toDate ? item.expiresAt.toDate() : new Date(item.expiresAt.seconds * 1000);

        // Hangisi daha önce bitiyorsa o baz alınır
        return productExpiry < vitrineExpiry ? productExpiry : vitrineExpiry;
    }
};

// Jest/Node ortamı desteği
if (typeof module !== 'undefined' && module.exports) {
    module.exports = utils;
}
