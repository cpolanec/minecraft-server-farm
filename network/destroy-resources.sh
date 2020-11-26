#!/bin/sh -e

[ -r .env ] && export $(grep -v '^#' .env | xargs)

echo ""
echo "*** Delete Network Foundation stack: $NETWORK_STACK_NAME ***"
echo ""

echo "Deleting the networking foundation and waiting for completion..."
aws cloudformation delete-stack --stack-name $NETWORK_STACK_NAME | jq -rc .
aws cloudformation wait stack-delete-complete --stack-name $NETWORK_STACK_NAME | jq -rc .
echo ""
