FROM node:20-alpine

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copia os arquivos de manifestos de pacotes
COPY package*.json ./
COPY prisma ./prisma/

# Instala as dependências (incluindo devDependencies para o tsx e prisma CLI)
RUN npm install

# Copia todo o código-fonte
COPY . .

# Gera o Prisma Client durante a construção da imagem
RUN npx prisma generate

EXPOSE 3333

# Executa o servidor em modo de desenvolvimento (tsx watch)
CMD ["npm", "run", "dev"]
