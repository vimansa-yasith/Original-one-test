FROM node:20-bullseye-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 💡 මෙතනින් package-lock.json කියන එක අයින් කළා මචන්
COPY package.json ./ 

# 🚀 npm ci වෙනුවට npm install පාවිච්චි කිරීම
RUN npm install --omit=dev

COPY . .

EXPOSE 3001
CMD ["node", "index.js"]
