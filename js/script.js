let map;
let currentMarkers = [];
let temporaryMarker = null;
let currentRouteLayer;
let searchTimeout;
let selectedLocation = null;

const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjYwNTc5MWQ0Mjk5ODQ4OTRiMGI5OGFiOWFmZWIxMzg3IiwiaCI6Im11cm11cjY0In0=';

let isLoggedIn = sessionStorage.getItem('isUserLoggedIn') === 'true';

window.addEventListener('DOMContentLoaded', () => {
    initializeMap();
    initializeUI();
});

function initializeMap() {
    map = L.map('map', {
        doubleClickZoom: false
    }).setView([37.5665, 126.9780], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    map.on('dblclick', handleMapDoubleClick);
}

function initializeUI() {
    setupSearchInput();
    setupButtons();
    setupMenuTabs();
    updateSideMenu();
    setDefaultTab();
    renderFavoritesList();
    addFavoriteItemEventListeners();
}

function setDefaultTab() {
    const urlParams = new URLSearchParams(window.location.search);
    const fromLogin = urlParams.get('from');

    if (isLoggedIn && fromLogin === 'login') {
        document.getElementById('parent-btn').click();
        history.replaceState(null, '', window.location.pathname);
    } else {
        document.getElementById('safe-btn').click();
    }
}

function handleLogout() {
    isLoggedIn = false;
    sessionStorage.setItem('isUserLoggedIn', 'false');
    toggleLogoutPopup(false);
    toggleSidePopup(false);
    updateSideMenu();
    setDefaultTab();
}

function updateSideMenu() {
    const pbox = document.querySelector('.pbox');
    if (!pbox) return;

    if (isLoggedIn) {
        pbox.innerHTML = `
            <a href="#">마이페이지</a>
            <a href="#">고객센터</a>
            <a href="#" id="logout-btn">로그아웃</a>
        `;
        document.getElementById('logout-btn').onclick = (e) => {
            e.preventDefault();
            toggleLogoutPopup(true);
        };
    } else {
        pbox.innerHTML = `
            <a href="./signin.html">로그인</a>
            <a href="./signup.html">회원가입</a>
            <a href="http://127.0.0.1:5500/custumer.html">고객센터</a>
        `;
    }
}

function setupMenuTabs() {
    const menuItems = document.querySelectorAll('.menu-group .menu-item');
    
    menuItems.forEach(tab => {
        tab.addEventListener('click', () => {
            menuItems.forEach(item => item.classList.remove('active'));
            tab.classList.add('active');
            let panelId;
            switch (tab.id) {
                case 'safe-btn':
                    panelId = 'safe';
                    break;
                case 'parent-btn':
                    panelId = isLoggedIn ? 'parent-after-login' : 'parent-before';
                    break;
                case 'find-btn':
                    panelId = 'favorites';
                    renderFavoritesList();
                    break;
            }
            if (panelId) {
                showContentPanel(panelId);
            }
        });
    });
}

function setupButtons() {
    document.getElementById('findRouteBtn').onclick = handleFindRoute;
    document.querySelector('.menubtn').onclick = () => toggleSidePopup(true);
    document.querySelector('.close').onclick = () => toggleSidePopup(false);
    document.querySelector('.overlay').onclick = () => toggleSidePopup(false);
    document.getElementById('logout-confirm-btn').onclick = handleLogout;
    document.getElementById('logout-cancel-btn').onclick = () => toggleLogoutPopup(false);
    document.getElementById('parent-connect-btn').onclick = (e) => {
        e.preventDefault();
        showContentPanel('parent-connected-list');
    };
    document.getElementById('setStartBtn').onclick = () => setLocationAs('start');
    document.getElementById('setEndBtn').onclick = () => setLocationAs('end');
    document.getElementById('cancelPopupBtn').onclick = hideLocationPopup;
    document.getElementById('locationPopupOverlay').onclick = hideLocationPopup;
    document.getElementById('addFavoriteBtn').onclick = handleAddFavorite;
}

function setupSearchInput() {
    const searchInput = document.getElementById('searchInput');
    const searchResultsDiv = document.getElementById('searchResults');
    if (!searchInput || !searchResultsDiv) return;

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim();
        if (query.length < 2) {
            searchResultsDiv.classList.remove('active');
            return;
        }
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchPlaces(query).then(results => showSearchResults(results, searchResultsDiv));
        }, 300);
    });
    searchInput.addEventListener('blur', () => {
        setTimeout(() => searchResultsDiv.classList.remove('active'), 200);
    });
}

function showContentPanel(panelIdToShow) {
    document.querySelectorAll('.container .content-panel').forEach(panel => {
        panel.style.display = 'none';
        panel.classList.remove('active');
    });
    const panelToShow = document.getElementById(panelIdToShow);
    if (panelToShow) {
        panelToShow.style.display = 'block';
        panelToShow.classList.add('active');
    }
}

function toggleSidePopup(show) {
    const overlay = document.querySelector('.overlay');
    const popup = document.querySelector('.popup');
    const pbox = document.querySelector('.pbox');
    overlay.classList.toggle('active', show);
    popup.classList.toggle('popup-toggle', show);
    pbox.classList.toggle('pbox-toggle', show);
}

