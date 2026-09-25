
let map = null;
let marker = null;


// ==========================================
// SEARCH PLACE
// ==========================================

async function searchPlace() {

    const input = document.getElementById("placeInput");
    const daysInput = document.getElementById("daysInput");

    if (!input || !daysInput) {
        console.error("Input elements not found");
        return;
    }

    const place = input.value.trim();
    const days = parseInt(daysInput.value);

    if (place === "") {

        alert("Please enter a place!");
        return;

    }

    if (isNaN(days) || days < 1 || days > 30) {

        alert("Please enter a valid number of days (1-30)!");
        return;

    }

    const loading = document.getElementById("loading");

    if (loading) {
        loading.style.display = "block";
    }

    try {

        const url =
            "https://nominatim.openstreetmap.org/search" +
            "?format=json" +
            "&q=" + encodeURIComponent(place) +
            "&limit=1";

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Location search failed");
        }

        const locations = await response.json();

        if (locations.length === 0) {

            showError("Place not found. Try another place.");
            return;

        }

        const latitude = parseFloat(locations[0].lat);
        const longitude = parseFloat(locations[0].lon);
        const displayName = locations[0].display_name;

        // SHOW DESTINATION

        showDestination(
            place,
            displayName,
            latitude,
            longitude,
            days
        );

        // FIND WEATHER AND NEARBY PLACES

        await Promise.all([

            findNearbyPlaces(latitude, longitude),

            findWeather(latitude, longitude)

        ]);

        // SHOW MAP

        showMap(
            latitude,
            longitude,
            place
        );

    } catch (error) {

        console.error("Error:", error);

        showError(
            "Something went wrong. Please check your internet connection."
        );

    } finally {

        if (loading) {
            loading.style.display = "none";
        }

    }

}


// ==========================================
// GET BUDGET RATES
// ==========================================

function getBudgetRates(place) {

    const location = place.toLowerCase();

    // EXPENSIVE INTERNATIONAL DESTINATIONS

    const expensivePlaces = [

        "paris",
        "london",
        "new york",
        "zurich",
        "tokyo",
        "singapore",
        "dubai",
        "switzerland"

    ];

    // MAJOR INDIAN CITIES

    const indianMetroCities = [

        "delhi",
        "mumbai",
        "bangalore",
        "bengaluru",
        "hyderabad",
        "chennai",
        "kolkata",
        "pune",
        "gurgaon",
        "gurugram"

    ];

    // BUDGET-FRIENDLY DESTINATIONS

    const budgetPlaces = [

        "rishikesh",
        "manali",
        "jaipur",
        "varanasi",
        "amritsar",
        "haridwar"

    ];


    if (
        expensivePlaces.some(
            city => location.includes(city)
        )
    ) {

        return {

            budget: [3500, 7000],

            standard: [7000, 14000],

            luxury: [15000, 30000]

        };

    }


    else if (
        indianMetroCities.some(
            city => location.includes(city)
        )
    ) {

        return {

            budget: [1800, 3500],

            standard: [3500, 6500],

            luxury: [7000, 15000]

        };

    }


    else if (
        budgetPlaces.some(
            city => location.includes(city)
        )
    ) {

        return {

            budget: [1000, 2200],

            standard: [2200, 4500],

            luxury: [5000, 10000]

        };

    }


    else {

        // DEFAULT ESTIMATED RATES

        return {

            budget: [1500, 3000],

            standard: [3000, 6000],

            luxury: [7000, 14000]

        };

    }

}


// ==========================================
// CALCULATE TOTAL BUDGET
// ==========================================

function calculateBudget(place, days) {

    const rates = getBudgetRates(place);

    const budgetMin = rates.budget[0] * days;
    const budgetMax = rates.budget[1] * days;

    const standardMin = rates.standard[0] * days;
    const standardMax = rates.standard[1] * days;

    const luxuryMin = rates.luxury[0] * days;
    const luxuryMax = rates.luxury[1] * days;


    return {

        budget:

            `₹${budgetMin.toLocaleString("en-IN")} - ₹${budgetMax.toLocaleString("en-IN")}`,

        standard:

            `₹${standardMin.toLocaleString("en-IN")} - ₹${standardMax.toLocaleString("en-IN")}`,

        luxury:

            `₹${luxuryMin.toLocaleString("en-IN")} - ₹${luxuryMax.toLocaleString("en-IN")}`

    };

}


