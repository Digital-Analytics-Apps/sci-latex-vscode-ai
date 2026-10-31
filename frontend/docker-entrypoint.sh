#!/bin/sh
set -e

# Generate env-config.js from container environment variables (injected via Kubernetes Secret / ConfigMap)
cat <<EOF > /usr/share/nginx/html/env-config.js
window.__ENV__ = {
  VITE_API_URL: "${VITE_API_URL}",
  VITE_WS_URL: "${VITE_WS_URL}"
};
EOF

exec "$@"
