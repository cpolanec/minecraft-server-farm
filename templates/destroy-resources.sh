#!/bin/sh

[ -r .env ] && export $(grep -v '^#' .env | xargs)

echo ""
echo "*** Delete EC2 Launch Template stack: $EC2_TEMPLATES_STACK_NAME ***"
echo ""

echo "Deleting the launch templates and waiting for completion..."
aws cloudformation delete-stack --stack-name $EC2_TEMPLATES_STACK_NAME | jq -rc .
aws cloudformation wait stack-delete-complete --stack-name $EC2_TEMPLATES_STACK_NAME | jq -rc .
echo ""
