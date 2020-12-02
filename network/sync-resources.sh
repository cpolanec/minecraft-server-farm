#!/bin/sh -e

[ -r .env ] && export $(grep -v '^#' .env | xargs)

echo ""
echo "*** Deploy Networking Foundation ***"
echo ""

echo "Networking Deployment Parameters:"
echo "  |- environment = $ENVIRONMENT"
echo "  |- stack name  = $NETWORK_STACK_NAME"
echo ""

echo "Validating the CloudFormation template..."
aws cloudformation validate-template \
  --template-body file://./network/aws-vpc-foundation.yml \
  > network/aws-vpc-foundation.validated.json
echo ""

echo "Deploying the Networking foundation..."
aws cloudformation deploy \
  --stack-name $NETWORK_STACK_NAME \
  --role-arn $CLOUDFORMATION_ROLE_ARN \
  --template-file network/aws-vpc-foundation.yml \
  --no-fail-on-empty-changeset \
  --parameter-overrides Environment=$ENVIRONMENT
echo ""
