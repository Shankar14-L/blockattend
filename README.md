# Blockchain QR Attendance System

A comprehensive blockchain-based attendance tracking system with QR code functionality, built with FastAPI, React, and MongoDB.

## 🚀 Features

### Core Functionality
- **Blockchain Integration**: Simulated blockchain for immutable attendance records
- **QR Code Generation**: Real-time QR code generation for attendance sessions
- **Role-Based Access**: Separate dashboards for teachers and students
- **Real-time Updates**: Live attendance tracking and notifications
- **Professional UI/UX**: Modern, responsive design with advanced components

### Teacher Features
- Create and manage classes
- Generate QR codes for attendance sessions
- View real-time attendance statistics
- Monitor student enrollment and participation
- Dashboard with comprehensive analytics

### Student Features
- Scan QR codes to mark attendance
- View attendance history and records
- Track enrolled classes
- Blockchain-verified attendance records

### Technical Features
- JWT authentication with secure token management
- MongoDB with proper data modeling
- Blockchain simulation with cryptographic hashing
- RESTful API design with comprehensive error handling
- Responsive design with Tailwind CSS and Shadcn UI

## 🏗️ Architecture

```
refactored_project/
│
├── backend/
│   ├── main.py
│   ├── routes/
│   ├── models/
│   ├── database/
│   ├── auth/
│   ├── utils/
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── blockchain/
│   ├── contract-abi.json
│   ├── eth.js
│   ├── hardhat.config.js
│   └── package.json
│
└── README.txt

```

## 🛠️ Installation & Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- MongoDB
- Git

### Backend Setup
1. Navigate to backend directory:
   ```bash
   cd blockchain-qr-attendance/backend
   ```

2. Create virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables in `.env`:
   ```env
   MONGO_URL="mongodb://localhost:27017"
   DB_NAME="blockchain_attendance"
   CORS_ORIGINS="*"
   SECRET_KEY="blockchain-qr-attendance-secret-key-2025"
   ```

5. Start the backend server:
   ```bash
   uvicorn server:app --host 0.0.0.0 --port 8001 --reload
   ```

