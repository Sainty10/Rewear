#!/bin/bash
cd "$(dirname "$0")/.." || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo 'Install Node.js 24 from https://nodejs.org, then open this file again.'
  read -r -p 'Press Enter to close.'
  exit 1
fi
if [ ! -d node_modules ]; then
  npm ci || exit 1
fi
(sleep 4; open http://localhost:3000) &
npm run dev
