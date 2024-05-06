#!/bin/bash
set -euo pipefail

private:log() { printf "%s\n" "$@" >&2; }

help() {
    private:log "$0 <task> [[args]]"
    private:log "Tasks:"
    compgen -A function | grep -v '^private:' | sed 's/^/    /'
}

util:node() {
    with:node "$@"
    node "$@"
}

build() {
    with:node "$@"
    node esbuild.config.mjs
}

ci:release() {
    npm ci
    node esbuild.config.mjs
}

util:npm() {
    with:node "$@"
    command npm "$@"
}

util:npx() {
    with:node "$@"
    command npx "$@"
}

with:node() {
    if type -ft >/dev/null node; then return; fi
    exec docker run -it --rm \
        -u node \
        -v "$(realpath "$(dirname "$0")/..")":/usr/src/app \
        --env JSII_SILENCE_WARNING_UNTESTED_NODE_VERSION=1 \
        --env NPM_CONFIG_UPDATE_NOTIFIER=false \
        -w /usr/src/app/lambda \
        "${DOCKER_ARGS[@]}" \
        docker.io/library/node "$0" "${FUNCNAME[1]}" "$@"
}

"$@"