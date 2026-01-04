// --- IMPORT FIREBASE LIBRARIES ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// --- 1. FIREBASE CONFIGURATION ---
// PASTE YOUR CONFIG OBJECT FROM FIREBASE CONSOLE HERE
const firebaseConfig = {
    apiKey: "AIzaSyA7dkJMtlN9Lbxa6bU8Qlf5ojWHoyAADcE",
  authDomain: "campus-navigation-d4e9a.firebaseapp.com",
  projectId: "campus-navigation-d4e9a",
  storageBucket: "campus-navigation-d4e9a.firebasestorage.app",
  messagingSenderId: "1032189115152",
  appId: "1:1032189115152:web:805a9a4ee48071bc564395",
  measurementId: "G-S5EFCENBJ1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- 2. GLOBAL VARIABLES ---
let map;
let directionsService;
let directionsRenderer;
let activeOverlay = null;
let navigationLine = null;
let animationInterval = null;
let isEditor = false;
// --- NEW GLOBALS FOR MANUAL NAVIGATION ---
let currentNavSteps = []; // Stores the list of steps (Ground -> Floor 1 -> Floor 2)
let currentStepIndex = 0; // Tracks which step we are on (0, 1, 2...)


// --- 3. CAMPUS DATA (Multi-Floor Support) ---
const campusData = {
    buildings: [
        // --- BUILDING 1: ENGINEERING (Example with 2 Floors) ---
        {
            id: "b1",
            name: "Engineering Block",
            lat: 37.7749, 
            lng: -122.4194,
            floors: {
                "1": { 
                    url: 'https://i.ibb.co/engineering_floor1.png', 
                    bounds: { north: 37.7755, south: 37.7745, east: -122.4185, west: -122.4200 }
                },
                "2": { 
                    url: 'https://i.ibb.co/engineering_floor2.png', 
                    bounds: { north: 37.7755, south: 37.7745, east: -122.4185, west: -122.4200 }
                }
            },
            rooms: [
                { id: "101", name: "101 - Lab", floor: "1", lat: 37.7748, lng: -122.4196 },
                { id: "201", name: "201 - Server Room", floor: "2", lat: 37.7748, lng: -122.4196 }
            ],
            paths: {
                "101": [ { lat: 37.7745, lng: -122.4194 }, { lat: 37.7748, lng: -122.4196 } ],
                "201": [ { lat: 37.7745, lng: -122.4194 }, { lat: 37.7748, lng: -122.4196 } ]
            }
        },

        // --- BUILDING 2: SCIENCE HALL (Example with 2 Floors) ---
        {
            id: "b2",
            name: "Science Hall",
            lat: 37.7760,
            lng: -122.4150,
            floors: {
                "1": { 
                    url: 'https://i.ibb.co/science_floor1.png', 
                    bounds: { north: 37.7765, south: 37.7755, east: -122.4140, west: -122.4160 }
                },
                "2": { 
                    url: 'https://i.ibb.co/science_floor2.png', 
                    bounds: { north: 37.7765, south: 37.7755, east: -122.4140, west: -122.4160 }
                }
            },
            rooms: [
                { id: "s101", name: "Bio Lab 1", floor: "1", lat: 37.7762, lng: -122.4155 },
                { id: "s201", name: "Chem Lab 2", floor: "2", lat: 37.7762, lng: -122.4155 }
            ],
            paths: {
                "s101": [ { lat: 37.7755, lng: -122.4150 }, { lat: 37.7762, lng: -122.4155 } ]
            }
        },

                // --- BUILDING 3: SS PG HOSTEL (Full G+3 Setup) ---
        {
            id: "b3",
            name: "SS PG Hostel", 
            lat: 17.086173, 
            lng: 82.052563, 
            
            // Floor Plan Images (You need 4 different images if layouts differ)
            floors: {
                "G": { 
                    url: 'https://i.ibb.co/hPNCHfW/Screenshot-2026-01-02-181854.png', 
                    bounds: { north: 17.086258, south: 17.086068, east: 82.052665, west: 82.052487 }
                },
                "1": { 
                    url: 'https://i.ibb.co/Q7BPrx1t/Screenshot-2026-01-02-181957.png', 
                    bounds: { north: 17.086258, south: 17.086068, east: 82.052665, west: 82.052487 }
                },
                "2": { 
                    url: 'https://i.ibb.co/Q7BPrx1t/Screenshot-2026-01-02-181957.png', 
                    bounds: { north: 17.086258, south: 17.086068, east: 82.052665, west: 82.052487 }
                },
                "3": { 
                    url: 'https://i.ibb.co/Q7BPrx1t/Screenshot-2026-01-02-181957.png', 
                    bounds: { north: 17.086258, south: 17.086068, east: 82.052665, west: 82.052487 }
                }
            },

            // ALL ROOMS (G+3)
            rooms: [
                // --- GROUND FLOOR ---
                { id: "h_g01", name: "G01 - Shop", floor: "G", lat: 17.086076, lng: 82.052570 },
                { id: "h_g02", name: "G02 - Store Room",    floor: "G", lat: 17.086070, lng: 82.052530 },
                { id: "h_g03", name: "G03 - Store Room",  floor: "G", lat: 17.086160, lng: 82.052530 },
                { id: "h_g04", name: "G04 - Workers Room",  floor: "G", lat: 17.086220, lng: 82.052530 },
                { id: "h_g05", name: "G05 - Guest Room",   floor: "G", lat: 17.086210, lng: 82.052570 },

                // --- 1ST FLOOR ---
                { id: "h_101", name: "101 - Student Room", floor: "1", lat: 17.086076, lng: 82.052600 },
                { id: "h_102", name: "102 - Student Room", floor: "1", lat: 17.086076, lng: 82.052570 },
                { id: "h_103", name: "103 - Student Room", floor: "1", lat: 17.086070, lng: 82.052530 },
                { id: "h_104", name: "104 - Student Room", floor: "1", lat: 17.086160, lng: 82.052530 },
                { id: "h_105", name: "105 - Student Room", floor: "1", lat: 17.086220, lng: 82.052530 },
                { id: "h_106", name: "106 - Student Room", floor: "1", lat: 17.086210, lng: 82.052570 },
                // --- 2ND FLOOR ---
                { id: "h_201", name: "201 - Student Room", floor: "2", lat: 17.086076, lng: 82.052600 },
                { id: "h_202", name: "202 - Student Room", floor: "2", lat: 17.086076, lng: 82.052570 },
                { id: "h_203", name: "203 - Student Room", floor: "2", lat: 17.086070, lng: 82.052530 },
                { id: "h_204", name: "204 - Student Room", floor: "2", lat: 17.086160, lng: 82.052530 },
                { id: "h_205", name: "205 - Student Room", floor: "2", lat: 17.086220, lng: 82.052530 },
                { id: "h_206", name: "206 - Student Room", floor: "2", lat: 17.086210, lng: 82.052570 },
                // --- 3RD FLOOR ---
                { id: "h_301", name: "301 - Student Room", floor: "3", lat: 17.086076, lng: 82.052600 },
                { id: "h_302", name: "302 - Student Room", floor: "3", lat: 17.086076, lng: 82.052570 },
                { id: "h_303", name: "303 - Student Room", floor: "3", lat: 17.086070, lng: 82.052530 },
                { id: "h_304", name: "304 - Student Room", floor: "3", lat: 17.086160, lng: 82.052530 },
                { id: "h_305", name: "305 - Student Room", floor: "3", lat: 17.086220, lng: 82.052530 },
                { id: "h_306", name: "306 - Student Room", floor: "3", lat: 17.086210, lng: 82.052570 }
            ],

            // PATHS FOR NAVIGATION
            // Note: Update these coordinates using the Picker Tool!
            paths: {
                // Ground floor just needs Entrance -> Door
                "h_g01": [ { lat: 17.086100, lng: 82.052658 }, { lat: 17.086076, lng: 82.052570 } ],
                "h_g02": [ { lat: 17.086100, lng: 82.052658 }, { lat: 17.086070, lng: 82.052530 } ],
                "h_g03": [ { lat: 17.086100, lng: 82.052658 }, { lat: 17.086160, lng: 82.052530 } ],
                "h_g04": [ { lat: 17.086100, lng: 82.052658 }, { lat: 17.086220, lng: 82.052530 } ],
                "h_g05": [ { lat: 17.086100, lng: 82.052658 }, { lat: 17.086210, lng: 82.052570 } ],
                
                // Upper floors need Entrance -> Stairs -> Door
                // (Using placeholder Stair coords: 17.086150, 82.052550)
                "h_101": [ { lat: 17.086100, lng: 82.052658 }, { lat: 17.086091, lng: 82.052644 }, { lat: 17.086076, lng: 82.052600 } ],
                "h_201": [ { lat: 17.086100, lng: 82.052658 }, { lat: 17.086091, lng: 82.052644 }, { lat: 17.086076, lng: 82.052600 } ],
                "h_301": [ { lat: 17.086100, lng: 82.052658 }, { lat: 17.086091, lng: 82.052644 }, { lat: 17.086076, lng: 82.052600 } ],
                "h_102": [ { lat: 17.086100, lng: 82.052658 }, { lat: 17.086091, lng: 82.052644 }, { lat: 17.086076, lng: 82.052570 } ],
                "h_202": [ { lat: 17.086100, lng: 82.052658 }, { lat: 17.086091, lng: 82.052644 }, { lat: 17.086076, lng: 82.052570 } ],
                "h_302": [ { lat: 17.086100, lng: 82.052658 }, { lat: 17.086091, lng: 82.052644 }, { lat: 17.086076, lng: 82.052570 } ],
                "h_103": [ { lat: 17.086100, lng: 82.052658 }, { lat: 17.086091, lng: 82.052644 }, { lat: 17.086070, lng: 82.052530 } ],
                "h_203": [ { lat: 17.086100, lng: 82.052658 }, { lat: 17.086091, lng: 82.052644 }, { lat: 17.086070, lng: 82.052530 } ],
                "h_303": [ { lat: 17.086100, lng: 82.052658 }, { lat: 17.086091, lng: 82.052644 }, { lat: 17.086070, lng: 82.052530 } ],
                "h_104": [ { lat: 17.086100, lng: 82.052658 }, { lat: 17.086091, lng: 82.052644 }, { lat: 17.086160, lng: 82.052530 } ],
                "h_204": [ { lat: 17.086100, lng: 82.052658 }, { lat: 17.086091, lng: 82.052644 }, { lat: 17.086160, lng: 82.052530 } ],
                "h_304": [ { lat: 17.086100, lng: 82.052658 }, { lat: 17.086091, lng: 82.052644 }, { lat: 17.086160, lng: 82.052530 } ],
                "h_105": [ { lat: 17.086100, lng: 82.052658 }, { lat: 17.086091, lng: 82.052644 }, { lat: 17.086220, lng: 82.052530 } ],
                "h_205": [ { lat: 17.086100, lng: 82.052658 }, { lat: 17.086091, lng: 82.052644 }, { lat: 17.086220, lng: 82.052530 } ],
                "h_305": [ { lat: 17.086100, lng: 82.052658 }, { lat: 17.086091, lng: 82.052644 }, { lat: 17.086220, lng: 82.052530 } ],
                "h_106": [ { lat: 17.086100, lng: 82.052658 }, { lat: 17.086091, lng: 82.052644 }, { lat: 17.086210, lng: 82.052570 } ],
                "h_206": [ { lat: 17.086100, lng: 82.052658 }, { lat: 17.086091, lng: 82.052644 }, { lat: 17.086210, lng: 82.052570 } ],
                "h_306": [ { lat: 17.086100, lng: 82.052658 }, { lat: 17.086091, lng: 82.052644 }, { lat: 17.086210, lng: 82.052570 } ]
                // You must add paths for the other rooms (h_102, h_103 etc.) manually
            }
        }

    ]
};

// --- 4. MAP INITIALIZATION ---

// We define a normal function instead of window.initMap
function initApp() {
    // Check if Google Maps is actually loaded yet
    if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
        // If not loaded, wait 100 milliseconds and try again
        console.log("Waiting for Google Maps...");
        setTimeout(initApp, 100);
        return;
    }

    // Google Maps is ready! Load the map now.
    console.log("Google Maps loaded. Starting app...");
    
    const campusCenter = { lat: 37.7752, lng: -122.4175 };
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 16, 
        center: campusCenter, 
        mapTypeId: 'roadmap',
        styles: [{ "featureType": "poi", "stylers": [{ "visibility": "off" }] }]
    });

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({ map: map, suppressMarkers: true });

    loadBuildings();
    populateBuildingsDropdown();
    listenForEvents(); // Connect to Firebase
}

