const esp32IP = "192.168.242.1";

    Promise.race([
        fetch(esp32IP + "/data"),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), 5000))
    ])
    .then(response => response.json())
    .then(data => {
        document.getElementById('phValue').innerText = "pH: " + (typeof data.pH === 'number' ? data.pH.toFixed(2) : 'N/A');
        document.getElementById('turbValue').innerText = "Turbidity: " + (typeof data.turbidity === 'number' ? data.turbidity.toFixed(2) : 'N/A') + " NTU";
        document.getElementById('phMeter').style.width = (data.pH / 14) * 100 + "%";
        document.getElementById('turbMeter').style.width = (data.turbidity / 100) * 100 + "%";

        let reportText = "Water quality is within acceptable limits.";
        if (data.pH < 6.5 || data.pH > 8.5) {
            reportText = "⚠️ pH level is outside the safe range!";
        }
        if (data.turbidity > 100) {
            reportText = "⚠️ Turbidity is too high, water quality is poor!";
        }
        document.getElementById('reportText').innerText = reportText;
    })


const fetchInterval = 10000; // Default to 10 seconds
let intervalId = null;
setInterval(updateData, fetchInterval);

updateData();
updateData();updateData();


