FROM node:0.12
MAINTAINER Masato Shimizu <ma6ato@gmail.com>

RUN mkdir -p /app
WORKDIR /app

COPY package.json /app/
RUN mkdir -p /dist/node_modules && \
    ln -s /dist/node_modules /app/node_modules && \
    npm install
COPY . /app
ENTRYPOINT ["npm","start"]
CMD []




