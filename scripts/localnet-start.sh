#!/bin/bash
set -euo pipefail

# source ./common.sh

VALIDATOR_OUT="./validator-stdout.txt"

main () {
    echo "Cleaning old output files..."
    rm -rf test-ledger
    rm -f $VALIDATOR_OUT

    echo "Starting test validator..."
    solana-test-validator -r \
        --bpf-program 9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin ../deps/serum_dex.so \
        --bpf-program JPv1rCqrhagNNmJVM5J1he7msQ5ybtvE1nNuHpDHMNU ../target/deploy/jet.so \
        --bpf-program test2Jds58cDo5cGk8eLFbdhW2doamw9xDAYKjTkbW5 ../target/deploy/test_writer.so 1>/dev/null &

    sleep 2

    echo "build and deploy jet..."
    anchor build &&\
    anchor deploy &&\
    ts-node localnet-migrate.ts
    
    echo "Validator PID: $validator_pid"
    echo "Localnet running..."
	echo "Ctl-c to exit."
    echo "run 'kill $(ps aux | grep 'solana-test-validator' | awk '{print $2}')' terminate the solana-test-validator."		
    wait 
}

main