// Add to the top of script.js
if (!Object.entries) {
    Object.entries = function(obj) {
        return Object.keys(obj).map(key => [key, obj[key]]);
    };
}

if (!Array.prototype.forEach) {
    Array.prototype.forEach = function(callback) {
        for (let i = 0; i < this.length; i++) {
            callback(this[i], i, this);
        }
    };
}

// Configuration
const esp32IP = "https://1bf1-2409-4081-178c-a2be-1cf6-e93e-421b-a41f.ngrok-free.app";
const UPDATE_INTERVAL = 5000;
const MAX_HISTORY_POINTS = 100;

// Threshold values with warning ranges
const THRESHOLDS = {
    pH: { min: 6.5, max: 8.5, warningBuffer: 0.5 },
    turbidity: { min: 0, max: 5, warningBuffer: 1 },
    tds: { min: 50, max: 250, warningBuffer: 25 },
    conductivity: { min: 100, max: 2000, warningBuffer: 100 },
    dissolvedOxygen: { min: 6.5, max: 8, warningBuffer: 0.5 }
};

// Data history storage
let dataHistory = [];

// Utility functions
const average = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
const getTimestamp = () => new Date().toISOString();

// Add this to store user preferences
function saveSettings(settings) {
    localStorage.setItem('waterqual_settings', JSON.stringify(settings));
}

function loadSettings() {
    return JSON.parse(localStorage.getItem('waterqual_settings') || '{}');
}

// Enhanced status determination with trend analysis
function getStatus(value, parameter, history = []) {
    const threshold = THRESHOLDS[parameter];
    const trend = history.length >= 3 ? 
        Math.sign(history[history.length - 1] - history[history.length - 3]) : 0;

    if (value >= threshold.min && value <= threshold.max) {
        return {
            status: 'optimal',
            trend: trend,
            message: `${parameter} is within optimal range`
        };
    } else if (value < threshold.min - threshold.warningBuffer || 
               value > threshold.max + threshold.warningBuffer) {
        return {
            status: 'critical',
            trend: trend,
            message: `${parameter} is critically ${value < threshold.min ? 'low' : 'high'}`
        };
    }
    return {
        status: 'warning',
        trend: trend,
        message: `${parameter} is near ${value < threshold.min ? 'lower' : 'upper'} limit`
    };
}

// Advanced parameter update with animations and trends
function updateParameter(value, parameter, history = []) {
    // Add loading state
    const elementId = parameter.toLowerCase();
    const meter = document.getElementById(`${elementId}Meter`);
    if (!meter) return; // Guard clause for missing elements
    
    meter.classList.add('loading');
    
    const valueDisplay = document.getElementById(`${elementId}Value`);
    const status = document.getElementById(`${elementId}Status`);
    
    // Calculate normalized percentage with bounds
    const normalizedValue = (value - THRESHOLDS[parameter].min) / 
        (THRESHOLDS[parameter].max - THRESHOLDS[parameter].min) * 100;
    const percentage = Math.max(0, Math.min(100, normalizedValue));
    
    // Smooth animation
    meter.style.transition = 'width 0.5s ease-in-out';
    meter.style.width = `${percentage}%`;
    
    // Add trend indicator
    const statusInfo = getStatus(value, parameter, history);
    const trendIcon = statusInfo.trend > 0 ? '↑' : statusInfo.trend < 0 ? '↓' : '→';
    
    valueDisplay.innerHTML = `
        ${parameter}: ${value.toFixed(2)} ${getUnits(parameter)}
        <span class="trend-indicator">${trendIcon}</span>
    `;
    
    status.className = `status-indicator ${statusInfo.status}`;
    status.setAttribute('title', statusInfo.message);
    
    meter.classList.remove('loading');
}

// Enhanced report generation with insights
function updateReport(data) {
    const reportText = document.getElementById('reportText');
    const overallStatus = document.getElementById('overallStatus');
    
    const analysis = analyzeWaterQuality(data);
    
    reportText.innerHTML = `
        <strong>Status:</strong> ${analysis.status}<br>
        <strong>Issues:</strong><br>
        ${analysis.issues.map(issue => `• ${issue}`).join('<br>')}
        ${analysis.recommendations ? 
            `<br><strong>Recommendations:</strong><br>
            ${analysis.recommendations.map(rec => `• ${rec}`).join('<br>')}` : 
            ''
        }
    `;
    
    overallStatus.className = `status-circle ${analysis.statusClass}`;
}

