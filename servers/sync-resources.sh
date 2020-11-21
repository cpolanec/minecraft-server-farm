#!/bin/sh -e

[ -r .env ] && export $(grep -v '^#' .env | xargs)

#
# validate the CloudFormation template
#

echo "Validating the CloudFormation template..."
aws cloudformation validate-template \
  --template-body file://./servers/aws-ec2-instance.yml \
  > servers/aws-ec2-instance.validated.json

#
# iterate over all the server configs
#

server_dir="servers/${ENVIRONMENT}"
for propfile in `ls ${server_dir}`; do
  #
  # gather deployment parameters
  #

  propfile_path=${server_dir}/${propfile}
  name=`basename $propfile .properties`
  stack_name="minecraft-server-${ENVIRONMENT}-${name}"

  snapshot_id=`grep gamedata.snapshot.id= $propfile_path | cut -d'=' -f2`
  
  lt_id_key=`grep launchtemplate.id.key= $propfile_path | cut -d'=' -f2`
  lt_id=`aws cloudformation describe-stacks --stack-name $EC2_TEMPLATES_STACK_NAME \
    | jq -r ".Stacks[0].Outputs[] | select(.OutputKey==\"${lt_id_key}\").OutputValue"` 

  lt_version_key=`grep launchtemplate.version.key= $propfile_path | cut -d'=' -f2`
  lt_version=`aws cloudformation describe-stacks --stack-name $EC2_TEMPLATES_STACK_NAME \
    | jq -r ".Stacks[0].Outputs[] | select(.OutputKey==\"${lt_version_key}\").OutputValue"` 

  echo ""
  echo "*** Deploy Minecraft server: $name ***"
  echo ""

  echo "Server Deployment Parameters:"
  echo "  |- stack name              = $stack_name"
  echo "  |- properties file         = $propfile"
  echo "  |- snapshot id             = $snapshot_id"
  echo "  |- launch template id      = $lt_id"
  echo "  |- launch template version = $lt_version"
  echo ""

  #
  # deploy cloudformation template with instance and volume
  #

  echo "Deploying EC2 instance and EBS volume..."
  aws cloudformation deploy \
    --stack-name $stack_name \
    --role $CLOUDFORMATION_ROLE_ARN \
    --template-file servers/aws-ec2-instance.yml \
    --no-fail-on-empty-changeset \
    --parameter-overrides \
      Environment=$ENVIRONMENT \
      NetworkStackName=$NETWORK_STACK_NAME \
      GameDataSnapshotId=$snapshot_id \
      LaunchTemplateId=$lt_id \
      LaunchTemplateVersion=$lt_version
  echo ""

  #
  # gather deployment outputs
  #

  instance_id=`aws cloudformation describe-stacks --stack-name $stack_name \
    | jq -r '.Stacks[0].Outputs[] | select(.OutputKey == "InstanceId").OutputValue'`
  volume_id=`aws cloudformation describe-stacks --stack-name $stack_name \
    | jq -r '.Stacks[0].Outputs[] | select(.OutputKey == "VolumeId").OutputValue'`

  echo "Server Deployment Outputs:"
  echo "  |- instance id = $instance_id"
  echo "  |- volume id   = $volume_id"
  echo ""

  #
  # attaching volume (if not already attached)
  #

  attached_state=`aws ec2 describe-volumes --volume-ids $volume_id \
    | jq -r '.Volumes[0].Attachments[0].State'`
  if [ ! $attached_state = "attached" ]; then
    echo "Attaching EBS volume to EC2 instance then rebooting instance..."
    aws ec2 attach-volume \
      --device /dev/sdm \
      --instance-id $instance_id \
      --volume-id $volume_id \
      | jq -rc .
    aws ec2 wait volume-in-use --volume-ids $volume_id | jq -rc .
    aws ec2 reboot-instances --instance-ids $instance_id | jq -rc .
    echo ""
  fi
done