// Start the waiting process immediately
initApp();

    

function loadBuildings() {
    campusData.buildings.forEach(building => {
        new google.maps.Marker({
            position: { lat: building.lat, lng: building.lng },
            map: map, title: building.name
        });
    });
}

// --- 5. FIREBASE EVENT LOGIC (With Auto-Remove) ---

// Read Events (Real-time listener)
function listenForEvents() {
    // We order by date so upcoming events show first
    const q = query(collection(db, "events"), orderBy("date", "asc"));

    // onSnapshot runs every time the database changes
    onSnapshot(q, (querySnapshot) => {
        const list = document.getElementById('event-list');
        list.innerHTML = ""; // Clear list

        // 1. Get Today's Date (at midnight)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let hasUpcomingEvents = false; // Tracker to see if list is empty

        querySnapshot.forEach((doc) => {
            const event = doc.data();

            // 2. CHECK DATE
            // Convert the stored string (YYYY-MM-DD) to a Date object
            const eventDate = new Date(event.date);
            // Set time to midnight to compare dates accurately
            eventDate.setHours(0, 0, 0, 0);

            // ❌ IF PAST: Skip this event (don't create the list item)
            if (eventDate < today) {
                return; 
            }

            // ✅ IF FUTURE/TODAY: Show the event
            hasUpcomingEvents = true;

            const item = document.createElement('li');
            item.className = 'event-card'; // Ensure you have CSS for this
            
            // Safe check for room name (in case it's missing)
            const locationName = event.roomName || "Unknown Room";
            
            item.innerHTML = `
                <strong>${event.title}</strong><br>
                <small>${event.date} @ ${event.time}</small><br>
                <small style="color: #666;">📍 ${locationName}</small>
            `;

            item.onclick = () => {
                // Trigger your navigation
                startNavigation(event.roomId, event.buildId);
                
                // Optional: Auto-switch floor if specific to this building
                const building = campusData.buildings.find(b => b.id === event.buildId);
                if(building) showFloorPlan(building, event.floor || "G"); 
            };

            list.appendChild(item);
        });

        // 3. Handle Empty State
        if (!hasUpcomingEvents) {
            list.innerHTML = "<li style='padding:10px; text-align:center;'>No upcoming events.</li>";
        }
    });
}


