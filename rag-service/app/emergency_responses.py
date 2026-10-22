
import re
from typing import Optional


def normalize_text(text: str) -> str:
    """Normalize English and Hinglish input for offline matching."""
    text = (text or "").lower()
    text = text.replace("-", " ").replace("_", " ")
    text = re.sub(r"[^\w\s']", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def contains_phrase(text: str, phrases: list[str]) -> bool:
    """Match phrases without accidentally matching partial words."""
    padded_text = f" {text} "
    return any(f" {normalize_text(p)} " in padded_text for p in phrases)


# These responses are local templates. They do not diagnose a person.
# Have the safety wording reviewed by a qualified medical/fire-safety professional
# before deploying this application for real-world emergency use.

EMERGENCY_RESPONSES = {
    "heart": {
        "urgency": "emergency_if_red_flags",
        "title": "Chest pain or an unusually fast heartbeat",
        "answer": (
            "A fast, pounding heartbeat or chest discomfort can have different "
            "causes. This app cannot determine the cause from a message.\n\n"
            "What to do now:\n"
            "1. Stop physical activity and sit somewhere safe.\n"
            "2. If you have chest pain or pressure, severe difficulty breathing, "
            "fainting, or feel close to fainting, call emergency services now. "
            "In India, dial 112.\n"
            "3. New, persistent, worsening, or unusual palpitations need prompt "
            "medical assessment, even if you do not have chest pain.\n"
            "4. If you feel faint or very unwell, do not drive yourself. Ask "
            "someone nearby to help.\n\n"
            "Do not delay emergency care to use this app."
        ),
        "disclaimer": (
            "General emergency information, not a diagnosis or a substitute "
            "for emergency medical care."
        ),
    },
    "stroke": {
        "urgency": "emergency",
        "title": "Possible stroke — get emergency help",
        "answer": (
            "A stroke can cause sudden changes in the brain. Treat sudden "
            "stroke warning signs as an emergency.\n\n"
            "Watch for:\n"
            "- Face drooping or an uneven smile.\n"
            "- Weakness or numbness, especially on one side of the body.\n"
            "- Trouble speaking, understanding, seeing, walking, or keeping "
            "balance.\n"
            "- A sudden, severe headache with no known cause.\n\n"
            "What to do:\n"
            "1. Call emergency services now. In India, dial 112.\n"
            "2. Note when the symptoms started, or when the person was last "
            "known to be well.\n"
            "3. Stay with the person and monitor their breathing and "
            "responsiveness.\n"
            "4. Do not give food, drink, or medication unless directed by "
            "a qualified medical professional.\n"
            "5. Do not wait to see if the symptoms disappear, and do not "
            "drive the person yourself if an ambulance is available."
        ),
        "disclaimer": (
            "Possible stroke symptoms require emergency assessment. "
            "This app cannot confirm or rule out a stroke."
        ),
    },
    "house_fire": {
        "urgency": "emergency",
        "title": "House or apartment fire",
        "answer": (
            "If there is a fire or smoke inside your home, get out if you "
            "can do so safely.\n\n"
            "What to do:\n"
            "1. Warn others and activate the fire alarm if it is safe to do so.\n"
            "2. Leave by a safe exit. Stay low if there is smoke.\n"
            "3. Do not use elevators. Use stairs only if the route is safe.\n"
            "4. Close doors behind you if you can do so without delaying "
            "your escape. Do not lock yourself in or go back for belongings.\n"
            "5. Once outside, move away from the building and call emergency "
            "services. In India, dial 112.\n"
            "6. Never re-enter a burning building.\n\n"
            "If you cannot escape safely, go into a room away from the fire "
            "if possible, close the door, block smoke entering around gaps "
            "if you can, call emergency services, and signal your location. "
            "Follow the emergency operator's instructions."
        ),
        "disclaimer": (
            "Conditions differ between buildings. Follow the fire alarm, "
            "local emergency responders, and the safest available exit route."
        ),
    },
    "office_fire": {
        "urgency": "emergency",
        "title": "Office or commercial building fire",
        "answer": (
            "Treat a building fire or fire alarm seriously. Follow the "
            "building's emergency procedures and responder instructions.\n\n"
            "What to do:\n"
            "1. Activate the alarm or alert building security if it is safe "
            "and the alarm has not already been raised.\n"
            "2. Stop work and evacuate by the nearest safe, marked exit.\n"
            "3. Use stairs, not elevators. Stay low if you encounter smoke.\n"
            "4. Do not collect belongings or return to your desk.\n"
            "5. Help others only when you can do so without putting yourself "
            "in danger. Tell responders if someone may be trapped.\n"
            "6. Go to the designated assembly area, stay clear of emergency "
            "vehicle access routes, and do not re-enter until officials say "
            "it is safe.\n"
            "7. Call emergency services. In India, dial 112.\n\n"
            "If all escape routes are blocked by fire or smoke, do not enter "
            "the smoke. Move away from immediate danger if possible, close "
            "yourself off from smoke, call emergency services, and tell them "
            "your exact location and floor."
        ),
        "disclaimer": (
            "Follow your building's evacuation plan and instructions from "
            "fire and rescue personnel."
        ),
    },
}


TOPIC_ALIASES = {
    "heart": [
        "heart attack and chest pain",
        "heart attack",
        "chest pain",
        "heart",
        "myocardial infarction",
    ],
    "stroke": [
        "stroke",
        "brain attack",
    ],
    "house_fire": [
        "house or apartment fire",
        "house fire",
        "home fire",
        "apartment fire",
        "residential fire",
    ],
    "office_fire": [
        "office or commercial building fire",
        "office fire",
        "office building fire",
        "commercial building fire",
        "workplace fire",
    ],
}


HEARTBEAT_PHRASES = [
    "heart beating too much",
    "my heart is beating too much",
    "heart is beating too much",
    "heart beating fast",
    "my heart is beating fast",
    "heart is beating fast",
    "heart beating very fast",
    "heart is beating very fast",
    "heart beating too fast",
    "heart is beating too fast",
    "heart racing",
    "my heart is racing",
    "racing heart",
    "fast heartbeat",
    "rapid heartbeat",
    "pounding heart",
    "heart pounding",
    "heart palpitations",
    "palpitations",
    "heart rate is high",
    "heartbeat is high",
    "heart is pounding",
    "dil bahut tez dhadak raha hai",
    "dil tez dhadak raha hai",
    "mera dil tez dhadak raha hai",
    "dil zor se dhadak raha hai",
]

CHEST_PAIN_PHRASES = [
    "chest pain",
    "chest hurts",
    "pain in my chest",
    "chest pressure",
    "tightness in my chest",
    "tight chest",
    "pain in chest",
    "seene me dard",
    "seene mein dard",
    "seene me jalan",
    "seene mein jalan",
]

STROKE_PHRASES = [
    "possible stroke",
    "signs of stroke",
    "stroke symptoms",
    "face drooping",
    "face is drooping",
    "one side weakness",
    "weakness on one side",
    "slurred speech",
    "difficulty speaking",
    "cannot speak properly",
    "sudden loss of balance",
    "sudden vision loss",
    "sudden severe headache",
    "chehra tedha",
    "bolne me dikkat",
    "bolne mein dikkat",
    "ek taraf kamzori",
]

FIRE_PHRASES = [
    "there is a fire",
    "fire in my house",
    "fire in my home",
    "house is on fire",
    "my house is on fire",
    "apartment is on fire",
    "fire in my apartment",
    "office is on fire",
    "fire in the office",
    "office building fire",
    "commercial building fire",
    "building is on fire",
    "smoke in my house",
    "smoke in the office",
    "trapped in a fire",
    "trapped in smoke",
    "ghar me aag",
    "ghar mein aag",
    "office me aag",
    "office mein aag",
]


def _response(key: str, matched_intent: str) -> dict:
    """Return a fresh, consistently shaped response."""
    template = EMERGENCY_RESPONSES[key]
    return {
        "matched": True,
        "matched_intent": matched_intent,
        "urgency": template["urgency"],
        "title": template["title"],
        "answer": template["answer"],
        "sources": [],
        "disclaimer": template["disclaimer"],
    }


def _topic_key(topic: str) -> Optional[str]:
    normalized_topic = normalize_text(topic)

    # Prefer longer aliases first to avoid broad matches such as "heart".
    aliases = sorted(
        (
            (normalize_text(alias), key)
            for key, values in TOPIC_ALIASES.items()
            for alias in values
        ),
        key=lambda item: len(item[0]),
        reverse=True,
    )

    for alias, key in aliases:
        if alias and f" {alias} " in f" {normalized_topic} ":
            return key

    return None


def get_emergency_response(question: str, topic: str = ""):
    """
    Get a local emergency response for the selected topic or recognized phrase.

    Returns a response dictionary for supported cases, otherwise None.
    This function does not diagnose medical conditions.
    """
    question_text = normalize_text(question)
    selected_topic = _topic_key(topic)

    # Specific symptoms take priority over the currently selected topic.
    # This ensures a stroke warning sign is not answered with generic
    # heart-attack or fire information.
    if contains_phrase(question_text, STROKE_PHRASES):
        return _response("stroke", "possible_stroke")

    if contains_phrase(question_text, HEARTBEAT_PHRASES):
        return _response("heart", "fast_or_pounding_heartbeat")

    if contains_phrase(question_text, CHEST_PAIN_PHRASES):
        return _response("heart", "chest_pain")

    if contains_phrase(question_text, FIRE_PHRASES):
        # Use the selected fire topic if the user has one selected.
        if selected_topic in ("house_fire", "office_fire"):
            return _response(selected_topic, "fire_emergency")
        # Otherwise choose a general home-fire response.
        return _response("house_fire", "fire_emergency")

    # When the user has opened a known emergency topic but asks a general
    # question such as "what should I do?", provide that topic's safety guide.
    if selected_topic:
        return _response(selected_topic, "topic_guidance")

    return None
