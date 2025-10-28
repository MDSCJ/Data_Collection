// === Configuration ===
// IMPORTANT: Replace this URL with your deployed Google Apps Script Web App URL
const FORM_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwq1YTJ3GYAszqmTSCrspyDtVYpBBB5l21MYVRZZZm2iY-SeRt8MZAEFh1vt2aMhm7XMg/exec";

// SECURITY NOTE: This secret token MUST match the token in GoogleAppsScript.js
const SECRET_TOKEN = "e89c0205-59e5-4f48-a00d-58b688d0111a";

// === Form Elements ===
const form = document.getElementById('dataForm');
const submitBtn = document.getElementById('submitBtn');
const validationMessage = document.getElementById('validationMessage');
const responseMessage = document.getElementById('responseMessage');
const familyMembersWrapper = document.getElementById('familyMembersWrapper');
const latInput = document.getElementById('latitude');
const lonInput = document.getElementById('longitude');

let memberIndex = 0;
let memberCount = 0;

// === Leaflet Map Variables ===
let map;
let marker;
let isMapInitialized = false;

// === Utility Functions ===

// Function to create a unique ID field for family members
function createMemberBlock(index) {
    return `
    <div id="member-${index}" class="member-block p-3 border border-gray-200 rounded bg-white relative" data-index="${index}">
      <button type="button" onclick="removeMember(${index})" class="absolute top-1 right-1 text-red-500 hover:text-red-700 text-xl leading-none">&times;</button>
      <div class="flex space-x-2 mb-2">
        <div class="flex-1">
          <label for="name-${index}" class="text-xs font-medium required-indicator">Name</label>
          <input type="text" id="name-${index}" required class="input-style" data-label="Family Member Name">
        </div>
        <div class="w-1/4">
          <label for="age-${index}" class="text-xs font-medium required-indicator">Age</label>
          <input type="number" id="age-${index}" required min="1" max="100" class="input-style" oninput="toggleIdField(${index})" data-label="Family Member Age">
        </div>
      </div>
      <div id="id-group-${index}" class="hidden space-y-2">
        <label for="id-${index}" class="text-xs font-medium">ID Number (Optional for 18+)</label>
        <input type="text" id="id-${index}" 
          pattern="^(\\d{10}|\\d{12})[vV]?$" 
          title="Must be 10 or 12 digits, optionally followed by 'v' or 'V'." 
          class="input-style">
      </div>
    </div>
  `;
}

// Toggle ID visibility based on age (18+)
window.toggleIdField = function(index) {
    const ageInput = document.getElementById(`age-${index}`);
    const idGroup = document.getElementById(`id-group-${index}`);
    const age = parseInt(ageInput.value, 10);

    if (age >= 18) {
        idGroup.classList.remove('hidden');
    } else {
        idGroup.classList.add('hidden');
        document.getElementById(`id-${index}`).value = ''; // Clear if hidden
    }
    checkFormValidity();
};

// Add a new family member block
window.addMember = function() {
    const index = ++memberIndex;
    familyMembersWrapper.insertAdjacentHTML('beforeend', createMemberBlock(index));
    memberCount++;
    checkFormValidity();
};

// Remove a family member block
window.removeMember = function(index) {
    const block = document.getElementById(`member-${index}`);
    if (block) {
        block.remove();
        memberCount--;
        checkFormValidity();
    }
};

// =================================================================
// Collects data and formats it as a simple string
// =================================================================
function collectAndStoreFamilyData() {
    const members = [];

    document.querySelectorAll('.member-block').forEach(block => {
        const index = block.dataset.index;
        const name = document.getElementById(`name-${index}`).value.trim();
        const age = document.getElementById(`age-${index}`).value.trim();
        const idInput = document.getElementById(`id-${index}`);
        const id = idInput ? idInput.value.trim() : '';

        if (name && age) {
            let memberString = `${name} (${age})`;
            if (idInput && !idInput.classList.contains('hidden') && id) {
                if (idInput.checkValidity()) {
                    memberString += ` [${id}]`;
                }
            }
            members.push(memberString);
        }
    });

    const finalDataString = members.join(', ');
    document.getElementById('family_members_data').value = finalDataString;
    return finalDataString;
}

// === Map Functions ===
function initializeMap(latitude, longitude) {
    const center = [latitude || 20.5937, longitude || 78.9629]; // Center of India

    if (!isMapInitialized) {
        map = L.map('map').setView(center, 5);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
        }).addTo(map);

        marker = L.marker(center, { draggable: true }).addTo(map);

        marker.on('dragend', function(e) {
            const coords = e.target.getLatLng();
            updateMapMessage(`Latitude: ${coords.lat.toFixed(4)}, Longitude: ${coords.lng.toFixed(4)}`);
        });

        map.on('click', function(e) {
            marker.setLatLng(e.latlng);
            updateMapMessage(`Latitude: ${e.latlng.lat.toFixed(4)}, Longitude: ${e.latlng.lng.toFixed(4)}`);
        });

        isMapInitialized = true;
    } else {
        map.setView(center, 13);
        marker.setLatLng(center);
    }
    updateMapMessage("Drag the marker or click on the map to select a location.");
}