// Add Event (Write to Firestore)
async function addNewEvent() {
    const title = document.getElementById('new-event-title').value;
    const date = document.getElementById('new-event-date').value;
    const buildId = document.getElementById('building-select').value; // Get building from main dropdown for context
    const roomId = document.getElementById('new-event-room').value;

    if (title && date && roomId && buildId) {
        try {
            await addDoc(collection(db, "events"), {
                title: title,
                date: date,
                roomId: roomId,
                buildId: buildId
            });
            alert("Event saved to cloud successfully!");
            document.getElementById('new-event-title').value = "";
        } catch (e) {
            console.error("Error adding document: ", e);
            alert("Error saving event: " + e.message);
        }
    } else {
        alert("Please select a building in the main panel, then a room and event details.");
    }
}

// --- 6. UI INTERACTION HANDLERS ---
// We attach these to window or addEventListeners because modules have their own scope

document.getElementById('building-select').addEventListener('change', populateRooms);
document.getElementById('nav-start-btn').addEventListener('click', () => startNavigation());
document.getElementById('editor-login-btn').addEventListener('click', toggleEditorMode);
document.getElementById('add-event-btn').addEventListener('click', addNewEvent);

function populateBuildingsDropdown() {
    const selector = document.getElementById('building-select');
    campusData.buildings.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b.id;
        opt.innerText = b.name;
        selector.appendChild(opt);
    });
}

