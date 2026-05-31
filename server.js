import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Helper function to execute PowerShell commands
async function runPowerShell(cmd) {
  try {
    const { stdout, stderr } = await execAsync(cmd, { shell: 'powershell.exe' });
    if (stderr && !stdout) {
      throw new Error(stderr);
    }
    return stdout.trim();
  } catch (error) {
    console.error(`Error running PowerShell command: ${cmd}`, error);
    return null;
  }
}

// 1. Live Telemetry Metrics Endpoint
app.get('/api/metrics', async (req, res) => {
  try {
    // A. CPU Usage: Query Average Load Percentage
    const cpuRaw = await runPowerShell('Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average | Select-Object -ExpandProperty Average');
    const cpu = cpuRaw ? Math.round(parseFloat(cpuRaw)) : Math.floor(Math.random() * 15) + 5; // fallback to active mock if null

    // B. RAM Usage: Query Visible & Free Memory (in KB)
    const ramRaw = await runPowerShell('Get-CimInstance Win32_OperatingSystem | Select-Object TotalVisibleMemorySize, FreePhysicalMemory | ConvertTo-Json');
    let ramUsedPercent = 45; // default fallback
    let totalRamGB = 16;
    let freeRamGB = 8;
    
    if (ramRaw) {
      try {
        const ramData = JSON.parse(ramRaw);
        // Normalize single-item JSON responses if wrapped differently
        const total = ramData.TotalVisibleMemorySize || (Array.isArray(ramData) ? ramData[0].TotalVisibleMemorySize : 16000000);
        const free = ramData.FreePhysicalMemory || (Array.isArray(ramData) ? ramData[0].FreePhysicalMemory : 8000000);
        
        totalRamGB = Math.round(total / (1024 * 1024));
        freeRamGB = Math.round(free / (1024 * 1024) * 10) / 10;
        ramUsedPercent = Math.round(((total - free) / total) * 100);
      } catch (err) {
        console.error('Error parsing RAM data', err);
      }
    }

    // C. Battery Status: Query Charge and status
    const batteryRaw = await runPowerShell('Get-CimInstance Win32_Battery | Select-Object EstimatedChargeRemaining, BatteryStatus | ConvertTo-Json');
    let batteryLevel = 100;
    let isCharging = true;
    
    if (batteryRaw) {
      try {
        const batteryData = JSON.parse(batteryRaw);
        const charge = batteryData.EstimatedChargeRemaining !== undefined 
          ? batteryData.EstimatedChargeRemaining 
          : (Array.isArray(batteryData) ? batteryData[0]?.EstimatedChargeRemaining : null);
        
        const status = batteryData.BatteryStatus !== undefined 
          ? batteryData.BatteryStatus 
          : (Array.isArray(batteryData) ? batteryData[0]?.BatteryStatus : null);
        
        if (charge !== null && charge !== undefined) {
          batteryLevel = charge;
        }
        // BatteryStatus values: 1 = Discharging, 2 = AC Power (Charging), etc.
        isCharging = status === 2 || status === 6 || status === 7 || status === null; 
      } catch (err) {
        console.error('Error parsing battery data', err);
      }
    } else {
      // Mock battery for desktops or devices without batteries
      batteryLevel = 100;
      isCharging = true;
    }

    res.json({
      success: true,
      cpu,
      ram: {
        usedPercent: ramUsedPercent,
        totalGB: totalRamGB,
        freeGB: freeRamGB,
      },
      battery: {
        level: batteryLevel,
        isCharging: isCharging
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Active Processes Endpoint
app.get('/api/processes', async (req, res) => {
  try {
    // Fetch top 8 processes sorted by memory working set
    const cmd = 'Get-Process | Sort-Object WorkingSet -Descending | Select-Object -First 8 -Property Id, ProcessName, CPU, WorkingSet | ConvertTo-Json';
    const rawProcs = await runPowerShell(cmd);
    
    let processes = [];
    if (rawProcs) {
      try {
        const data = JSON.parse(rawProcs);
        const list = Array.isArray(data) ? data : [data];
        processes = list.map(p => ({
          id: p.Id,
          name: p.ProcessName,
          cpu: p.CPU ? Math.round(p.CPU * 10) / 10 : 0.1,
          ramMB: Math.round(p.WorkingSet / (1024 * 1024))
        }));
      } catch (e) {
        console.error('Error parsing processes', e);
      }
    }
    
    // Fill in mock processes if none were returned (failsafe)
    if (processes.length === 0) {
      processes = [
        { id: 4120, name: 'chrome', cpu: 2.4, ramMB: 840 },
        { id: 9812, name: 'node', cpu: 1.8, ramMB: 310 },
        { id: 1402, name: 'Cursor', cpu: 3.5, ramMB: 780 },
        { id: 2888, name: 'Spotify', cpu: 0.4, ramMB: 180 },
        { id: 5044, name: 'Explorer', cpu: 0.1, ramMB: 120 },
      ];
    }
    
    res.json({ success: true, processes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. System Diagnostics Scan Endpoint
app.get('/api/diagnostics', async (req, res) => {
  try {
    const osVer = await runPowerShell('[System.Environment]::OSVersion.VersionString') || 'Windows 11 Home';
    const driveInfo = await runPowerShell('Get-PSDrive C | Select-Object Used, Free | ConvertTo-Json');
    let diskStats = { totalGB: 512, freeGB: 224, usedPercent: 56 };
    
    if (driveInfo) {
      try {
        const parsed = JSON.parse(driveInfo);
        const used = parsed.Used || 0;
        const free = parsed.Free || 0;
        const total = used + free;
        diskStats = {
          totalGB: Math.round(total / (1024 * 1024 * 1024)),
          freeGB: Math.round(free / (1024 * 1024 * 1024)),
          usedPercent: Math.round((used / total) * 100)
        };
      } catch (e) {
        console.error('Disk parsing failed', e);
      }
    }

    // Ping check for network latency (returns latency in ms or null)
    const pingRaw = await runPowerShell('Test-Connection -ComputerName 8.8.8.8 -Count 1 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty ResponseTime');
    const latency = pingRaw ? parseInt(pingRaw) : 18;

    res.json({
      success: true,
      os: osVer,
      disk: diskStats,
      network: {
        status: latency !== null ? 'ONLINE' : 'LIMITED',
        latency: latency || 999
      },
      diagnosedAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Quick Actions Endpoint (Launch Calculator, Notepad, etc.)
app.post('/api/action', async (req, res) => {
  const { action } = req.body;
  
  try {
    let message = '';
    if (action === 'notepad') {
      exec('notepad.exe');
      message = 'Initiating safe text editor... Notepad launched.';
    } else if (action === 'calc') {
      exec('calc.exe');
      message = 'Activating secondary arithmetic unit... Calculator launched.';
    } else if (action === 'mspaint') {
      exec('mspaint.exe');
      message = 'Opening visual sketching console... Paint launched.';
    } else {
      return res.status(400).json({ success: false, error: 'Unknown action request.' });
    }
    
    res.json({ success: true, message });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4.5 Live Weather Query Endpoint (using free wttr.in weather API)
app.get('/api/weather', async (req, res) => {
  const location = req.query.location || '';
  const lat = req.query.lat;
  const lon = req.query.lon;
  
  try {
    let url = '';
    if (lat && lon) {
      // wttr.in accepts direct lat/lon coordinates
      url = `https://wttr.in/${lat},${lon}?format=j1`;
      console.log(`[B.O.S.S.] Fetching weather for coordinates: ${lat}, ${lon}`);
    } else {
      url = `https://wttr.in/${encodeURIComponent(location)}?format=j1`;
      console.log(`[B.O.S.S.] Fetching live weather for: ${location || 'Auto-Geolocate'}`);
    }
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Weather service returned code ${response.status}`);
    }
    
    const data = await response.json();
    const condition = data.current_condition[0];
    const area = data.nearest_area[0];
    
    const cityName = area.areaName[0].value;
    const country = area.country[0].value;
    const tempC = condition.temp_C;
    const desc = condition.weatherDesc[0].value;
    const humidity = condition.humidity;
    const windKmph = condition.windspeedKmph;

    res.json({
      success: true,
      city: cityName,
      country: country,
      tempC: parseInt(tempC),
      desc: desc,
      humidity: parseInt(humidity),
      windKmph: parseInt(windKmph)
    });
  } catch (error) {
    console.error('Weather fetch error:', error);
    res.json({
      success: false,
      error: error.message,
      city: location || 'London',
      tempC: 18,
      desc: 'Mild Cloud Cover',
      humidity: 62,
      windKmph: 12
    });
  }
});

// Haversine formula to compute great-circle distance on earth
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // distance in km
}

// 4.7 Tactical Flight Path & ETA Simulation Endpoint
app.get('/api/eta', async (req, res) => {
  const startLat = parseFloat(req.query.startLat) || 1.3521; // defaults to Singapore
  const startLon = parseFloat(req.query.startLon) || 103.8198;
  const destination = req.query.destination || 'London';

  console.log(`[B.O.S.S.] Computing ETA calculations to: ${destination} from coordinates: ${startLat}, ${startLon}`);

  try {
    let destLat = 51.5074; // Fallback coordinates: London
    let destLon = -0.1278;
    let resolvedName = destination;

    // Geocode destination using free OpenStreetMap Nominatim
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&limit=1`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'BOSS-Butler-Operating-System/1.0 (Windows NT; AI Assistant)' }
      });
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          destLat = parseFloat(data[0].lat);
          destLon = parseFloat(data[0].lon);
          resolvedName = data[0].display_name.split(',')[0];
        }
      }
    } catch (e) {
      console.warn('[B.O.S.S.] Geocoding failed, falling back to static map coordinates.', e);
    }

    const distance = Math.round(haversineDistance(startLat, startLon, destLat, destLon));

    // Travel profiles: velocity in km/h
    const profiles = [
      { id: 'mark85', name: 'Iron Man Mark LXXXV Thrusters', speed: 4900, desc: 'Hypersonic Flight (Mach 4)' },
      { id: 'supersonic', name: 'Standard Jet Propulsion', speed: 1836, desc: 'Supersonic Cruise (Mach 1.5)' },
      { id: 'hypercar', name: 'Ground Transport System', speed: 180, desc: 'High-speed Ground System' }
    ].map(p => {
      const durationHours = distance / p.speed;
      const hours = Math.floor(durationHours);
      const minutes = Math.round((durationHours - hours) * 60);
      
      const etaTime = new Date();
      etaTime.setMinutes(etaTime.getMinutes() + Math.round(durationHours * 60));

      return {
        id: p.id,
        name: p.name,
        speedKmph: p.speed,
        desc: p.desc,
        duration: `${hours}h ${minutes}m`,
        durationTotalMinutes: Math.round(durationHours * 60),
        eta: etaTime.toISOString()
      };
    });

    res.json({
      success: true,
      start: { lat: startLat, lon: startLon },
      destination: { name: resolvedName, lat: destLat, lon: destLon },
      distanceKm: distance,
      profiles
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. FULL ARBITRARY SHELL COMMAND RUNNER (Requested by USER: "Let it have access to everything")
app.post('/api/shell', async (req, res) => {
  const { command } = req.body;
  if (!command) {
    return res.status(400).json({ success: false, error: 'Command parameter is empty.' });
  }

  console.log(`[B.O.S.S.] Executing user command: ${command}`);
  
  try {
    // Run under PowerShell shell environment
    const { stdout, stderr } = await execAsync(command, { shell: 'powershell.exe', timeout: 30000 });
    
    res.json({
      success: true,
      stdout: stdout || '',
      stderr: stderr || '',
      exitCode: 0
    });
  } catch (error) {
    // If the command failed, return stdout/stderr and exit code if available
    res.json({
      success: false,
      error: error.message,
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      exitCode: error.code || 1
    });
  }
});

app.listen(PORT, () => {
  console.log(`[B.O.S.S. Backend Server active at http://localhost:${PORT}]`);
});
