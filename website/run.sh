#!/bin/bash
set -euo pipefail
private:log() { printf "%s\n" "$@" >&2; }

HOST_NAME=beta.plants.anasta.si
CERT_DIR=/home/sanasta/credentials/certificates/$HOST_NAME/config/live/$HOST_NAME
HTTPS_KEY=$CERT_DIR/privkey.pem
HTTPS_CERT=$CERT_DIR/fullchain.pem

help() {
    private:log "$0 <task> [[args]]"
    private:log "Tasks:"
    compgen -A function | grep -v '^private:' | sed 's/^/    /'
}

with:node() {
    if type -t >/dev/null node; then return; fi
    exec docker run -it --rm \
        -v ~/.aws:/home/node/.aws \
        -v "$PWD":/usr/src/app \
        -u node \
        --env JSII_SILENCE_WARNING_UNTESTED_NODE_VERSION=1 \
        --env NPM_CONFIG_UPDATE_NOTIFIER=false \
        -w /usr/src/app \
        "${DOCKER_ARGS[@]}" \
        docker.io/library/node "$0" "${FUNCNAME[1]}" "$@"
}

dev() {
    DOCKER_ARGS=(
        -p 0.0.0.0:3000:3000
        -v "$HTTPS_KEY:$HTTPS_KEY"
        -v "$HTTPS_CERT:$HTTPS_CERT"
    )
    with:node "$@"

    npx next dev \
        --port 3000 \
        --hostname 0.0.0.0 \
        --experimental-https \
        --experimental-https-key "$HTTPS_KEY" \
        --experimental-https-cert "$HTTPS_CERT"
}

build() {
    with:node "$@"
    npx next build
}

ci:release() {
    npm ci
    npx next build
}

register-dns() {
    private:register-dns \
        beta.plants.anasta.si \
        $(ip -json -family inet addr | jq -r 'map(select(.ifname != "lo" and (.ifname | test("^docker") | not))) | .[0].addr_info[0].local')
}
private:register-dns() {
    ../run.sh private:sso_login

    local RECORD_NAME=$1
    local VALUE=$2
    local response change_id change_status
    private:log "Creating A record $RECORD_NAME with value $VALUE"

    response=$(
        ../run.sh with:aws --color off --profile AdministratorAccess \
            route53 change-resource-record-sets \
            --hosted-zone-id Z3PODT6L2Y6659 \
            --change-batch "$(
                jq -n \
                --arg RECORD_NAME "$RECORD_NAME" \
                --arg VALUE "$VALUE" \
                '{
                    "Changes": [
                        {
                            "Action": "UPSERT",
                            "ResourceRecordSet": {
                                "Type": "A",
                                "Name": $RECORD_NAME,
                                "TTL": 60,
                                "ResourceRecords": [
                                    {
                                        "Value": $VALUE
                                    }
                                ]
                            }
                        }
                    ]
                }'
            )" 2>&1
    )

    change_id=$(echo "$response" | jq -r .ChangeInfo.Id)
    change_status=$(echo "$response" | jq -r .ChangeInfo.Status)
    while [ "$change_status" = "PENDING" ]; do
        private:log "Change status is $change_status"
        sleep 1
        response=$(../run.sh with:aws --profile certbot route53 get-change --id "$change_id")
        change_status=$(echo "$response" | jq -r .ChangeInfo.Status)
    done

    private:log "Change status is $change_status"
    if [ "$change_status" != "INSYNC" ]; then
        exit 1
    fi
}

"$@"