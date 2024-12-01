// API Constants
const BASE_URL = "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes";
const PROVINCES = `${BASE_URL}/Listados/Provincias`;
const MUNICIPALITIES = `${BASE_URL}/Listados/MunicipiosPorProvincia/`;
const STATIONS = `${BASE_URL}/EstacionesTerrestres/FiltroMunicipio/`;

// DOM Elements
const provinceSelect = document.getElementById("province");
const municipalityDropdown = document.getElementById("municipality");
const fuelTypeSelect = document.getElementById("fuelType");
const stationListContainer = document.getElementById("stationList");
const isOpenCheckbox = document.getElementById("isOpen");

let stationsData = []; // Store loaded stations to display them later

// Function to load provinces from the API
async function loadProvinces() {
  try {
    const response = await fetch(PROVINCES);
    if (!response.ok) throw new Error(`Error: ${response.statusText}`);
    const data = await response.json();
    populateSelect(provinceSelect, data, "IDPovincia", "Provincia");
  } catch (error) {
    console.error("Error loading provinces:", error);
  }
}

// Load municipalities based on the selected province
async function loadMunicipalities(provinceId) {
  if (!provinceId) return;

  try {
    const response = await fetch(`${MUNICIPALITIES}${provinceId}`);
    if (!response.ok) throw new Error(`Error: ${response.statusText}`);
    const data = await response.json();
    populateSelect(municipalityDropdown, data, "IDMunicipio", "Municipio");
  } catch (error) {
    console.error("Error loading municipalities:", error);
  }
}

// Populate a <select> element with data
function populateSelect(selectElement, data, valueKey, textKey) {
  selectElement.innerHTML = `<option value="" disabled selected>Select an option</option>`;
  data.forEach(item => {
    const option = document.createElement("option");
    option.value = item[valueKey];
    option.textContent = item[textKey];
    selectElement.appendChild(option);
  });
}

// Load stations for the selected municipality
async function loadStationsByMunicipality(municipalityId) {
  if (!municipalityId) return;

  try {
    const response = await fetch(`${STATIONS}${municipalityId}`);
    if (!response.ok) throw new Error(`Error: ${response.statusText}`);
    const data = await response.json();
    stationsData = data.ListaEESSPrecio || [];
    console.log("Stations data:", data);

    if (stationsData.length === 0) {
      stationListContainer.innerHTML = "<p>No gas stations available in this municipality.</p>";
    } else {
      stationListContainer.innerHTML = "<p>Please select a fuel type to filter the results.</p>";
    }
  } catch (error) {
    console.error("Error loading stations:", error);
  }
}

// Check if a gas station is currently open based on schedule and day of the week
function isStationOpen(schedule) {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const currentTime = now.getHours() * 60 + now.getMinutes(); // Current time in minutes since midnight

  if (schedule.includes("L-D: 24H")) {
    return true; // Open every day 24 hours
  }

  const daysMap = {
    "L": 1,
    "M": 2,
    "X": 3,
    "J": 4,
    "V": 5,
    "S": 6,
    "D": 0
  };

  const hours = schedule.split(";");

  for (const hour of hours) {
    const [days, timeRange] = hour.split(": ");
    const dayRanges = days.split("-");

    let startDay = dayRanges[0].trim();
    let endDay = dayRanges.length > 1 ? dayRanges[1].trim() : startDay;

    const startDayIndex = daysMap[startDay];
    const endDayIndex = daysMap[endDay];

    // Check if the current day is within the specified day range
    if (
      (startDayIndex <= endDayIndex && currentDay >= startDayIndex && currentDay <= endDayIndex) ||
      (startDayIndex > endDayIndex && (currentDay >= startDayIndex || currentDay <= endDayIndex))
    ) {
      const [start, end] = timeRange.split("-");
      const [startHours, startMinutes] = start.split(":").map(Number);
      const [endHours, endMinutes] = end.split(":").map(Number);

      const startTime = startHours * 60 + startMinutes;
      const endTime = endHours * 60 + endMinutes;

      // Consider if the gas station closes after midnight
      if (endTime < startTime) {
        if (currentTime >= startTime || currentTime <= endTime) {
          return true;
        }
      } else {
        if (currentTime >= startTime && currentTime <= endTime) {
          return true;
        }
      }
    }
  }
  return false;
}

// Display gas stations filtered by fuel type
function filterAndDisplayStations() {
  const fuelType = fuelTypeSelect.value;
  const isOpen = isOpenCheckbox.checked;
  console.log("Fuel Type:", fuelType);
  console.log("Is Open:", isOpen);

  if (!fuelType) {
    stationListContainer.innerHTML = "<p>Please select a fuel type.</p>";
    return;
  }

  const fuelKey = `Precio ${fuelType}`.trim();
  console.log("Fuel Key:", fuelKey);

  const filteredStations = stationsData.filter(station => {
    const fuelPrice = station[fuelKey];
    const openStatus = isStationOpen(station.Horario);
    console.log("Station:", station);
    console.log("Fuel Key:", fuelKey, "Value:", fuelPrice);
    return typeof fuelPrice !== "undefined" && fuelPrice !== "" && (!isOpen || openStatus);
  });

  console.log("Filtered Stations:", filteredStations);

  displayStations(filteredStations, fuelType);
}

// Display stations in the DOM
function displayStations(stations, fuelType) {
  stationListContainer.innerHTML = "";

  if (stations.length === 0) {
    stationListContainer.innerHTML = "<p>No stations found for the selected fuel type.</p>";
    return;
  }

  stations.forEach(station => {
    const priceKey = `Precio ${fuelType}`.trim();
    const stationElement = document.createElement("div");
    stationElement.className = "station";
    stationElement.innerHTML = `
      <h3>${station.Rótulo || "Unknown Name"}</h3>
      <p><strong>Address:</strong> ${station.Dirección || "No address"}</p>
      <p><strong>Municipality:</strong> ${station.Municipio || "Unknown municipality"}</p>
      <p><strong>Schedule:</strong> ${station.Horario || "Unknown hours"}</p>
      <p><strong>Price ${fuelType}:</strong> ${station[priceKey] || "Not available"}</p>
    `;
    stationListContainer.appendChild(stationElement);
  });
}

// Event Listeners: Listen to events and call appropriate functions
provinceSelect.addEventListener("change", () => {
  const provinceId = provinceSelect.value;
  loadMunicipalities(provinceId);
  municipalityDropdown.disabled = false;
  stationListContainer.innerHTML = "";
  fuelTypeSelect.value = "";
});

municipalityDropdown.addEventListener("change", () => {
  const municipalityId = municipalityDropdown.value;
  loadStationsByMunicipality(municipalityId);
});

fuelTypeSelect.addEventListener("change", filterAndDisplayStations);
isOpenCheckbox.addEventListener("change", filterAndDisplayStations);

// Initialize: Load provinces when the page loads
loadProvinces();
