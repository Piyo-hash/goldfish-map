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

function getCategoryImage(category) {
    return categoryImages[category] || categoryImages['default'];
}

// ===== 地図の初期化 =====
const map = L.map('map').setView([36.2048, 138.2529], 5);

L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>'
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
    const el = document.getElementById('visit-count');
    if (el) el.textContent = getVisitedCount();
}

// ===== 魚シルエット SVG ピン =====
function createCustomIcon(category, visited) {
    const color = categoryColors[category] || categoryColors['その他'];
    const fishSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="white">
        <path d="M12 2C12 2 3 8 3 12s9 10 9 10 9-6 9-10S12 2 12 2zm0 3c1.5 2 5 5 6.5 7-1.5 2-5 5-6.5 7-1.5-2-5-5-6.5-7C7 10 10.5 7 12 5zm0 4a3 3 0 100 6 3 3 0 000-6z"/>
    </svg>`;
    const goldStar = visited ? `<span style="position:absolute;top:-5px;right:-5px;font-size:12px;">⭐</span>` : '';
    return L.divIcon({
        className: 'custom-pin',
        html: `<div style="
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
            <i class="fa-solid fa-fish" style="
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

        const popupContent = `
            <div class="popup-card">
                <img src="${imageUrl}" alt="${item.name}" class="popup-image" onerror="this.style.display='none'">
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
                        <button class="visited-btn${visitedClass}" onclick="toggleVisited('${item.name.replace(/'/g, "\\'")}', this)">
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
            <img src="${imageUrl}" alt="" class="thumb" onerror="this.style.display='none'" loading="lazy">
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