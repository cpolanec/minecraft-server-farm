#!/bin/sh -e

[ -r .env ] && export $(grep -v '^#' .env | xargs)

#
# parse command arguments
#

delete_all=1
while [ "$1" != "" ]; do
  param=`echo $1 | cut -d'=' -f1`
  value=`echo $1 | cut -d'=' -f2`
  case $param in
    --all)
      delete_all=1
      ;;
    --only-orphans)
      delete_all=0
      ;;
    *)
      echo "ERROR: unknown parameter \"$param\""
      exit 1
      ;;
  esac
  shift
done

#
# get stack names to be deleted
#

subnet_id=`aws cloudformation describe-stacks --stack-name $NETWORK_STACK_NAME \
  | jq -r '.Stacks[0].Outputs[] | select(.OutputKey=="SubnetId").OutputValue'`
all_stack_names=`aws ec2 describe-instances \
  --filters Name=subnet-id,Values=${subnet_id} \
  --query 'Reservations[*].Instances[*].{Id:InstanceId,Tags:Tags}' \
  | jq -r '.[][].Tags[] | select(.Key=="aws:cloudformation:stack-name").Value'`

del_stack_names=$all_stack_names
if [ $delete_all -ne 1 ]; then
  # create list of stacks that have configuration definitions
  def_stack_names=""
  for propfile in `ls servers/${ENVIRONMENT}`; do
    def_stack_names="$def_stack_names `basename $propfile .properties`"
  done

  # create list of stacks that are missing configuration definitions
  del_stack_names=""
  for stack in $all_stack_names; do
    [ `echo $def_stack_names | grep -w $stack` ] && del_stack_names="$del_stack_names $stack"
  done
fi

for stack in $del_stack_names; do
  echo ""
  echo "*** Delete Minecraft server stack: $stack ***"
  echo ""

  #
  # detach volume from instance
  #

  instance_id=`aws cloudformation describe-stacks --stack-name $stack \
    | jq -r '.Stacks[0].Outputs[] | select(.OutputKey == "InstanceId").OutputValue'`
  volume_id=`aws cloudformation describe-stacks --stack-name $stack \
    | jq -r '.Stacks[0].Outputs[] | select(.OutputKey == "VolumeId").OutputValue'`

  echo "Stopping EC2 instance $instance_id ..."
  aws ec2 stop-instances --force --instance-ids $instance_id | jq -rc .
  aws ec2 wait instance-stopped --instance-ids $instance_id | jq -rc .
  echo ""

  echo "Detaching EBS volume $volume_id ..."
  aws ec2 detach-volume --volume-id $volume_id | jq -rc .
  aws ec2 wait volume-available --volume-id $volume_id | jq -rc .
  echo ""

  #
  # delete cloudformation stack
  #

  echo "Request deletion of cloudformation stack..."
  aws cloudformation delete-stack --stack-name $stack | jq -rc .
  echo ""
done

echo ""
echo "*** Wait for stack delete operations to complete ***"
echo ""
for stack in $del_stack_names; do
  #
  # wait for stack deletion to complete
  #

  echo "Waiting for stack $stack to complete delete operations..."
  aws cloudformation wait stack-delete-complete --stack-name $stack | jq -rc .
  echo ""
done