// ==========================================
// SHOW DESTINATION
// ==========================================

function showDestination(

    place,
    address,
    latitude,
    longitude,
    days

) {

    const result = document.getElementById("result");

    if (!result) {
        return;
    }


    const googleMapsURL =

        "https://www.google.com/maps/search/?api=1&query=" +

        latitude + "," + longitude;


    // CALCULATE BUDGET ONCE

    const budget = calculateBudget(place, days);


    result.innerHTML = `

        <div class="destination">

            <h2>📍 ${place}</h2>

            <p>${address}</p>

            <br>

            <p>
                <b>Latitude:</b>
                ${latitude.toFixed(4)}
            </p>

            <p>
                <b>Longitude:</b>
                ${longitude.toFixed(4)}
            </p>

        </div>


        <!-- WEATHER SECTION -->

        <section class="weather-section" aria-live="polite">

            <div class="weather-heading">

                <div>

                    <p class="section-label">
                        LOCAL FORECAST
                    </p>

                    <h2>
                        Weather near ${place}
                    </h2>

                </div>

                <div id="weather-current">
                    Loading weather...
                </div>

            </div>

            <div
                id="weather-forecast"
                class="weather-forecast"
            ></div>

        </section>


        <!-- NEARBY PLACES -->

        <div class="cards">


            <div class="card">

                <h3>🏨 Nearby Hotels</h3>

                <div id="hotels">

                    Searching for hotels...

                </div>

            </div>



            <div class="card">

                <h3>🍴 Nearby Restaurants</h3>

                <div id="restaurants">

                    Searching for restaurants...

                </div>

            </div>



            <div class="card">

                <h3>🏛️ Places to Visit</h3>

                <div id="attractions">

                    Searching for attractions...

                </div>

            </div>


        </div>


        <!-- BUDGET SECTION -->

        <div class="budget">

            <h2>💰 Estimated Travel Budget</h2>

            <p style="margin-bottom: 20px;">

                📍 ${place} · 🗓️ ${days} Days

            </p>


            <div class="budget-box">


                <!-- BUDGET -->

                <div class="budget-card">

                    <h3>🎒 Budget</h3>

                    <p>

                        Basic accommodation,
                        food and local travel

                    </p>

                    <p class="price">

                        ${budget.budget}

                    </p>

                </div>



                <!-- STANDARD -->

                <div class="budget-card">

                    <h3>⭐ Standard</h3>

                    <p>

                        Comfortable hotel,
                        food and activities

                    </p>

                    <p class="price">

                        ${budget.standard}

                    </p>

                </div>



                <!-- LUXURY -->

                <div class="budget-card">

                    <h3>👑 Luxury</h3>

                    <p>

                        Premium hotel,
                        food and activities

                    </p>

                    <p class="price">

                        ${budget.luxury}

                    </p>

                </div>


            </div>


            <p style="margin-top: 20px; font-size: 13px; color: #666;">

                *Estimated accommodation, food and local travel costs.
                Actual prices may vary.

            </p>

        </div>



        <!-- MAP SECTION -->

        <div class="map-section">

            <h2>🗺️ Explore ${place}</h2>

            <p>

                Find more hotels, restaurants,
                attractions and directions.

            </p>


            <a

                class="map-button"

                href="${googleMapsURL}"

                target="_blank"

                rel="noopener noreferrer"

            >

                🗺️ Open Google Maps

            </a>

        </div>

    `;

}


// ==========================================
// FIND WEATHER
// ==========================================

