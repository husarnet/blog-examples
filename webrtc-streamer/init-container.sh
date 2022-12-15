#!/bin/bash

function get_status() {
    local status="success"

    while read line; do
        if [[ $line == *"ERROR"* ]]; then
            status="waiting..."
        fi
    done
    echo $status
}

function get_ipv6() {
    local ipv6addr="::"
    
    while read line; do
        if [[ $line == *"Husarnet IP address:"* ]]; then
            ipv6addr=${line#*"Husarnet IP address: "}
        fi
    done
    
    echo $ipv6addr
}

function print_instruction() {
    local ipv6addr=$( get_ipv6 )
    
    echo "*******************************************"
    echo "💡 Tip"
    echo "To access a live video stream visit:"
    echo "👉 http://[${ipv6addr}]:80/ 👈"
    echo "in your web browser 💻" 
    echo "*******************************************"
    echo ""
}


if [[ ${JOINCODE} == "" ]]; then
    echo ""
    echo "ERROR: no JOINCODE provided in \"docker run ... \" command. Visit https://app.husarnet.com to get a JOINCODE"
    echo ""
    /bin/bash
    exit
fi

echo ""
echo "🔥 Connecting to Husarnet network as \"${HOSTNAME}\":"
husarnet-daemon 2>/dev/null &
husarnet join ${JOINCODE} ${HOSTNAME}
echo "done"
echo ""

# start a web server
nginx
print_instruction < <(husarnet status)

SUPPORTED=$( python3 check_support.py) 


if [[ ${SUPPORTED} == 'True' ]];
then
echo "H264"
mv -f  /opt/janus/etc/janus/janus.plugin.streaming.h264.jcfg  /opt/janus/etc/janus/janus.plugin.streaming.jcfg 
else
echo "VP8"
mv -f  /opt/janus/etc/janus/janus.plugin.streaming.vp8.jcfg  /opt/janus/etc/janus/janus.plugin.streaming.jcfg 
fi

python3 websocket_server.py &
/opt/janus/bin/janus --nat-1-1=${DOCKER_IP}


/bin/bash
