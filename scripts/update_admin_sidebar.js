const fs = require('fs');
const path = require('path');

const adminHtmlPath = path.resolve(__dirname, '../admin.html');
let html = fs.readFileSync(adminHtmlPath, 'utf8');

// 1. Add CSS rules for collapsed sidebar and tooltips
const oldCssTarget = `        /* Sidebar */
        .sidebar {
            width: 280px;
            background: var(--bg-sidebar);
            backdrop-filter: var(--glass-blur);
            -webkit-backdrop-filter: var(--glass-blur);
            border-right: 1px solid var(--border-color);
            padding: 32px 20px;
            display: flex;
            flex-direction: column;
            position: fixed;
            height: 100vh;
            z-index: 1000;
            transition: all 0.4s ease;
        }`;

const newCssReplacement = `        /* Sidebar */
        .sidebar {
            width: 280px;
            background: var(--bg-sidebar);
            backdrop-filter: var(--glass-blur);
            -webkit-backdrop-filter: var(--glass-blur);
            border-right: 1px solid var(--border-color);
            padding: 24px 16px;
            display: flex;
            flex-direction: column;
            position: fixed;
            height: 100vh;
            z-index: 1000;
            transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1), padding 0.35s ease, transform 0.4s ease;
            overflow-x: hidden;
        }

        .sidebar.collapsed {
            width: 78px;
            padding: 24px 10px;
        }

        .sidebar-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 32px;
            padding: 0 4px;
            position: relative;
        }

        .sidebar.collapsed .sidebar-top {
            justify-content: center;
            margin-bottom: 24px;
        }

        .sidebar-toggle-btn {
            width: 32px;
            height: 32px;
            border-radius: 10px;
            background: white;
            border: 1px solid var(--border-color);
            color: var(--text-muted);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: var(--shadow-sm);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            flex-shrink: 0;
        }

        .sidebar-toggle-btn:hover {
            color: var(--primary);
            border-color: var(--primary);
            transform: scale(1.08);
            background: var(--primary-light);
        }

        .sidebar.collapsed .sidebar-toggle-btn {
            position: absolute;
            right: -2px;
            top: -10px;
            width: 22px;
            height: 22px;
            font-size: 0.65rem;
            border-radius: 50%;
            background: var(--primary);
            color: white;
            border: 2px solid white;
            box-shadow: 0 2px 8px rgba(0, 173, 239, 0.4);
            transform: rotate(180deg);
        }

        .sidebar.collapsed .sidebar-toggle-btn:hover {
            transform: rotate(180deg) scale(1.18);
        }

        .header-toggle-btn {
            width: 44px;
            height: 44px;
            border-radius: 14px;
            background: white;
            border: 1px solid var(--border-color);
            color: var(--text-muted);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: var(--shadow-sm);
            transition: all 0.2s ease;
            font-size: 1.1rem;
            flex-shrink: 0;
        }

        .header-toggle-btn:hover {
            color: var(--primary);
            border-color: var(--primary);
            background: var(--primary-light);
            transform: translateY(-1px);
        }

        .sidebar.collapsed .sidebar-logo .logo-text {
            display: none !important;
            opacity: 0;
            width: 0;
        }

        .sidebar.collapsed .nav-label {
            display: none !important;
            opacity: 0;
            height: 0;
            margin: 0;
            padding: 0;
        }

        .sidebar.collapsed .nav-section {
            margin-bottom: 8px;
            padding-bottom: 8px;
            border-bottom: 1px dashed rgba(226, 232, 240, 0.8);
        }

        .sidebar.collapsed .nav-section:last-child {
            border-bottom: none;
        }

        .sidebar.collapsed .nav-link {
            justify-content: center;
            padding: 12px 0;
            gap: 0;
            margin-bottom: 6px;
            position: relative;
        }

        .sidebar.collapsed .nav-link:hover {
            transform: scale(1.08);
        }

        .sidebar.collapsed .nav-link span {
            display: none !important;
            opacity: 0;
            width: 0;
        }

        .sidebar.collapsed .nav-link:hover::after {
            content: attr(data-title);
            position: absolute;
            left: calc(100% + 14px);
            top: 50%;
            transform: translateY(-50%);
            background: #0f172a;
            color: #ffffff;
            font-size: 0.8rem;
            font-weight: 700;
            padding: 7px 14px;
            border-radius: 10px;
            white-space: nowrap;
            z-index: 2000;
            box-shadow: 0 6px 20px rgba(0,0,0,0.25);
            pointer-events: none;
            animation: tooltipSlideIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .sidebar.collapsed .nav-link:hover::before {
            content: '';
            position: absolute;
            left: calc(100% + 8px);
            top: 50%;
            transform: translateY(-50%);
            border-width: 5px 6px 5px 0;
            border-style: solid;
            border-color: transparent #0f172a transparent transparent;
            z-index: 2000;
            pointer-events: none;
        }

        @keyframes tooltipSlideIn {
            from { opacity: 0; transform: translateY(-50%) translateX(-6px); }
            to { opacity: 1; transform: translateY(-50%) translateX(0); }
        }`;