async function findWeather(latitude, longitude) {

    const currentElement =
        document.getElementById("weather-current");

    const forecastElement =
        document.getElementById("weather-forecast");


    if (!currentElement || !forecastElement) {
        return;
    }


    try {

        const url =

            "https://api.open-meteo.com/v1/forecast" +

            "?latitude=" + latitude +

            "&longitude=" + longitude +

            "&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m" +

            "&daily=weather_code,temperature_2m_max,temperature_2m_min" +

            "&forecast_days=5" +

            "&timezone=auto";


        const response = await fetch(url);


        if (!response.ok) {
            throw new Error("Weather search failed");
        }


        const weather = await response.json();

        const current = weather.current;

        const daily = weather.daily;

        const currentCondition =
            getWeatherCondition(current.weather_code);



        // CURRENT WEATHER

        currentElement.innerHTML = `

            <div class="current-weather">

                <span class="weather-icon">

                    ${currentCondition.icon}

                </span>


                <div>

                    <strong>

                        ${Math.round(current.temperature_2m)}
                        ${weather.current_units.temperature_2m}

                    </strong>


                    <span>

                        ${currentCondition.label}

                    </span>

                </div>

            </div>


            <p class="weather-meta">

                Feels like
                ${Math.round(current.apparent_temperature)}
                ${weather.current_units.apparent_temperature}

                · Wind
                ${Math.round(current.wind_speed_10m)}
                ${weather.current_units.wind_speed_10m}

            </p>

        `;



        // WEATHER FORECAST

        forecastElement.innerHTML =

            daily.time.map(function(day, index) {

                const condition =
                    getWeatherCondition(
                        daily.weather_code[index]
                    );


                const date =
                    new Date(day + "T12:00:00");


                const dayName =

                    index === 0

                        ? "Today"

                        : date.toLocaleDateString(
                            "en-US",
                            {
                                weekday: "short"
                            }
                        );


                return `

                    <div class="forecast-day">

                        <strong>

                            ${dayName}

                        </strong>


                        <span class="forecast-icon">

                            ${condition.icon}

                        </span>


                        <span>

                            ${Math.round(
                                daily.temperature_2m_max[index]
                            )}°

                            /

                            ${Math.round(
                                daily.temperature_2m_min[index]
                            )}°

                        </span>

                    </div>

                `;

            }).join("");


    } catch (error) {

        console.error("Weather error:", error);


        currentElement.innerHTML =
            "Weather unavailable";


        forecastElement.innerHTML =
            "<p>Try searching again in a moment.</p>";

    }

}


// ==========================================
// WEATHER CONDITIONS
// ==========================================

function getWeatherCondition(code) {

    const conditions = {

        0: {
            icon: "☀️",
            label: "Clear sky"
        },

        1: {
            icon: "🌤️",
            label: "Mainly clear"
        },

        2: {
            icon: "⛅",
            label: "Partly cloudy"
        },

        3: {
            icon: "☁️",
            label: "Overcast"
        },

        45: {
            icon: "🌫️",
            label: "Foggy"
        },

        48: {
            icon: "🌫️",
            label: "Rime fog"
        },

        51: {
            icon: "🌦️",
            label: "Light drizzle"
        },

        53: {
            icon: "🌦️",
            label: "Drizzle"
        },

        55: {
            icon: "🌧️",
            label: "Heavy drizzle"
        },

        61: {
            icon: "🌦️",
            label: "Light rain"
        },

        63: {
            icon: "🌧️",
            label: "Rain"
        },

        65: {
            icon: "🌧️",
            label: "Heavy rain"
        },

        71: {
            icon: "🌨️",
            label: "Light snow"
        },

        73: {
            icon: "❄️",
            label: "Snow"
        },

        75: {
            icon: "❄️",
            label: "Heavy snow"
        },

        80: {
            icon: "🌦️",
            label: "Rain showers"
        },

        81: {
            icon: "🌧️",
            label: "Rain showers"
        },

        82: {
            icon: "⛈️",
            label: "Heavy showers"
        },

        95: {
            icon: "⛈️",
            label: "Thunderstorm"
        },

        96: {
            icon: "⛈️",
            label: "Storm with hail"
        },

        99: {
            icon: "⛈️",
            label: "Storm with hail"
        }

    };


    return conditions[code] || {

        icon: "🌡️",

        label: "Mixed conditions"

    };

}


// ==========================================
// FIND NEARBY PLACES
// ==========================================