function toggleLogoutPopup(show) {
    document.getElementById('logout-popup').classList.toggle('active', show);
}

function handleMapDoubleClick(e) {
    reverseGeocode(e.latlng.lat, e.latlng.lng);
}

async function searchPlaces(query) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=kr&addressdetails=1`);
        const data = await response.json();
        return data.map(item => ({
            name: item.display_name.split(',')[0],
            address: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon)
        }));
    } catch (error) {
        return [];
    }
}

function showSearchResults(results, container) {
    if (results.length === 0) {
        container.innerHTML = '<div class="no-results">검색 결과가 없습니다.</div>';
    } else {
        container.innerHTML = results.map(place => `
            <div class="search-item" data-lat="${place.lat}" data-lng="${place.lng}" data-name="${place.name}" data-address="${place.address}">
                <div class="search-item-title">${place.name}</div>
                <div class="search-item-address">${place.address}</div>
            </div>`).join('');
    }
    container.querySelectorAll('.search-item').forEach(item => {
        item.onmousedown = () => {
            const lat = parseFloat(item.dataset.lat);
            const lng = parseFloat(item.dataset.lng);
            const name = item.dataset.name;
            const address = item.dataset.address;
            selectedLocation = { lat, lng, name, address };
            showLocationPopup(lat, lng, name, address);
            container.classList.remove('active');
            map.setView([lat, lng], 16);
        };
    });
    container.classList.add('active');
}

async function reverseGeocode(lat, lng) {
    showLocationPopup(lat, lng, '주소 검색 중...');
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`);
        const data = await response.json();
        const address = data.display_name || '주소를 찾을 수 없습니다.';
        const name = data.address.road || data.address.suburb || address.split(',')[0];
        selectedLocation = { lat, lng, name, address };
        document.getElementById('locationPopupPlaceName').textContent = name;
        document.getElementById('locationPopupPlaceAddress').textContent = address;
    } catch (error) {
        document.getElementById('locationPopupPlaceName').textContent = '오류 발생';
        document.getElementById('locationPopupPlaceAddress').textContent = '주소를 가져오는 데 실패했습니다.';
    }
}

function showLocationPopup(lat, lng, name = '', address = '') {
    if (temporaryMarker) map.removeLayer(temporaryMarker);
    temporaryMarker = L.marker([lat, lng]).addTo(map);
    document.getElementById('locationPopupPlaceName').textContent = name;
    document.getElementById('locationPopupPlaceAddress').textContent = address;
    document.getElementById('locationPopup').classList.add('active');
    document.getElementById('locationPopupOverlay').classList.add('active');
}

function hideLocationPopup() {
    document.getElementById('locationPopup').classList.remove('active');
    document.getElementById('locationPopupOverlay').classList.remove('active');
    if (temporaryMarker) {
        map.removeLayer(temporaryMarker);
        temporaryMarker = null;
    }
    selectedLocation = null;
}

function setLocationAs(type) {
    if (selectedLocation) {
        const input = document.getElementById(type);
        input.value = selectedLocation.name;
        input.dataset.lat = selectedLocation.lat;
        input.dataset.lng = selectedLocation.lng;
        hideLocationPopup();
    }
}

async function handleFindRoute() {
    const startInput = document.getElementById('start');
    const endInput = document.getElementById('end');
    if (!startInput.value || !endInput.value) {
        alert('출발지와 도착지를 모두 입력해주세요.');
        return;
    }
    const startCoords = await getCoords(startInput);
    const endCoords = await getCoords(endInput);
    if (!startCoords || !endCoords) {
        alert('출발지 또는 도착지 좌표를 찾을 수 없습니다.');
        return;
    }
    const route = await getRoute(startCoords, endCoords);
    if (route) {
        displayRoute(route, startCoords, endCoords);
    }
}

async function getCoords(inputElement) {
    if (inputElement.dataset.lat && inputElement.dataset.lng) {
        return { lat: parseFloat(inputElement.dataset.lat), lng: parseFloat(inputElement.dataset.lng) };
    }
    const results = await searchPlaces(inputElement.value);
    if (results.length > 0) {
        return { lat: results[0].lat, lng: results[0].lng };
    }
    return null;
}

async function getRoute(start, end) {
    const url = 'https://api.openrouteservice.org/v2/directions/foot-walking/geojson';
    const body = JSON.stringify({
        "coordinates": [[start.lng, start.lat], [end.lng, end.lat]]
    });
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8',
                'Content-Type': 'application/json; charset=utf-8',
                'Authorization': ORS_API_KEY
            },
            body: body
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error('ORS API 서버로부터 받은 원본 에러:', errorText);
            alert(`경로 탐색 서버에서 오류가 발생했습니다. (오류 코드: ${response.status}) \n콘솔(F12)에서 상세 정보를 확인하세요.`);
            return null;
        }
        const data = await response.json();
        if (!data.features || data.features.length === 0) {
            alert("해당 조건에 맞는 경로를 찾을 수 없습니다.");
            return null;
        }
        const routeData = data.features[0];
        return {
            geometry: routeData.geometry,
            distance: routeData.properties.summary.distance,
            duration: routeData.properties.summary.duration
        };
    } catch (error) {
        console.error("경로 검색 중 네트워크 예외:", error);
        alert("경로를 검색하는 중 네트워크에 문제가 발생했습니다.");
        return null;
    }
}

