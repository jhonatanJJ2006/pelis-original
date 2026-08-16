FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache git python3 make g++

RUN git clone --depth 1 https://github.com/consumet/api.consumet.org.git . \
  && npm install --omit=dev

ENV PORT=3000
ENV REDIS_HOST=redis
ENV REDIS_PORT=6379

EXPOSE 3000

CMD ["node", "src/main.js"]
