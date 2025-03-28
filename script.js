// APIエンドポイントURL
const apiUrl = "https://ha0v0yufh6.execute-api.ap-northeast-1.amazonaws.com/prod/wave-data";

// 地図を表示するための変数
let map;
let currentMarker; // 現在のマーカーを保持する変数

// DOMのロード完了後に初期化を実行
document.addEventListener("DOMContentLoaded", () => {
    // 初回ロード時に地図を初期化し、大阪駅の波データを取得
    initMap();
});

// 地図の初期化関数 (大阪駅を中心に設定)
function initMap() {
    const osakaStation = { lat: 34.7025, lng: 135.4959 }; // 大阪駅の緯度・経度

    // 地図を初期化
    map = new google.maps.Map(document.getElementById("map"), {
        center: osakaStation, // 初期表示位置
        zoom: 14, // ズームレベル
    });

    // 初期マーカーを設置
    currentMarker = new google.maps.Marker({
        position: osakaStation,
        map: map,
        title: "大阪駅",
    });

    // 地図をクリックした際のイベント
    map.addListener("click", (event) => {
        const clickedLat = event.latLng.lat(); // クリックした地点の緯度
        const clickedLng = event.latLng.lng(); // クリックした地点の経度

        // フォームに緯度・経度を自動入力
        document.getElementById("latitude").value = clickedLat.toFixed(6);
        document.getElementById("longitude").value = clickedLng.toFixed(6);

        // マーカーを更新
        if (currentMarker) {
            currentMarker.setPosition({ lat: clickedLat, lng: clickedLng });
        } else {
            currentMarker = new google.maps.Marker({
                position: { lat: clickedLat, lng: clickedLng },
                map: map,
                title: "選択された位置",
            });
        }

        // 波情報を取得
        fetchWaveData(clickedLat, clickedLng);

        // 地図の中心を更新
        map.setCenter({ lat: clickedLat, lng: clickedLng });
    });

    // 初回ロード時に大阪駅の波データを取得
    fetchWaveData(osakaStation.lat, osakaStation.lng);
}

