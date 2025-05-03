#!/bin/bash

apt update
apt upgrade
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
	nginx
pip3 install mysql-connector-python --break-system-packages
