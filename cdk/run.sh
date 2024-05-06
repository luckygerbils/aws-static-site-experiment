#!/bin/bash
set -euo pipefail

private:log() { printf "%s\n" "$@" >&2; }

help() {
    private:log "$0 <task> [[args]]"
    private:log "Tasks:"
    compgen -A function | grep -v '^private:' | sed 's/^/    /'
}

cdk() {
    with:node "$@"
    npx cdk --profile "${PROFILE:-cdk}" "$@"
}

npm() {
    with:node "$@"
    command npm "$@"
}

node() {
    with:node "$@"
    command node "$@"
}

cdk:deploy() {
    ../run.sh private:sso_login
    cdk deploy "$@"
}

cdk:bootstrap() {
    ../run.sh private:sso_login
    PROFILE=AdministratorAccess \
        cdk bootstrap \
        --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess
}

ci:synth() {
    npm ci
    npx cdk synth
}

with:node() {
    if type -ft >/dev/null node; then return; fi
    exec docker run -it --rm \
        -v ~/.aws:/home/node/.aws \
        -v "$(realpath "$(dirname "$0")/..")":/usr/src/app \
        -u node \
        --env JSII_SILENCE_WARNING_UNTESTED_NODE_VERSION=1 \
        --env NPM_CONFIG_UPDATE_NOTIFIER=false \
        -w /usr/src/app/cdk \
        "${DOCKER_ARGS[@]}" \
        docker.io/library/node "$0" "${FUNCNAME[1]}" "$@"
}

"$@"