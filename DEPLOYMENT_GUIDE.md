# SDM Clothes POS - Render Deployment Guide

## Project Overview
This is a Next.js full-stack application with integrated frontend and backend for a Point of Sale (POS) system for SDM Cloth House.

## Features
- Dashboard with sales analytics
- POS billing system
- Inventory management
- Offline-first operation
- User authentication (Owner/Cashier roles)
- Receipt printing

## Prerequisites
1. **MongoDB Atlas Account** - Free tier available
2. **GitHub Repository** - Already cloned
3. **Render Account** - Free tier available

## Step 1: MongoDB Atlas Setup

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a new cluster (free tier)
4. Create a database user:
   - Username: `sdm-admin`
   - Password: Generate a strong password
5. Configure IP access: Allow access from anywhere (0.0.0.0/0)
6. Get your connection string from Database → Connect → Connect your application

## Step 2: Prepare for Deployment

1. **Install dependencies locally:**
   ```bash
   cd C:\Users\AL RAHMAN LAPTOP\Desktop\sdm-clothes
   npm install
   ```

2. **Test locally:**
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000/setup` to create initial owner account

## Step 3: Deploy to Render

### Option A: Using render.yaml (Recommended)
1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "Add Render deployment configuration"
   git push origin main
   ```

2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click "New" → "Web Service"
4. Connect your GitHub repository
5. Render will automatically detect the `render.yaml` file

### Option B: Manual Configuration
1. Go to Render Dashboard → "New" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `sdm-clothes-pos`
   - **Environment**: `Node`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`

## Step 4: Environment Variables
In Render Dashboard, add these environment variables:

```
MONGODB_URI=mongodb+srv://sdm-admin:YOUR_PASSWORD@cluster.mongodb.net/sdm-clothes
NEXTAUTH_SECRET=your-long-random-secret-at-least-32-characters
NEXTAUTH_URL=https://your-app-name.onrender.com
NODE_ENV=production
```

## Step 5: Deploy and Test
1. Render will automatically build and deploy
2. Once deployed, visit `https://your-app-name.onrender.com/setup`
3. Create your owner account
4. Test the POS system

## Important Notes

### Offline Functionality
The app includes offline-first features:
- Inventory cache in `local-data/inventory_cache.json`
- Pending sales in `local-data/pending_sales.json`
- Auto-sync when connection is restored

### User Roles
- **Owner**: Full access (Dashboard, POS, Inventory, Users)
- **Cashier POS**: POS and Receipt only
- **Cashier Inventory**: POS and Inventory (no delete access)

### Troubleshooting
- If deployment fails, check Render build logs
- Ensure MongoDB URI is correct and accessible
- Verify NEXTAUTH_SECRET is at least 32 characters
- Check that all dependencies are installed

## Production Considerations
- Upgrade to paid Render plan for better performance
- Configure custom domain
- Set up SSL certificates (handled by Render)
- Regular database backups
- Monitor application logs

## Support
For issues:
1. Check Render deployment logs
2. Verify MongoDB connection
3. Test locally first
4. Check environment variables configuration
