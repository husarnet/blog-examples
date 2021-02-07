FROM ubuntu:20.10

# install Husarnet client
RUN apt update -y && \
    apt install -y curl && \
    apt install -y gnupg2 && \
    apt install -y systemd && \
    curl https://install.husarnet.com/install.sh | bash

RUN update-alternatives --set ip6tables /usr/sbin/ip6tables-nft

# install webserver service
RUN apt install -y nginx

# some optional modules
RUN apt install -y vim
RUN apt install -y iputils-ping

# Find your JOINCODE at https://app.husarnet.com
ENV JOINCODE=""
ENV HOSTNAME=my-container-1

# HTTP PORT
EXPOSE 80

# copy project files into the image
COPY init-container.sh /opt
COPY src /var/www/html/

# initialize a container
CMD /opt/init-container.sh