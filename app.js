
// --- State ---
let currentTempC = 0;
let feelsLikeC = 0;
let isCelsius = true;
let currentCity = localStorage.getItem('lastCity') || CONFIG.DEFAULT_CITY;

// --- DOM Elements ---
const elements = {
    cityInput: document.getElementById('cityInput'),
    searchBtn: document.getElementById('searchBtn'),
    geoBtn: document.getElementById('geoBtn'),
    cityName: document.getElementById('cityName'),
    dateTime: document.getElementById('dateTime'),
    tempValue: document.getElementById('tempValue'),
    unitToggle: document.getElementById('unitToggle'),
    conditionText: document.getElementById('conditionText'),
    feelsLike: document.getElementById('feelsLike'),
    humidity: document.getElementById('humidity'),
    windSpeed: document.getElementById('windSpeed'),
    visibility: document.getElementById('visibility'),
    pressure: document.getElementById('pressure'),
    sunrise: document.getElementById('sunrise'),
    sunset: document.getElementById('sunset'),
    weatherIconLarge: document.getElementById('weatherIconLarge'),
    hourlyList: document.getElementById('hourlyList'),
    forecastList: document.getElementById('forecastList'),
    loader: document.getElementById('loader'),
    soundBtn: document.getElementById('soundBtn'),
    rainSource: document.getElementById('rainSource')
};

// --- Meteocons Mapping ---
// Maps OWM icon codes to Meteocons SVG paths (using jsDelivr CDN)
const getMeteoconUrl = (iconCode) => {
    const mapping = {
        '01d': 'clear-day',
        '01n': 'clear-night',
        '02d': 'partly-cloudy-day',
        '02n': 'partly-cloudy-night',
        '03d': 'cloudy',
        '03n': 'cloudy',
        '04d': 'overcast-day',
        '04n': 'overcast-night',
        '09d': 'rain',
        '09n': 'rain',
        '10d': 'partly-cloudy-day-rain',
        '10n': 'partly-cloudy-night-rain',
        '11d': 'thunderstorms-day',
        '11n': 'thunderstorms-night',
        '13d': 'snow',
        '13n': 'snow',
        '50d': 'mist',
        '50n': 'mist'
    };
    const iconName = mapping[iconCode] || 'clear-day';
    return `https://cdn.jsdelivr.net/gh/basmilius/weather-icons/production/fill/svg/${iconName}.svg`;
};

// --- Initialization ---
const init = () => {
    updateDateTime();
    setInterval(updateDateTime, 1000);
    fetchWeather(currentCity);

    // Event Listeners
    elements.searchBtn.addEventListener('click', () => {
        const city = elements.cityInput.value.trim();
        if (city) {
            fetchWeather(city);
            elements.cityInput.value = '';
        }
    });

    elements.cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') elements.searchBtn.click();
    });

    elements.geoBtn.addEventListener('click', getUserLocation);

    elements.unitToggle.addEventListener('click', toggleUnits);

    elements.soundBtn.addEventListener('click', toggleSound);
};

// --- Time & Date ---
const updateDateTime = () => {
    const now = new Date();
    const options = { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    elements.dateTime.textContent = now.toLocaleDateString('en-US', options);
};

// --- Fetch Logic ---
async function fetchWeather(city) {
    showLoader(true);
    try {
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${CONFIG.API_KEY}`);
        if (!response.ok) throw new Error('City not found');
        const data = await response.json();
        
        updateCurrentWeather(data);
        fetchForecast(data.coord.lat, data.coord.lon);
        
        currentCity = city;
        localStorage.setItem('lastCity', city);
    } catch (error) {
        alert(error.message);
    } finally {
        showLoader(false);
    }
}

async function fetchForecast(lat, lon) {
    try {
        const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${CONFIG.API_KEY}`);
        const data = await response.json();
        updateHourlyForecast(data.list);
        updateDailyForecast(data.list);
    } catch (error) {
        console.error('Forecast error:', error);
    }
}

function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            try {
                showLoader(true);
                const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${CONFIG.API_KEY}`);
                const data = await res.json();
                updateCurrentWeather(data);
                fetchForecast(latitude, longitude);
            } catch (err) {
                alert('Geolocation failed');
            } finally {
                showLoader(false);
            }
        }, () => alert('Location permission denied'));
    } else {
        alert('Geolocation not supported');
    }
}

// --- UI Rendering ---
function updateCurrentWeather(data) {
    currentTempC = data.main.temp;
    feelsLikeC = data.main.feels_like;
    
    elements.cityName.textContent = `${data.name}, ${data.sys.country}`;
    renderTemperature();
    
    elements.conditionText.textContent = data.weather[0].description;
    elements.humidity.textContent = `${data.main.humidity}%`;
    elements.windSpeed.textContent = `${(data.wind.speed * 3.6).toFixed(1)} km/h`;
    elements.visibility.textContent = `${(data.visibility / 1000).toFixed(1)} km`;
    elements.pressure.textContent = `${data.main.pressure} hPa`;
    
    elements.sunrise.textContent = formatTime(data.sys.sunrise, data.timezone);
    elements.sunset.textContent = formatTime(data.sys.sunset, data.timezone);
    
    // Large Icon
    const iconUrl = getMeteoconUrl(data.weather[0].icon);
    const fallbackUrl = `https://openweathermap.org/img/wn/${data.weather[0].icon}@4x.png`;
    console.log('Main Weather Icon URL:', iconUrl);
    elements.weatherIconLarge.innerHTML = `<img src="${iconUrl}" alt="weather" style="width: 100%; height: 100%; object-fit: contain;" onerror="this.onerror=null;this.src='${fallbackUrl}'">`;
    
    updateBackground(data.weather[0].main);
    checkRainStatus(data.weather[0].main);
}

