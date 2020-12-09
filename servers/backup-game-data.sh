#!/bin/sh -e

[ -r .env ] && export $(grep -v '^#' .env | xargs)

echo ""
echo "*** Backup Minecraft server data ***"
echo ""

#
# get stack names to be backed up
#

timestamp=`date "+%Y%m%d%H%M%S"`
subnet_id=`aws cloudformation describe-stacks --stack-name $NETWORK_STACK_NAME \
  | jq -r '.Stacks[0].Outputs[] | select(.OutputKey=="SubnetId").OutputValue'`
all_stack_names=`aws ec2 describe-instances \
  --filters Name=subnet-id,Values=${subnet_id} \
  --query 'Reservations[*].Instances[*].{Id:InstanceId,Tags:Tags}' \
  | jq -r '.[][].Tags[] | select(.Key=="aws:cloudformation:stack-name").Value'`

#
# stop Minecraft servers for safe backup process
#

for stack in $all_stack_names; do
  instance_id=`aws cloudformation describe-stacks --stack-name $stack \
    | jq -r '.Stacks[0].Outputs[] | select(.OutputKey == "InstanceId").OutputValue'`

  echo "Stopping EC2 instance $instance_id (if not already stopped) ..."
  aws ec2 stop-instances --instance-ids $instance_id | jq -rc .
  echo ""
done

#
# create volume snapshots after instances have stopped
#

for stack in $all_stack_names; do
  instance_id=`aws cloudformation describe-stacks --stack-name $stack \
    | jq -r '.Stacks[0].Outputs[] | select(.OutputKey == "InstanceId").OutputValue'`
  volume_id=`aws cloudformation describe-stacks --stack-name $stack \
    | jq -r '.Stacks[0].Outputs[] | select(.OutputKey == "VolumeId").OutputValue'`

  echo "Waiting for instance $instance_id to stop ..."
  aws ec2 wait instance-stopped --instance-ids $instance_id | jq -rc .
  echo ""

  echo "Creating snapshot of volumme $volume_id ..."
  aws ec2 create-snapshot \
    --volume-id $volume_id \
    --description ${stack}-${timestamp} \
    --tag-specification \
      "ResourceType=snapshot,Tags=[\
        {Key=Application, Value=minecraft}, \
        {Key=Environment, Value=${ENVIRONMENT}}, \
        {Key=Name, Value=${stack}-${timestamp}}, \
        {Key=Stack, Value=$stack}, \
        {Key=Event, Value=github-push}, \
        {Key=Timestamp, Value=$timestamp} \
      ]" | jq -rc .
  echo ""
done

#
# wait for snapshots to complete
#
snapshot_ids=`aws ec2 describe-snapshots \
  --filters \
    Name=tag:Application,Values=minecraft \
    Name=tag:Environment,Values=test \
    Name=tag:Timestamp,Values=$timestamp \
  | jq -r '.Snapshots[].SnapshotId'`
if [ -n "$snapshot_ids" ]; then
  echo "Waiting for snapshots to complete ..."
  aws ec2 wait snapshot-completed --snapshot-ids $snapshot_ids 
  echo ""
fi