// Replace CRLF-safe
const normalize = s => s.replace(/\r\n/g, '\n');
html = normalize(html);
const targetNorm = normalize(oldCssTarget);

if (html.includes(targetNorm)) {
    html = html.replace(targetNorm, normalize(newCssReplacement));
    console.log('Successfully replaced sidebar CSS in admin.html');
} else {
    console.warn('Could not find exact CSS target in admin.html');
}

// 2. Update .main rule
const oldMainCss = normalize(`        .main {
            flex: 1;
            margin-left: 280px;
            padding: 40px;
            max-width: calc(100vw - 280px);
        }`);

const newMainCss = normalize(`        .main {
            flex: 1;
            margin-left: 280px;
            padding: 40px;
            max-width: calc(100vw - 280px);
            transition: margin-left 0.35s cubic-bezier(0.4, 0, 0.2, 1), max-width 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }

        body.sidebar-collapsed .main {
            margin-left: 78px;
            max-width: calc(100vw - 78px);
        }`);

if (html.includes(oldMainCss)) {
    html = html.replace(oldMainCss, newMainCss);
    console.log('Successfully updated .main CSS in admin.html');
}

// 3. Update sidebar top HTML
const oldSidebarTop = normalize(`    <aside class="sidebar">
        <a href="#" class="sidebar-logo">
            <div class="logo-icon">
                <i class="fas fa-location-dot"></i>
            </div>
            <div class="logo-text">Yanım<span>daki</span></div>
        </a>`);

const newSidebarTop = normalize(`    <aside class="sidebar">
        <div class="sidebar-top">
            <a href="#" class="sidebar-logo" style="margin-bottom: 0; padding: 0;">
                <div class="logo-icon">
                    <i class="fas fa-location-dot"></i>
                </div>
                <div class="logo-text">Yanım<span>daki</span></div>
            </a>
            <button id="sidebar-collapse-btn" class="sidebar-toggle-btn" onclick="adminApp.toggleCollapse()" title="Menüyü Daralt/Genişlet">
                <i class="fas fa-angles-left"></i>
            </button>
        </div>`);

if (html.includes(oldSidebarTop)) {
    html = html.replace(oldSidebarTop, newSidebarTop);
    console.log('Successfully updated sidebar-top HTML in admin.html');
}

// 4. Update header HTML with toggle button
const oldHeader = normalize(`    <main class="main">
        <header class="header">
            <div class="welcome-box">
                <h1 id="tab-title">Hoş Geldiniz 👋</h1>
                <p>Uygulamanızın bugün neler yaptığını görün.</p>
            </div>`);

const newHeader = normalize(`    <main class="main">
        <header class="header">
            <div style="display: flex; align-items: center; gap: 16px;">
                <button id="header-sidebar-toggle-btn" class="header-toggle-btn" onclick="adminApp.toggleCollapse()" title="Menüyü Daralt/Genişlet">
                    <i class="fas fa-bars-staggered"></i>
                </button>
                <div class="welcome-box">
                    <h1 id="tab-title">Hoş Geldiniz 👋</h1>
                    <p>Uygulamanızın bugün neler yaptığını görün.</p>
                </div>
            </div>`);

if (html.includes(oldHeader)) {
    html = html.replace(oldHeader, newHeader);
    console.log('Successfully updated header HTML in admin.html');
}

