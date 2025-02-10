# tagging-tool/Dockerfile

# Base image
FROM node:18

# Install Python, pip, and venv
RUN apt-get update && apt-get install -y python3 python3-pip python3-venv

# Set the working directory
WORKDIR /app

# Copy all files to the container
COPY . .

# Create a virtual environment
RUN python3 -m venv /app/venv

# Activate the virtual environment and install dependencies
RUN /app/venv/bin/pip install -r scrapers/requirements.txt

# Install dependencies for both the root and backend
RUN npm install --prefix frontend && npm install --prefix backend

# Build the frontend
RUN npm run build --prefix frontend

# Expose ports for frontend (80) and backend (3000)
EXPOSE 80 5000 5001

# Start both frontend, backend, and Python script
CMD ["sh", "-c", ". /app/venv/bin/activate && python scrapers/main.py & npm start --prefix backend & npx serve -s frontend/build -l 80"]