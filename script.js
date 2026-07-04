document.getElementById('search-btn').addEventListener('click', performForesightScan);
document.getElementById('location-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') performForesightScan();
});

// Run an initial load scan for London on startup
window.addEventListener('DOMContentLoaded', () => {
  fetchWeatherData(51.5074, -0.1278, "LONDON // COORD_STABLE");
});

async function performForesightScan() {
  const query = document.getElementById('location-input').value.trim();
  if (!query) return;

  try {
    document.getElementById('search-btn').innerText = "SCANNING...";
    
    // Free Public Geocoding API (Nominatim)
    const geoUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
    const geoRes = await fetch(geoUrl, {
      headers: { 'User-Agent': 'MeteoricWeatherForesightSystem' }
    });
    const geoData = await geoRes.json();

    if (!geoData || geoData.length === 0) {
      alert("LOCATION COORDINATES REJECTED OR NOT FOUND.");
      document.getElementById('search-btn').innerText = "EXECUTE_SCAN";
      return;
    }

    const target = geoData[0];
    const lat = parseFloat(target.lat);
    const lon = parseFloat(target.lon);
    const locationLabel = target.display_name.split(',')[0].toUpperCase();

    await fetchWeatherData(lat, lon, locationLabel);

  } catch (err) {
    console.error("Geocoding matrix error:", err);
    alert("CRITICAL ERROR PROCESSING TARGET COORDINATES.");
  } finally {
    document.getElementById('search-btn').innerText = "EXECUTE_SCAN";
  }
}

async function fetchWeatherData(lat, lon, label) {
  try {
    // Open-Meteo Free Public Weather API Endpoint
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,surface_pressure,cloud_cover,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_probability_max&timezone=auto`;
    
    const response = await fetch(weatherUrl);
    const data = await response.json();

    updateDashboard(data, label);
  } catch (err) {
    console.error("Telemetry collection error:", err);
    alert("CRITICAL FAILURE RETRIEVING ATMOSPHERIC TELEMETRY.");
  }
}

function updateDashboard(data, locationLabel) {
  const current = data.current;
  const daily = data.daily;

  // Header Context Update
  document.querySelector('.logo-zone h1').innerText = `METEORIC // ${locationLabel}`;

  // Current Metrics Update
  document.getElementById('current-temp').innerText = Math.round(current.temperature_2m);
  document.getElementById('apparent-temp').innerText = Math.round(current.apparent_temperature);
  document.getElementById('precipitation').innerText = current.precipitation;
  document.getElementById('humidity').innerText = current.relative_humidity_2m;
  document.getElementById('windspeed').innerText = current.wind_speed_10m;

  // Composition Update
  document.getElementById('cloud-val').innerText = `${current.cloud_cover}%`;
  document.getElementById('cloud-bar').style.width = `${current.cloud_cover}%`;
  
  // Estimate current UV from peak daily index safe layout
  const todayUv = daily.uv_index_max[0];
  document.getElementById('uv-val').innerText = todayUv.toFixed(1);
  document.getElementById('uv-bar').style.width = `${Math.min((todayUv / 12) * 100, 100)}%`;

  document.getElementById('pressure-val').innerText = `${Math.round(current.surface_pressure)} hPa`;

  // 7-Day Table Generation
  const tbody = document.getElementById('forecast-body');
  tbody.innerHTML = ''; // Clear prior entries

  daily.time.forEach((dayTimestamp, index) => {
    const rawDate = new Date(dayTimestamp);
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    const formattedDate = rawDate.toLocaleDateString('en-US', options).toUpperCase();

    const maxTemp = Math.round(daily.temperature_2m_max[index]);
    const minTemp = Math.round(daily.temperature_2m_min[index]);
    const rainProb = daily.precipitation_probability_max[index];
    const uvPeak = daily.uv_index_max[index].toFixed(1);

    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="bold-val">${formattedDate}</td>
      <td>${minTemp}°C // ${maxTemp}°C</td>
      <td>${rainProb}%</td>
      <td>${uvPeak}</td>
    `;
    tbody.appendChild(row);
  });
}