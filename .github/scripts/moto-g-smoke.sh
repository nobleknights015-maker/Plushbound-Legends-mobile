#!/usr/bin/env bash
set -euo pipefail

PACKAGE="com.plushbound.legends"
APK="plushbound-moto-g-test.apk"

wait_for_editor_ready() {
  local phase="$1"
  local log_file="$2"
  local max_attempts="${3:-30}"
  local attempt pid

  for attempt in $(seq 1 "$max_attempts"); do
    adb logcat -d > "$log_file"
    if grep -q 'PLUSHBOUND_EDITOR_NOT_READY' "$log_file"; then
      echo "Editor reported NOT_READY during $phase."
      return 1
    fi
    if grep -q 'PLUSHBOUND_EDITOR_READY' "$log_file"; then
      echo "Editor ready during $phase (attempt $attempt/$max_attempts)."
      return 0
    fi
    pid=$(adb shell pidof "$PACKAGE" 2>/dev/null | tr -d '\r' || true)
    if [ "$attempt" -ge 5 ] && [ -z "$pid" ]; then
      echo "Plushbound process exited before readiness during $phase."
      return 1
    fi
    sleep 2
  done

  adb logcat -d > "$log_file"
  echo "Timed out waiting for editor readiness during $phase."
  return 1
}

assert_process_alive() {
  local phase="$1"
  local pid
  pid=$(adb shell pidof "$PACKAGE" 2>/dev/null | tr -d '\r' || true)
  if [ -z "$pid" ]; then
    echo "Plushbound process is not alive during $phase."
    return 1
  fi
  echo "Plushbound process alive during $phase (pid $pid)."
}

adb wait-for-device
adb shell wm size 720x1600
adb shell wm density 270
adb logcat -c

echo "Installing clean engine/editor APK on Moto G class emulator..."
adb install -r "$APK"

echo "Cold launching Plushbound editor..."
adb shell monkey -p "$PACKAGE" -c android.intent.category.LAUNCHER 1 >/dev/null
wait_for_editor_ready "cold launch" moto-g-editor-startup-logcat.txt 30
assert_process_alive "cold launch"

echo "Capturing editor startup diagnostics..."
grep -E 'PlushboundEditor|chromium|cr_' moto-g-editor-startup-logcat.txt | tee moto-g-editor-startup-diagnostics.txt || true

echo "Proving real editor modules executed in Android WebView..."
grep -q 'PLUSHBOUND_EDITOR_READY' moto-g-editor-startup-logcat.txt
! grep -q 'PLUSHBOUND_EDITOR_NOT_READY' moto-g-editor-startup-logcat.txt

echo "Recording initial memory footprint..."
adb shell dumpsys meminfo "$PACKAGE" | tee moto-g-meminfo-initial.txt

echo "Running constrained interaction smoke..."
adb shell monkey -p "$PACKAGE" --pct-touch 35 --pct-motion 20 --pct-nav 15 --pct-majornav 10 --pct-appswitch 5 --throttle 80 -s 20261022 180 >/dev/null || true
sleep 3
assert_process_alive "interaction smoke"

echo "Background / foreground lifecycle check..."
adb shell input keyevent KEYCODE_HOME
sleep 2
adb shell monkey -p "$PACKAGE" -c android.intent.category.LAUNCHER 1 >/dev/null
sleep 4
assert_process_alive "background/foreground"

echo "Rotation lifecycle check..."
adb shell settings put system accelerometer_rotation 0 || true
adb shell settings put system user_rotation 1 || true
sleep 3
assert_process_alive "landscape rotation"
adb shell settings put system user_rotation 0 || true
sleep 3
assert_process_alive "portrait rotation"
adb shell settings put system accelerometer_rotation 1 || true

echo "Memory pressure check..."
adb shell am send-trim-memory "$PACKAGE" RUNNING_LOW || true
sleep 2
assert_process_alive "low-memory trim"

echo "Force-stop / clean relaunch check..."
adb shell am force-stop "$PACKAGE"
sleep 1
adb logcat -c
adb shell monkey -p "$PACKAGE" -c android.intent.category.LAUNCHER 1 >/dev/null
wait_for_editor_ready "force-stop relaunch" moto-g-editor-relaunch-logcat.txt 30
assert_process_alive "force-stop relaunch"

adb shell dumpsys meminfo "$PACKAGE" | tee moto-g-meminfo-final.txt
adb shell dumpsys gfxinfo "$PACKAGE" framestats | tee moto-g-gfxinfo.txt || true
adb logcat -d > moto-g-logcat.txt

echo "Checking for application crashes and ANRs..."
grep -E -A12 -B5 'FATAL EXCEPTION|ANR in com\.plushbound\.legends|Process com\.plushbound\.legends .* has died' moto-g-logcat.txt | tee moto-g-crash-scan.txt || true
if grep -E -A12 -B5 'FATAL EXCEPTION|ANR in com\.plushbound\.legends|Process com\.plushbound\.legends .* has died' moto-g-logcat.txt | grep -q 'com.plushbound.legends'; then
  echo "Crash/ANR signature detected for Plushbound."
  exit 1
fi

echo "Moto G class editor simulation gate passed."
