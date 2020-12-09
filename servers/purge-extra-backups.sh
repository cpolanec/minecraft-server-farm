#!/bin/sh -e

[ -r .env ] && export $(grep -v '^#' .env | xargs)

echo ""
echo "*** Delete Minecraft game server backups ***"
echo ""

#
# get stack names to evaluate for snapshot deletions
#

all_stack_names=`aws ec2 describe-snapshots \
  --filters \
      Name=tag:Application,Values=minecraft \
      Name=tag:Environment,Values=${ENVIRONMENT} \
  | jq -r '[.Snapshots[].Tags[] | select(.Key=="Stack").Value] | unique[]'`

#
# keep last three snapshots
#

for stack in $all_stack_names; do

  echo "Deleting volume snapshots from stack $stack ..."

  del_snapshot_ids=`aws ec2 describe-snapshots \
    --filters Name=tag:Stack,Values=${stack} \
    | jq -r ".Snapshots | sort_by(.StartTime) | reverse[${GAME_DATA_BACKUP_COUNT}:][].SnapshotId"`

  for snapshot_id in $del_snapshot_ids; do
    echo "  |- deleting snapshot $snapshot_id ..."
    aws ec2 delete-snapshot --snapshot-id $snapshot_id | jq  -rc .
  done

  echo ""

done