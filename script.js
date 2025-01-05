const API_KEY = '54a57bc234ad752a4f59e59cd372201d';

// DOM Elements
const cityInput = document.getElementById('city');
const locationBtn = document.querySelector('.location-btn');

// Event Listeners
cityInput.addEventListener('input', debounce(getWeatherData, 500));
locationBtn.addEventListener('click', getCurrentLocation);

// Debounce Function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Get Current Location
function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                getWeatherByCoords(position.coords.latitude, position.coords.longitude);
            },
            error => {
                console.error('Error getting location:', error);
            }
        );
    }
}

// Get Weather by Coordinates
async function getWeatherByCoords(lat, lon) {
    try {
        const response = await axios.get('https://api.openweathermap.org/data/2.5/forecast', {
            params: {
                lat,
                lon,
                appid: API_KEY,
                units: 'metric'
            }
        });
        updateUI(response.data);
    } catch (error) {
        console.error('Error fetching weather data:', error);
    }
}

// Fetch Weather Data
async function getWeatherData() {
    const city = cityInput.value;
    if (!city) return;

    try {
        const response = await axios.get('https://api.openweathermap.org/data/2.5/forecast', {
            params: {
                q: city,
                appid: API_KEY,
                units: 'metric'
            }
        });
        updateUI(response.data);
    } catch (error) {
        console.error('Error fetching weather data:', error);
    }
}

// Update UI
function updateUI(data) {
    updateCurrentWeather(data);
    updateDailyForecast(data);
    updateHourlyForecast(data);
    updateAirQuality(data.city.coord);
    updateLocalTime(data.city.timezone);
}

// Update Current Weather
function updateCurrentWeather(data) {
    const current = data.list[0];
    
    document.querySelector('.temperature').textContent = Math.round(current.main.temp);
    document.querySelector('.weather-condition').textContent = capitalizeWords(current.weather[0].description);
    document.querySelector('.location').textContent = `${data.city.name}, ${data.city.country}`;
    
    const now = new Date();
    document.querySelector('.current-date').textContent = now.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
    });

    // Update sunrise and sunset times
    const sunrise = new Date(data.city.sunrise * 1000);
    const sunset = new Date(data.city.sunset * 1000);
    document.querySelector('.sunrise .time').textContent = formatTime(sunrise);
    document.querySelector('.sunset .time').textContent = formatTime(sunset);

    // Update other highlights
    document.querySelector('.highlight-card:nth-of-type(3) .highlight-value span').textContent = 
        `${current.main.humidity}%`;
    document.querySelector('.highlight-card:nth-of-type(4) .highlight-value span').textContent = 
        `${current.main.pressure}hPa`;
    document.querySelector('.highlight-card:nth-of-type(5) .highlight-value span').textContent = 
        `${(current.visibility / 1000).toFixed(0)}km`;
    document.querySelector('.highlight-card:nth-of-type(6) .highlight-value span').textContent = 
        `${Math.round(current.main.feels_like)}°C`;
    document.querySelector('.highlight-card:nth-of-type(7) .highlight-value span').textContent = 
        `${current.wind.speed.toFixed(1)} m/s`;
}

// Update Daily Forecast
function updateDailyForecast(data) {
    const forecastList = document.querySelector('.forecast-list');
    forecastList.innerHTML = '';

    // Group forecast by day
    const dailyForecasts = {};
    data.list.forEach(forecast => {
        const date = new Date(forecast.dt * 1000);
        const day = date.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
        
        if (!dailyForecasts[day]) {
            dailyForecasts[day] = {
                minTemp: forecast.main.temp_min,
                maxTemp: forecast.main.temp_max,
                icon: forecast.weather[0].icon,
                description: forecast.weather[0].description
            };
        } else {
            dailyForecasts[day].minTemp = Math.min(dailyForecasts[day].minTemp, forecast.main.temp_min);
            dailyForecasts[day].maxTemp = Math.max(dailyForecasts[day].maxTemp, forecast.main.temp_max);
        }
    });

    // Create forecast items
    Object.entries(dailyForecasts).slice(1, 6).forEach(([day, forecast]) => {
        const forecastItem = document.createElement('div');
        forecastItem.className = 'forecast-item';
        forecastItem.innerHTML = `
            <div class="forecast-day">${day}</div>
            <i class="wi wi-owm-${forecast.icon} forecast-icon"></i>
            <div class="forecast-temp">
                <span>${Math.round(forecast.maxTemp)}°</span>
                <span class="min-temp">${Math.round(forecast.minTemp)}°</span>
            </div>
        `;
        forecastList.appendChild(forecastItem);
    });
}

