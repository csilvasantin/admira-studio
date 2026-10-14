#!/bin/sh
# Only inhibit idle sleep while a Starbucks native player runs. Manual lock remains available.
while :; do
  player_pid=$(/usr/bin/pgrep -u "$(/usr/bin/id -u)" -f '/Applications/AdmiraStarbucks(Vertical|VerticalRight|Horizontal(Central)?).app/Contents/MacOS/AdmiraSignageMac' | /usr/bin/head -n 1)
  if [ -n "$player_pid" ]; then /usr/bin/caffeinate -di -w "$player_pid"; fi
  /bin/sleep 5
done
