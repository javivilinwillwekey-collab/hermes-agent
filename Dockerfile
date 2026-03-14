FROM node:20

# Instalar dependencias del sistema y GitHub CLI
RUN apt-get update && apt-get install -y curl wget git && \
    mkdir -p -m 755 /etc/apt/keyrings && \
    wget -qO- https://cli.github.com/packages/githubcli-archive-keyring.gpg | tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null && \
    chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null && \
    apt-get update && apt-get install -y gh && \
    # Instalar gog (Google Workspace CLI)
    wget https://github.com/steipete/gog/releases/latest/download/gog_linux_amd64 -O /usr/local/bin/gog && \
    chmod +x /usr/local/bin/gog && \
    # Limpiar
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

ENV PORT=7860
EXPOSE 7860

# Usar el script de inicio optimizado
CMD ["npm", "start"]
