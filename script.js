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
const esp32IP = "192.168.45.1";
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
        showLoadingState();
        console.log("Attempting to connect to ESP32...");
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        // Add http:// protocol and log the full URL
        const url = `http://${esp32IP}/data`;
        console.log("Fetching from:", url);

        const response = await fetch(url, {
            mode: 'cors',
            method: 'GET',
            signal: controller.signal,
            headers: {
                'Accept': 'application/json'
            }
        });

        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Received data:", data);

        if (!validateData(data)) {
            throw new Error("Invalid data format received");
        }

        // Update UI with new data
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

        document.getElementById("connectionStatus").innerText = "Connected ✅";
        document.getElementById("connectionStatus").style.color = "green";
        hideLoadingState();

    } catch (error) {
        console.error("Connection error:", error.message);
        document.getElementById("connectionStatus").innerText = `Disconnected ❌ (${error.message})`;
        document.getElementById("connectionStatus").style.color = "red";
        hideLoadingState();

        if (retryCount > 0) {
            console.log(`Retrying... ${retryCount} attempts remaining`);
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


// Landing Animation Script
document.addEventListener('DOMContentLoaded', () => {
    // Create splash overlay
    const splash = document.createElement('div');
    splash.className = 'splash-overlay';
    
    // Add splash content
    splash.innerHTML = `
        <div class="splash-logo">
            <i class="fas fa-water"></i>
            <span>BlueMetrics</span>
        </div>
        <div class="splash-text">Real-time Water Quality Monitoring</div>
        <div class="loading-bar">
            <div class="loading-progress"></div>
        </div>
    `;
    
    document.body.appendChild(splash);
    
    // Add water ripple effect
    const ripple = document.createElement('div');
    ripple.className = 'water-ripple';
    document.body.appendChild(ripple);
    
    // Initial state of the body
    document.body.classList.add('loading');
    
    // Animate the loading bar
    const loadingProgress = document.querySelector('.loading-progress');
    let progress = 0;
    
    const animateLoading = () => {
        if (progress < 100) {
            progress += Math.random() * 15;
            progress = Math.min(progress, 100);
            loadingProgress.style.width = `${progress}%`;
            
            if (progress < 100) {
                setTimeout(animateLoading, 200 + Math.random() * 300);
            } else {
                // When loading completes
                setTimeout(() => {
                    splash.classList.add('fade-out');
                    document.body.classList.remove('loading');
                    document.body.classList.add('animate-in');
                    
                    // Set initial width of progress bars to 0, then animate them
                    setTimeout(() => {
                        // Get the current width values from CSS variables or default values
                        animateProgressBars();
                    }, 100);
                }, 500);
            }
        }
    };
    
    // Start the animation sequence
    setTimeout(animateLoading, 500);
    
    // Function to animate progress bars to their proper values
    function animateProgressBars() {
        // Get dynamic data or use defaults
        const phValue = 7.0; // Could be from data
        const turbidityValue = 2.5;
        const tdsValue = 150;
        const conductivityValue = 500;
        const doValue = 7.2;
        
        // Calculate percentages based on thresholds
        const phPercentage = ((phValue - 6.5) / (8.5 - 6.5)) * 100;
        const turbidityPercentage = (turbidityValue / 5) * 100;
        const tdsPercentage = ((tdsValue - 50) / (250 - 50)) * 100;
        const conductivityPercentage = ((conductivityValue - 100) / (2000 - 100)) * 100;
        const doPercentage = ((doValue - 6.5) / (8 - 6.5)) * 100;
        
        // Set the width for each progress bar
        document.querySelector('.ph-fill').style.width = `${phPercentage}%`;
        document.querySelector('.turbidity-fill').style.width = `${turbidityPercentage}%`;
        document.querySelector('.tds-fill').style.width = `${tdsPercentage}%`;
        document.querySelector('.conductivity-fill').style.width = `${conductivityPercentage}%`;
        document.querySelector('.do-fill').style.width = `${doPercentage}%`;
    }
    
    // Handle history section animations
    const observerOptions = {
        threshold: 0.2,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in-section');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Add animation classes for scrolling sections
    document.querySelectorAll('.history, .info').forEach(section => {
        section.classList.add('scroll-animate');
        observer.observe(section);
    });
});
// Enhanced animation for BlueMetrics dashboard
document.addEventListener('DOMContentLoaded', () => {
    // Add the CSS styles for animations
    const style = document.createElement('style');
    style.textContent = `
        /* Basic scroll animations */
        .scroll-animate {
            opacity: 0;
            transform: translateY(30px);
            transition: opacity 0.8s ease, transform 0.8s ease;
        }
        .fade-in-section {
            opacity: 1;
            transform: translateY(0);
        }
        body.loading {
            overflow: hidden;
        }
        
        /* Dashboard title animation */
        .animate-in h1 {
            opacity: 0;
            transform: translateY(-20px);
            animation: slideUp 1s ease 1s forwards;
        }
        
        .animate-in .last-updated {
            opacity: 0;
            animation: fadeIn 1s ease 1.8s forwards;
        }
        
        /* Card animations */
        .animate-in .card {
            opacity: 0;
            animation: cardAppear 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        
        .animate-in .container .card:nth-child(1) { animation-delay: 1.4s; }
        .animate-in .container .card:nth-child(2) { animation-delay: 1.6s; }
        .animate-in .container .card:nth-child(3) { animation-delay: 1.8s; }
        .animate-in .container .card:nth-child(4) { animation-delay: 2.0s; }
        .animate-in .container .card:nth-child(5) { animation-delay: 2.2s; }
        .animate-in .container .card:nth-child(6) { animation-delay: 2.4s; }
        
        /* Progress bars special animation */
        .animate-in .progress-fill {
            width: 0 !important;
            transition: width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .animate-in .ph-fill { 
            background: linear-gradient(90deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff);
            background-size: 500% 500%;
            animation: gradientFlow 3s ease-in-out infinite;
            transition-delay: 1.7s;
        }
        
        .animate-in .turbidity-fill { transition-delay: 1.9s; }
        .animate-in .tds-fill { transition-delay: 2.1s; }
        .animate-in .conductivity-fill { transition-delay: 2.3s; }
        .animate-in .do-fill { transition-delay: 2.5s; }
        
        /* Keyframe animations */
        @keyframes slideUp {
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        @keyframes fadeIn {
            to {
                opacity: 1;
            }
        }
        
        @keyframes cardAppear {
            from {
                opacity: 0;
                transform: translateY(40px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        @keyframes gradientFlow {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
    `;
    document.head.appendChild(style);
    
    // Apply scroll-animate class to elements we want to animate on scroll
    const animateElements = [
        ...document.querySelectorAll('.info-card'),
        ...document.querySelectorAll('#history h2, #info h2'),
        document.querySelector('.history-container'),
        document.querySelector('.parameters-table')
    ];
    
    // Add the scroll-animate class to each element
    animateElements.forEach(element => {
        if (element) {
            element.classList.add('scroll-animate');
        }
    });
    
    // Add the initial animation class to the dashboard section
    const dashboard = document.querySelector('#dashboard');
    if (dashboard) {
        dashboard.classList.add('animate-in');
    }
    
    // Function to check if element is in viewport
    const isInViewport = (element) => {
        const rect = element.getBoundingClientRect();
        return (
            rect.top <= (window.innerHeight || document.documentElement.clientHeight) * 0.8 &&
            rect.bottom >= 0
        );
    };
    
    // Function to handle scroll animation
    const handleScrollAnimation = () => {
        const animElements = document.querySelectorAll('.scroll-animate');
        animElements.forEach(element => {
            if (isInViewport(element)) {
                element.classList.add('fade-in-section');
            }
        });
    };
    
    // Add initial page loading animation
    document.body.classList.add('loading');
    
    // Initialize progress bar widths after animations
    const initializeProgressBars = () => {
        // Wait for the entrance animations to complete
        setTimeout(() => {
            const progressFills = document.querySelectorAll('.progress-fill');
            progressFills.forEach(fill => {
                // Remove the !important from inline style by setting it via JavaScript
                fill.style.width = fill.getAttribute('data-fill-width') || '50%';
            });
        }, 2600); // Time after the last progress bar delay
    };
    
    // Store current widths before applying animations
    const progressFills = document.querySelectorAll('.progress-fill');
    progressFills.forEach(fill => {
        // Store the original width to use after animation
        const computedStyle = window.getComputedStyle(fill);
        const currentWidth = computedStyle.width;
        fill.setAttribute('data-fill-width', currentWidth);
    });
    
    window.addEventListener('load', () => {
        setTimeout(() => {
            document.body.classList.remove('loading');
            handleScrollAnimation();
            initializeProgressBars();
        }, 300);
    });
    
    // Listen for scroll events
    window.addEventListener('scroll', handleScrollAnimation);
    
    // Initial check for elements in viewport
    handleScrollAnimation();
});
