import argparse
import csv
import json
import os

import mysql.connector


def parse_float(value):
    if value is None:
        return None
    value = str(value).strip()
    if not value:
        return None
    try:
        return float(value)
    except ValueError:
        return None


def main():
    parser = argparse.ArgumentParser(description="Import initiatives from a CSV into MySQL.")
    parser.add_argument("csv_path", help="Path to the CSV file to import.")
    parser.add_argument("--purge", action="store_true", help="Delete existing initiatives before import.")
    parser.add_argument("--status", default="approved", help="Status value to set on imported rows.")
    parser.add_argument("--user-id", type=int, default=2, help="User id to assign to imported rows.")
    args = parser.parse_args()

    db = mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "geocollect"),
        port=int(os.getenv("DB_PORT", "3306")),
    )
    cursor = db.cursor()

    if args.purge:
        cursor.execute("DELETE FROM initiatives")
        db.commit()

    with open(args.csv_path, newline="", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        for row in reader:
            initiative = (row.get("Nom de l'initiative") or "").strip() or "Sans nom"
            description = (row.get("Commentaire écrit") or "").strip()

            village = (row.get("Lieu de l'initiative (village)") or "").strip()
            commune = (row.get("Lieu de l'initiative (commune)") or "").strip()

            actor_type = (row.get("Type d'acteur") or "").strip()
            year = (row.get("Année de début de l'initiative") or "").strip() or None

            activities_raw = (row.get("Maillon chaine de valeur ou activité") or "").strip()
            activities = (
                json.dumps([a.strip() for a in activities_raw.split(",") if a.strip()])
                if activities_raw
                else json.dumps([])
            )

            email = (row.get("Email") or "").strip()
            phone = (row.get("Numéro de téléphone") or "").strip()
            person_name = (row.get("Nom de la personne interrogée") or "").strip()
            website = (row.get("Site Internet") or "").strip()
            social = (row.get("Réseaux sociaux") or "").strip()
            social_media = json.dumps([social]) if social else json.dumps([])

            lon = parse_float(row.get("x"))
            lat = parse_float(row.get("y"))

            sql = """
            INSERT INTO initiatives (
                initiative, description, village, commune,
                zone_intervention, actor_type, year, activities,
                lat, lon, contact_email, contact_phone, person_name,
                website, social_media, videos, extra_fields,
                status, user_id
            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,
                      %s,%s,%s,%s,%s,%s,%s,%s,%s,
                      %s,%s)
            """
            values = (
                initiative,
                description,
                village,
                commune,
                None,
                actor_type,
                year,
                activities,
                lat,
                lon,
                email,
                phone,
                person_name,
                website,
                social_media,
                json.dumps([]),
                json.dumps({}),
                args.status,
                args.user_id,
            )
            cursor.execute(sql, values)

    db.commit()
    cursor.close()
    db.close()

    print("✔ Import terminé avec succès.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
