#!/bin/bash

# Test script for Token Cost Webhook endpoint
# Usage: 
#   ./test-token-cost.sh "Your text to count tokens for" [aws-profile]
#   ./test-token-cost.sh /path/to/file.txt [aws-profile]

if [ -z "$1" ]; then
  echo "Usage: ./test-token-cost.sh <text-or-file-path> [aws-profile]"
  echo ""
  echo "Examples:"
  echo "  ./test-token-cost.sh \"Your text here\""
  echo "  ./test-token-cost.sh ./prompt"
  echo "  ./test-token-cost.sh ./prompt my-aws-profile"
  exit 1
fi

# Check if the first argument is a file
if [ -f "$1" ]; then
  echo "Reading from file: $1"
  INPUT_TEXT=$(cat "$1")
  AWS_PROFILE="${2:-default_okta}"
else
  INPUT_TEXT="$1"
  AWS_PROFILE="${2:-default_okta}"
fi

# Escape the text for JSON
INPUT_TEXT_JSON=$(jq -n --arg text "$INPUT_TEXT" '$text')

echo "Testing Token Cost Webhook..."
echo "Text length: ${#INPUT_TEXT} characters"
echo "AWS Profile: $AWS_PROFILE"
echo ""

curl -X POST http://localhost:3001/api/webhook/tokenCost \
  -H "Content-Type: application/json" \
  -d "{
    \"inputText\": $INPUT_TEXT_JSON,
    \"awsProfile\": \"$AWS_PROFILE\"
  }" | jq .

echo ""
echo "Check http://localhost:3001 to see the event and calculate costs!"
