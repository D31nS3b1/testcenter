ARG NODE_VERSION=14.15.0

FROM node:${NODE_VERSION}

WORKDIR /app
COPY package.json .
RUN npm install

COPY docs /app/docs
COPY scripts /app/scripts
COPY sampledata /app/sampledata
COPY test /app/test

RUN mkdir /app/tmp

# for dredd
RUN echo "{\"testcenterUrl\": \"http://testcenter-backend\"}" > /app/test/dredd/config/dredd_test_config.json
COPY /backend/vendor/iqb-berlin /app/backend/vendor/iqb-berlin

# will be overwritten by makefile
CMD ["sleep", "infinity"]