function populateRooms() {
    const buildId = document.getElementById('building-select').value;
    const roomSelector = document.getElementById('room-select');
    const editorSelector = document.getElementById('new-event-room');
    const floorDiv = document.getElementById('floor-selector');
    const floorBtnContainer = document.getElementById('floor-buttons-container');

    // Reset UI
    roomSelector.innerHTML = '<option value="">Select Room</option>';
    editorSelector.innerHTML = '<option value="">Select Room</option>';
    roomSelector.disabled = true;
    floorDiv.style.display = "none";
    floorBtnContainer.innerHTML = "";

    if (!buildId) return;

    const building = campusData.buildings.find(b => b.id === buildId);
    if (building) {
        roomSelector.disabled = false;
        
        // 1. Populate Rooms
        building.rooms.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r.id;
            opt.innerText = r.name;
            roomSelector.appendChild(opt);
            
            const opt2 = opt.cloneNode(true);
            editorSelector.appendChild(opt2);
        });

        // 2. Generate Floor Buttons (If building has floors)
        if (building.floors) {
            floorDiv.style.display = "block";
            Object.keys(building.floors).forEach(floorLevel => {
                const btn = document.createElement("button");
                btn.innerText = "Level " + floorLevel;
                btn.style.marginRight = "5px";
                btn.onclick = () => showFloorPlan(building, floorLevel);
                floorBtnContainer.appendChild(btn);
            });
            // Show Level 1 by default
            showFloorPlan(building, "1");
        }
    }
}


