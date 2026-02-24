// ===== カテゴリ別デフォルト画像（Unsplash） =====
const categoryImages = {
    '常設展示': 'https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?w=400&h=250&fit=crop',
    'イベント': 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=400&h=250&fit=crop',
    '養殖・直売': 'https://images.unsplash.com/photo-1501436513145-30f24e19fcc8?w=400&h=250&fit=crop',
    '養殖・研究': 'https://images.unsplash.com/photo-1501436513145-30f24e19fcc8?w=400&h=250&fit=crop',
    '養殖場': 'https://images.unsplash.com/photo-1501436513145-30f24e19fcc8?w=400&h=250&fit=crop',
    '養殖': 'https://images.unsplash.com/photo-1501436513145-30f24e19fcc8?w=400&h=250&fit=crop',
    '品評会': 'https://images.unsplash.com/photo-1583212292454-1fe6229603b7?w=400&h=250&fit=crop',
    '直売所': 'https://images.unsplash.com/photo-1535591273668-578e31182c4f?w=400&h=250&fit=crop',
    'default': 'https://images.unsplash.com/photo-1524704654690-b56c05c78a00?w=400&h=250&fit=crop'
};

// SVGプレースホルダー（外部画像がロードできない場合用）
const categoryPlaceholderColors = {
    '常設展示': '#1e3a5f',
    'イベント': '#be123c',
    '養殖・直売': '#4a7c59',
    '養殖・研究': '#4a7c59',
    '養殖場': '#4a7c59',
    '養殖': '#4a7c59',
    '品評会': '#c77c2a',
    '直売所': '#6b7280',
    'default': '#4b5563'
};

function makePlaceholderSvg(category) {
    const color = categoryPlaceholderColors[category] || categoryPlaceholderColors['default'];
    return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect fill="${color}" width="400" height="250" opacity="0.12"/><text x="200" y="130" text-anchor="middle" font-size="48" fill="${color}" opacity="0.3" font-family="serif">🐟</text></svg>`)}`;
}

function getCategoryImage(category) {
    return categoryImages[category] || categoryImages['default'];
}

function handleImageError(img, category) {
    img.src = makePlaceholderSvg(category || 'default');
    img.onerror = null;
}

// ===== 地図の初期化 =====
const map = L.map('map').setView([36.2048, 138.2529], 5);

// CartoDB Voyager（水色基調の柔らかいタイル）
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
}).addTo(map);

// クラスタグループの初期化
const markerClusterGroup = L.markerClusterGroup({
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    maxClusterRadius: 50
});
map.addLayer(markerClusterGroup);

let markers = [];
const locationListEl = document.getElementById('location-list');
const filterBtns = document.querySelectorAll('.filter-btn');
const searchInput = document.getElementById('search-input');

// ===== カテゴリごとの色設定（和風カラー） =====
const categoryColors = {
    '常設展示': '#1e3a5f',   // 藍色
    'イベント': '#be123c',   // 朱赤
    '養殖・直売': '#4a7c59', // 抹茶
    '養殖・研究': '#4a7c59',
    '養殖場': '#4a7c59',
    '養殖': '#4a7c59',
    '品評会': '#c77c2a',     // 琥珀
    '直売所': '#6b7280',
    'その他': '#4b5563'
};

// ===== 訪問記録 (localStorage) =====
const STORAGE_KEY = 'kingyo_visited_spots';

function getVisitedSpots() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
}

function setVisited(spotName, visited) {
    const spots = getVisitedSpots();
    if (visited) {
        spots[spotName] = Date.now();
    } else {
        delete spots[spotName];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(spots));
    updateVisitCounter();
}

function isVisited(spotName) {
    return !!getVisitedSpots()[spotName];
}

function getVisitedCount() {
    return Object.keys(getVisitedSpots()).length;
}

function updateVisitCounter() {
    const totalSpots = (typeof goldfishLocations !== 'undefined') ? goldfishLocations.length : 192;
    const visitedCount = getVisitedCount();
    const el = document.getElementById('visit-count');
    if (el) el.textContent = visitedCount;

    const totalEl = document.getElementById('total-count');
    if (totalEl) totalEl.textContent = totalSpots;

    // プログレスバー更新
    const progressFill = document.getElementById('progress-fill');
    if (progressFill) {
        const pct = totalSpots > 0 ? (visitedCount / totalSpots) * 100 : 0;
        progressFill.style.width = pct + '%';
    }

    // プログレステキスト更新
    const progressText = document.getElementById('progress-text');
    if (progressText) {
        const remaining = totalSpots - visitedCount;
        if (remaining <= 0) {
            progressText.textContent = '🎉 全スポット制覇おめでとう！';
            progressText.style.color = 'var(--shu-red)';
            progressText.style.fontWeight = 'bold';
        } else {
            progressText.textContent = `制覇まであと ${remaining} カ所！`;
        }
    }
}

