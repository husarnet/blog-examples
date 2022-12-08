FROM ubuntu:20.10

RUN apt update -y
RUN apt install -y curl gnupg2 systemd
RUN curl https://install.husarnet.com/install.sh | bash

RUN update-alternatives --set ip6tables /usr/sbin/ip6tables-nft

COPY startup.sh /usr/bin/startup.sh
CMD startup.sh
