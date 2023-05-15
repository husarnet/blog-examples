#!/bin/bash
if [[ ${UID} -ne 0 ]]
then
echo "You are not root user. Run this script as root!"
exit 1
fi
# mount piKVM filesystem in read/write mode
rw
# update piKVM OS packages (this is required)
pacman -Syyu --noconfirm 
# install Husarnet client
curl -s https://install.husarnet.com/install.sh | sudo bash
# set up required husarnet hooks to switch between rw and ro filesystem
mkdir -p /var/lib/husarnet/hook.rw_request.d
echo '#!/bin/bash' > /var/lib/husarnet/hook.rw_request.d/rw.sh
echo 'rw' >> /var/lib/husarnet/hook.rw_request.d/rw.sh
mkdir -p /var/lib/husarnet/hook.rw_release.d
echo '#!/bin/bash' > /var/lib/husarnet/hook.rw_release.d/ro.sh
echo 'ro' >> /var/lib/husarnet/hook.rw_release.d/ro.sh
chmod +x /var/lib/husarnet/hook*/*
husarnet daemon hooks enable
reboot
