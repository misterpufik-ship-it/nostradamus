#!/usr/bin/env bash
set -euo pipefail

PROJECT=/srv/deploy/projects/x-active-obuchenie
REPO=$PROJECT/repo
VENV=$PROJECT/venv
USERS=$PROJECT/users.json
CREDS=$PROJECT/builder-credentials.txt

cd "$REPO"
sudo -u deploy git -C "$REPO" fetch origin
sudo -u deploy git -C "$REPO" checkout main
sudo -u deploy git -C "$REPO" pull --ff-only origin main

"$VENV/bin/pip" install -q -r obuchenie/lesson_builder/requirements.txt

SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
install -m 644 deploy/lesson-builder.service /etc/systemd/system/x-active-lesson-builder.service
sed -i "s/CHANGE_ME_ON_SERVER/$SECRET/" /etc/systemd/system/x-active-lesson-builder.service

if [[ ! -f "$USERS" ]]; then
  ADMIN_PW=$(openssl rand -base64 14 | tr -d '/+=' | head -c 16)
  EMP_PW=$(openssl rand -base64 14 | tr -d '/+=' | head -c 16)
  "$VENV/bin/python" scripts/create-builder-user.py admin --role admin --name Admin --users-file "$USERS" --password "$ADMIN_PW"
  "$VENV/bin/python" scripts/create-builder-user.py employee --role employee --name "Сотрудник" --users-file "$USERS" --password "$EMP_PW"
  chown deploy:deploy "$USERS"
  chmod 600 "$USERS"
  printf "admin\t%s\nemployee\t%s\n" "$ADMIN_PW" "$EMP_PW" > "$CREDS"
  chown root:root "$CREDS"
  chmod 600 "$CREDS"
  echo "CREATED_USERS"
else
  echo "USERS_ALREADY_EXIST"
fi

systemctl daemon-reload
systemctl restart x-active-lesson-builder
systemctl is-active x-active-lesson-builder
