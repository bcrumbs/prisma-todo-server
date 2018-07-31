#!/bin/sh

if [ $# -eq 0 ]; then
  npm run start
else
  exec "$@"
fi
