# Posts Manager

## Overview
A simple CRUD application for managing posts and comments using a JSON-based database.

## Project Structure
- `server.js` - Node.js HTTP server that serves static files and provides REST API
- `main.js` - Frontend JavaScript handling all UI interactions
- `db.json` - JSON database file storing posts, comments, and profile data
- `Index.html` - Home page
- `posts.html` - Posts management page
- `comments.html` - Comments management page  
- `profile.html` - Profile page
- `Kaboom/` - Shared assets (CSS, header/footer components)

## Running the Application
The application runs on port 5000 using `node server.js`.

## API Endpoints
- `GET/POST /posts` - List or create posts
- `GET/PATCH/DELETE /posts/:id` - Get, update, or delete a post
- `GET/POST /comments` - List or create comments
- `GET/PATCH/DELETE /comments/:id` - Get, update, or delete a comment
- `GET/PATCH /profile` - Get or update profile

## Recent Changes
- 2026-01-30: Set up for Replit environment with custom server.js replacing json-server
