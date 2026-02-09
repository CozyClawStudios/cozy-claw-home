#!/bin/bash
# Poll Companion House message queue and forward to OpenClaw
# Run via cron every 10 seconds

QUEUE_FILE="/home/zak/.openclaw/workspace/cozy-claw-studio/shared-house/.clawbot-queue.jsonl"
SEEN_FILE="/home/zak/.openclaw/workspace/cozy-claw-studio/shared-house/.seen-by-cron"

# Create seen file if it doesn't exist
touch "$SEEN_FILE"

# Check if queue file exists
if [[ ! -f "$QUEUE_FILE" ]]; then
    exit 0
fi

# Read queue file line by line
tail -50 "$QUEUE_FILE" | while IFS= read -r line; do
    # Skip empty lines
    [[ -z "$line" ]] && continue
    
    # Check if we've already processed this message
    if echo "$line" | grep -q '"id":'; then
        msg_id=$(echo "$line" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
        
        if grep -q "$msg_id" "$SEEN_FILE" 2>/dev/null; then
            continue
        fi
        
        # Mark as seen
        echo "$msg_id" >> "$SEEN_FILE"
        
        # Extract content and forward
        content=$(echo "$line" | grep -o '"content":"[^"]*"' | head -1 | cut -d'"' -f4)
        
        if [[ -n "$content" ]]; then
            # Forward via openclaw CLI
            cd /home/zak/.openclaw/workspace
            openclaw sessions send --session-key "agent:main:main" --message "[Companion House] $content" 2>/dev/null
        fi
    fi
done
