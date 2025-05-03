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
	libmariadb-dev
pip3 install gunicorn \
	mysql-connector-python \
	flask
