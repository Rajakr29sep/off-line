import { Router } from "express";

const router = Router();

const categories = [
  {
    id: "medical",
    title: "Medical emergencies",
    description: "Urgent medical care and first aid",
    icon: "heart-pulse",
    facilityType: "hospital",
    color: "#ff6c56",
    topics: [
      "Heart attack and chest pain",
      "Stroke",
      "Cardiac arrest",
      "Severe bleeding",
      "Unconscious person",
      "Difficulty breathing or choking",
      "Seizures",
      "Severe allergic reaction",
      "Poisoning",
      "Burns and scalds",
      "Fractures and dislocations",
      "Head, neck, or spinal injuries",
      "Heatstroke and hypothermia",
      "Snakebite and scorpion sting",
    ],
  },
  {
    id: "fire",
    title: "Fire and explosion",
    description: "Fire response, smoke hazards and evacuation",
    icon: "flame",
    facilityType: "fire_station",
    color: "#ffb454",
    topics: [
      "House or apartment fire",
      "Office or commercial building fire",
      "Kitchen or LPG cylinder fire",
      "Electrical fire",
      "Vehicle fire",
      "Forest or vegetation fire",
      "Explosion or suspected bomb",
      "Person trapped in a burning building",
    ],
  },
  {
    id: "flood",
    title: "Floods and water emergencies",
    description: "Floodwater, water contamination and water rescue",
    icon: "waves",
    facilityType: "shelter",
    color: "#66c7ff",
    topics: [
      "Urban flash flooding",
      "Waterlogged roads",
      "River or drain overflow",
      "Person trapped in floodwater",
      "Flooded basement or underpass",
      "Contaminated drinking water",
      "Water rescue and evacuation",
    ],
  },
  {
    id: "natural-disasters",
    title: "Natural disasters and severe weather",
    description: "Earthquakes, storms, extreme temperatures and evacuation",
    icon: "cloud-lightning",
    facilityType: "shelter",
    color: "#b5f36e",
    topics: [
      "Earthquake",
      "Building collapse",
      "Severe thunderstorm",
      "Lightning strike",
      "Tornado or violent windstorm",
      "Extreme heat and heatwave",
      "Landslide",
      "Cyclone and storm surge",
      "Person trapped under rubble",
      "Evacuation and temporary shelter",
    ],
  },
  {
    id: "transport",
    title: "Road and transport accidents",
    description: "Traffic collisions, railway incidents and transport safety",
    icon: "car-front",
    facilityType: "hospital",
    color: "#ff967f",
    topics: [
      "Car or motorcycle crash",
      "Pedestrian hit by a vehicle",
      "Bus accident",
      "Multi-vehicle pileup",
      "Railway accident",
      "Person trapped inside a vehicle",
    ],
  },
  {
    id: "personal-safety",
    title: "Personal safety and crime",
    description: "Personal threats, missing people and police assistance",
    icon: "shield-alert",
    facilityType: "police",
    color: "#7bdff2",
    topics: [
      "Assault or physical attack",
      "Domestic violence",
      "Stalking or harassment",
      "Missing child or adult",
      "Robbery or armed threat",
      "Suspicious unattended object",
      "Crowd crush or stampede",
    ],
  },
  {
    id: "hazardous-materials",
    title: "Chemical, biological and hazardous-material incidents",
    description: "Chemical exposure, gas leaks and contamination",
    icon: "radiation",
    facilityType: "fire_station",
    color: "#d5a7ff",
    topics: [
      "Chemical spill",
      "Toxic gas leak",
      "LPG or natural gas leak",
      "Carbon monoxide exposure",
      "Chemical splash on skin or eyes",
      "Pesticide poisoning",
    ],
  },
  {
    id: "infrastructure",
    title: "Utility and infrastructure failures",
    description: "Electrical hazards, utilities and structural damage",
    icon: "zap",
    facilityType: "hospital",
    color: "#ffd166",
    topics: [
      "Power outage",
      "Live or fallen electrical wire",
      "Electric shock",
      "Water supply failure",
      "Building structural damage",
      "Elevator entrapment",
      "Telecommunications outage",
    ],
  },
  {
    id: "search-rescue",
    title: "Search, rescue and survival",
    description: "Missing people, survival and emergency evacuation",
    icon: "life-buoy",
    facilityType: "shelter",
    color: "#70e1bd",
    topics: [
      "Missing person",
      "Lost child",
      "Person trapped in a confined space",
      "Getting lost in an unfamiliar area",
      "Stranded without food or water",
      "Safe drinking-water treatment",
      "Basic survival kit preparation",
    ],
  },
  {
    id: "community",
    title: "Public gatherings and community emergencies",
    description: "Crowd safety, public venues and community response",
    icon: "users",
    facilityType: "hospital",
    color: "#c7f17d",
    topics: [
      "Crowd crush",
      "Stampede",
      "Panic in a stadium",
      "School evacuation",
      "Public transport station evacuation",
      "Temporary shelter and relief distribution",
    ],
  },
];

router.get("/", (_req, res) => {
  res.json({
    ok: true,
    total: categories.length,
    categories,
  });
});

router.get("/:id", (req, res) => {
  const cat = categories.find((c) => c.id === req.params.id);
  if (!cat) {
    return res.status(404).json({ ok: false, message: "Category not found" });
  }
  return res.json({ ok: true, category: cat });
});

export default router;