function updateHourlyForecast(list) {
    elements.hourlyList.innerHTML = '';
    // Show next 8 items (24 hours)
    list.slice(0, 8).forEach(item => {
        const temp = isCelsius ? Math.round(item.main.temp) : Math.round((item.main.temp * 9/5) + 32);
        const time = new Date(item.dt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const div = document.createElement('div');
        div.className = 'hourly-item glass-effect';
        const iconUrl = getMeteoconUrl(item.weather[0].icon);
        const fallbackUrl = `https://openweathermap.org/img/wn/${item.weather[0].icon}.png`;
        div.innerHTML = `
            <p>${time}</p>
            <img src="${iconUrl}" width="50" height="50" onerror="this.onerror=null;this.src='${fallbackUrl}'">
            <p>${temp}°${isCelsius ? 'C' : 'F'}</p>
        `;
        elements.hourlyList.appendChild(div);
    });
}

function updateDailyForecast(list) {
    elements.forecastList.innerHTML = '';
    const dailyData = list.filter(item => item.dt_txt.includes('12:00:00'));
    
    dailyData.forEach(item => {
        const date = new Date(item.dt * 1000);
        const day = date.toLocaleDateString('en-US', { weekday: 'short' });
        const maxTemp = isCelsius ? Math.round(item.main.temp_max) : Math.round((item.main.temp_max * 9/5) + 32);
        const minTemp = isCelsius ? Math.round(item.main.temp_min) : Math.round((item.main.temp_min * 9/5) + 32);

        const card = document.createElement('div');
        card.className = 'forecast-card glass-effect';
        const iconUrl = getMeteoconUrl(item.weather[0].icon);
        const fallbackUrl = `https://openweathermap.org/img/wn/${item.weather[0].icon}@2x.png`;
        card.innerHTML = `
            <p class="day-name">${day}</p>
            <img src="${iconUrl}" width="60" height="60" onerror="this.onerror=null;this.src='${fallbackUrl}'">
            <div class="forecast-temp">
                <span class="temp-max">${maxTemp}°</span>
                <span class="temp-min">${minTemp}°</span>
            </div>
            <p style="font-size: 0.8rem; color: #e0e0e0;">${item.weather[0].main}</p>
        `;
        elements.forecastList.appendChild(card);
    });
}

// --- Helpers ---
function renderTemperature() {
    const temp = isCelsius ? Math.round(currentTempC) : Math.round((currentTempC * 9/5) + 32);
    const feels = isCelsius ? Math.round(feelsLikeC) : Math.round((feelsLikeC * 9/5) + 32);
    
    elements.tempValue.textContent = temp;
    elements.unitToggle.textContent = isCelsius ? '°C' : '°F';
    elements.feelsLike.textContent = `${feels}°${isCelsius ? 'C' : 'F'}`;
}

function toggleUnits() {
    isCelsius = !isCelsius;
    renderTemperature();
    // Re-render forecasts to update units
    const city = elements.cityName.textContent.split(',')[0];
    fetchWeather(city); // Actually we can just re-render from state but simpler to re-call or update internal components
    // Performance optimization: Just re-render the components from a stored state.
}

function formatTime(unix, timezone) {
    const date = new Date((unix + timezone) * 1000);
    return date.getUTCHours() >= 12 
        ? `${date.getUTCHours() - 12 || 12}:${String(date.getUTCMinutes()).padStart(2, '0')} PM`
        : `${date.getUTCHours() || 12}:${String(date.getUTCMinutes()).padStart(2, '0')} AM`;
}

function showLoader(show) {
    elements.loader.style.display = show ? 'block' : 'none';
}

function updateBackground(condition) {
    const main = condition.toLowerCase();
    let gradient = "linear-gradient(135deg, #03045e, #000000)";
    
    if (main.includes('clear')) gradient = "linear-gradient(135deg, #00b4d8, #0077b6, #03045e)";
    else if (main.includes('cloud')) gradient = "linear-gradient(135deg, #4b6cb7, #182848)";
    else if (main.includes('rain')) gradient = "linear-gradient(135deg, #203a43, #2c5364)";
    else if (main.includes('thunderstorm')) gradient = "linear-gradient(135deg, #0f0c29, #302b63, #24243e)";
    
    document.body.style.background = gradient;
}

function checkRainStatus(condition) {
    if (condition.toLowerCase().includes('rain')) {
        // We don't auto-play because of browser policies, just update the icon suggestively
        elements.soundBtn.classList.add('suggest'); 
    }
}

function toggleSound() {
    const isPlaying = !elements.rainSource.paused;
    if (isPlaying) {
        elements.rainSource.pause();
        elements.soundBtn.classList.remove('active');
        elements.soundBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
    } else {
        elements.rainSource.play();
        elements.soundBtn.classList.add('active');
        elements.soundBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
    }
}

// --- Start ---
init();
