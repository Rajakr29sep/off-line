CATEGORY_TERMS = {
    "medical": ["medical", "first aid", "heart", "stroke", "bleeding", "unconscious", "breathing", "choking", "seizure", "allergy", "poison", "burn", "fracture", "drowning", "heatstroke", "dehydration", "rabies", "snakebite"],
    "fire": ["fire", "smoke", "burn", "explosion", "evacuation", "lpg", "flame"],
    "flood": ["flood", "water", "drowning", "contamination", "evacuation", "rescue"],
    "natural-disasters": ["earthquake", "storm", "lightning", "heatwave", "cold wave", "landslide", "cyclone", "rubble"],
    "transport": ["road accident", "vehicle", "crash", "railway", "train", "metro", "collision", "pedestrian"],
    "personal-safety": ["police", "assault", "violence", "stalking", "missing person", "robbery", "hostage", "crowd"],
    "hazardous-materials": ["chemical", "toxic", "gas leak", "carbon monoxide", "pesticide", "radiation", "hazardous"],
    "infrastructure": ["power outage", "electrical", "electric shock", "gas supply", "sewer", "elevator", "bridge", "sinkhole", "telecommunications"],
    "search-rescue": ["rescue", "missing person", "trapped", "stranded", "shelter", "evacuation", "signalling", "survival"],
    "community": ["crowd", "stampede", "stadium", "concert", "school evacuation", "public gathering", "mass casualty", "shelter"]
}
def category_terms(category_id: str):
    return CATEGORY_TERMS.get(category_id, [])
