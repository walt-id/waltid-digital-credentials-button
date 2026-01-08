#!/usr/bin/env bash
set -euo pipefail

# Build the web-demo image from the repo root so all packages are included.
docker build --no-cache -f apps/web-demo/Dockerfile -t waltid/digital-credentials .

# Push the freshly built image.
docker push waltid/digital-credentials

# Bounce the pod to pick up the new image (k8s will recreate it).
current_pod=$(kubectl get pods --no-headers -n demo-portal | awk '/waltid-digital-credentials/ {print $1; exit 0}')
if [ -n "${current_pod}" ]; then
  echo "Deleting current pod: ${current_pod}"
  kubectl delete pod "${current_pod}" -n demo-portal
else
  echo "No existing waltid-digital-credentials pod found; continuing."
fi

echo "Waiting for new waltid-digital-credentials pod to become ready..."
new_pod=""
for i in {1..60}; do
  new_pod=$(kubectl get pods --no-headers -n demo-portal | awk '/waltid-digital-credentials/ {print $1; exit 0}')
  if [ -n "${new_pod}" ]; then
    # Ensure it's ready before proceeding.
    if kubectl get pod "${new_pod}" -n demo-portal 2>/dev/null | awk 'NR==2 {print $2}' | grep -q '^1/1$'; then
      status=$(kubectl get pod "${new_pod}" -n demo-portal -o jsonpath='{.status.phase}')
      if [ "${status}" = "Running" ]; then
        echo "Pod ${new_pod} is Running and Ready."
        break
      fi
    fi
  fi
  sleep 2
done

if [ -z "${new_pod}" ]; then
  echo "Failed to find new waltid-digital-credentials pod after waiting."
  exit 1
fi

echo "Following logs for pod: ${new_pod}"
kubectl logs -f "${new_pod}" -n demo-portal
