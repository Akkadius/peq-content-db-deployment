#!/usr/bin/env bash

CWD=$(pwd)
source $CWD/.env

cd /tmp/

#############################################
# mysqldump
#############################################

echo "# Dumping database and compressing"
MYSQL_BACKUP_NAME=${MARIADB_DATABASE}-$(date +"%m-%d-%Y")
mysqldump --lock-tables=false -uroot -p${MARIADB_ROOT_PASSWORD} -h mariadb ${MARIADB_DATABASE} > /tmp/${MYSQL_BACKUP_NAME}.sql
tar -zcvf ${MYSQL_BACKUP_NAME}.tar.gz ${MYSQL_BACKUP_NAME}.sql

#############################################
# upload
#############################################

echo "# Uploading database snapshot"
dropbox_uploader.sh upload ${MYSQL_BACKUP_NAME}.tar.gz database-snapshots/${MYSQL_BACKUP_NAME}.tar.gz

#############################################
# deployment folder
#############################################
echo "# Backing up entire deployment..."
DEPLOYMENT_BACKUP_NAME=deployment-peq-cdn-$(date +"%m-%d-%Y")
sudo tar -zcvf ${DEPLOYMENT_BACKUP_NAME}.tar.gz -C ~/ .
echo "# Uploading entire deployment..."
dropbox_uploader.sh upload ${DEPLOYMENT_BACKUP_NAME}.tar.gz deployment-backups/${MYSQL_BACKUP_NAME}.tar.gz

IFS='
'

#############################################
# prune snapshots
#############################################
BACKUP_RETENTION=90
BACKUP_PATH=database-snapshots
echo "# Truncating ${BACKUP_PATH} days back ${BACKUP_RETENTION}"
OUTPUT=$($CWD/backup/dropbox-list-truncation-files.pl ${BACKUP_PATH} ${BACKUP_RETENTION})
for x in $OUTPUT; do dropbox_uploader.sh delete ${BACKUP_PATH}/$x; done

#############################################
# prune deployments
#############################################
BACKUP_RETENTION=90
BACKUP_PATH=deployment-backups
echo "# Truncating ${BACKUP_PATH} days back ${BACKUP_RETENTION}"
OUTPUT=$($CWD/backup/dropbox-list-truncation-files.pl ${BACKUP_PATH} ${BACKUP_RETENTION})
for x in $OUTPUT; do dropbox_uploader.sh delete ${BACKUP_PATH}/$x; done

#############################################
# cleanup
#############################################
echo "# Cleaning up..."
sudo rm -rf /tmp/*

