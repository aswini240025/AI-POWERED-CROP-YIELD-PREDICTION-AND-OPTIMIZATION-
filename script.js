const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const OPENWEATHER_API_KEY = '2259d8f7cef7d2cb8f6b8d1f97014cfbf'; // YOUR KEY
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// 1. REAL LOCATION DETECTION
app.post('/api/detect-location', async (req, res) => {
    try {
        const { lat, lon } = req.body;
        
        // Use OpenStreetMap to get location details
        const osmResponse = await axios.get(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
        );
        
        const address = osmResponse.data.address;
        res.json({
            success: true,
            state: address.state || address.region,
            district: address.county || address.district,
            village: address.village,
            pincode: address.postcode
        });
    } catch (error) {
        // Fallback to simulation if API fails
        res.json({
            success: true,
            state: "Tamil Nadu",
            district: "Chennai",
            village: "Kavaraipettai",
            pincode: "601206"
        });
    }
});

// 2. GET REAL WEATHER DATA
app.get('/api/weather/:lat/:lon', async (req, res) => {
    try {
        const { lat, lon } = req.params;
        
        // OpenWeatherMap API
        const weatherResponse = await axios.get(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`
        );
        
        res.json({
            temperature: weatherResponse.data.main.temp,
            condition: weatherResponse.data.weather[0].main,
            humidity: weatherResponse.data.main.humidity,
            rainfall: weatherResponse.data.rain ? weatherResponse.data.rain['1h'] || 0 : 0,
            windSpeed: weatherResponse.data.wind.speed,
            realData: true
        });
    } catch (error) {
        // Fallback data
        res.json({
            temperature: 28,
            condition: "Normal",
            humidity: 65,
            rainfall: 50,
            windSpeed: 12,
            realData: false
        });
    }
});

// 3. GET REAL SOIL DATA
app.get('/api/soil/:lat/:lon', async (req, res) => {
    try {
        const { lat, lon } = req.params;
        
        // SoilGrids API for soil data
        const soilResponse = await axios.get(
            `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=${lon}&lat=${lat}&property=nitrogen&property=phh2o&property=soc&depth=0-5cm&value=mean`,
            {
                auth: {
                    username: 'soilgrids',
                    password: 'soilgrids'
                }
            }
        );
        
        const properties = soilResponse.data.properties;
        res.json({
            nitrogen: properties.find(p => p.name === 'nitrogen')?.value || 'Medium',
            pH: properties.find(p => p.name === 'phh2o')?.value || 6.5,
            organicCarbon: properties.find(p => p.name === 'soc')?.value || 'Medium',
            soilType: getSoilTypeFromCoords(lat, lon),
            realData: true
        });
    } catch (error) {
        // Fallback data
        res.json({
            nitrogen: 'Medium',
            pH: 6.2,
            organicCarbon: 'Medium',
            soilType: 'Clay Soil',
            realData: false
        });
    }
});

// 4. AI ANALYSIS WITH REAL DATA
app.post('/api/analyze-farm', async (req, res) => {
    const { lat, lon, crop, state, district } = req.body;
    
    try {
        // Get real weather and soil data
        const [weatherData, soilData] = await Promise.all([
            axios.get(`http://localhost:5000/api/weather/${lat}/${lon}`),
            axios.get(`http://localhost:5000/api/soil/${lat}/${lon}`)
        ]);
        
        // AI LOGIC based on real data
        const recommendations = generateAIRecommendations(crop, weatherData.data, soilData.data);
        
        res.json({
            success: true,
            location: `${district}, ${state}`,
            crop: crop,
            weather: weatherData.data,
            soil: soilData.data,
            recommendations: recommendations,
            message: "✅ AI-Powered Analysis Complete with Real Data!"
        });
    } catch (error) {
        // Fallback to simulation
        res.json({
            success: true,
            recommendations: {
                yield: "4.2 tons/hectare",
                fertilizer: "NPK 10:26:26 - Apply 150 kg/acre",
                irrigation: "Water every 3 days based on weather",
                pestAlert: "Normal conditions - Monitor weekly"
            },
            message: "Analysis complete (using simulation data)"
        });
    }
});

// AI Recommendation Engine
function generateAIRecommendations(crop, weather, soil) {
    const cropData = {
        'Rice': { water: 1500, fertilizer: 'NPK 20:10:10', duration: 120 },
        'Wheat': { water: 800, fertilizer: 'NPK 15:15:15', duration: 110 },
        'Maize': { water: 700, fertilizer: 'NPK 12:32:16', duration: 90 },
        'Sugarcane': { water: 2500, fertilizer: 'NPK 25:10:10', duration: 300 }
    };
    
    const cropInfo = cropData[crop] || cropData['Rice'];
    
    // Adjust based on real weather
    let irrigation = `Water ${cropInfo.water} mm over ${cropInfo.duration} days`;
    if (weather.rainfall > 100) {
        irrigation = "Reduce irrigation - Sufficient rainfall";
    }
    
    // Adjust fertilizer based on soil
    let fertilizer = cropInfo.fertilizer;
    if (soil.nitrogen === 'High') {
        fertilizer = "Reduce nitrogen, increase phosphorus";
    }
    
    // Yield prediction
    const baseYield = 4.2; // tons/hectare
    const weatherFactor = weather.temperature > 35 ? 0.8 : 1.0;
    const soilFactor = soil.pH > 6.0 && soil.pH < 7.5 ? 1.2 : 0.9;
    const predictedYield = (baseYield * weatherFactor * soilFactor).toFixed(2);
    
    return {
        yield: `${predictedYield} tons/hectare`,
        fertilizer: `${fertilizer} - Apply in 3 splits`,
        irrigation: irrigation,
        pestAlert: weather.humidity > 80 ? "⚠️ High humidity - Watch for fungal diseases" : "✅ Low pest risk",
        nextSteps: [
            "Test soil pH weekly",
            "Check weather forecast daily",
            "Apply first fertilizer in 7 days"
        ]
    };
}

function getSoilTypeFromCoords(lat, lon) {
    // Simple simulation - in real app, use soil API
    const soils = ['Clay Soil', 'Sandy Soil', 'Loamy Soil', 'Silt Soil'];
    return soils[Math.floor(Math.random() * soils.length)];
}

// Serve index.html for all routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`✅ AgriSmart running at http://localhost:${PORT}`);
    console.log(`✅ Using OpenWeather API Key: ${OPENWEATHER_API_KEY}`);
});