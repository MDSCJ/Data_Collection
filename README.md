# Secure User Data Collection Form (Developer README)

This repository contains the code for a secure, serverless web form that captures user data and saves it to a Google Sheet. It uses a clean separation of frontend (HTML/JS) and backend (Google Apps Script) to ensure no private credentials are ever exposed on the client side.

This document explains *how the code works* to help new contributors.

## Project Philosophy

The primary goal is **security**. We **never** put Google Sheet API keys or credentials in the `index.html` file. All database "write" operations are handled by a trusted, server-side Google Apps Script, which is called via a secret Web App URL.

## How it Works: The Data Flow

1.  **User:** Fills out the HTML form in `index.html`.
2.  **Frontend (JS):** On submit, the JavaScript:
    * Prevents the default form submission.
    * Serializes the form fields into a JSON object.
    * Uses the `fetch()` API to send this JSON object via a `POST` request to a specific, secret **Google Apps Script Web App URL**.
3.  **Backend (Google Apps Script):**
    * The `doPost(e)` function in `Code.gs` is triggered by the `POST` request.
    * It parses the incoming JSON data from the request's body (`e.postData.contents`).
    * It opens the private Google Sheet (which it has permission to do).
    * It appends a new row to the sheet, populating it with the parsed data and a new timestamp.
    * It returns a JSON response (`{"result": "success"}`) back to the frontend.
4.  **Frontend (JS):**
    * The `fetch()` call receives the JSON response.
    * It then shows a success or error message to the user.

---

## Code Deep Dive

### 1. Frontend (`index.html`)

The frontend is a single HTML file with three key JavaScript components:

#### A. Map Initialization (Leaflet.js)
This section sets up the interactive map.
* `L.map('map').setView(...)`: Initializes the map inside the `<div id="map">`.
* `L.tileLayer(...)`: Loads the map tiles from OpenStreetMap.
* `let marker = L.marker(...)`: Creates a single, draggable marker.
* **Event Listeners:**
    * `map.on('click', ...)`: When the user clicks the map, it moves the marker to the click location.
    * `marker.on('dragend', ...)`: When the user finishes dragging the marker, it triggers the update function.
* **Data Sync:**
    * `updateLocationInput(latLng)`: This is a helper function that takes a latitude/longitude object and updates the value of the `<input type="hidden" id="location">` field. This hidden field is what actually gets submitted with the form.

#### B. Live Location Button
This code handles the "Get Live Location" button.
* `document.getElementById('getLocationBtn').addEventListener('click', ...)`: Listens for a click.
* `navigator.geolocation.getCurrentPosition(...)`: This is the standard browser **Geolocation API**.
* On success, it gets the `position.coords` and uses `map.setView()` to zoom to that spot and `marker.setLatLng()` to move the pin, finally calling `updateLocationInput()` to save the coordinates.

#### C. Form Submission (`fetch()`)
This is the most critical part of the frontend logic.
* `form.addEventListener('submit', ...)`: Captures the "submit" event.
* `e.preventDefault()`: Stops the browser from its default behavior (which would be to reload the page).
* `new FormData(form)`: This object easily grabs all the current values from the form fields.
* `data[key] = value`: We loop over the `FormData` to build a simple JavaScript object (`{id: "123", houseNumber: "456", ...}`).
* `fetch(WEB_APP_URL, ...)`: This is the asynchronous network request.
    * `method: 'POST'`: Specifies that we are *sending* data.
    * `mode: 'cors'`: Required for making requests to a different domain (your HTML file to `script.google.com`).
    * `body: JSON.stringify(data)`: This is where we convert our JavaScript object into a JSON string, which is the format the backend expects.
* `.then(...)` / `.catch(...)`: These blocks handle the response from the server, updating the `<div id="status">` to show a success or error message to the user.

---

### 2. Backend (`Code.gs`)

This is a Google Apps Script file, which is essentially server-side JavaScript hosted by Google.

* `const sheet = ...`: Gets the specific tab (e.g., "Sheet1") from the currently active spreadsheet.
* `function doPost(e)`: This is the **main entry point**. Google Apps Script *requires* this function name (`doPost`) to handle `POST` requests. The `e` (event) parameter contains all the request data.
* `const data = JSON.parse(e.postData.contents)`: This line reads the JSON string sent by `fetch()` and parses it back into a JavaScript object (`data.id`, `data.houseNumber`, etc.).
* `sheet.appendRow([...])`: This is the database command. It adds a new row to the *end* of the Google Sheet. The order of items in the array `[]` **must** match the column order in your sheet (e.g., Timestamp, ID, HouseNumber...).
* `ContentService.createTextOutput(...)`: This is how we send a response back to the frontend.
    * We `JSON.stringify` a success message.
    * `.setMimeType(ContentService.MimeType.JSON)` tells the browser that we are sending JSON, so the `fetch()` call knows how to parse it.
* `try...catch(error)`: This is for error handling. If `appendRow` or `JSON.parse` fails, it catches the error and sends a `{"result": "error"}` message back to the frontend, which will then display it to the user.

---