### Frontend Setup
1. Navigate to frontend directory:
   ```bash
   cd blockchain-qr-attendance/frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Configure environment variables in `.env`:
   ```env
   REACT_APP_BACKEND_URL=http://localhost:8001
   ```

4. Start the development server:
   ```bash
   npm start
   # or
   yarn start
   ```

### Database Setup
1. Make sure MongoDB is running:
   ```bash
   mongod
   ```

2. The application will automatically create the required collections on first use.

## 🎯 Usage

### For Teachers
1. **Register/Login** as a teacher
2. **Create Classes** with name and description
3. **Generate QR Codes** for attendance sessions
4. **Monitor Attendance** through the dashboard
5. **View Analytics** and student statistics

### For Students
1. **Register/Login** as a student
2. **Scan QR Codes** provided by teachers
3. **Mark Attendance** automatically through scanning
4. **View History** of all attendance records
5. **Track Progress** across enrolled classes

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Classes
- `GET /api/classes` - Get all classes (role-based)
- `POST /api/classes` - Create new class (teachers only)
- `GET /api/classes/{class_id}` - Get class details
- `POST /api/classes/{class_id}/generate-qr` - Generate QR code

### Attendance
- `POST /api/attendance/mark` - Mark attendance via QR
- `GET /api/attendance/my` - Get student's attendance records

### Analytics
- `GET /api/dashboard/stats` - Get dashboard statistics

### Blockchain
- `GET /api/blockchain/verify/{block_hash}` - Verify blockchain record

## 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access**: Teachers and students have different permissions
- **QR Code Expiration**: Time-limited QR codes for security
- **Blockchain Verification**: Cryptographic proof of attendance
- **Input Validation**: Comprehensive data validation
- **CORS Protection**: Configurable cross-origin resource sharing

## 🌐 Blockchain Integration

The system implements a blockchain simulation with:
- **Immutable Records**: All attendance records are blockchain-verified
- **Cryptographic Hashing**: SHA-256 hashing for data integrity
- **Block Structure**: Proper blockchain data structure with previous hash linking
- **Verification**: Real-time blockchain record verification

## 📱 Modern UI Features

- **Responsive Design**: Works on desktop, tablet, and mobile
- **Glass Morphism**: Modern glass effects and backdrop filters
- **Smooth Animations**: Micro-interactions and transitions
- **Toast Notifications**: Real-time feedback for user actions
- **Professional Color Scheme**: Modern gradient and color palette
- **Accessibility**: Proper ARIA labels and keyboard navigation

## 🚀 Deployment

### Production Environment Variables

Backend `.env`:
```env
MONGO_URL="mongodb://production-mongodb-url"
DB_NAME="blockchain_attendance_prod"
CORS_ORIGINS="https://yourdomain.com"
SECRET_KEY="your-super-secure-secret-key"
```

Frontend `.env`:
```env
REACT_APP_BACKEND_URL=https://your-api-domain.com
```

### Build for Production

Frontend:
```bash
cd frontend
npm run build
```

Backend:
```bash
cd backend
pip install -r requirements.txt
```

## 📊 Database Schema

### Users Collection
```javascript
{
  id: String,
  name: String,
  email: String,
  role: String, // "teacher" or "student"
  wallet_address: String,
  created_at: DateTime
}
```

### Classes Collection
```javascript
{
  id: String,
  name: String,
  description: String,
  course_code: String,
  teacher_id: String,
  teacher_name: String,
  students_enrolled: [String],
  created_at: DateTime,
  is_active: Boolean
}
```

### Attendance Collection
```javascript
{
  id: String,
  student_id: String,
  student_name: String,
  class_id: String,
  class_name: String,
  timestamp: DateTime,
  blockchain_hash: String,
  qr_code_id: String,
  verified: Boolean
}
```

### Blockchain Collection
```javascript
{
  id: String,
  block_number: Number,
  previous_hash: String,
  timestamp: DateTime,
  data: Object,
  hash: String,
  nonce: Number
}
```

## 🧪 Testing

### API Testing
Use the provided test endpoints or tools like Postman to test the API.

### Frontend Testing
The application includes comprehensive test IDs for automated testing.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature-name`
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
1. Check the troubleshooting section below
2. Review API documentation
3. Check server logs for errors

## 🔧 Troubleshooting

### Common Issues

1. **Backend won't start**:
   - Check if MongoDB is running
   - Verify Python dependencies are installed
   - Check environment variables in `.env`

2. **Frontend shows errors**:
   - Ensure backend is running on correct port
   - Check REACT_APP_BACKEND_URL in frontend `.env`
   - Verify all npm packages are installed

3. **QR codes not working**:
   - Check if QR codes have expired (30-minute limit)
   - Verify student is properly authenticated
   - Check network connectivity between frontend and backend

4. **Authentication issues**:
   - Clear browser localStorage/cookies
   - Check JWT token expiration
   - Verify user credentials

### Port Configuration
- Backend: http://localhost:8001
- Frontend: http://localhost:3000
- MongoDB: mongodb://localhost:27017

## 🎉 Demo Accounts

For testing purposes, you can create:

**Teacher Account:**
- Email: teacher@demo.com
- Password: password123
- Role: teacher

**Student Account:**
- Email: student@demo.com  
- Password: password123
- Role: student

## 🔮 Future Enhancements

- Real Ethereum blockchain integration
- Mobile app with native QR scanning
- Advanced analytics and reporting
- Multi-language support
- Email notifications
- Biometric verification
- Integration with learning management systems

---

**Built with ❤️ using FastAPI, React, MongoDB, and modern web technologies.**
## Ethereum integration added
- Configure RPC_URL, PRIVATE_KEY, CONTRACT_ADDRESS in `.env`
- On attendance save, if `recordOnChain:true` is sent, it will call the contract.
