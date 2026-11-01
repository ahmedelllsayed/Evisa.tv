#!/bin/sh
set -e
mkdir -p /app/.data/uploads
chown -R nextjs:nodejs /app/.data/uploads
exec su-exec nextjs node server.js