function updateMapMessage(msg, isError = false) {
    const mapMessage = document.getElementById('mapMessage');
    mapMessage.textContent = msg;
    mapMessage.className = isError ? 'text-sm text-red-600' : 'text-sm text-gray-700';
}

function getLiveLocation() {
    updateMapMessage("Finding your location...", false);
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                map.setView([latitude, longitude], 15);
                marker.setLatLng([latitude, longitude]);
                updateMapMessage(`Live location found! Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`);
            },
            (error) => {
                let msg = "Geolocation error: ";
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        msg += "Permission denied. Please allow location access.";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        msg += "Location information is unavailable.";
                        break;
                    case error.TIMEOUT:
                        msg += "The request to get user location timed out.";
                        break;
                    default:
                        msg += "An unknown error occurred.";
                }
                console.error("Geolocation error:", msg, error);
                updateMapMessage(msg, true);
            }, { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    } else {
        updateMapMessage("Geolocation is not supported by this browser.", true);
    }
}

// === Validation & Submission ===
function checkFormValidity() {
    let isValid = form.checkValidity();
    let errorMessage = '';

    if (!latInput.value || !lonInput.value) {
        isValid = false;
        errorMessage = 'Please confirm your location on the map before submitting.';
    } else if (memberCount === 0) {
        isValid = false;
        errorMessage = 'Please add at least one family member.';
    } else if (!form.checkValidity()) {
        const requiredElements = form.querySelectorAll('[required], input:not(.hidden):not([type="hidden"])');
        for (let i = 0; i < requiredElements.length; i++) {
            const element = requiredElements[i];
            if (!element.checkValidity()) {
                let label = element.dataset.label || element.id;
                errorMessage = `Please correct the required field: '${label}'.`;
                break;
            }
        }
    }

    validationMessage.textContent = errorMessage;
    submitBtn.disabled = !isValid;
}

// === Event Listeners ===
form.addEventListener('input', checkFormValidity);

// Open map modal
document.getElementById('openMapBtn').addEventListener('click', function() {
    const modal = document.getElementById('mapModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    const initialLat = parseFloat(latInput.value) || 20.5937;
    const initialLon = parseFloat(lonInput.value) || 78.9629;

    setTimeout(() => {
        initializeMap(initialLat, initialLon);
        map.invalidateSize();
    }, 100);
});

// Use live location
document.getElementById('liveLocationBtn').addEventListener('click', getLiveLocation);

// Confirm map location
document.getElementById('confirmLocationBtn').addEventListener('click', function() {
    if (marker) {
        const coords = marker.getLatLng();
        latInput.value = coords.lat.toFixed(6);
        lonInput.value = coords.lng.toFixed(6);
        document.getElementById('locationDisplay').textContent =
            `Location Status: Pinned (Lat: ${latInput.value}, Lon: ${lonInput.value})`;
        document.getElementById('mapModal').classList.add('hidden');
        document.getElementById('mapModal').classList.remove('flex');
        checkFormValidity();
    } else {
        updateMapMessage("Please select or find a location first.", true);
    }
});

// Add member button
document.getElementById('addMemberBtn').addEventListener('click', addMember);

// Form submission
form.addEventListener('submit', async function(e) {
    e.preventDefault();
    collectAndStoreFamilyData();

    if (!form.checkValidity() || submitBtn.disabled) {
        checkFormValidity();
        responseMessage.textContent = 'Please fix the errors above before submitting.';
        responseMessage.className = 'mt-4 text-center text-red-600 font-bold';
        return;
    }

    responseMessage.textContent = 'Submitting data... Please wait.';
    responseMessage.className = 'mt-4 text-center text-blue-600 font-bold';
    submitBtn.disabled = true;

    const formData = new FormData(form);
    const payload = {};
    formData.forEach((value, key) => payload[key] = value);

    payload['Timestamp'] = new Date().toLocaleString();
    payload['secretToken'] = SECRET_TOKEN;

    try {
        await fetch(FORM_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        responseMessage.textContent = 'Data submitted successfully! Thank you.';
        responseMessage.className = 'mt-4 text-center text-green-600 font-bold';
        form.reset();
        latInput.value = '';
        lonInput.value = '';
        memberCount = 0;
        familyMembersWrapper.innerHTML = '';
        document.getElementById('locationDisplay').textContent = 'Location Status: Not Pinned';
        checkFormValidity();
        addMember();
    } catch (error) {
        console.error('Submission error:', error);
        responseMessage.textContent = 'Error: Failed to submit data. Check console for details.';
        responseMessage.className = 'mt-4 text-center text-red-600 font-bold';
        submitBtn.disabled = false;
    }
});

// === Initialization ===
document.addEventListener('DOMContentLoaded', () => {
    addMember();
    checkFormValidity();
});
