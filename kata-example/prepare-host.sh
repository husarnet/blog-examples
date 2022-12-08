#!/bin/bash
# Proper error handling
set -euo pipefail

catch() {
  if [ "$1" != "0" ]; then
    echo "Error $1 has occurred on line $2"
  fi
}
trap 'catch $? $LINENO' EXIT

pushd () {
    builtin pushd "$@" > /dev/null
}

popd () {
    builtin popd "$@" > /dev/null
}


# Intall helper tools
sudo apt-get install -y jq golang-go libelf-dev build-essential git flex bison

# Install kata 1.x runtime
# Based on https://github.com/kata-containers/documentation/blob/master/install/ubuntu-installation-guide.md
ARCH=$(arch)
BRANCH="${BRANCH:-master}"
RELEASE=$(lsb_release -rs)
sudo sh -c "echo 'deb http://download.opensuse.org/repositories/home:/katacontainers:/releases:/${ARCH}:/${BRANCH}/xUbuntu_${RELEASE}/ /' > /etc/apt/sources.list.d/kata-containers.list"
curl -sL  http://download.opensuse.org/repositories/home:/katacontainers:/releases:/${ARCH}:/${BRANCH}/xUbuntu_${RELEASE}/Release.key | sudo apt-key add -
sudo -E apt-get update
sudo -E apt-get -y install kata-runtime kata-proxy kata-shim

# Add the kata runtime to available runtimes
DAEMON_CONFIG_PATH="/etc/docker/daemon.json"

if [ -f ${DAEMON_CONFIG_PATH} ]; then
    ORIGINAL_CONTENT=$(cat ${DAEMON_CONFIG_PATH})
else
    ORIGINAL_CONTENT=""
fi

if [ -z "${ORIGINAL_CONTENT}" ]; then
    ORIGINAL_CONTENT="{}"
fi

echo "${ORIGINAL_CONTENT}" | jq '."runtimes"."kata-runtime".path="/usr/bin/kata-runtime"' | sudo bash -c "cat - > ${DAEMON_CONFIG_PATH}"

sudo systemctl daemon-reload
sudo systemctl restart docker

# Build kernel for the containers with some extra modules

if [ ! -d kata-packaging ]; then
    git clone https://github.com/kata-containers/packaging.git kata-packaging
else
    pushd kata-packaging
    git pull
    popd
fi

pushd kata-packaging/kernel
rm -fr kata-linux-*
./build-kernel.sh setup

CONFIG_FILE="kata-linux-*/.config"

enable_option () {
    option_name=$1
    option_value=${2:-y}
    
    grep "${option_name}" ${CONFIG_FILE} >/dev/null && sed -i "s/^.*${option_name}[ =].*\$/${option_name}=${option_value}/" ${CONFIG_FILE} || echo "${option_name}=${option_value}" >> ${CONFIG_FILE}
}

enable_option CONFIG_IP6_NF_IPTABLES m
enable_option CONFIG_IP6_NF_FILTER m
enable_option CONFIG_TUN m

for kernel_path in kata-linux-*; do
    pushd "${kernel_path}"
    make olddefconfig
    popd
done

./build-kernel.sh build
sudo ./build-kernel.sh install
popd
