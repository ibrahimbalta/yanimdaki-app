/**
 * Yanımdaki - Native Mobile Modal Gestures (Swipe-to-Dismiss)
 * Enables touch-drag-to-close on bottom sheet modals with haptic feedback.
 */
(function () {
    function initModalGestures() {
        if (window.innerWidth > 768) return;

        let activeSheet = null;
        let startY = 0;
        let currentDeltaY = 0;
        let isDragging = false;
        let startTime = 0;

        document.addEventListener('touchstart', (e) => {
            const overlay = e.target.closest('.modal-overlay, #product-detail-modal');
            if (!overlay || overlay.style.display === 'none') return;

            const sheet = overlay.querySelector('.modal-content, .game-modal') || overlay;
            const target = e.target;
            const sheetRect = sheet.getBoundingClientRect();
            const touchY = e.touches[0].clientY;

            // Handle bar (::before alanı veya üst 60px) veya modal header
            const header = target.closest('.modal-header, .game-modal-header, #product-detail-modal > div:first-child') ||
                           (touchY - sheetRect.top >= 0 && touchY - sheetRect.top <= 65);

            // Eğer başlık dışı bir yerse, ancak dikey kaydırma en tepedeyse (scrollTop <= 0) ve üst 140px içindeyse
            const scrollableBody = sheet.querySelector('.game-modal-body, #detail-content, .modal-body');
            const canDragFromTop = scrollableBody && scrollableBody.scrollTop <= 0 && (touchY - sheetRect.top <= 140);

            // Form inputları, selectler veya butonlara tıklanırken drag başlatma
            const isInteractive = target.closest('input, textarea, select, button, a, [contenteditable="true"]');

            if (!isInteractive && (header || canDragFromTop)) {
                isDragging = true;
                activeSheet = sheet;
                startY = touchY;
                currentDeltaY = 0;
                startTime = Date.now();
                activeSheet.style.transition = 'none';
            }
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            if (!isDragging || !activeSheet) return;
            const deltaY = e.touches[0].clientY - startY;

            if (deltaY > 0) {
                currentDeltaY = deltaY;
                activeSheet.style.transform = `translateY(${deltaY}px)`;
            } else {
                // Yukarı doğru çekilirse hafif direnç uygula
                currentDeltaY = deltaY * 0.15;
                activeSheet.style.transform = `translateY(${currentDeltaY}px)`;
            }
        }, { passive: true });

        document.addEventListener('touchend', () => {
            if (!isDragging || !activeSheet) return;
            isDragging = false;
            const sheet = activeSheet;
            activeSheet = null;

            const timeElapsed = Date.now() - startTime;
            const isFastFlick = timeElapsed < 250 && currentDeltaY > 50;

            if (currentDeltaY > 100 || isFastFlick) {
                // Aşağı kaydırarak kapat
                sheet.style.transition = 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)';
                sheet.style.transform = 'translateY(100%)';

                // Dokunsal titreşim (Haptics)
                try {
                    if (navigator.vibrate) navigator.vibrate(15);
                    if (window.Capacitor?.Plugins?.Haptics) {
                        window.Capacitor.Plugins.Haptics.impact({ style: 'Light' });
                    }
                } catch (err) {
                    // Ignore haptics errors if blocked
                }

                setTimeout(() => {
                    const parentModal = sheet.closest('.modal-overlay, #product-detail-modal');
                    if (parentModal) {
                        const closeBtn = parentModal.querySelector('.fa-times, .close-btn, button[onclick*="close"], i[onclick*="close"]');
                        if (closeBtn) {
                            closeBtn.click();
                        } else {
                            parentModal.style.display = 'none';
                        }
                    }
                    sheet.style.transform = '';
                    sheet.style.transition = '';
                }, 180);
            } else {
                // Yerine geri yaylan (spring bounce)
                sheet.style.transition = 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)';
                sheet.style.transform = 'translateY(0)';
                setTimeout(() => {
                    sheet.style.transform = '';
                    sheet.style.transition = '';
                }, 220);
            }
        }, { passive: true });
    }

    window.initModalGestures = initModalGestures;
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initModalGestures);
    } else {
        initModalGestures();
    }
})();
