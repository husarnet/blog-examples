ARG ARCH
FROM husarnet/husarnet:$ARCH
SHELL ["/usr/bin/bash", "-c"]
ARG DEBIAN_FRONTEND=noninteractive
RUN apt-get update -y
RUN apt-get install nginx -y
COPY nginx.conf /etc/nginx/nginx.conf
CMD bash -c "husarnet-docker & nginx -g 'daemon off;'"