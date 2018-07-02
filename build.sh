#!/usr/bin/env bash

DEST_PATH="../atricoware-server/routes/shooterbingo/public"
rm -rf $DEST_PATH && wait
cp -R ./public $DEST_PATH && wait
cd ../atricoware-server && wait
git checkout public/icons
