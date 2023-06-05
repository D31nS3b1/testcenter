FROM node:16.19-bullseye as dev

ARG NODE_ENV=development

RUN apt update && apt install -y chromium

WORKDIR /app

COPY frontend/package*.json ./
RUN npm install

COPY frontend/angular.json .
COPY frontend/tsconfig.json .
COPY frontend/src /app/src
COPY common /common
COPY definitions /definitions

# ng build needs to run once here, otherwise the Angular compiler Ivy bugs out
RUN npx ng build --configuration dev

EXPOSE 4200

CMD ["npx", "ng", "serve", "--configuration", "dev", "--disable-host-check", "--host", "0.0.0.0"]

#===================================
FROM dev as builder

RUN npx ng build --configuration production --output-path=dist --output-hashing all

#===================================
FROM nginx:1.23 as prod

COPY --from=builder /app/dist /usr/share/nginx/html
COPY ./frontend/config/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]