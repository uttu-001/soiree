#!/bin/bash
# scripts/test_api.sh — Quick API smoke test
# Run from repo root: bash scripts/test_api.sh
# Requires: server running on localhost:8000

BASE="http://localhost:8000/api/v1"
echo "=== Soirée API Smoke Test ==="

echo ""
echo "1. Health check"
curl -s $BASE/../health | python3 -m json.tool

echo ""
echo "2. Create event"
EVENT=$(curl -s -X POST $BASE/events/ \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "birthday",
    "venue_mode": "hybrid",
    "location": "Lucknow",
    "start_hour": 20,
    "budget": 5000,
    "guest_count": 6,
    "guests": [
      {"name": "Anjali", "dietary_tags": ["Veg"]},
      {"name": "Rahul", "dietary_tags": []}
    ],
    "dietary_tags": [],
    "health_focus": 40,
    "notes": "Anjali birthday surprise"
  }')
echo $EVENT | python3 -m json.tool
EVENT_ID=$(echo $EVENT | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "Created event ID: $EVENT_ID"

echo ""
echo "3. List events"
curl -s $BASE/events/ | python3 -m json.tool

echo ""
echo "4. Get single event"
curl -s $BASE/events/$EVENT_ID | python3 -m json.tool

echo ""
echo "5. Update event (patch budget)"
curl -s -X PATCH $BASE/events/$EVENT_ID \
  -H "Content-Type: application/json" \
  -d '{"budget": 6000}' | python3 -m json.tool

echo ""
echo "6. Generate plan for this event"
echo "(streaming — first 500 chars)"
curl -s -X POST $BASE/plans/generate \
  -H "Content-Type: application/json" \
  -d "{
    \"event_type\": \"birthday\",
    \"venue_mode\": \"hybrid\",
    \"location\": \"Lucknow\",
    \"start_hour\": 20,
    \"budget\": 6000,
    \"guest_count\": 6,
    \"guests\": [{\"name\": \"Anjali\", \"dietary_tags\": [\"Veg\"]}],
    \"dietary_tags\": [],
    \"health_focus\": 40,
    \"notes\": \"Anjali birthday surprise\"
  }" | head -c 500

echo ""
echo ""
echo "=== All tests passed ==="