function showFloorPlan(building, floorLevel) {
    // Remove existing overlay
    if (activeOverlay) activeOverlay.setMap(null);

    // Check if this building has data for this floor
    if (building.floors && building.floors[floorLevel]) {
        const floorData = building.floors[floorLevel];
        
        activeOverlay = new google.maps.GroundOverlay(
            floorData.url,
            floorData.bounds
        );
        activeOverlay.setMap(map);
        map.fitBounds(floorData.bounds);
        
        console.log(`Switched to Floor ${floorLevel}`);
    }
}


// --- FINAL NAVIGATION FUNCTION (GPS + Smart Animation) ---
function startNavigation(targetRoomId = null, targetBuildId = null) {
    // 1. Reset UI & Variables
    if(animationInterval) clearInterval(animationInterval);
    if(navigationLine) navigationLine.setMap(null);

    const buildId = targetBuildId || document.getElementById('building-select').value;
    const roomId = targetRoomId || document.getElementById('room-select').value;

    if (!buildId || !roomId) { alert("Please select a building and room."); return; }

    const building = campusData.buildings.find(b => b.id === buildId);
    const room = building.rooms.find(r => r.id === roomId);
    
    // Get the indoor path data you mapped
    const rawPath = building.paths[roomId]; 

    // Instructions while finding GPS
    document.getElementById("instructions").innerText = "Locating you...";
    document.getElementById("instructions").style.backgroundColor = "#fff";

    // 2. GET USER LOCATION (GPS)
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                // Success! We have coordinates.
                const userLocation = { 
                    lat: position.coords.latitude, 
                    lng: position.coords.longitude 
                };
                
                // Proceed to calculate the full route
                handleRouteCalculation(userLocation, building, room, rawPath);
            },
            (error) => {
                // Error (User denied or GPS failed)
                console.warn("GPS Error:", error);
                alert("Location access denied or failed. Starting from Main Gate.");
                
                // Fallback Location (Update these to your Campus Main Gate!)
                const defaultLocation = { lat: 17.086000, lng: 82.052000 }; 
                handleRouteCalculation(defaultLocation, building, room, rawPath);
            },
            { enableHighAccuracy: true } // Request precise GPS
        );
    } else {
        // Browser doesn't support GPS
        alert("GPS not supported. Using default location.");
        const defaultLocation = { lat: 17.086000, lng: 82.052000 }; 
        handleRouteCalculation(defaultLocation, building, room, rawPath);
    }
}

