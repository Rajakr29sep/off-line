import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FACILITIES_FILE = path.resolve(__dirname, "..", "data", "maps", "facilities.geojson");

const facilities = [
  // --- DELHI NCR (High Density) ---
  {
    id: "delhi-aiims",
    name: "AIIMS Apex Trauma & Emergency Center",
    type: "hospital",
    phone: "011-26588500 / 112",
    address: "Sri Aurobindo Marg, Ansari Nagar, New Delhi",
    emergency_level: "Level-1 Trauma & Comprehensive Emergency",
    city: "Delhi NCR",
    coordinates: [77.2090, 28.5672]
  },
  {
    id: "delhi-safdarjung",
    name: "Safdarjung Multi-Specialty Hospital",
    type: "hospital",
    phone: "011-26165060 / 102",
    address: "Ring Road, opposite AIIMS, New Delhi",
    emergency_level: "Emergency, Burn Center & ICU",
    city: "Delhi NCR",
    coordinates: [77.2062, 28.5701]
  },
  {
    id: "delhi-rml",
    name: "Dr. Ram Manohar Lohia Hospital",
    type: "hospital",
    phone: "011-23365525 / 112",
    address: "Baba Kharak Singh Marg, Connaught Place, New Delhi",
    emergency_level: "Central Emergency & Disaster Care",
    city: "Delhi NCR",
    coordinates: [77.2023, 28.6253]
  },
  {
    id: "delhi-lnjp",
    name: "Lok Nayak Jai Prakash Hospital (LNJP)",
    type: "hospital",
    phone: "011-23233000 / 102",
    address: "Jawaharlal Nehru Marg, Delhi Gate, New Delhi",
    emergency_level: "Mass Casualty Emergency & Infection Unit",
    city: "Delhi NCR",
    coordinates: [77.2405, 28.6367]
  },
  {
    id: "delhi-gangaram",
    name: "Sir Ganga Ram Hospital",
    type: "hospital",
    phone: "011-25750000 / 011-42254000",
    address: "Sir Ganga Ram Hospital Marg, Old Rajinder Nagar, New Delhi",
    emergency_level: "Tertiary Emergency & Cardiac Care",
    city: "Delhi NCR",
    coordinates: [77.1895, 28.6385]
  },
  {
    id: "delhi-max-saket",
    name: "Max Super Speciality Hospital Saket",
    type: "hospital",
    phone: "011-26515050 / 1066",
    address: "1, 2, Press Enclave Marg, Saket, New Delhi",
    emergency_level: "24x7 Emergency Trauma & Cardiac Care",
    city: "Delhi NCR",
    coordinates: [77.2117, 28.5273]
  },
  {
    id: "delhi-apollo",
    name: "Indraprastha Apollo Hospital",
    type: "hospital",
    phone: "011-71791090 / 1066",
    address: "Delhi-Mathura Road, Sarita Vihar, New Delhi",
    emergency_level: "Level-1 Comprehensive Emergency & Stroke Unit",
    city: "Delhi NCR",
    coordinates: [77.2840, 28.5414]
  },
  {
    id: "gurgaon-medanta",
    name: "Medanta - The Medicity",
    type: "hospital",
    phone: "0124-4141414 / 1066",
    address: "CH Bakhtawar Singh Road, Sector 38, Gurugram",
    emergency_level: "Apex Trauma, Critical Care & Air Ambulance Hub",
    city: "Delhi NCR",
    coordinates: [77.0425, 28.4394]
  },
  {
    id: "noida-fortis",
    name: "Fortis Hospital Noida",
    type: "hospital",
    phone: "0120-4300222 / 105010",
    address: "B-22, Sector 62, Noida, Gautam Buddha Nagar",
    emergency_level: "24x7 Emergency & Neuro Trauma Care",
    city: "Delhi NCR",
    coordinates: [77.3732, 28.6186]
  },
  {
    id: "delhi-fire-hq",
    name: "Delhi Fire Service Headquarters",
    type: "fire_station",
    phone: "101 / 011-23414000",
    address: "Connaught Circus, Barakhamba Road, New Delhi",
    emergency_level: "Central Fire & High-Rise Rescue Command",
    city: "Delhi NCR",
    coordinates: [77.2285, 28.6289]
  },
  {
    id: "delhi-fire-bhikaji",
    name: "Safdarjung Fire Station",
    type: "fire_station",
    phone: "101 / 011-26182000",
    address: "Bhikaji Cama Place, New Delhi",
    emergency_level: "Sub-Division Rescue & HazMat Unit",
    city: "Delhi NCR",
    coordinates: [77.2144, 28.5732]
  },
  {
    id: "delhi-police-parliament",
    name: "Parliament Street Police Station",
    type: "police",
    phone: "112 / 100",
    address: "Parliament Street, New Delhi",
    emergency_level: "Central Police & Rapid Emergency Response",
    city: "Delhi NCR",
    coordinates: [77.2185, 28.6219]
  },
  {
    id: "delhi-police-connaught",
    name: "Connaught Place Police Station",
    type: "police",
    phone: "112 / 100",
    address: "Shaheed Bhagat Singh Marg, New Delhi",
    emergency_level: "Emergency Patrol & Public Safety Unit",
    city: "Delhi NCR",
    coordinates: [77.2155, 28.6318]
  },
  {
    id: "delhi-police-hauzkhas",
    name: "Hauz Khas Police Station",
    type: "police",
    phone: "112 / 011-26510065",
    address: "Aurobindo Marg, Hauz Khas, New Delhi",
    emergency_level: "South Zone Emergency Response Unit",
    city: "Delhi NCR",
    coordinates: [77.2065, 28.5489]
  },
  {
    id: "delhi-shelter-ndma",
    name: "National Disaster Management Authority (NDMA)",
    type: "shelter",
    phone: "011-26701728 / 1070",
    address: "NDMA Bhawan, A-1, Safdarjung Enclave, New Delhi",
    emergency_level: "National Disaster Response & Shelter Command",
    city: "Delhi NCR",
    coordinates: [77.2295, 28.6129]
  },
  {
    id: "delhi-shelter-pragati",
    name: "Pragati Disaster Evacuation Shelter",
    type: "shelter",
    phone: "112",
    address: "Mathura Road, Pragati Maidan, New Delhi",
    emergency_level: "Emergency Evacuation & Temporary Relief Shelter",
    city: "Delhi NCR",
    coordinates: [77.2410, 28.6271]
  },

  // --- MUMBAI ---
  {
    id: "mumbai-kem",
    name: "KEM Hospital (King Edward Memorial)",
    type: "hospital",
    phone: "022-24107000 / 112",
    address: "Acharya Donde Marg, Parel, Mumbai",
    emergency_level: "Apex Public Emergency & Trauma Center",
    city: "Mumbai",
    coordinates: [72.8427, 19.0029]
  },
  {
    id: "mumbai-lilavati",
    name: "Lilavati Hospital & Research Centre",
    type: "hospital",
    phone: "022-26751000 / 1057",
    address: "A-791, Bandra Reclamation, Bandra West, Mumbai",
    emergency_level: "24x7 Critical Care & Cardiac Trauma",
    city: "Mumbai",
    coordinates: [72.8294, 19.0514]
  },
  {
    id: "mumbai-hinduja",
    name: "P.D. Hinduja Hospital",
    type: "hospital",
    phone: "022-24451515 / 112",
    address: "Veer Savarkar Marg, Mahim, Mumbai",
    emergency_level: "Tertiary Emergency & Stroke Care",
    city: "Mumbai",
    coordinates: [72.8398, 19.0334]
  },
  {
    id: "mumbai-bombay-hosp",
    name: "Bombay Hospital & Medical Research Centre",
    type: "hospital",
    phone: "022-22067676 / 102",
    address: "12, Marine Lines, Mumbai",
    emergency_level: "South Mumbai 24x7 Emergency Trauma",
    city: "Mumbai",
    coordinates: [72.8286, 18.9407]
  },
  {
    id: "mumbai-fire-hq",
    name: "Mumbai Fire Brigade Headquarters",
    type: "fire_station",
    phone: "101 / 022-23076111",
    address: "Byculla Fire Station, Morland Road, Mumbai",
    emergency_level: "Central Command & HazMat Rescue Unit",
    city: "Mumbai",
    coordinates: [72.8336, 18.9760]
  },
  {
    id: "mumbai-police-marinedrive",
    name: "Marine Drive Police Station",
    type: "police",
    phone: "112 / 100",
    address: "Dinshaw Vacha Road, Churchgate, Mumbai",
    emergency_level: "Coastal & City Emergency Response Unit",
    city: "Mumbai",
    coordinates: [72.8242, 18.9322]
  },

  // --- BENGALURU ---
  {
    id: "blr-victoria",
    name: "Victoria Hospital Trauma Care Centre",
    type: "hospital",
    phone: "080-26701150 / 112",
    address: "Fort Road, near City Market, Bengaluru",
    emergency_level: "Apex Government Emergency & Trauma Care",
    city: "Bengaluru",
    coordinates: [77.5746, 12.9634]
  },
  {
    id: "blr-manipal",
    name: "Manipal Hospital Old Airport Road",
    type: "hospital",
    phone: "080-25024444 / 105711",
    address: "98, HAL Old Airport Road, Kodihalli, Bengaluru",
    emergency_level: "Level-1 Trauma & Emergency Medicine",
    city: "Bengaluru",
    coordinates: [77.6499, 12.9592]
  },
  {
    id: "blr-nimhans",
    name: "NIMHANS Neuro Emergency Centre",
    type: "hospital",
    phone: "080-26995000 / 112",
    address: "Hosur Road, Lakkasandra, Bengaluru",
    emergency_level: "National Neuro-Trauma & Emergency Care",
    city: "Bengaluru",
    coordinates: [77.5960, 12.9403]
  },
  {
    id: "blr-fire-hq",
    name: "Karnataka Fire & Emergency Services Command",
    type: "fire_station",
    phone: "101 / 080-22971500",
    address: "Sheshadri Road, Gandhi Nagar, Bengaluru",
    emergency_level: "State Fire Rescue & Disaster Headquarters",
    city: "Bengaluru",
    coordinates: [77.5855, 12.9716]
  },
  {
    id: "blr-police-cubbon",
    name: "Cubbon Park Police Station",
    type: "police",
    phone: "112 / 100",
    address: "Kasturba Road, Bengaluru",
    emergency_level: "Central Metro Emergency Response Unit",
    city: "Bengaluru",
    coordinates: [77.5928, 12.9762]
  },

  // --- KOLKATA ---
  {
    id: "kol-sskm",
    name: "SSKM Hospital & IPGMER Trauma Care Centre",
    type: "hospital",
    phone: "033-22231589 / 112",
    address: "244, AJC Bose Road, Bhowanipore, Kolkata",
    emergency_level: "Apex Government Trauma & Emergency Hospital",
    city: "Kolkata",
    coordinates: [88.3426, 22.5398]
  },
  {
    id: "kol-medcollege",
    name: "Medical College Hospital Kolkata",
    type: "hospital",
    phone: "033-22551635 / 102",
    address: "88, College Street, Bowbazar, Kolkata",
    emergency_level: "Central Emergency & Critical Care",
    city: "Kolkata",
    coordinates: [88.3620, 22.5735]
  },
  {
    id: "kol-fire-hq",
    name: "West Bengal Fire & Emergency Services HQ",
    type: "fire_station",
    phone: "101 / 033-22521165",
    address: "13D, Mirza Ghalib Street, Kolkata",
    emergency_level: "State Emergency Fire Command",
    city: "Kolkata",
    coordinates: [88.3530, 22.5560]
  },
  {
    id: "kol-police-lalbazar",
    name: "Kolkata Police Headquarters Lalbazar",
    type: "police",
    phone: "112 / 100",
    address: "18, Lalbazar Street, BBD Bagh, Kolkata",
    emergency_level: "Central Police Control & Emergency Response",
    city: "Kolkata",
    coordinates: [88.3518, 22.5714]
  },

  // --- HYDERABAD ---
  {
    id: "hyd-osmania",
    name: "Osmania General Hospital Emergency",
    type: "hospital",
    phone: "040-24600121 / 112",
    address: "Afzal Gunj, High Court Road, Hyderabad",
    emergency_level: "Apex Trauma & Mass Casualty Emergency",
    city: "Hyderabad",
    coordinates: [78.4744, 17.3753]
  },
  {
    id: "hyd-apollo",
    name: "Apollo Hospitals Jubilee Hills",
    type: "hospital",
    phone: "040-23607777 / 1066",
    address: "Road No. 72, Film Nagar, Jubilee Hills, Hyderabad",
    emergency_level: "Level-1 Comprehensive Emergency Care",
    city: "Hyderabad",
    coordinates: [78.4115, 17.4178]
  },
  {
    id: "hyd-fire-hq",
    name: "Telangana State Disaster Response & Fire Services",
    type: "fire_station",
    phone: "101 / 040-23442944",
    address: "BRK Bhavan, Tank Bund Road, Hyderabad",
    emergency_level: "Central Fire & Emergency Command",
    city: "Hyderabad",
    coordinates: [78.4800, 17.4080]
  },
  {
    id: "hyd-police-abids",
    name: "Abids Police Station",
    type: "police",
    phone: "112 / 100",
    address: "Abids Road, Gun Foundry, Hyderabad",
    emergency_level: "Central Police Response",
    city: "Hyderabad",
    coordinates: [78.4739, 17.3896]
  },

  // --- CHENNAI ---
  {
    id: "chn-rggh",
    name: "Rajiv Gandhi Government General Hospital (RGGGH)",
    type: "hospital",
    phone: "044-25305000 / 112",
    address: "EVR Periyar Salai, Park Town, Chennai",
    emergency_level: "Apex Government Emergency Trauma Centre",
    city: "Chennai",
    coordinates: [80.2785, 13.0805]
  },
  {
    id: "chn-apollo",
    name: "Apollo Hospital Greams Road",
    type: "hospital",
    phone: "044-28290200 / 1066",
    address: "21 Greams Lane, Thousand Lights, Chennai",
    emergency_level: "24x7 Emergency, Heart & Stroke Unit",
    city: "Chennai",
    coordinates: [80.2514, 13.0604]
  },
  {
    id: "chn-fire-hq",
    name: "Tamil Nadu Fire & Rescue Services Headquarters",
    type: "fire_station",
    phone: "101 / 044-28554441",
    address: "Pantheon Road, Egmore, Chennai",
    emergency_level: "State Fire & Rescue Command",
    city: "Chennai",
    coordinates: [80.2609, 13.0732]
  },

  // --- PUNE ---
  {
    id: "pune-sassoon",
    name: "Sassoon General Hospital & Trauma Center",
    type: "hospital",
    phone: "020-26128000 / 112",
    address: "Near Pune Railway Station, Sassoon Road, Pune",
    emergency_level: "Government Multi-Specialty Trauma Care",
    city: "Pune",
    coordinates: [73.8739, 18.5284]
  },
  {
    id: "pune-ruby",
    name: "Ruby Hall Clinic 24x7 Emergency",
    type: "hospital",
    phone: "020-66455100 / 1058",
    address: "40, Sassoon Road, Sangamvadi, Pune",
    emergency_level: "Level-1 Emergency & Cardiac Care",
    city: "Pune",
    coordinates: [73.8778, 18.5332]
  },

  // --- AHMEDABAD ---
  {
    id: "ahd-civil",
    name: "Ahmedabad Civil Hospital Trauma Centre",
    type: "hospital",
    phone: "079-22683721 / 112",
    address: "Asarwa, Ahmedabad, Gujarat",
    emergency_level: "Apex Trauma & Disaster Medical Centre",
    city: "Ahmedabad",
    coordinates: [72.6033, 23.0525]
  },

  // --- JAIPUR ---
  {
    id: "jpr-sms",
    name: "SMS Hospital (Sawai Man Singh) Emergency",
    type: "hospital",
    phone: "0141-2560291 / 112",
    address: "Jawahar Lal Nehru Marg, Ashok Nagar, Jaipur",
    emergency_level: "Apex Government Emergency & Trauma Hub",
    city: "Jaipur",
    coordinates: [75.8166, 26.8974]
  },

  // --- LUCKNOW ---
  {
    id: "lko-kgmu",
    name: "KGMU Trauma Centre (King George's Medical University)",
    type: "hospital",
    phone: "0522-2257540 / 112",
    address: "Shah Mina Road, Chowk, Lucknow",
    emergency_level: "Level-1 Regional Trauma & Critical Care",
    city: "Lucknow",
    coordinates: [80.9152, 26.8690]
  },

  // --- PATNA ---
  {
    id: "pat-aiims",
    name: "AIIMS Patna Emergency Medicine & Trauma",
    type: "hospital",
    phone: "0612-2451000 / 112",
    address: "Aurangabad Road, Phulwari Sharif, Patna",
    emergency_level: "National Institute Emergency & Trauma Centre",
    city: "Patna",
    coordinates: [85.0442, 25.5606]
  },
  {
    id: "pat-pmch",
    name: "Patna Medical College Hospital (PMCH)",
    type: "hospital",
    phone: "0612-2300080 / 102",
    address: "Ashok Rajpath, Patna",
    emergency_level: "Government Emergency & Burn Centre",
    city: "Patna",
    coordinates: [85.1614, 25.6200]
  }
];

const geojson = {
  type: "FeatureCollection",
  name: "National_Emergency_Facilities",
  features: facilities.map((f) => ({
    type: "Feature",
    id: f.id,
    geometry: {
      type: "Point",
      coordinates: f.coordinates
    },
    properties: {
      name: f.name,
      type: f.type,
      phone: f.phone,
      address: f.address,
      emergency_level: f.emergency_level,
      city: f.city,
      amenity: f.type
    }
  }))
};

fs.writeFileSync(FACILITIES_FILE, JSON.stringify(geojson, null, 2), "utf-8");
console.log(`Successfully updated ${FACILITIES_FILE} with ${geojson.features.length} nationwide emergency facilities!`);
