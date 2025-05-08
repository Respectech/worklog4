#!/bin/bash

# Exit on error
set -e

# Ensure the script is run with sudo
if [ "$EUID" -ne 0 ]; then
    echo "Please run this script with sudo"
    exit 1
fi

# Update and upgrade system packages
apt update
apt upgrade -y

# Install required packages
apt install -y git \
    vim \
    python3 \
    python3-pip \
    mariadb-server \
    mariadb-client \
    build-essential \
    libssl-dev \
    libffi-dev \
    python3-dev \
    libmariadb-dev \
    gunicorn \
    python3-flask \
    nginx \
    python3-gevent

# Install Python package
pip3 install mysql-connector-python --break-system-packages

# Ensure worklog user exists
if ! id "worklog" >/dev/null 2>&1; then
    echo "Creating worklog user..."
    useradd -m -s /bin/bash worklog
fi

# Ensure www-data group exists
if ! getent group www-data >/dev/null; then
    echo "Creating www-data group..."
    groupadd www-data
fi

# Ensure worklog user is in www-data group
if ! groups worklog | grep -q www-data; then
    echo "Adding worklog user to www-data group..."
    usermod -aG www-data worklog
fi

# Ensure worklog4 directory exists and has correct permissions
WORKLOG_DIR="/home/worklog/worklog4"
if [ ! -d "$WORKLOG_DIR" ]; then
    echo "Creating $WORKLOG_DIR..."
    mkdir -p "$WORKLOG_DIR"
    chown worklog:www-data "$WORKLOG_DIR"
    chmod 775 "$WORKLOG_DIR"
fi

# Define the systemd service file
SERVICE_FILE="/etc/systemd/system/myapp.service"
SERVICE_CONTENT="[Unit]
Description=Gunicorn instance for myapp
After=network.target

[Service]
User=worklog
Group=www-data
WorkingDirectory=/home/worklog/worklog4
ExecStart=/usr/bin/gunicorn --threads 4 --worker-class gevent -w 16 -b 0.0.0.0:8000 app:app

[Install]
WantedBy=multi-user.target"

# Create or update the systemd service file
if [ ! -f "$SERVICE_FILE" ] || ! cmp -s <(echo "$SERVICE_CONTENT") "$SERVICE_FILE"; then
    echo "Creating or updating $SERVICE_FILE..."
    echo "$SERVICE_CONTENT" > "$SERVICE_FILE"
    chmod 644 "$SERVICE_FILE"
    chown root:root "$SERVICE_FILE"
    # Reload systemd daemon
    systemctl daemon-reload
    # Enable the service to start on boot
    systemctl enable myapp.service
    # Start the service
    systemctl start myapp.service
    echo "myapp.service created and started"
else
    echo "$SERVICE_FILE is already up to date"
fi

# Verify the service status
systemctl status myapp.service
