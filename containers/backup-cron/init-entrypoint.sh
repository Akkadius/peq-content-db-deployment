#!/usr/bin/env bash

echo "# Backup cron booting..."

while inotifywait -e modify ./backup/*.cron; do bash -c "cat ./backup/*.cron > /tmp/crontab && crontab /tmp/crontab && rm /tmp/crontab; sudo pkill cron; echo '# Installing changed crons...' > /proc/1/fd/1 2>/proc/1/fd/2; sudo cron -f &"; done >/dev/null 2>&1 &

echo "# Installing crons..."
cat ./backup/*.cron > /tmp/crontab && crontab /tmp/crontab && rm /tmp/crontab && sudo cron -f
