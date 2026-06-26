#!/usr/bin/env python3
"""
Tour Guide Content Generator
Usage: python3 scripts/generate.py
Follow the prompts to generate guide content for a trip.
"""

import os, json, re
import anthropic

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

COUNTRY_LANG = {
    "china": "zh", "taiwan": "zh", "中国": "zh", "台湾": "zh",
    "chongqing": "zh", "重庆": "zh", "beijing": "zh", "shanghai": "zh",
    "taipei": "zh",
}

def detect_language(destination: str) -> str:
    dest_lower = destination.lower()
    for key, lang in COUNTRY_LANG.items():
        if key in dest_lower:
            return lang
    return "en"

def generate_place(name: str, date: str, time_slot: str, category: str, language: str) -> dict:
    if language == "zh":
        prompt = f"""你是一位经验丰富的旅游导览作家。请为以下地点生成一份旅游指南内容，以JSON格式输出。

地点：{name}
日期安排：{date} {time_slot}
类别：{category}

请输出以下JSON结构（只输出JSON，不要其他内容）：
{{
  "id": "根据地点名称生成的英文ID，小写，用短横线连接",
  "name": "{name}",
  "date": "{date}",
  "time": "{time_slot}",
  "category": "{category}",
  "emoji": "一个最能代表此地点的emoji",
  "hook": "100-150字的情感钩子，让家人真正想来这个地方。用生动、有温度的语言描述这里的独特之处和故事感。",
  "practical": [
    "至少5条实用贴士，包括最佳时间、注意事项、交通、票价、着装等"
  ],
  "food": [
    "3-4条美食推荐，具体到菜名和大概价格"
  ]
}}"""
    else:
        prompt = f"""You are an experienced travel guide writer. Generate tour guide content for the following place in JSON format.

Place: {name}
Schedule: {date} {time_slot}
Category: {category}

Output ONLY this JSON structure (no other text):
{{
  "id": "english-id-based-on-place-name-lowercase-hyphenated",
  "name": "{name}",
  "date": "{date}",
  "time": "{time_slot}",
  "category": "{category}",
  "emoji": "one emoji that best represents this place",
  "hook": "100-150 word emotional hook that makes family members genuinely want to visit. Use vivid, warm language about what makes this place unique and meaningful.",
  "practical": [
    "at least 5 practical tips covering best time to visit, what to watch out for, transport, tickets, what to wear, etc."
  ],
  "food": [
    "3-4 specific food recommendations with dish names and approximate prices"
  ]
}}"""

    print(f"  Generating content for: {name}...")
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}]
    )

    raw = message.content[0].text.strip()
    # Extract JSON if wrapped in markdown code block
    match = re.search(r'```(?:json)?\s*([\s\S]*?)```', raw)
    if match:
        raw = match.group(1).strip()

    return json.loads(raw)

def main():
    print("\n=== Family Tour Guide — Content Generator ===\n")

    # Trip details
    trip_title = input("Trip title (e.g. 重庆之旅 / Norway Winter): ").strip()
    destination = input("Destination (e.g. Chongqing, China): ").strip()
    month = input("Month (e.g. August 2026 / 2026年8月): ").strip()
    trip_id = input("Trip ID for filename (e.g. chongqing-2026-08): ").strip()

    language = detect_language(destination)
    print(f"\nLanguage detected: {'Chinese (中文)' if language == 'zh' else 'English'}")

    # Itinerary input
    print("\nPaste your itinerary below.")
    print("Format: one place per line as: Place Name | Day 1 | Morning | Category")
    print("(Category examples: 地标/Landmark, 古镇/Old Town, 美食/Food, 体验/Experience)")
    print("Type 'DONE' on a new line when finished.\n")

    places_raw = []
    while True:
        line = input().strip()
        if line.upper() == 'DONE':
            break
        if '|' in line:
            parts = [p.strip() for p in line.split('|')]
            if len(parts) >= 4:
                places_raw.append(parts[:4])
            else:
                print(f"  Skipping (need 4 fields): {line}")

    if not places_raw:
        print("No places entered. Exiting.")
        return

    print(f"\nGenerating content for {len(places_raw)} places...\n")

    places = []
    for name, date, time_slot, category in places_raw:
        try:
            place = generate_place(name, date, time_slot, category, language)
            places.append(place)
            print(f"  ✓ Done: {name}")
        except Exception as e:
            print(f"  ✗ Error for {name}: {e}")

    trip_data = {
        "id": trip_id,
        "title": trip_title,
        "destination": destination,
        "language": language,
        "month": month,
        "places": places
    }

    output_path = f"trips/{trip_id}.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(trip_data, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Saved to {output_path}")
    print(f"\nNext steps:")
    print(f"1. Add '{trip_id}' to TRIPS_MANIFEST in js/app.js")
    print(f"2. Add the new JSON file to the cache list in sw.js")
    print(f"3. Push to GitHub — the app will update automatically")

if __name__ == '__main__':
    main()