function displayRoute(route, start, end) {
    clearAllMarkers();
    if (currentRouteLayer) map.removeLayer(currentRouteLayer);
    currentRouteLayer = L.geoJSON(route.geometry, {
        style: { color: 'rgb(0, 162, 255)', weight: 6, opacity: 0.8 }
    }).addTo(map);
    addPermanentMarker(start.lat, start.lng, '<b>출발지</b>');
    addPermanentMarker(end.lat, end.lng, '<b>도착지</b>');
    map.fitBounds(currentRouteLayer.getBounds(), { padding: [50, 50] });
    const distance = (route.distance / 1000).toFixed(1);
    const duration = Math.round(route.duration / 60);
    const infoBox = document.getElementById('routeInfo');
    infoBox.innerHTML = `총 거리: <b>${distance}km</b> / 예상 시간: <b>약 ${duration}분</b>`;
    infoBox.classList.add('active');
}

function addPermanentMarker(lat, lng, popupText) {
    const marker = L.marker([lat, lng]).addTo(map);
    if (popupText) marker.bindPopup(popupText).openPopup();
    currentMarkers.push(marker);
}

function clearAllMarkers() {
    currentMarkers.forEach(m => map.removeLayer(m));
    currentMarkers = [];
    if (temporaryMarker) {
        map.removeLayer(temporaryMarker);
        temporaryMarker = null;
    }
}

function getFavorites() {
    return JSON.parse(localStorage.getItem('favorites')) || [];
}

function saveFavorites(favorites) {
    localStorage.setItem('favorites', JSON.stringify(favorites));
}

function handleAddFavorite() {
    if (!selectedLocation) {
        alert('즐겨찾기에 추가할 장소를 먼저 선택해주세요.');
        return;
    }

    const favorites = getFavorites();
    const isAlreadyFavorite = favorites.some(fav => fav.lat === selectedLocation.lat && fav.lng === selectedLocation.lng);

    if (isAlreadyFavorite) {
        alert('이미 즐겨찾기에 추가된 장소입니다.');
        return;
    }

    favorites.push(selectedLocation);
    saveFavorites(favorites);
    alert('즐겨찾기에 추가되었습니다!');
    renderFavoritesList();
    hideLocationPopup();
}

function renderFavoritesList() {
    const favorites = getFavorites();
    const container = document.getElementById('favorites-list-container');
    const message = document.getElementById('no-favorites-message');

    if (favorites.length === 0) {
        container.innerHTML = '';
        message.style.display = 'block';
        return;
    }

    message.style.display = 'none';
    container.innerHTML = favorites.map(fav => `
        <div class="favorite-item">
            <div class="favorite-item-info">
                <div class="favorite-item-name">${fav.name}</div>
                <div class="favorite-item-address">${fav.address}</div>
            </div>
            <div class="favorite-item-actions">
                <button class="favorite-item-btn set-start" data-name="${fav.name}" data-lat="${fav.lat}" data-lng="${fav.lng}">출발</button>
                <button class="favorite-item-btn set-end" data-name="${fav.name}" data-lat="${fav.lat}" data-lng="${fav.lng}">도착</button>
                <button class="favorite-item-btn delete" data-name="${fav.name}" data-lat="${fav.lat}" data-lng="${fav.lng}">삭제</button>
            </div>
        </div>
    `).join('');
}

function addFavoriteItemEventListeners() {
    const container = document.getElementById('favorites-list-container');
    container.addEventListener('click', (e) => {
        const target = e.target;
        const name = target.dataset.name;
        
        if (!target.dataset.lat) return;

        const lat = parseFloat(target.dataset.lat);
        const lng = parseFloat(target.dataset.lng);

        if (target.classList.contains('set-start')) {
            const startInput = document.getElementById('start');
            startInput.value = name;
            startInput.dataset.lat = lat;
            startInput.dataset.lng = lng;
            document.getElementById('safe-btn').click();
            alert(`'${name}'을(를) 출발지로 설정했습니다.`);
        }

        if (target.classList.contains('set-end')) {
            const endInput = document.getElementById('end');
            endInput.value = name;
            endInput.dataset.lat = lat;
            endInput.dataset.lng = lng;
            document.getElementById('safe-btn').click();
            alert(`'${name}'을(를) 도착지로 설정했습니다.`);
        }

        if (target.classList.contains('delete')) {
            if (confirm(`'${name}'을(를) 즐겨찾기에서 삭제하시겠습니까?`)) {
                let favorites = getFavorites();
                favorites = favorites.filter(fav => fav.lat !== lat || fav.lng !== lng);
                saveFavorites(favorites);
                renderFavoritesList();
            }
        }
    });
}