// 5. Add data-title attributes to all nav-links
const navReplacements = [
    ['onclick="adminApp.switchTab(\'dashboard\')"', 'data-title="Dashboard" onclick="adminApp.switchTab(\'dashboard\')"'],
    ['onclick="adminApp.switchTab(\'users\')"', 'data-title="Kullanıcılar" onclick="adminApp.switchTab(\'users\')"'],
    ['onclick="adminApp.switchTab(\'ads\')"', 'data-title="İlan Yönetimi" onclick="adminApp.switchTab(\'ads\')"'],
    ['onclick="adminApp.switchTab(\'payments\')"', 'data-title="Ödeme Onayları" onclick="adminApp.switchTab(\'payments\')"'],
    ['onclick="adminApp.switchTab(\'gallery_applications\')"', 'data-title="Vitrin Başvuruları" onclick="adminApp.switchTab(\'gallery_applications\')"'],
    ['onclick="adminApp.switchTab(\'partners\')"', 'data-title="İş Ortakları" onclick="adminApp.switchTab(\'partners\')"'],
    ['onclick="adminApp.switchTab(\'gallery\')"', 'data-title="Sponsorlu Galeri" onclick="adminApp.switchTab(\'gallery\')"'],
    ['onclick="adminApp.switchTab(\'banners\')"', 'data-title="Ana Sayfa Banner" onclick="adminApp.switchTab(\'banners\')"'],
    ['onclick="adminApp.switchTab(\'campaigns\')"', 'data-title="Kampanyalar" onclick="adminApp.switchTab(\'campaigns\')"'],
    ['onclick="adminApp.switchTab(\'reports\')"', 'data-title="Şikayetler" onclick="adminApp.switchTab(\'reports\')"'],
    ['onclick="adminApp.switchTab(\'reset\')"', 'data-title="Sistemi Sıfırla" onclick="adminApp.switchTab(\'reset\')"']
];

for (const [target, repl] of navReplacements) {
    if (html.includes(target) && !html.includes(repl)) {
        html = html.replace(target, repl);
    }
}
console.log('Successfully added data-title to nav-links');

// Convert back to CRLF
html = html.replace(/\n/g, '\r\n');
fs.writeFileSync(adminHtmlPath, html, 'utf8');
console.log('admin.html updated successfully!');

// Now update admin.js
const adminJsPath = path.resolve(__dirname, '../admin.js');
let js = fs.readFileSync(adminJsPath, 'utf8');
js = normalize(js);

// 1. In init, check localStorage
const oldJsInit = normalize(`    init: function () {
        console.log("Admin Panel Başlatıldı...");`);

const newJsInit = normalize(`    init: function () {
        console.log("Admin Panel Başlatıldı...");

        // Kaydedilmiş daraltma tercihini uygula
        const savedCollapsed = localStorage.getItem('admin_sidebar_collapsed') === 'true';
        if (savedCollapsed) {
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) sidebar.classList.add('collapsed');
            document.body.classList.add('sidebar-collapsed');
            const btn = document.getElementById('sidebar-collapse-btn');
            if (btn) btn.title = 'Menüyü Genişlet';
        }`);

if (js.includes(oldJsInit)) {
    js = js.replace(oldJsInit, newJsInit);
    console.log('Successfully updated init in admin.js');
}

// 2. In switchTab, map human friendly titles
const oldSwitchTab = normalize(`        document.getElementById('tab-title').textContent = tab.charAt(0).toUpperCase() + tab.slice(1);`);
const newSwitchTab = normalize(`        const tabTitles = {
            'dashboard': 'Genel Bakış (Dashboard)',
            'users': 'Kullanıcı Yönetimi',
            'ads': 'İlan Yönetimi',
            'payments': 'Ödeme Onayları',
            'gallery_applications': 'Vitrin Başvuruları',
            'partners': 'İş Ortakları (Güvenli Noktalar)',
            'gallery': 'Sponsorlu Galeri',
            'banners': 'Ana Sayfa Banner Yönetimi',
            'campaigns': 'Kampanyalar',
            'reports': 'Şikayetler & Moderasyon',
            'reset': 'Sistemi Sıfırla'
        };
        document.getElementById('tab-title').textContent = tabTitles[tab] || (tab.charAt(0).toUpperCase() + tab.slice(1));`);

if (js.includes(oldSwitchTab)) {
    js = js.replace(oldSwitchTab, newSwitchTab);
    console.log('Successfully updated switchTab in admin.js');
}

// 3. Add toggleCollapse method
const oldToggleSidebar = normalize(`    toggleSidebar: function () {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (sidebar && overlay) {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        }
    },`);

const newToggleSidebar = normalize(`    toggleCollapse: function () {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;
        const isCollapsed = sidebar.classList.toggle('collapsed');
        document.body.classList.toggle('sidebar-collapsed', isCollapsed);

        localStorage.setItem('admin_sidebar_collapsed', isCollapsed ? 'true' : 'false');

        const btn = document.getElementById('sidebar-collapse-btn');
        if (btn) {
            btn.title = isCollapsed ? 'Menüyü Genişlet' : 'Menüyü Daralt';
        }
    },

    toggleSidebar: function () {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (sidebar && overlay) {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        }
    },`);

if (js.includes(oldToggleSidebar)) {
    js = js.replace(oldToggleSidebar, newToggleSidebar);
    console.log('Successfully added toggleCollapse to admin.js');
}

js = js.replace(/\n/g, '\r\n');
fs.writeFileSync(adminJsPath, js, 'utf8');
console.log('admin.js updated successfully!');
