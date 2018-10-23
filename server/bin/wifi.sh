#!/bin/bash
WIFI_NAME=$1
echo "search $1"

connmanctl scan wifi
WIFI_ID="$(connmanctl services | grep "$WIFI_NAME" | sed 's/.*\(wifi_.*\)/\1/')"
echo "WIFI_ID $WIFI_ID"
connmanctl connect "$WIFI_ID"