<div align="center"> <img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" /> </div>
Agentic Town – AI Studio Demo App

Agentic Town is an AI-powered living world simulation built as a hackathon demo and proof of concept.
It showcases how autonomous AI agents can think, remember, react, and evolve inside a simulated 2D environment.

This project is currently a work in progress, designed to demonstrate:

Agent-based AI reasoning

Time-aware and memory-aware NPC behavior

Graceful fallback when AI APIs are unavailable

A clean, modular architecture ready for scale

⚠️ Note: This demo currently runs using the Gemini free tier, which has strict API quota limits.
When the quota is exhausted, the system automatically falls back to a local rule-based cognition engine so gameplay continues uninterrupted.
Full AI-driven cognition at scale would require a paid Gemini subscription.

Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio:
👉 https://ai.studio/apps/drive/1V4wBAgChmJeNWcI3VPaCYihvnOlgeTEx

Run Locally
Prerequisites

Node.js (recommended: latest LTS)

Setup Instructions

Install dependencies

npm install


Configure environment variables

Set the GEMINI_API_KEY in
.env.local
 to your Gemini API key

Run the app locally

npm run dev


Once running, the application will start a local development server and load the Agentic Town simulation in your browser.

Project Status

✅ Core agent simulation implemented

✅ NPC thoughts, moods, memory, and time awareness

✅ Player–NPC and NPC–NPC interactions

✅ Robust fallback system for AI API failures

🚧 Ongoing improvements toward richer cognition and deeper emergent behavior

This repository represents an engineering-first demo, focused on reliability, extensibility, and AI-centric design rather than final game polish.
