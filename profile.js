// Sample user data (replace with actual backend data)
let userData = {
    username: "johndoe",
    email: "john.doe@example.com",
    createdDate: "2025-01-01",
    preferences: {
        updateInterval: 5000,
        notifyCritical: true,
        notifyWarning: false
    }
};

// Load profile data on page load
document.addEventListener('DOMContentLoaded', () => {
    loadProfileData();
    loadPreferences();
});

// Toggle edit mode
function toggleEditMode(enable) {
    const infoCard = document.querySelector('.profile-card:first-child');
    const editForm = document.getElementById('editProfileForm');
    
    if (enable) {
        infoCard.style.display = 'none';
        editForm.classList.add('active');
        
        // Populate form with current data
        document.getElementById('editUsername').value = userData.username;
        document.getElementById('editEmail').value = userData.email;
    } else {
        infoCard.style.display = 'block';
        editForm.classList.remove('active');
    }
}

// Load profile data into UI
function loadProfileData() {
    document.getElementById('username').textContent = userData.username;
    document.getElementById('email').textContent = userData.email;
    document.getElementById('createdDate').textContent = userData.createdDate;
}

// Load preferences into UI
function loadPreferences() {
    document.getElementById('updateInterval').value = userData.preferences.updateInterval;
    document.getElementById('notifyCritical').checked = userData.preferences.notifyCritical;
    document.getElementById('notifyWarning').checked = userData.preferences.notifyWarning;
}

// Save profile changes
document.getElementById('editProfileForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const newUsername = document.getElementById('editUsername').value;
    const newEmail = document.getElementById('editEmail').value;
    const newPassword = document.getElementById('editPassword').value;

    if (!newUsername || !newEmail) {
        alert('Username and Email are required');
        return;
    }

    // Update user data (replace with API call in production)
    userData.username = newUsername;
    userData.email = newEmail;
    if (newPassword) {
        // Handle password update logic here
        console.log('Password update requested');
    }

    loadProfileData();
    toggleEditMode(false);
    alert('Profile updated successfully');
});

// Save preferences
function savePreferences() {
    userData.preferences.updateInterval = parseInt(document.getElementById('updateInterval').value);
    userData.preferences.notifyCritical = document.getElementById('notifyCritical').checked;
    userData.preferences.notifyWarning = document.getElementById('notifyWarning').checked;

    // Save to localStorage or backend (for demo, using console)
    console.log('Updated preferences:', userData.preferences);
    alert('Preferences saved successfully');

    // Optionally, update the main dashboard's update interval
    if (window.opener && window.opener.updateData) {
        window.opener.UPDATE_INTERVAL = userData.preferences.updateInterval;
    }
}