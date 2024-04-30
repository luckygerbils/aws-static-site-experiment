#!/bin/bash
set -euo pipefail
if [ -n "${DEBUG:-}" ]; then set -x; fi

BOOTSTRAP_PROFILE=AdministratorAccess
CDK_PROFILE=cdk

private:log() { printf "%s\n" "$@" >&2; }

help() {
    private:log "$0 <task> [[args]]"
    private:log "Tasks:"
    compgen -A function | grep -v '^private:' | sed 's/^/    /'
}

private:sso_login() {
    if ! util:aws --profile "$BOOTSTRAP_PROFILE" sts get-caller-identity >/dev/null; then
        util:aws --profile "$BOOTSTRAP_PROFILE" sso login
    fi
}

util:aws() {
    docker run --rm -it \
        -v ~/.aws:/root/.aws \
        public.ecr.aws/aws-cli/aws-cli "$@"
}

util:node() {
    docker run -it --rm \
        -v ~/.aws:/root/.aws \
        -v "$PWD":/usr/src/app \
        --env JSII_SILENCE_WARNING_UNTESTED_NODE_VERSION=1 \
        --env NPM_CONFIG_UPDATE_NOTIFIER=false \
        -w /usr/src/app \
        docker.io/library/node "$@"
}

util:npm() {
    util:node npm -- "$@"
}

util:npx() {
    util:node npx -- "$@"
}

util:cdk() {
    private:sso_login
    util:npx cdk --profile "${PROFILE:-$CDK_PROFILE}" "$@"
}

bootstrap() {
    PROFILE="$BOOTSTRAP_PROFILE" util:cdk bootstrap \
        --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess
}

"${@:-help}"