// Update Hourly Forecast
function updateHourlyForecast(data) {
    const hourlyList = document.querySelector('.hourly-list');
    hourlyList.innerHTML = '';

    // Get next 8 3-hour forecasts
    data.list.slice(0, 8).forEach((forecast, index) => {
        const time = new Date(forecast.dt * 1000);
        const hourlyItem = document.createElement('div');
        hourlyItem.className = `hourly-item ${index === 3 ? 'active' : ''}`; // Add active class to 4th item
        hourlyItem.innerHTML = `
            <div class="hour">${formatTime(time)}</div>
            <img 
                src="http://openweathermap.org/img/wn/${forecast.weather[0].icon}@2x.png"
                alt="${forecast.weather[0].description}"
                class="weather-icon"
            />
            <div class="hourly-temp">${Math.round(forecast.main.temp)}°</div>
        `;
        
        // Add click handler to toggle active state
        hourlyItem.addEventListener('click', () => {
            document.querySelectorAll('.hourly-item').forEach(item => {
                item.classList.remove('active');
            });
            hourlyItem.classList.add('active');
        });
        
        hourlyList.appendChild(hourlyItem);
    });
}

// Update Air Quality
async function updateAirQuality(coords) {
    try {
        const response = await axios.get('https://api.openweathermap.org/data/2.5/air_pollution', {
            params: {
                lat: coords.lat,
                lon: coords.lon,
                appid: API_KEY
            }
        });

        const airQuality = response.data.list[0].components;
        const aqi = response.data.list[0].main.aqi;

        // Update AQI values
        document.querySelector('.aqi-grid .aqi-item:nth-child(1) .aqi-value').textContent = 
            airQuality.pm2_5.toFixed(2);
        document.querySelector('.aqi-grid .aqi-item:nth-child(2) .aqi-value').textContent = 
            airQuality.so2.toFixed(2);
        document.querySelector('.aqi-grid .aqi-item:nth-child(3) .aqi-value').textContent = 
            airQuality.no2.toFixed(2);
        document.querySelector('.aqi-grid .aqi-item:nth-child(4) .aqi-value').textContent = 
            airQuality.o3.toFixed(2);

        // Update AQI badge
        const aqiText = getAQIText(aqi);
        const badge = document.querySelector('.aqi-badge');
        badge.textContent = aqiText;
        badge.style.backgroundColor = getAQIColor(aqi);
    } catch (error) {
        console.error('Error fetching air quality data:', error);
    }
}

// Update Local Time
function updateLocalTime(timezone) {
    const updateTime = () => {
        const localTime = new Date(new Date().getTime() + timezone * 1000);
        const timeStr = localTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
        document.querySelector('.current-time').textContent = timeStr;
    };
    
    updateTime();
    setInterval(updateTime, 1000);
}

// Helper Functions
function formatTime(date) {
    return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
    });
}

function capitalizeWords(str) {
    return str.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

function getAQIText(aqi) {
    const aqiTexts = ['Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'];
    return aqiTexts[aqi - 1] || 'Unknown';
}

function getAQIColor(aqi) {
    const colors = {
        1: '#22c55e', // Good - Green
        2: '#facc15', // Fair - Yellow
        3: '#fb923c', // Moderate - Orange
        4: '#ef4444', // Poor - Red
        5: '#7f1d1d'  // Very Poor - Dark Red
    };
    return colors[aqi] || '#71717a';
}

// Initial load
document.addEventListener('DOMContentLoaded', () => {
    if (cityInput.value) {
        getWeatherData();
    } else {
        getCurrentLocation();
    }
});

const themeToggle = document.querySelector('.theme-toggle');
const themeIcon = themeToggle.querySelector('i');
const themeText = themeToggle.querySelector('.theme-text');

// Check for saved theme preference
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
    themeIcon.classList.replace('fa-moon', 'fa-sun');
    themeText.textContent = 'Light Mode';
}

// Theme toggle event listener

themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    
    if (document.body.classList.contains('light-theme')) {
        themeIcon.classList.replace('fa-moon', 'fa-sun');
        themeText.textContent = 'Light Mode';
        localStorage.setItem('theme', 'light');
    } else {
        themeIcon.classList.replace('fa-sun', 'fa-moon');
        themeText.textContent = 'Dark Mode';
        localStorage.setItem('theme', 'dark');
    }
});