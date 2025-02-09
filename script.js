const esp32IP = "http://192.168.242.1"; // Change to your ESP32 IP

        function updateData() {
            fetch(esp32IP + "/data")
            .then(response => response.json())
            .then(data => {
                document.getElementById('phValue').innerText = "pH: " + data.pH.toFixed(2);
                document.getElementById('turbValue').innerText = "Turbidity: " + data.turbidity.toFixed(2) + " NTU";

                document.getElementById('phMeter').style.width = (data.pH / 14) * 100 + "%";
                document.getElementById('turbMeter').style.width = (data.turbidity / 100) * 100 + "%";

                let reportText = "Water quality is within acceptable limits.";
                if (data.pH < 6.5 || data.pH > 8.5) reportText = "⚠️ pH level is outside the safe range!";
                if (data.turbidity > 100) reportText = "⚠️ Turbidity is too high, water quality is poor!";
                document.getElementById('reportText').innerText = reportText;
            })
            .catch(error => {
                console.log("Error fetching data:", error);
                document.getElementById('reportText').innerText = "🚨 Unable to fetch data!";
            });
        }

        setInterval(updateData, 2000);
        updateData();
