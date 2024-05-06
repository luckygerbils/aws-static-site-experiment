#!/bin/bash
set -euo pipefail
if [ -n "${DEBUG:-}" ]; then set -x; fi

private:log() { printf "%s\n" "$@" >&2; }

help() {
    private:log "$0 <task> [[args]]"
    private:log "Tasks:"
    compgen -A function | grep -v '^private:' | sed 's/^/    /'
}

private:sso_login() {
    if ! with:aws --profile AdministratorAccess sts get-caller-identity >/dev/null; then
        with:aws --profile AdministratorAccess sso login
    fi
}

with:aws() {
    docker run --rm \
        -v ~/.aws:/root/.aws \
        public.ecr.aws/aws-cli/aws-cli "$@"
}

in:cdk() {
    pushd cdk
    ./run.sh "$@"
    popd
}

in:website() {
    pushd website
    ./run.sh "$@"
    popd
}

in:lambda() {
    pushd lambda
    ./run.sh "$@"
    popd
}

build-and-deploy() {
    in:website build
    in:lambda build
    in:cdk cdk:deploy PipelineStack/StaticSiteStage/AwsStaticSiteExperimentStack
}

ci:synth() {
    in:website ci:release
    in:lambda ci:release
    in:cdk ci:synth
}

"${@:-help}"