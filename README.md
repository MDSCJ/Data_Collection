# Secure User Data Collection Form

This project is a secure, standalone website for collecting user data, which is then saved directly into a private Google Sheet.

It consists of a simple HTML/CSS/JS frontend and uses **Google Apps Script** as a secure backend, ensuring no private keys or credentials are exposed to the public.

## Features

* **Secure:** Form data is sent to a Google Apps Script web app, not directly to the sheet, protecting your credentials.
* **Simple:** No complex databases or servers needed. Everything is hosted for free by Google and on any static site host (like GitHub Pages).
* **Interactive Map:** Users can set their location by:
    * Clicking the map to drop a pin.
    * Dragging the pin.
    * Clicking "Get Live Location" to use their device's GPS.
* **Data Fields:**
    * ID
    * House Number
    * Family Members
    * Contact Number
    * Location (Latitude, Longitude)
    * Timestamp (auto-generated)

## Project Architecture

This project's security relies on separating the client (website) from the database (sheet).

1.  **Frontend (Client):** `index.html`
    * A user fills out the form in their browser.
    * When they click "Submit," the JavaScript uses the `fetch()` API to send the form data as a JSON object to a secret URL.
2.  **Backend (Server):** `Code.gs` (Google Apps Script)
    * The secret URL belongs to a deployed Google Apps Script web app.
    * The `doPost(e)` function in the script receives the JSON data.
    * It safely uses `SpreadsheetApp` (a trusted Google service) to open the private Google Sheet and append the new data as a row.
3.  **Database (Storage):** `Google Sheet`
    * The sheet is never shared publicly. It only gives permission to the Apps Script (which you own).

This architecture prevents data breaches, as the public-facing website has no "write" access to the Google Sheet.

## Setup Instructions

Follow these 3 steps to get your project running.

### 1. The Google Sheet

1.  Create a new Google Sheet.
2.  Name it whatever you like (e.g., "User Data").
3.  In the first tab (e.g., `Sheet1`), set up the following headers in the first row:
    * `A1`: `Timestamp`
    * `B1`: `ID`
    * `C1`: `HouseNumber`
    * `D1`: `Location`
    * `E1`: `FamilyMembers`
    * `F1`: `ContactNumber`

### 2. The Google Apps Script (Backend)

1.  In your Google Sheet, click **Extensions** > **Apps Script**.
2.  Name your script (e.g., "WebFormHandler").
3.  Delete all the code in `Code.gs` and paste the contents of this repository's `Code.gs` file.
4.  **Important:** If your sheet tab is not named `Sheet1`, update the `const sheetName = "Sheet1";` line in the script.
5.  Click the **Deploy** button (top right) and select **New deployment**.
6.  Click the **Gear Icon** (Select type) and choose **Web app**.
7.  In the "Who has access" dropdown, select **Anyone**.
    * *This is required for an anonymous web form to submit data. It is still secure because only people with the secret URL can access it.*
8.  Click **Deploy**.
9.  Google will ask you to **Authorize access**. Click it, choose your account, click "Advanced," and "Go to... (unsafe)". Allow the permissions.
10. After it's deployed, **Copy the Web app URL**.

### 3. The Website (Frontend)

1.  Open the `index.html` file in a text editor.
2.  Find this line near the top of the `<script>` tag:
    ```javascript
    const WEB_APP_URL = "PASTE_YOUR_WEB_APP_URL_HERE";
    ```
3.  **Paste your copied Web app URL** from Step 2 into the quotes.
4.  Save the file.

## How to Use

You can now open the `index.html` file in any web browser (or host it on a service like GitHub Pages or Netlify).

1.  Open the `index.html` file.
2.  Fill out the form fields.
3.  Set your location on the map.
4.  Click "Submit Data".
5.  Check your Google Sheet. The new data will appear at the bottom!