// --- HELPER: COORDINATES LOGIC ---
function handleRouteCalculation(origin, building, room, rawPath) {
    // If we have indoor path data, the "Entrance" is the first point
    // If no path data, we just route to the room itself
    const destination = (rawPath && rawPath.length > 0) ? rawPath[0] : { lat: room.lat, lng: room.lng };

    // A. OUTDOOR ROUTE (Google Directions API)
    const request = {
        origin: origin,
        destination: destination, // Navigate to the Building Entrance
        travelMode: 'WALKING'
    };

    directionsService.route(request, function(result, status) {
        if (status == 'OK') {
            directionsRenderer.setDirections(result); // Draw Blue Line (Outdoor)
        } else {
            console.error("Outdoor directions failed: " + status);
        }
    });

    // B. INDOOR ROUTE (Trigger the Smart Animation)
    // This runs immediately so the user sees the indoor logic too
    startIndoorAnimation(building, room, rawPath);
}

// --- ADVANCED HELPER: GENERATE FLOOR-BY-FLOOR STEPS ---
function startIndoorAnimation(building, room, rawPath) {
    const isUpperFloor = (room.floor !== "G" && room.floor !== "0");
    const controlsDiv = document.getElementById("nav-controls");

    // CASE 1: MULTI-FLOOR NAVIGATION
    if (isUpperFloor && rawPath && rawPath.length >= 3) {
        const entrance = rawPath[0];
        const stairs = rawPath[1]; // Stair location (Ground)
        const door = rawPath[2];
        const targetFloor = parseInt(room.floor); // Convert "3" to number 3

        currentNavSteps = [];

        // STEP A: Ground Floor (Entrance -> Stairs)
        currentNavSteps.push({
            buildId: building.id,
            floor: "G",
            message: "Enter Building, Walk to Stairs",
            points: [entrance, stairs]
        });

        // STEP B: Intermediate Floors (Loop from 1 up to Target - 1)
        // Example: If going to Floor 3, this adds steps for Floor 1 and Floor 2
        for (let i = 1; i < targetFloor; i++) {
            currentNavSteps.push({
                buildId: building.id,
                floor: i.toString(), // "1", "2", etc.
                message: `Climb Stairs to Level ${i} ... Keep Climbing`,
                points: [stairs, stairs] // Just show a dot at the stairs
            });
        }

        // STEP C: Target Floor (Stairs -> Room)
        currentNavSteps.push({
            buildId: building.id,
            floor: room.floor,
            message: `Arrived at Level ${room.floor}. Exit Stairs & Go to Room.`,
            points: [stairs, door]
        });

        // Initialize Manual Controls
        currentStepIndex = 0;
        controlsDiv.style.display = "block"; 
        showStep(0); // Start at Ground

    } else {
        // CASE 2: SIMPLE NAVIGATION
        if (room.floor) showFloorPlan(building, room.floor);
        drawIndoorPath(rawPath || [room]);
        
        document.getElementById("instructions").innerText = `Walk to ${room.name}`;
        document.getElementById("instructions").style.backgroundColor = "#fff";
        controlsDiv.style.display = "none"; 
    }
}



// Helper function to draw the lines
function calculateRoute(origin, building, room, roomId) {
    const indoorPath = building.paths[roomId] || [room];
    const buildingEntrance = indoorPath[0];

    // Outdoor Path (Google Directions)
    const request = {
        origin: origin,
        destination: buildingEntrance,
        travelMode: 'WALKING'
    };

    directionsService.route(request, function(result, status) {
        if (status == 'OK') {
            directionsRenderer.setDirections(result);
            drawIndoorPath(indoorPath);
        } else {
            console.error("Outdoor route failed: " + status);
            // Even if outdoor fails, draw indoor path
            drawIndoorPath(indoorPath);
        }
    });

    document.getElementById("instructions").innerText = `Navigating to ${room.name}...`;
}


