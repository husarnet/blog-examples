#!/bin/bash
set -euo pipefail

if [[ ${UID} -ne 0 ]]; then
    echo "You are not root user. Run this script as root!"
    exit 1
fi

echo "If you encounter errors update piKVM OS packages, using:"
echo "pacman -Syyu --noconfirm"

# piKVM specific: Setup required Husarnet hooks to switch between rw and ro filesystem automatically
rw

mkdir -p /var/lib/husarnet/hook.rw_request.d
mkdir -p /var/lib/husarnet/hook.rw_release.d

cat << 'EOF' > /var/lib/husarnet/hook.rw_request.d/rw.sh
#!/bin/bash
rw
EOF

cat << 'EOF' > /var/lib/husarnet/hook.rw_release.d/ro.sh
#!/bin/bash
ro
EOF

chmod +x /var/lib/husarnet/hook.rw_request.d/rw.sh
chmod +x /var/lib/husarnet/hook.rw_release.d/ro.sh

cat << 'EOF' > /var/lib/husarnet/config.json
{
    "user-settings": {
        "enableHooks": "true"
    }
}
EOF

# Actually install Husarnet client
cd /tmp
wget https://nightly.husarnet.com/pacman/armv7h/husarnet-2.0.295-armv7h.pkg -O /tmp/husarnet_pikvm.pkg
pacman -U /tmp/husarnet_pikvm.pkg --noconfirm

# Back to readonly mode
ro
