#!/bin/bash
# generate-tour-audio.sh — Tour Guide Audio Generator
# Chinese trips: zh-CN-XiaoxiaoNeural (lively, expressive)
# English trips: en-US-Nova:DragonHDLatestNeural (same as Manifestation app)
# Usage: ./scripts/generate-tour-audio.sh trips/chongqing-2026-08.json

AZURE_KEY=$(security find-generic-password -a "azure-tts" -s "azure-tts-key" -w 2>/dev/null)
REGION="southeastasia"
OUTPUT_DIR="audio"

if [ -z "$AZURE_KEY" ]; then
  echo "ERROR: Azure TTS key not found in Keychain."
  exit 1
fi

TRIP_FILE="${1:-trips/chongqing-2026-08.json}"

if [ ! -f "$TRIP_FILE" ]; then
  echo "ERROR: Trip file not found: $TRIP_FILE"
  exit 1
fi

TRIP_ID=$(python3 -c "import json,sys; d=json.load(open('$TRIP_FILE')); print(d['id'])")
LANGUAGE=$(python3 -c "import json,sys; d=json.load(open('$TRIP_FILE')); print(d['language'])")
echo "Generating audio for: $TRIP_ID (language: $LANGUAGE)"
mkdir -p "$OUTPUT_DIR"

generate() {
  local filename=$1
  local ssml=$2
  echo "  → $filename"
  curl -s -X POST \
    "https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1" \
    -H "Ocp-Apim-Subscription-Key: ${AZURE_KEY}" \
    -H "Content-Type: application/ssml+xml" \
    -H "X-Microsoft-OutputFormat: audio-48khz-192kbitrate-mono-mp3" \
    -d "$ssml" \
    -o "${OUTPUT_DIR}/${filename}"
  sleep 1
  SIZE=$(ls -lh "${OUTPUT_DIR}/${filename}" | awk '{print $5}')
  echo "    Done: $SIZE"
}

# Read places from JSON and generate audio for each
python3 - "$TRIP_FILE" "$TRIP_ID" "$LANGUAGE" "$OUTPUT_DIR" << 'PYEOF'
import json, sys, subprocess, os, time

trip_file, trip_id, language, output_dir = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]

with open(trip_file, 'r', encoding='utf-8') as f:
    trip = json.load(f)

azure_key = subprocess.check_output(
    ['security', 'find-generic-password', '-a', 'azure-tts', '-s', 'azure-tts-key', '-w'],
    stderr=subprocess.DEVNULL
).decode().strip()

region = 'southeastasia'

def generate(filename, ssml):
    import urllib.request
    url = f'https://{region}.tts.speech.microsoft.com/cognitiveservices/v1'
    req = urllib.request.Request(url, data=ssml.encode('utf-8'), method='POST')
    req.add_header('Ocp-Apim-Subscription-Key', azure_key)
    req.add_header('Content-Type', 'application/ssml+xml')
    req.add_header('X-Microsoft-OutputFormat', 'audio-48khz-192kbitrate-mono-mp3')
    with urllib.request.urlopen(req) as resp:
        data = resp.read()
    path = os.path.join(output_dir, filename)
    with open(path, 'wb') as f:
        f.write(data)
    size = os.path.getsize(path)
    print(f'    ✓ {filename} ({size//1024}KB)')
    time.sleep(1)

for place in trip['places']:
    pid = place['id']
    filename = f"{trip_id}-{pid}.mp3"

    practical_text = '。'.join(place['practical']) if language == 'zh' else '. '.join(place['practical'])
    food_items = [f for f in place['food'] if not f.startswith('📖')]
    food_text = '。'.join(food_items) if language == 'zh' else '. '.join(food_items)

    if language == 'zh':
        script = f"{place['name']}！{place['hook']} 实用贴士：{practical_text}。素食美食推荐：{food_text}。"
        ssml = f'''<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN">
  <voice name="zh-CN-XiaoxiaoNeural">
    <prosody rate="-5%" pitch="+8%">
      {script}
    </prosody>
  </voice>
</speak>'''
    else:
        script = f"{place['name']}! {place['hook']} Here are some practical tips: {practical_text}. Food highlights: {food_text}."
        ssml = f'''<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
  <voice name="en-US-Nova:DragonHDLatestNeural">
    <prosody rate="-10%" pitch="+5%">
      {script}
    </prosody>
  </voice>
</speak>'''

    print(f'  Generating: {place["name"]} → {filename}')
    try:
        generate(filename, ssml)
    except Exception as e:
        print(f'  ✗ Error: {e}')

print(f'\nAll done! Audio files in {output_dir}/')
PYEOF
