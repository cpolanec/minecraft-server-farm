#!/bin/sh -e

[ -r .env ] && export $(grep -v '^#' .env | xargs)

echo ""
echo "*** Deploy EC2 Launch Templates ***"
echo ""

echo "Launch Template Deployment Parameters:"
echo "  |- stack name = $EC2_TEMPLATES_STACK_NAME"
echo ""

echo "Validating the CloudFormation template..."
aws cloudformation validate-template \
  --template-body file://./templates/aws-ec2-templates.yml \
  > templates/aws-ec2-templates.validated.json
echo ""

echo "Deploying the Launch Templates..."
aws cloudformation deploy \
  --stack-name $EC2_TEMPLATES_STACK_NAME \
  --role-arn $CLOUDFORMATION_ROLE_ARN \
  --template-file templates/aws-ec2-templates.yml \
  --no-fail-on-empty-changeset \
  --parameter-overrides \
    Environment=$ENVIRONMENT \
    NetworkStackName=$NETWORK_STACK_NAME \
    SshKeyName=$SSH_KEY_NAME \
    MinecraftRconPassword=$MINECRAFT_RCON_PASSWORD
echo ""