// ===== 魚シルエット SVG ピン =====
function createCustomIcon(category, visited) {
    const color = categoryColors[category] || categoryColors['その他'];
    const goldStar = visited ? `<span style="position:absolute;top:-5px;right:-5px;font-size:12px;">⭐</span>` : '';
    return L.divIcon({
        className: 'custom-pin',
        html: `<div class="marker-inner" style="
            position: relative;
            background: linear-gradient(135deg, ${color}, ${color}dd);
            width: 32px;
            height: 32px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 3px 8px rgba(0,0,0,0.25);
            border: 2px solid rgba(255,255,255,0.8);
            ${visited ? 'border-color: #e8a030;' : ''}
        ">
            <i class="fa-solid fa-fish fish-icon" style="
                transform: rotate(45deg);
                color: white;
                font-size: 14px;
            "></i>
            ${goldStar}
        </div>`,
        iconSize: [32, 44],
        iconAnchor: [16, 44],
        popupAnchor: [0, -42]
    });
}

// ===== アプリの描画 =====
function renderApp(data) {
    markerClusterGroup.clearLayers();
    markers = [];
    locationListEl.innerHTML = '';

    if (!data || data.length === 0) {
        locationListEl.innerHTML = '<div style="text-align:center;padding:30px;color:#999;font-size:0.85rem;">該当するスポットが見つかりません</div>';
        return;
    }

    data.forEach(item => {
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lng);
        if (isNaN(lat) || isNaN(lng)) return;

        const visited = isVisited(item.name);
        const icon = createCustomIcon(item.category, visited);
        const marker = L.marker([lat, lng], { icon: icon });

        const description = item.description || item.desc || "詳細情報はありません。";
        const season = item.season ? `<div class="popup-season"><i class="fa-regular fa-calendar"></i> ${item.season}</div>` : '';
        const imageUrl = item.imageUrl || getCategoryImage(item.category);

        const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

        const visitedClass = visited ? ' is-visited' : '';
        const visitedLabel = visited ? '✓ 訪問済み' : '🐟 行ったよ！';

        const escapedName = item.name.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
        const popupContent = `
            <div class="popup-card">
                <img src="${imageUrl}" alt="${item.name}" class="popup-image" onerror="handleImageError(this,'${item.category}')">
                <div class="popup-body">
                    <h3>${item.name}</h3>
                    <div class="popup-meta">
                        <span class="badge ${item.category}">${item.category}</span>
                        <span>${item.pref}</span>
                    </div>
                    <div class="popup-desc">${description}</div>
                    ${season}
                    <div class="popup-actions">
                        <a href="${googleMapsUrl}" target="_blank" rel="noopener" class="google-maps-link">
                            <i class="fa-solid fa-location-arrow"></i> Googleマップ
                        </a>
                        <button class="visited-btn${visitedClass}" data-spot="${escapedName}" onclick="toggleVisited(this.dataset.spot, this)">
                            ${visitedLabel}
                        </button>
                    </div>
                </div>
            </div>
        `;
        marker.bindPopup(popupContent, { maxWidth: 280, minWidth: 240 });

        markerClusterGroup.addLayer(marker);

        // サイドバーのリスト項目
        const listItem = document.createElement('div');
        listItem.className = 'location-item';
        listItem.innerHTML = `
            <img src="${imageUrl}" alt="" class="thumb" onerror="handleImageError(this,'${item.category}')" loading="lazy">
            <div class="item-content">
                <span class="location-title">${item.name}</span>
                <div class="location-meta">
                    <span class="badge ${item.category}">${item.category}</span>
                    <span style="font-size:0.75rem;color:#6b5e50">${item.pref}</span>
                    ${visited ? '<span class="visited-badge">⭐ 訪問済</span>' : ''}
                </div>
                <div class="location-desc">${description}</div>
            </div>
        `;

        listItem.addEventListener('click', () => {
            document.querySelectorAll('.location-item').forEach(el => el.classList.remove('active'));
            listItem.classList.add('active');
            map.flyTo([lat, lng], 14, { animate: true, duration: 1.5 });
            marker.openPopup();
        });

        locationListEl.appendChild(listItem);
        markers.push({ marker, item, element: listItem });
    });

    updateVisitCounter();
}

