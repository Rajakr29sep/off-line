

import sqlite3
from pathlib import Path
import sqlite3

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "data" / "index" / "emergency.sqlite3"

DOCUMENTS = [
    {
        "title": "Heart attack and chest pain: emergency response",
        "path": "https://www.redcross.org/take-a-class/resources/learn-first-aid/heart-attack",
        "category": "medical",
        "topic": "Heart attack and chest pain",
        "text": (
            "Possible heart attack emergency. Warning signs can include chest "
            "pressure, squeezing, pain spreading to the arm, neck, jaw or back, "
            "shortness of breath, sweating, nausea, dizziness or unusual fatigue. "
            "Call emergency services immediately if a heart attack is suspected. "
            "In India, call 112. Stop activity, help the person rest in a "
            "comfortable position, stay with them, and monitor responsiveness "
            "and breathing while awaiting help. Do not delay medical care."
        ),
    },
    {
        "title": "Stroke: recognize and respond",
        "path": "https://www.stroke.org.uk/",
        "category": "medical",
        "topic": "Stroke",
        "text": (
            "A possible stroke is an emergency. Look for sudden face drooping, "
            "weakness or numbness on one side, trouble speaking or understanding, "
            "sudden vision changes, balance problems, or a severe sudden headache. "
            "Call emergency services immediately; in India call 112. Record the "
            "time symptoms began or when the person was last known well. Stay "
            "with the person and monitor breathing and responsiveness. Do not "
            "give food, drink or medication unless directed by a qualified "
            "medical professional. Do not wait for symptoms to disappear."
        ),
    },
    {
        "title": "House or apartment fire: immediate actions",
        "path": "https://www.gov.uk/government/publications/make-your-home-safe-from-fire/fire-safety-in-the-home-accessible-version",
        "category": "fire",
        "topic": "House or apartment fire",
        "text": (
            "If there is a fire, alert others and leave immediately using a "
            "safe exit. Do not stop to collect belongings or attempt to fight "
            "a dangerous fire. If there is smoke, stay low while escaping. "
            "If safe to do so, close doors behind you. Do not open a door that "
            "feels hot. Once safely outside, call emergency services; in India "
            "call 112. Never re-enter a burning building. If trapped, close "
            "yourself in a room away from smoke, block gaps under the door if "
            "possible, call for help and communicate your location."
        ),
    },
    {
        "title": "Office or commercial building fire: evacuation",
        "path": "https://www.gov.uk/government/publications/make-your-home-safe-from-fire/fire-safety-in-the-home-accessible-version",
        "category": "fire",
        "topic": "Office or commercial building fire",
        "text": (
            "When a fire alarm sounds or a fire is discovered, follow the "
            "building's emergency plan and instructions from fire wardens "
            "or emergency responders. Leave by a safe marked exit and use "
            "stairs rather than lifts when evacuating. Do not collect "
            "belongings or re-enter the building. If smoke blocks the route, "
            "do not enter dense smoke; move to a safer area, call emergency "
            "services and tell them your exact location and floor. In India, "
            "call 112. Follow building-specific instructions because evacuation "
            "procedures can vary."
        ),
    },
]


def main():
    if not DB_PATH.exists():
        raise SystemExit(
            f"Database not found: {DB_PATH}\n"
            "Run your existing index builder first to create the schema."
        )

    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("PRAGMA busy_timeout=5000")

        for doc in DOCUMENTS:
            cursor = conn.execute(
                """
                INSERT INTO passages
                    (source_zim, title, article_path, category, topic, chunk_text)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    "curated-offline-guidance (not ZIM)",
                    doc["title"],
                    doc["path"],
                    doc["category"],
                    doc["topic"],
                    doc["text"],
                ),
            )

            row_id = cursor.lastrowid

            conn.execute(
                """
                INSERT INTO passages_fts
                    (rowid, title, article_path, category, topic, chunk_text)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    row_id,
                    doc["title"],
                    doc["path"],
                    doc["category"],
                    doc["topic"],
                    doc["text"],
                ),
            )

        conn.commit()

        count = conn.execute(
            "SELECT COUNT(*) FROM passages"
        ).fetchone()[0]

        print(f"Added {len(DOCUMENTS)} offline guidance passages.")
        print(f"Total passages in database: {count}")
        print(f"Database: {DB_PATH}")


if __name__ == "__main__":
    main()
