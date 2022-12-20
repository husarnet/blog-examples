FROM ubuntu:22.04
ARG DEBIAN_FRONTEND=noninteractive

RUN apt update -y && apt install -y curl gnupg2 nginx systemd ffmpeg build-essential libmicrohttpd-dev libjansson-dev libnice-dev libssl-dev libsofia-sip-ua-dev libglib2.0-dev libopus-dev libogg-dev libini-config-dev libcollection-dev pkg-config gengetopt libtool autotools-dev automake libconfig-dev git make sudo iputils-ping vim
RUN curl -s https://install.husarnet.com/install.sh | bash

# Install libsrtp
RUN cd ~ && \
    git clone https://github.com/cisco/libsrtp.git && \
    cd libsrtp && \
    git checkout v2.2.0 && \
    ./configure --prefix=/usr --enable-openssl && \
    make shared_library && \
    sudo make install

# Install janus
RUN cd ~ && \
    git clone https://github.com/meetecho/janus-gateway && \
	cd janus-gateway && \
	git checkout 414edcae7955b924f8a434909fafe243c2ad8d6c && \
    sh autogen.sh && \
    ./configure --disable-websockets --disable-data-channels --disable-rabbitmq --disable-docs --prefix=/opt/janus && \
    make && \
    sudo make install && \
    sudo make configs

RUN mkdir -p /var/www/html && cp -r /opt/janus/share/janus/demos/. /var/www/html
RUN rm -rf /var/www/html/favicon.ico

# utility to list and change control options for a camera, eg.
# v4l2-ctl -d /dev/video0 --list-ctrls
# v4l2-ctl --set-ctrl=exposure_auto=1
RUN apt install -y v4l-utils alsa-utils

# install python dependencies
RUN sudo apt install python3 python-pkg-resources python3-pkg-resources python3-pip -y
RUN pip3 install websockets

# Husarnet credentials. Find your JOINCODE at https://app.husarnet.com
ENV JOINCODE=""
ENV HOSTNAME=my-webrtc-streamer

# Audio settings
ENV AUDIO=true
ENV CAM_AUDIO_CHANNELS=2

# Advanced (keep default)
ENV TEST=false
ENV ENABLE_BASE_SERVER_FORWARDING=0

EXPOSE 80 7088 8088 8188 8089
EXPOSE 10000-10200/udp
EXPOSE 8000-8010/udp

# Configure janus
COPY conf/*.jcfg  /opt/janus/etc/janus/

# copy project files into the image
COPY init-container.sh /opt
COPY *.sh /opt/
COPY frontend_src /var/www/html/

WORKDIR /app
COPY backend_src /app/

# initialize a container
CMD /opt/init-container.sh
