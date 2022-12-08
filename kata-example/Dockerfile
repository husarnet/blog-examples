FROM ubuntu:20.10

# Install Husarnet Client
RUN apt update -y

RUN apt install -y curl gnupg2 systemd

RUN curl https://install.husarnet.com/install.sh | bash

# This is important on Kata runtime as it's kernel is using the legacy API
RUN update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy

# Install misc tools, SSH server and configure auth as you like
RUN apt install -y vim fonts-emojione iputils-ping

RUN apt install -y openssh-server sudo 
RUN useradd -rm -d /home/johny -g root -G sudo -s /bin/bash -u 123 johny
RUN echo 'johny:johny' | chpasswd
RUN echo "You're in!" > /etc/motd
RUN mkdir -p -m 0755 /var/run/sshd

# Find your JOINCODE at https://app.husarnet.com
ENV JOINCODE=""
ENV HOSTNAME=my-container-1

# SSH
EXPOSE 22

COPY init-container.sh /opt
CMD /opt/init-container.sh