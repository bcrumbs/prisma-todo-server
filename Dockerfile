FROM node:alpine

COPY . /usr/src/app

WORKDIR /usr/src/app

ARG prisma_server

RUN npm config set unsafe-perm true \
    && npm i \
    && npm i -g prisma graphql-cli \
    && sed -i "s/localhost/$prisma_server/g" prisma/prisma.yml \
    && sed -i "s/localhost:4466/$prisma_server:4466/g" .graphqlconfig.yml \
    && sed -i "s/localhost:4466/$prisma_server:4466/g" src/index.js \
    && ping -c 1 prisma \
    && prisma deploy

EXPOSE 4000

ENTRYPOINT ["/bin/sh", "docker-entrypoint.sh"]
