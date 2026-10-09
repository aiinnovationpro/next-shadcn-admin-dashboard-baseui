#!/bin/sh
# Start the dashboard at login as a macOS launch agent (production build, 127.0.0.1 only).
# Usage: scripts/launch-agent.sh install | uninstall | status
set -eu

LABEL="com.benalika.akutu-dashboard"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG="$HOME/Library/Logs/akutu-dashboard.log"
DOMAIN="gui/$(id -u)"
REPO="$(cd "$(dirname "$0")/.." && pwd)"

case "${1:-}" in
install)
  # launchd has no nvm: pin the node that is on PATH now. ponytail: re-run install after a node upgrade.
  NODE="$(command -v node)"
  [ -f "$REPO/.next/BUILD_ID" ] || (cd "$REPO" && npm run build)
  cat >"$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE</string>
    <string>$REPO/node_modules/next/dist/bin/next</string>
    <string>start</string>
    <string>-H</string><string>127.0.0.1</string>
    <string>-p</string><string>3100</string>
  </array>
  <key>WorkingDirectory</key><string>$REPO</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
</dict>
</plist>
EOF
  launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true
  launchctl bootstrap "$DOMAIN" "$PLIST"
  echo "installed: $LABEL (log: $LOG)"
  ;;
uninstall)
  launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true
  rm -f "$PLIST"
  echo "uninstalled: $LABEL"
  ;;
status)
  launchctl print "$DOMAIN/$LABEL" | grep -E "state|pid|last exit" || echo "not loaded"
  ;;
*)
  echo "usage: $0 install | uninstall | status" >&2
  exit 2
  ;;
esac
