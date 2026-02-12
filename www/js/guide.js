
const appGuide = {
    currentStep: 0,
    steps: [
        {
            text: "Selam! Ben **Pusula**, senin Yanımdaki mahalle rehberinim! Yanımdaki dünyasına hoş geldin! 🧭✨",
            btn: "Memnun oldum!"
        },
        {
            text: "⚡ **Hızlı Nakit:** Mahallemizde eşyalarını tam 24 saatte komşuna satıp nakde çevirebileceğini biliyor muydun?",
            btn: "Süpermiş!"
        },
        {
            text: "📦 **Sürpriz Paket:** Mahalle esnafımızdaki taze ve indirimli gıda paketlerini kaçırma, bütçeni koru!",
            btn: "Devam et"
        },
        {
            text: "🏠 **Esnaf Fırsatları:** Mahallenin esnafı artık cebinde! Sana özel anlık fırsatları benden takip edebilirsin.",
            btn: "Çok iyi!"
        },
        {
            text: "🤝 **Takas Seçeneği:** Kullanmadığın eşyaları komşularınla takas et, mahalle ekonomisine can ver!",
            btn: "Harika!"
        },
        {
            text: "🛠️ **Usta & Yardım:** Bir şeye mi ihtiyacın var? Komşularından teknik destek veya yardım isteyebilirsin.",
            btn: "Anladım!"
        },
        {
            text: "Mahallenin tüm fırsatları için beni takip et! Hadi, keşfetmeye başlayalım. ✨",
            btn: "Başlayalım!"
        }
    ],

    init: function () {
        // Her sayfa yenilendiğinde (refresh) tekrar görünmesi için localStorage kontrolü kaldırıldı.
        setTimeout(() => {
            const container = document.getElementById('guide-container');
            if (container) {
                container.classList.add('active');
                this.currentStep = 0;
                this.updateStep();
            }
        }, 2000);
    },

    nextStep: function () {
        this.currentStep++;
        if (this.currentStep < this.steps.length) {
            this.updateStep();
        } else {
            this.complete();
        }
    },

    updateStep: function () {
        const textEl = document.getElementById('guide-text');
        const btnEl = document.getElementById('guide-btn');

        if (textEl && btnEl) {
            textEl.style.opacity = 0;
            setTimeout(() => {
                textEl.innerHTML = this.steps[this.currentStep].text;
                btnEl.innerText = this.steps[this.currentStep].btn;
                textEl.style.opacity = 1;
            }, 200);
        }
    },

    complete: function () {
        const container = document.getElementById('guide-container');
        if (container) {
            container.classList.remove('active');
        }
    }
};

// Sayfa yüklendiğinde rehberi başlat
document.addEventListener('DOMContentLoaded', () => {
    appGuide.init();
});