// Water quality analysis
function analyzeWaterQuality(data) {
    const issues = [];
    const recommendations = [];
    let criticalCount = 0;
    
    for (const [param, value] of Object.entries(data)) {
        const statusInfo = getStatus(value, param);
        if (statusInfo.status !== 'optimal') {
            issues.push(statusInfo.message);
            recommendations.push(getRecommendation(param, value));
            if (statusInfo.status === 'critical') criticalCount++;
        }
    }
    
    return {
        status: criticalCount > 0 ? 'Critical Action Required' : 
               issues.length > 0 ? 'Attention Needed' : 'All Parameters Optimal',
        statusClass: criticalCount > 0 ? 'critical' : 
                    issues.length > 0 ? 'warning' : 'optimal',
        issues,
        recommendations
    };
}

// Helper function for units
function getUnits(parameter) {
    const units = {
        pH: '',
        turbidity: 'NTU',
        tds: 'ppm',
        conductivity: 'µS/cm',
        dissolvedOxygen: 'mg/L'
    };
    return units[parameter] || '';
}

// Generate recommendations based on parameter values
function getRecommendation(parameter, value) {
    // Add your recommendation logic here
    const threshold = THRESHOLDS[parameter];
    if (value < threshold.min) {
        return `Consider increasing ${parameter} levels`;
    } else if (value > threshold.max) {
        return `Consider decreasing ${parameter} levels`;
    }
    return `Monitor ${parameter} closely`;
}

// Main data update function with error handling and retry logic
let connectionAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

function checkConnection() {
    if (connectionAttempts >= MAX_RECONNECT_ATTEMPTS) {
        document.getElementById("connectionStatus").innerText = "Connection Failed ❌";
        return false;
    }
    return true;
}

async function updateData(retryCount = 3) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${esp32IP}/data`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        try {
            const data = await response.json();
        } catch (parseError) {
            console.error("Error parsing JSON:", parseError);
            throw new Error("Invalid data format received");
        }

        if (!data || Object.keys(data).length === 0) throw new Error("Empty response received");

        // Update only if data has changed
        if (JSON.stringify(data) !== JSON.stringify(dataHistory[dataHistory.length - 1])) {
            dataHistory.push({
                timestamp: getTimestamp(),
                ...data
            });

            if (dataHistory.length > MAX_HISTORY_POINTS) {
                dataHistory.shift();
            }

            updateTimestamp();
            Object.entries(data).forEach(([param, value]) => {
                const history = dataHistory.map(entry => entry[param]);
                updateParameter(value, param, history);
            });

            updateReport(data);
            updateHistoryTable();
        }

        document.getElementById("connectionStatus").innerText = "Connected ✅";
        document.getElementById("connectionStatus").style.color = "green";
        
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Request timed out');
        }
        console.error("Error fetching data:", error);
        document.getElementById("connectionStatus").innerText = "Disconnected ❌";
        document.getElementById("connectionStatus").style.color = "red";

        if (retryCount > 0) {
            setTimeout(() => updateData(retryCount - 1), 1000);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Initialize hamburger menu
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    
    hamburger?.addEventListener('click', () => {
        navLinks?.classList.toggle('active');
    });
    
    // Start data updates
    updateData();
    setInterval(updateData, UPDATE_INTERVAL);
    
    // Add service worker registration
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('ServiceWorker registered'))
            .catch(err => console.error('ServiceWorker registration failed:', err));
    }
});

// Add this function as it's called but not defined
function updateTimestamp() {
    const timestampElement = document.getElementById('lastUpdate');
    if (timestampElement) {
        timestampElement.textContent = new Date().toLocaleTimeString();
    }
}

function updateHistoryTable() {
    const historyTable = document.getElementById("historyData");
    if (!historyTable) return;

    // Clear the table before adding new rows
    historyTable.innerHTML = "";

    // Reverse the order so the latest entry appears first
    const recentHistory = [...dataHistory].reverse();

    recentHistory.forEach(entry => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${entry.timestamp}</td>
            <td>${entry.pH.toFixed(2)}</td>
            <td>${entry.turbidity.toFixed(2)} NTU</td>
            <td>${entry.tds.toFixed(2)} ppm</td>
            <td>${entry.conductivity.toFixed(2)} µS/cm</td>
            <td>${entry.dissolvedOxygen.toFixed(2)} mg/L</td>
            <td><span class="status-badge ${getStatus(entry.pH, 'pH').status}">${getStatus(entry.pH, 'pH').status}</span></td>
        `;

        historyTable.appendChild(row);
    });
}

function showLoadingState() {
    document.querySelectorAll('.card').forEach(card => {
        card.classList.add('loading');
    });
}

function hideLoadingState() {
    document.querySelectorAll('.card').forEach(card => {
        card.classList.remove('loading');
    });
}

function validateData(data) {
    const requiredParams = ['pH', 'turbidity', 'tds', 'conductivity', 'dissolvedOxygen'];
    return requiredParams.every(param => 
        typeof data[param] === 'number' && 
        !isNaN(data[param])
    );
}
