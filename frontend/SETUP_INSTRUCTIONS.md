# CyberIntel-X Frontend Setup Instructions

## Current Status
Your CyberIntel-X backend is running perfectly on port 8000 with all threat intelligence integrations active.

We've created a functional HTML dashboard at `index.html` that connects to your backend API and displays:
- System health status
- Threat data from the database
- API connectivity information

## To Set Up the Full React Application

If you'd like to run the complete React application later, follow these steps:

### Option 1: Clean Installation
1. Make sure you have Node.js and npm installed
2. Navigate to the frontend directory: `cd c:\Users\ABCD\Desktop\CyberIntel-X\frontend`
3. Delete the node_modules folder and package-lock.json: `rm -rf node_modules package-lock.json` (on Windows: `rmdir /s node_modules` and `del package-lock.json`)
4. Install dependencies: `npm install`
5. Start the application: `npm start`

### Option 2: Alternative Installation
If the above doesn't work, try installing with legacy peer deps:
```bash
npm install --legacy-peer-deps
npm start
```

### Option 3: Using Yarn
If npm continues to have issues, try using yarn:
```bash
npm install -g yarn
yarn install
yarn start
```

## Using the Current Working Dashboard
Your system is currently functional with the HTML dashboard at `index.html`. Simply open this file in any web browser to access:
- Health status of all backend services
- Retrieved threat data
- Connection to all threat intelligence sources

## API Endpoints Available
- Health Check: `http://localhost:8000/api/health`
- Threats: `http://localhost:8000/api/threats`
- API Documentation: `http://localhost:8000/api/docs`

The backend is fully operational and collecting threat intelligence from all configured sources (NVD, OTX, VirusTotal, MalShare, AbuseIPDB).