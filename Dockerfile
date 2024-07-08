FROM node:16-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . /app

EXPOSE 3000 3307

CMD ["npm", "run", "start"]
