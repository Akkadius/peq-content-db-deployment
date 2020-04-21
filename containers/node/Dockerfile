FROM node:13.13.0-stretch

RUN apt-get update && apt-get install -y \
	bash \
	vim \
	wget \
	git \
	tzdata \
	&& rm -rf /var/lib/apt/lists/*

RUN npm install -g nodemon forever
RUN chown node /home/node

USER node

EXPOSE 8080 3000

WORKDIR /home/node/