// フォーム送信時のイベント
document.getElementById("locationForm").addEventListener("submit", async (event) => {
    event.preventDefault(); // フォームのデフォルト動作を防ぐ

    // 緯度と経度の取得
    const latitude = parseFloat(document.getElementById("latitude").value.trim());
    const longitude = parseFloat(document.getElementById("longitude").value.trim());

    if (isNaN(latitude) || isNaN(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        alert("緯度は -90 から 90、経度は -180 から 180 の範囲内で入力してください。");
        return;
    }

    // 地図の中心を更新
    const userLocation = { lat: latitude, lng: longitude };
    map.setCenter(userLocation);

    // マーカーを更新
    if (currentMarker) {
        currentMarker.setPosition(userLocation);
    } else {
        currentMarker = new google.maps.Marker({
            position: userLocation,
            map: map,
            title: "入力された位置",
        });
    }

    // APIリクエスト送信
    fetchWaveData(latitude, longitude);
});

// 波情報を取得する関数
async function fetchWaveData(latitude, longitude) {
    try {
        const response = await fetch(`${apiUrl}?latitude=${latitude}&longitude=${longitude}`, {
            method: "GET",
            mode: "cors",
            headers: {
                "Content-Type": "application/json",
            }
        });

        if (!response.ok) {
            const errorMessage = `HTTPエラー: ${response.status} (${response.statusText})`;
            console.error(errorMessage);
            alert(errorMessage);
            return;
        }

        const data = await response.json();

        // アコーディオン形式で波データを表示
        updateWaveAccordion(data.waveData);

        // データをグラフに表示
        updateWaveChart(data.waveData);
    } catch (error) {
        console.error("波データの取得に失敗しました:", error);
        alert("波データの取得に失敗しました。ネットワーク接続を確認してください。");
    }
}

// 波高に応じた部位とレベルを決定する関数
function getWaveDescription(waveHeight) {
    if (waveHeight < 0.3048) {
        return { level: "フラット", description: "不可", color: "#e0e0e0" };
    } else if (waveHeight < 0.6096) {
        return { level: "スネ", description: "初心者", color: "#b3e5fc" };
    } else if (waveHeight < 0.9144) {
        return { level: "ヒザ〜モモ", description: "初心者", color: "#81d4fa" };
    } else if (waveHeight < 1.2192) {
        return { level: "コシ〜ハラ", description: "初心者、中級者", color: "#4fc3f7" };
    } else if (waveHeight < 1.524) {
        return { level: "ムネ〜カタ", description: "中級者", color: "#29b6f6" };
    } else if (waveHeight < 1.8288) {
        return { level: "頭", description: "中級者、上級者", color: "#0288d1" };
    } else if (waveHeight < 3.048) {
        return { level: "オーバーヘッド", description: "上級者", color: "#01579b" };
    } else if (waveHeight < 4.572) {
        return { level: "ダブル", description: "上級者", color: "#002f6c" };
    } else {
        return { level: "トリプル", description: "上級者", color: "#001847" };
    }
}

// アコーディオンの波データを表示する関数
function updateWaveAccordion(waveData) {
    const accordionContainer = document.getElementById("accordion-container");
    accordionContainer.innerHTML = ""; // 初期化

    const groupedData = groupByDate(waveData); // 日付ごとにグループ化

    Object.keys(groupedData).forEach(date => {
        // 日付ごとのアコーディオンのヘッダー
        const dateHeader = document.createElement("div");
        dateHeader.className = "accordion-header";
        dateHeader.textContent = date;

        // 日付ごとのアコーディオンの内容
        const dateContent = document.createElement("div");
        dateContent.className = "accordion-content";

        groupedData[date].forEach(wave => {
            const waveItem = document.createElement("div");
            waveItem.className = "accordion-item";
            waveItem.innerHTML = `
                <div class="wave-data-row">
                    <div class="time">${new Date(wave.time).toLocaleTimeString()}</div>
                    <div class="height">${wave.waveHeight.toFixed(2)} m</div>
                    <div class="condition" style="background-color: ${getWaveDescription(wave.waveHeight).color};">
                        ${getWaveDescription(wave.waveHeight).description}
                    </div>
                </div>
            `;
            dateContent.appendChild(waveItem);
        });

        // 日付のアコーディオンをクリックで開閉
        dateHeader.addEventListener("click", () => {
            const isOpen = dateContent.style.display === "block";
            dateContent.style.display = isOpen ? "none" : "block";
        });

        const dateAccordionItem = document.createElement("div");
        dateAccordionItem.className = "accordion-item";
        dateAccordionItem.appendChild(dateHeader);
        dateAccordionItem.appendChild(dateContent);

        accordionContainer.appendChild(dateAccordionItem);
    });
}

// 日付ごとにデータをグループ化する関数
function groupByDate(waveData) {
    return waveData.reduce((result, wave) => {
        const date = new Date(wave.time).toLocaleDateString(); // 日付部分だけを取得
        if (!result[date]) {
            result[date] = [];
        }
        result[date].push(wave);
        return result;
    }, {});
}

// グラフを描画する
let waveChart;
function updateWaveChart(waveData) {
    const labels = waveData.map((wave) => new Date(wave.time).toLocaleTimeString());
    const heights = waveData.map((wave) => wave.waveHeight);

    const ctx = document.getElementById("waveChart").getContext("2d");

    if (waveChart) {
        waveChart.destroy();
    }

    waveChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "波高 (m)",
                data: heights,
                borderColor: "rgba(255, 99, 71, 1)",
                backgroundColor: "rgba(255, 160, 122, 0.4)",
                borderWidth: 3,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: "時間",
                        color: "#333",
                        font: {
                            size: 14,
                            family: 'Roboto',
                        }
                    },
                    ticks: {
                        color: "#333",
                        font: {
                            size: 12,
                            family: 'Roboto',
                        }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: "波高 (m)",
                        color: "#333",
                        font: {
                            size: 14,
                            family: 'Roboto',
                        }
                    },
                    ticks: {
                        color: "#333",
                        font: {
                            size: 12,
                            family: 'Roboto',
                        }
                    },
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: "#333",
                        font: {
                            size: 14,
                            family: 'Roboto',
                        }
                    }
                }
            }
        }
    });
}
