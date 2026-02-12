#!/bin/bash
# ============================================
# Agentclaw VPS Setup Script
# Run this on a fresh Ubuntu 22.04+ VPS
# ONE COMMAND SETUP -- just clone and run
# ============================================

echo ">>> Updating system..."
sudo apt update && sudo apt upgrade -y

echo ">>> Installing Git..."
sudo apt install -y git

echo ">>> Installing Node.js 22..."
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

echo ">>> Installing OpenClaw..."
npm install -g openclaw@latest

echo ">>> Cloning Agentclaw repo..."
cd ~
git clone https://github.com/YOUR_USERNAME/agentclaw.git
cd agentclaw

echo ">>> Copying config files..."
mkdir -p ~/.openclaw
mkdir -p ~/.openclaw/skills
cp SOUL.md ~/.openclaw/SOUL.md
cp config.json ~/.openclaw/config.json
cp .env ~/.openclaw/.env

echo ">>> Loading API keys..."
source ~/.openclaw/.env
echo 'source ~/.openclaw/.env' >> ~/.bashrc

echo ">>> Running OpenClaw onboard wizard..."
openclaw onboard --install-daemon

echo ">>> Installing skills..."
npx playbooks add skill openclaw/skills --skill twitter
npx playbooks add skill openclaw/skills --skill crypto-prices
npx playbooks add skill openclaw/skills --skill web-browse

echo ">>> Installing SMS verification service for auto X account creation..."
npm install -g puppeteer-extra puppeteer-extra-plugin-stealth

echo ""
echo "============================================"
echo "  Setup complete!"
echo "  The AI will now:"
echo "  1. Create its own Gmail account"
echo "  2. Create its own X account from this VPS"
echo "  3. Set up profile (pic, banner, bio)"
echo "  4. Start posting and trading 24/7"
echo ""
echo "  Start the agent: openclaw start"
echo "============================================"