// 「行ったよ！」ボタンのトグル
function toggleVisited(spotName, btnEl) {
    const nowVisited = !isVisited(spotName);
    setVisited(spotName, nowVisited);

    if (nowVisited) {
        btnEl.classList.add('is-visited');
        btnEl.innerHTML = '✓ 訪問済み';
    } else {
        btnEl.classList.remove('is-visited');
        btnEl.innerHTML = '🐟 行ったよ！';
    }

    // データを再描画して反映
    setTimeout(() => filterData(), 300);
}

// ===== 現在地表示機能 =====
function onLocationFound(e) {
    L.circleMarker(e.latlng, {
        radius: 10,
        color: '#1e3a5f',
        fillColor: '#4285F4',
        fillOpacity: 0.8,
        weight: 2
    }).addTo(map).bindPopup("あなたの現在地付近です").openPopup();
    map.flyTo(e.latlng, 14);
}

function onLocationError(e) {
    alert("位置情報の取得に失敗しました。ブラウザの設定で位置許可をオンにしてください。");
}

map.on('locationfound', onLocationFound);
map.on('locationerror', onLocationError);

const locateBtn = document.getElementById('locate-btn');
if (locateBtn) {
    locateBtn.addEventListener('click', () => {
        map.locate({ setView: true, maxZoom: 15 });
    });
}

// ===== フィルタリング機能 =====
let currentCategory = 'all';
let searchQuery = '';

function filterData() {
    let filtered = (typeof goldfishLocations !== 'undefined') ? goldfishLocations : [];

    // 訪問済みフィルタ
    if (currentCategory === 'visited') {
        filtered = filtered.filter(item => isVisited(item.name));
    } else if (currentCategory !== 'all') {
        filtered = filtered.filter(item =>
            item.category === currentCategory ||
            (currentCategory === 'その他' && !categoryColors.hasOwnProperty(item.category))
        );
    }

    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(item =>
            item.name.toLowerCase().includes(q) ||
            item.pref.toLowerCase().includes(q) ||
            (item.description && item.description.toLowerCase().includes(q))
        );
    }
    renderApp(filtered);
}

// フィルタボタンのイベント
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCategory = btn.dataset.category;
        filterData();
    });
});

// 検索入力のイベント
searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    filterData();
});

// ===== サイドバー開閉 =====
const sidebar = document.getElementById('sidebar');
const toggleBtn = document.getElementById('toggle-sidebar');

if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        setTimeout(() => { map.invalidateSize(); }, 400);
    });
}

// ===== 初回描画 =====
const mapData = (typeof goldfishLocations !== 'undefined') ? goldfishLocations : [];
renderApp(mapData);

// ===== 本日のおすすめスポット =====
function showDailyPick() {
    const data = (typeof goldfishLocations !== 'undefined') ? goldfishLocations : [];
    if (data.length === 0) return;

    // 日付ベースのシード値でランダムに1スポット選出
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    const index = seed % data.length;
    const spot = data[index];

    const contentEl = document.getElementById('daily-pick-content');
    if (!contentEl) return;

    const description = spot.description || spot.desc || '';
    contentEl.innerHTML = `
        <div class="daily-pick-name">${spot.name}</div>
        <div class="daily-pick-meta">
            <span class="badge ${spot.category}">${spot.category}</span>
            <span style="font-size:0.75rem;color:#6b5e50">${spot.pref}</span>
        </div>
        <div class="daily-pick-desc">${description}</div>
    `;

    // クリックで地図上のスポットにフォーカス
    const dailyPickEl = document.getElementById('daily-pick');
    if (dailyPickEl) {
        dailyPickEl.addEventListener('click', () => {
            const lat = parseFloat(spot.lat);
            const lng = parseFloat(spot.lng);
            if (!isNaN(lat) && !isNaN(lng)) {
                map.flyTo([lat, lng], 14, { animate: true, duration: 1.5 });
                // 対応するマーカーのポップアップを開く
                const found = markers.find(m => m.item.name === spot.name);
                if (found) {
                    setTimeout(() => found.marker.openPopup(), 1600);
                }
            }
        });
    }
}
showDailyPick();