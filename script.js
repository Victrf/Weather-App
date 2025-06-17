const API_KEY = "a5a3bb84b1e6d31875bcaa9e68791eb4"; // OpenWeather API

// HTML elements
const cityInput = document.getElementById("city-input");
const getWeatherBtn = document.getElementById("get-weather");
const toggleUnitBtn = document.getElementById("toggle-unit");
const geoBtn = document.getElementById("geo-btn");
const loader = document.getElementById("loader");
const result = document.getElementById("weather-result");
const errorMsg = document.getElementById("error-message");

const cityName = document.getElementById("city-name");
const weatherIcon = document.getElementById("weather-icon");
const localTime = document.getElementById("local-time");
const temp = document.getElementById("temp");
const description = document.getElementById("description");
const humidity = document.getElementById("humidity");
const summary = document.getElementById("weather-summary");

const trendSection = document.getElementById("trend-section");
const trendCards = document.getElementById("trend-cards");
const trendCanvas = document.getElementById("trend-chart");

let unit = "metric"; // or "imperial"

// Initialize last search
cityInput.value = localStorage.getItem("lastCity") || "";

// Utility: Convert timezone offset to local time
function getLocalTime(offsetSeconds) {
    const utc = Date.now() + new Date().getTimezoneOffset() * 60000;
    const local = new Date(utc + offsetSeconds * 1000);
    return local.toLocaleString();
}

// Core: Fetch current weather
async function fetchWeather(city) {
    loader.classList.remove("hidden");
    result.classList.add("hidden");
    errorMsg.classList.add("hidden");

    try {
        const res = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=${unit}&appid=${API_KEY}`
        );
        if (!res.ok) throw new Error("City not found");
        const data = await res.json();
        renderWeather(data);
        localStorage.setItem("lastCity", city);
    } catch (e) {
        errorMsg.textContent = e.message;
        errorMsg.classList.remove("hidden");
        trendSection.classList.add("hidden");
    } finally {
        loader.classList.add("hidden");
    }
}

// Core: Render current weather and trigger trends
async function renderWeather(data) {
    const symbol = unit === "metric" ? "°C" : "°F";

    cityName.textContent = `${data.name}, ${data.sys.country}`;
    weatherIcon.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
    weatherIcon.alt = data.weather[0].main;
    localTime.textContent = `🕒 ${getLocalTime(data.timezone)}`;
    temp.textContent = `🌡️ Temp: ${data.main.temp} ${symbol}`;
    description.textContent = `📋 ${data.weather[0].description}`;
    humidity.textContent = `💧 Humidity: ${data.main.humidity}%`;
    summary.textContent = getAISummary(data.main.temp);

    result.classList.remove("hidden");

    // Fetch and display trends
    const { lat, lon } = data.coord;
    const trendData = await fetchTrend(lat, lon);
    showTrendCards(trendData.daily);
    await showTrendChart(lat, lon);

    trendSection.classList.remove("hidden");
}

// AI-based weather summary
function getAISummary(tempValue) {
    let s = "";
    if (unit === "metric") {
        if (tempValue < 10) s = "🥶 It's cold, wear warm clothes!";
        else if (tempValue < 25) s = "😊 Perfect weather!";
        else s = "🥵 It's hot—stay hydrated!";
    } else {
        if (tempValue < 50) s = "❄️ Very cold!";
        else if (tempValue < 77) s = "👌 Nice weather.";
        else s = "🔥 Hot! Use sunscreen.";
    }
    return s;
}

// Fetch 7-day forecast
async function fetchTrend(lat, lon) {
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${unit}&appid=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch forecast data");

    const data = await res.json();
    return processForecastData(data.list); // clean and group
}


// Display trend cards
function showTrendCards(daily) {
    trendCards.innerHTML = "";
    daily.slice(1, 6).forEach(d => {
        const dt = new Date(d.dt * 1000).toLocaleDateString(undefined, {
            weekday: "short", month: "short", day: "numeric"
        });
        const icon = `https://openweathermap.org/img/wn/${d.weather[0].icon}.png`;
        const min = Math.round(d.temp.min);
        const max = Math.round(d.temp.max);
        const s = unit === "metric" ? "°C" : "°F";

        trendCards.innerHTML += `
      <div class="card">
        <p>${dt}</p>
        <img src="${icon}" alt="${d.weather[0].main}">
        <p>⬆️ ${max}${s} / ⬇️ ${min}${s}</p>
      </div>`;
    });
}

// Render trend chart with Chart.js
async function showTrendChart(lat, lon) {
    const data = await fetchTrend(lat, lon);
    const labels = data.daily.map(d => new Date(d.dt * 1000).toLocaleDateString());
    const temps = data.daily.map(d => d.temp.day.toFixed(1));
    const ctx = trendCanvas.getContext("2d");

    if (trendCanvas.chart) trendCanvas.chart.destroy();
    trendCanvas.classList.remove("hidden");

    trendCanvas.chart = new Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [{ data: temps, fill: true, borderColor: "#fff", backgroundColor: "rgba(255,255,255,0.2)", tension: 0.4 }]
        },
        options: {
            scales: {
                x: { ticks: { color: "#fff" } },
                y: { ticks: { color: "#fff" }, beginAtZero: false }
            },
            plugins: { legend: { labels: { color: "#fff" } } }
        }
    });
}

// Event listeners
getWeatherBtn.addEventListener("click", () => {
    const city = cityInput.value.trim();
    if (city) fetchWeather(city);
});

toggleUnitBtn.addEventListener("click", () => {
    unit = unit === "metric" ? "imperial" : "metric";
    toggleUnitBtn.textContent = unit === "metric" ? "Switch to °F" : "Switch to °C";
    const city = cityName.textContent.split(",")[0];
    if (city) fetchWeather(city);
});

geoBtn.addEventListener("click", () => {
    if (!navigator.geolocation) return alert("Geolocation not supported");
    loader.classList.remove("hidden");
    navigator.geolocation.getCurrentPosition(async pos => {
        const { latitude: lat, longitude: lon } = pos.coords;
        try {
            const res = await fetch(
                `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${unit}&appid=${API_KEY}`
            );
            if (!res.ok) throw new Error("Location weather not found");
            const data = await res.json();
            renderWeather(data);
        } catch (e) {
            errorMsg.textContent = e.message;
            errorMsg.classList.remove("hidden");
        } finally {
            loader.classList.add("hidden");
        }
    });
});

// Initial load (if city present)
if (cityInput.value) fetchWeather(cityInput.value.trim());
