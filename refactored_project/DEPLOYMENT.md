# Deployment Guide

## Quick Start with Docker

1. **Clone the project**
2. **Run with Docker Compose:**
   ```bash
   cd blockchain-qr-attendance
   docker-compose up -d
   ```
3. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8001
   - MongoDB: localhost:27017

## Manual Deployment

### Backend Deployment
1. Install Python 3.11+
2. Create virtual environment: `python -m venv venv`
3. Activate: `source venv/bin/activate` (Linux/Mac) or `venv\Scripts\activate` (Windows)
4. Install dependencies: `pip install -r requirements.txt`
5. Set environment variables in `.env`
6. Run: `uvicorn server:app --host 0.0.0.0 --port 8001`

### Frontend Deployment
1. Install Node.js 18+
2. Install dependencies: `yarn install`
3. Set environment variables in `.env`
4. Development: `yarn start`
5. Production build: `yarn build`

### Database Setup
1. Install MongoDB
2. Start MongoDB service
3. Application will create collections automatically

## Production Deployment

### Environment Variables

**Backend (.env):**
```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="blockchain_attendance"
CORS_ORIGINS="https://yourdomain.com"
SECRET_KEY="your-super-secure-secret-key-here"
```

**Frontend (.env):**
```env
REACT_APP_BACKEND_URL=https://api.yourdomain.com
```

### Security Checklist
- [ ] Change default SECRET_KEY
- [ ] Use HTTPS in production
- [ ] Configure proper CORS origins
- [ ] Set up MongoDB authentication
- [ ] Use environment variables for secrets
- [ ] Configure firewall rules
- [ ] Set up SSL certificates

### Performance Optimization
- [ ] Use MongoDB indexes for queries
- [ ] Implement Redis for session storage
- [ ] Enable gzip compression
- [ ] Use CDN for static assets
- [ ] Implement rate limiting
- [ ] Monitor application performance

## Cloud Deployment Options

### AWS Deployment
1. Use EC2 for backend
2. Use S3 + CloudFront for frontend
3. Use DocumentDB for MongoDB
4. Use Application Load Balancer

### Google Cloud Deployment
1. Use Cloud Run for containers
2. Use Cloud Storage for static files
3. Use Cloud Firestore for database
4. Use Cloud Load Balancing

### Digital Ocean Deployment
1. Use Droplets for servers
2. Use Spaces for static files
3. Use Managed MongoDB
4. Use Load Balancer

## Monitoring & Logging

### Application Monitoring
- Set up application performance monitoring
- Configure error tracking (Sentry)
- Monitor API response times
- Track user engagement

### Infrastructure Monitoring
- Monitor server resources (CPU, Memory, Disk)
- Set up alerts for downtime
- Monitor database performance
- Track network metrics

## Backup Strategy

### Database Backup
```bash
# Create backup
mongodump --db blockchain_attendance --out /path/to/backup

# Restore backup
mongorestore --db blockchain_attendance /path/to/backup/blockchain_attendance
```

### Application Backup
- Regular code repository backups
- Configuration file backups
- SSL certificate backups
- Environment variable backups

## Scaling Considerations

### Horizontal Scaling
- Use load balancers for multiple backend instances
- Implement database sharding for large datasets
- Use CDN for global content delivery
- Consider microservices architecture

### Vertical Scaling
- Increase server resources as needed
- Optimize database queries
- Implement caching strategies
- Use connection pooling

## Troubleshooting

### Common Issues
1. **Port conflicts**: Change port numbers in configuration
2. **Database connection**: Check MongoDB connection string
3. **CORS errors**: Configure proper origins in backend
4. **Build failures**: Check Node.js and Python versions

### Log Locations
- Backend logs: Check terminal or log files
- Frontend logs: Check browser console
- MongoDB logs: `/var/log/mongodb/mongod.log`
- Docker logs: `docker-compose logs [service]`