FROM node:18-alpine

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar todas las dependencias (incluyendo devDependencies para TypeScript)
RUN npm ci && npm cache clean --force

# Copiar código fuente
COPY . .

# Compilar TypeScript
RUN npm run build

# Eliminar devDependencies después del build para reducir tamaño
RUN npm prune --production && npm cache clean --force

# Exponer el puerto (Render asignará el puerto automáticamente)
EXPOSE 10000

# Comando para iniciar la aplicación
CMD ["npm", "start"]
