FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Create a valid tsconfig.json file
RUN cat > tsconfig.json << 'EOL'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "outDir": "dist",
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["*.ts"],
  "exclude": ["node_modules", "dist"]
}
EOL

# Copy source code
COPY . .

# Build the project
RUN npm run build

# Set executable permissions
RUN chmod +x dist/index.js

# Command to run the server
CMD ["node", "dist/index.js"] 