async function findNearbyPlaces(

    latitude,
    longitude

) {

    try {


        const query = `

            [out:json];

            (

                node["tourism"="hotel"]
                (around:5000,${latitude},${longitude});

                way["tourism"="hotel"]
                (around:5000,${latitude},${longitude});


                node["amenity"="restaurant"]
                (around:5000,${latitude},${longitude});

                way["amenity"="restaurant"]
                (around:5000,${latitude},${longitude});


                node["tourism"="attraction"]
                (around:5000,${latitude},${longitude});

                node["tourism"="museum"]
                (around:5000,${latitude},${longitude});

                node["historic"="monument"]
                (around:5000,${latitude},${longitude});

            );

            out center;

        `;


        const url =

            "https://overpass-api.de/api/interpreter?data=" +

            encodeURIComponent(query);


        const response = await fetch(url);


        if (!response.ok) {

            throw new Error("Nearby search failed");

        }


        const data = await response.json();


        const hotels = [];

        const restaurants = [];

        const attractions = [];


        if (!data.elements) {

            throw new Error("No data received");

        }


        data.elements.forEach(function(item) {


            const tags = item.tags || {};

            const name = tags.name;


            if (!name) {
                return;
            }


            // HOTELS

            if (tags.tourism === "hotel") {

                hotels.push(name);

            }


            // RESTAURANTS

            if (tags.amenity === "restaurant") {

                restaurants.push(name);

            }


            // ATTRACTIONS

            if (

                tags.tourism === "attraction" ||

                tags.tourism === "museum" ||

                tags.historic === "monument"

            ) {

                attractions.push(name);

            }

        });


        displayList(
            "hotels",
            hotels,
            "🏨"
        );


        displayList(
            "restaurants",
            restaurants,
            "🍴"
        );


        displayList(
            "attractions",
            attractions,
            "📍"
        );


    } catch (error) {


        console.error(
            "Nearby places error:",
            error
        );


        displayList(
            "hotels",
            [],
            "🏨"
        );


        displayList(
            "restaurants",
            [],
            "🍴"
        );


        displayList(
            "attractions",
            [],
            "📍"
        );

    }

}


// ==========================================
// DISPLAY LIST
// ==========================================

function displayList(

    elementID,
    items,
    icon

) {


    const element =
        document.getElementById(elementID);


    if (!element) {
        return;
    }


    const uniqueItems =

        [...new Set(items)].slice(0, 8);


    if (uniqueItems.length === 0) {


        element.innerHTML = `

            <p>

                No results found nearby.

            </p>

        `;


        return;

    }


    let html = "";


    uniqueItems.forEach(function(item) {


        html += `

            <div class="card-item">

                ${icon} ${item}

            </div>

        `;

    });


    element.innerHTML = html;

}


// ==========================================
// SHOW MAP
// ==========================================

function showMap(

    latitude,
    longitude,
    place

) {


    const mapElement =
        document.getElementById("map");


    if (!mapElement) {

        console.error("Map element not found");

        return;

    }


    if (typeof L === "undefined") {


        console.error(

            "Leaflet is not loaded. Add Leaflet JS to index.html."

        );


        return;

    }


    mapElement.style.display = "block";


    if (!map) {


        map = L.map("map").setView(

            [latitude, longitude],

            13

        );


        L.tileLayer(

            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",

            {

                maxZoom: 19,

                attribution:
                    "&copy; OpenStreetMap contributors"

            }

        ).addTo(map);


    } else {


        map.setView(

            [latitude, longitude],

            13

        );

    }


    if (marker) {

        map.removeLayer(marker);

    }


    marker = L.marker([

        latitude,
        longitude

    ])

        .addTo(map)

        .bindPopup(

            `<b>📍 ${place}</b>`

        )

        .openPopup();


    setTimeout(function() {

        map.invalidateSize();

    }, 300);

}


// ==========================================
// SHOW ERROR
// ==========================================

function showError(message) {


    const result =
        document.getElementById("result");


    if (result) {


        result.innerHTML = `

            <div class="error">

                <h2>

                    ❌ ${message}

                </h2>

            </div>

        `;

    }


    const mapElement =
        document.getElementById("map");


    if (mapElement) {

        mapElement.style.display = "none";

    }

}


// ==========================================
// ENTER KEY SEARCH
// ==========================================

document.addEventListener(

    "DOMContentLoaded",

    function() {


        const input =
            document.getElementById("placeInput");


        const daysInput =
            document.getElementById("daysInput");


        if (input) {


            input.addEventListener(

                "keydown",

                function(event) {


                    if (event.key === "Enter") {

                        searchPlace();

                    }

                }

            );

        }


        if (daysInput) {


            daysInput.addEventListener(

                "keydown",

                function(event) {


                    if (event.key === "Enter") {

                        searchPlace();

                    }

                }

            );

        }

    }

);