// 地図の初期化
const map = L.map('map').setView([36.2048, 138.2529], 5); // 日本全体を中心に

// 地図タイルの読み込み
L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>'
}).addTo(map);

// ★1. クラスタグループの初期化
const markerClusterGroup = L.markerClusterGroup();
map.addLayer(markerClusterGroup);

let markers = [];
const locationListEl = document.getElementById('location-list');
const filterBtns = document.querySelectorAll('.filter-btn');
const searchInput = document.getElementById('search-input');

// カテゴリごとの色設定
const categoryColors = {
    '常設展示': '#1e40af', // 青
    'イベント': '#be123c', // 赤
    '養殖・直売': '#166534', // 緑
    '品評会': '#b45309', // オレンジ
    'その他': '#4b5563'   // グレー
};

// カスタムアイコン（魚マーク）の作成
function createCustomIcon(category) {
    const color = categoryColors[category] || categoryColors['その他'];
    return L.divIcon({
        className: 'custom-pin',
        html: `<div style="
            background-color: ${color};
            width: 30px;
            height: 30px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 2px 2px 5px rgba(0,0,0,0.3);
            border: 2px solid white;
        ">
            <i class="fa-solid fa-fish" style="
                transform: rotate(45deg);
                color: white;
                font-size: 14px;
            "></i>
        </div>`,
        iconSize: [30, 42],
        iconAnchor: [15, 42],
        popupAnchor: [0, -40]
    });
}

// アプリの描画（ピンとリスト）
function renderApp(data) {
    // ★2. 既存のピンを削除（クラスタグループをクリア）
    markerClusterGroup.clearLayers();
    markers = [];
    locationListEl.innerHTML = '';

    if (!data) return;

    data.forEach(item => {
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lng);
        if (isNaN(lat) || isNaN(lng)) return;

        // ピンの作成
        const icon = createCustomIcon(item.category);
        const marker = L.marker([lat, lng], { icon: icon });

        const description = item.description || item.desc || "詳細情報はありません。";
        const season = item.season ? `<div class="popup-season"><i class="fa-regular fa-calendar"></i> ${item.season}</div>` : '';

        // ★3. 吹き出しの内容（Googleマップ連携ボタンを追加）
        // URLのミスを修正しました（${lat} に修正）
        const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        
        const popupContent = `
            <div class="popup-card">
                <h3>${item.name}</h3>
                <div class="popup-meta">
                    <span class="badge ${item.category}">${item.category}</span>
                    <span>${item.pref}</span>
                </div>
                <div class="popup-desc">${description}</div>
                ${season}
                <div class="popup-actions">
                    <a href="${googleMapsUrl}" target="_blank" rel="noopener" class="google-maps-link">
                        <i class="fa-solid fa-location-arrow"></i> Googleマップで開く
                    </a>
                </div>
            </div>
        `;
        marker.bindPopup(popupContent);

        // ★4. クラスタグループにピンを追加
        markerClusterGroup.addLayer(marker);

        // サイドバーの項目作成
        const listItem = document.createElement('div');
        listItem.className = 'location-item';
        listItem.innerHTML = `
            <div class="location-title">${item.name}</div>
            <div class="location-meta">
                <span class="badge ${item.category}">${item.category}</span>
                <span>${item.pref}</span>
            </div>
            <div class="location-desc">${description}</div>
        `;

        // クリックイベント
        listItem.addEventListener('click', () => {
            document.querySelectorAll('.location-item').forEach(el => el.classList.remove('active'));
            listItem.classList.add('active');
            map.flyTo([lat, lng], 14, { animate: true, duration: 1.5 });
            marker.openPopup();
        });

        locationListEl.appendChild(listItem);
        markers.push({ marker, item, element: listItem });
    });
}

// ★5. 現在地表示機能
function onLocationFound(e) {
    const radius = e.accuracy / 2;
    // 現在地に目立つマークを置く
    L.circleMarker(e.latlng, {radius: 10, color: '#4285F4', fillOpacity: 0.8}).addTo(map)
        .bindPopup("あなたの現在地付近です").openPopup();
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
        map.locate({setView: true, maxZoom: 15});
    });
}

// フィルタリング機能
let currentCategory = 'all';
let searchQuery = '';

function filterData() {
    let filtered = (typeof goldfishLocations !== 'undefined') ? goldfishLocations : [];

    if (currentCategory !== 'all') {
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

// サイドバー開閉の仕組み
const sidebar = document.getElementById('sidebar');
const toggleBtn = document.getElementById('toggle-sidebar');

if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        setTimeout(() => { map.invalidateSize(); }, 400);
    });
}

// 初回描画
const mapData = (typeof goldfishLocations !== 'undefined') ? goldfishLocations : [];
renderApp(mapData);