function drawIndoorPath(pathCoords) {
    // Safety clear just in case
    if (navigationLine) navigationLine.setMap(null);

    const lineSymbol = {
        path: 'M 0,-1 0,1',
        strokeOpacity: 1,
        scale: 4
    };

    // ASSIGN TO GLOBAL VARIABLE
    navigationLine = new google.maps.Polyline({
        path: pathCoords,
        strokeColor: '#FF0000',
        strokeOpacity: 0,
        icons: [{
            icon: lineSymbol,
            offset: '0',
            repeat: '20px'
        }],
        map: map
    });

    animatePolyline();
}


function animatePolyline() {
    let count = 0;
    animationInterval = setInterval(function() {
        count = (count + 1) % 200;
        const icons = navigationLine.get('icons');
        icons[0].offset = (count / 2) + '%';
        navigationLine.set('icons', icons);
    }, 20);
}

function toggleEditorMode() {
    if (!isEditor) {
        const pass = prompt("Enter Editor Password:");
        if (pass === "admin123") {
            isEditor = true;
            document.getElementById('editor-panel').classList.remove('hidden');
            document.getElementById('editor-login-btn').innerText = "Logout";
        } else {
            alert("Wrong password.");
        }
    } else {
        isEditor = false;
        document.getElementById('editor-panel').classList.add('hidden');
        document.getElementById('editor-login-btn').innerText = "Editor Login";
    }
}
// --- ANIMATION PLAYER FUNCTION (Paste this at the bottom of script.js) ---
function playMultiFloorAnimation(building, segments, index) {
    // 1. Check if animation is finished
    if (index >= segments.length) {
        document.getElementById("instructions").innerText = "You have arrived!";
        document.getElementById("instructions").style.backgroundColor = "#fff";
        return; 
    }

    const segment = segments[index];

    // 2. Switch Floor Image
    showFloorPlan(building, segment.floor);
    
    // 3. Update Instructions (Yellow Highlight)
    const instrDiv = document.getElementById("instructions");
    instrDiv.innerText = `STEP ${index + 1}: ${segment.message}`;
    instrDiv.style.backgroundColor = "#ffeb3b"; 
    
    // 4. Draw the line for this segment
    drawIndoorPath(segment.points);

    // 5. Wait 4 seconds, then play next step
    animationInterval = setTimeout(() => {
        playMultiFloorAnimation(building, segments, index + 1);
    }, 4000); // 4 seconds delay to let user see the path
}
// --- GLOBAL NAVIGATION CONTROLS (Replace your old Next/Prev functions with this) ---

// 1. Attach functions to 'window' so HTML buttons can click them
window.nextStep = function() {
    if (currentStepIndex < currentNavSteps.length - 1) {
        currentStepIndex++;
        window.showStep(currentStepIndex);
    } else {
        alert("You have arrived at the destination!");
    }
}

window.prevStep = function() {
    if (currentStepIndex > 0) {
        currentStepIndex--;
        window.showStep(currentStepIndex);
    }
}

window.showStep = function(index) {
    if (!currentNavSteps[index]) return;

    const segment = currentNavSteps[index];

    // 1. CLEAR OLD LINE (Crucial Fix)
    if (navigationLine) {
        navigationLine.setMap(null); // Remove previous line from map
    }
    // Also clear any running animation loops if you have them
    if (typeof animationInterval !== 'undefined') {
        clearInterval(animationInterval); 
    }

    // 2. Find Building & Switch Floor
    const building = campusData.buildings.find(b => b.id === segment.buildId);
    showFloorPlan(building, segment.floor);

    // 3. Draw New Path
    drawIndoorPath(segment.points);

    // 4. Update UI
    const instrDiv = document.getElementById("instructions");
    instrDiv.innerText = `STEP ${index + 1}: ${segment.message}`;
    instrDiv.style.backgroundColor = "#ffeb3b"; 

    const counter = document.getElementById("step-counter");
    if(counter) counter.innerText = `${index + 1} / ${currentNavSteps.length}`;
}

