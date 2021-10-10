#!/bin/bash
echo "Starting test validator with Serum dex..."
solana-test-validator -r --bpf-program 9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin deps/serum_dex.so 1>/dev/null &

anchor build &&\
anchor deploy &&\
ts-node localnet-migrate.ts
