/**
 * Utility to generate and download CSV reports (Excel compatible)
 */

export const downloadCSV = (filename, data) => {
  const csvContent = "data:text/csv;charset=utf-8," + data;
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const generateMockHistoricalData = (device, startDate, endDate) => {
  const readings = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Use device sim config or defaults
  const cfg = device.sim_config || {};
  const getVal = (metric) => {
    const mCfg = cfg[metric] || { mode: 'fixed', fixed: 20, min: 10, max: 30 };
    if (mCfg.mode === 'fixed') {
      // Add a tiny bit of noise even to fixed for "realism" in historical reports
      return Math.round(Number(mCfg.fixed));
    }
    const range = Number(mCfg.max) - Number(mCfg.min);
    return Math.round(Number(mCfg.min) + Math.random() * range);
  };

  // Generate a reading every 4 hours for the month to keep file size reasonable
  let current = new Date(start);
  while (current <= end) {
    readings.push({
      timestamp: new Date(current).toISOString(),
      date: current.toLocaleDateString(),
      time: current.toLocaleTimeString(),
      pm25: getVal('pm25'),
      pm10: getVal('pm10'),
      no2: getVal('no2'),
      so2: getVal('so2'),
      co: getVal('co'),
      o3: getVal('o3'),
      nh3: getVal('nh3'),
      pb: getVal('pb'),
      aqi: getVal('aqi'),
      temperature: getVal('temperature'),
      humidity: getVal('humidity')
    });
    // Increment by 4 hours
    current.setHours(current.getHours() + 4);
  }
  
  return readings;
};

export const exportDeviceToCSV = (device, readings) => {
  const headers = [
    "Date", "Time", "PM 10 (µg/m³)", "PM 2.5 (µg/m³)", 
    "NO2 (µg/m³)", "SO2 (µg/m³)", "CO (mg/m³)", 
    "O3 (µg/m³)", "NH3 (µg/m³)", "Pb (µg/m³)", 
    "AQI", "Temperature (°C)", "Humidity (%)"
  ];
  const rows = readings.map(r => [
    r.date,
    r.time,
    r.pm10,
    r.pm25,
    r.no2,
    r.so2,
    r.co,
    r.o3,
    r.nh3,
    r.pb,
    r.aqi,
    r.temperature,
    r.humidity
  ]);

  const csvString = [
    headers.join(","),
    ...rows.map(row => row.join(","))
  ].join("\n");

  const filename = `Report_${device.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
  downloadCSV(filename, csvString);
};
