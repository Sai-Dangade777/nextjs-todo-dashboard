# Todo Management SystemThis is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).



A comprehensive full-stack todo management application built with Next.js 14, TypeScript, Prisma, and SQLite. This system features user authentication, todo assignment, file uploads, and admin management capabilities.## Getting Started



## 🌟 FeaturesFirst, run the development server:



### User Management```bash

- **Secure Authentication**: JWT-based authentication with bcrypt password hashingnpm run dev

- **User Registration & Login**: Complete user onboarding flow# or

- **Role-based Access Control**: Admin and User roles with different permissionsyarn dev

- **Profile Management**: User profile updates with profile picture support# or

- **Admin Dashboard**: User management (enable/disable accounts, view all users)pnpm dev

# or

### Todo Managementbun dev

- **Full CRUD Operations**: Create, read, update, delete todos```

- **Todo Assignment**: Assign todos to self or other users

- **Priority Levels**: Urgent, High, Medium, Low priority systemOpen [http://localhost:3000](http://localhost:3000) with your browser to see the result.

- **Status Tracking**: Pending, In Progress, Completed, Cancelled

- **Due Dates**: Set and track due dates with overdue detectionYou can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

- **Drag & Drop**: Reorder todos by priority (position-based)

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

### File Management

- **Secure File Upload**: Attach files to todos during creation## Learn More

- **File Type Validation**: Support for images, documents, PDFs, etc.

- **Access Control**: Files accessible only to todo creators and assigneesTo learn more about Next.js, take a look at the following resources:

- **File Listing**: Dedicated page to view all uploaded files with todo associations

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.

### Notifications & Collaboration- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

- **Real-time Notifications**: Get notified when todos are assigned or updated

- **Todo Views**: \"My Todos\" vs \"Todos Created by Me\" filteringYou can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

- **Collaboration**: Multi-user environment with proper access controls

- **Activity Tracking**: Recent activity and upcoming deadlines## Deploy on Vercel



### Dashboard & AnalyticsThe easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

- **Comprehensive Stats**: Todo counts, completion rates, overdue items

- **Visual Charts**: Priority and status distributionCheck out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

- **Recent Activity**: Latest todos and upcoming deadlines
- **Progress Tracking**: Personal and team productivity insights

## 🛠️ Tech Stack

### Backend
- **Next.js 14** (App Router) - Full-stack React framework
- **TypeScript** - Type-safe development
- **Prisma ORM** - Database schema and migrations
- **SQLite** - Lightweight database for development
- **JWT** - Secure authentication tokens
- **bcrypt** - Password hashing
- **Multer** - File upload handling

### Frontend
- **React 18** - Modern React with hooks
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - High-quality component library
- **Lucide React** - Beautiful icons
- **React Hook Form** - Form management
- **Axios** - HTTP client for API calls

### Development Tools
- **ESLint** - Code linting
- **TypeScript** - Static type checking
- **Prisma Studio** - Database GUI
- **tsx** - TypeScript execution

## 📁 Project Structure

```
todo-management/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # Authentication endpoints
│   │   │   ├── todos/         # Todo CRUD operations
│   │   │   ├── files/         # File upload/download
│   │   │   └── users/         # User management
│   │   ├── dashboard/         # Dashboard page
│   │   ├── login/            # Login page
│   │   └── register/         # Registration page
│   ├── components/           # React components
│   │   ├── layout/          # Layout components
│   │   └── ui/              # shadcn/ui components
│   ├── contexts/            # React contexts
│   ├── lib/                 # Utility libraries
│   │   ├── auth/           # Authentication utilities
│   │   └── db/             # Database client
│   ├── middleware/         # API middleware
│   └── types/              # TypeScript type definitions
├── prisma/                 # Database schema and migrations
├── uploads/               # File upload directory
└── public/               # Static assets
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18.0 or later
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd todo-management
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # The .env file is already configured for development
   # DATABASE_URL="file:./prisma/dev.db"
   # JWT_SECRET="todo-app-jwt-secret-key-2024-north-star-dev"
   # JWT_EXPIRES_IN="7d"
   # MAX_FILE_SIZE=10485760
   # UPLOAD_DIR="./uploads"
   ```

4. **Initialize the database**
   ```bash
   # Generate Prisma client
   npx prisma generate
   
   # Run database migrations (already done)
   npx prisma migrate dev --name init
   
   # Seed the database with sample data (already done)
   npm run db:seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   Open [http://localhost:3000](http://localhost:3000) in your browser

### Demo Credentials

The seed script creates demo users you can use to test the application:

- **Admin User**: admin@todoapp.com / Admin123!
- **Regular User 1**: john@example.com / User123!
- **Regular User 2**: jane@example.com / User123!

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/logout` - User logout

### Todo Management
- `GET /api/todos` - List todos with filtering
- `POST /api/todos` - Create new todo
- `GET /api/todos/[id]` - Get specific todo
- `PUT /api/todos/[id]` - Update todo
- `DELETE /api/todos/[id]` - Delete todo

### File Management
- `POST /api/files` - Upload files
- `GET /api/files` - List user files
- `GET /api/files/serve/[filename]` - Serve file
- `DELETE /api/files/[id]` - Delete file

### User Management (Admin)
- `GET /api/users` - List all users (Admin only)
- `GET /api/users/[id]` - Get user profile
- `PUT /api/users/[id]` - Update user
- `DELETE /api/users/[id]` - Deactivate user (Admin only)

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

## 🗄️ Database Schema

The application uses a SQLite database with the following main entities:

### Users
- Authentication and profile information
- Role-based access control (USER/ADMIN)
- Account status management

### Todos
- Complete todo lifecycle management
- Priority and status tracking
- Assignment and creation relationships
- Due date management

### Files
- Secure file storage and access
- Todo associations
- Upload tracking

### Notifications
- Real-time user notifications
- Todo activity tracking
- Read/unread status

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Role-based Authorization**: Admin and user role separation
- **File Access Control**: Users can only access authorized files
- **Input Validation**: Server-side validation for all endpoints
- **CORS Protection**: Secure cross-origin request handling

## 🎨 UI/UX Features

- **Responsive Design**: Works on desktop and mobile devices
- **Modern UI**: Clean, professional interface with shadcn/ui
- **Loading States**: Proper loading indicators throughout
- **Error Handling**: User-friendly error messages
- **Toast Notifications**: Real-time feedback for user actions
- **Form Validation**: Client and server-side validation

## 📊 Performance Considerations

- **Database Indexing**: Strategic indexes on frequently queried fields
- **File Size Limits**: Configurable file upload size restrictions
- **Pagination**: Efficient data loading with pagination
- **Caching**: Strategic caching for static assets
- **Optimistic Updates**: Immediate UI feedback for better UX

## 🚀 Development

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:seed      # Seed database with sample data
npm run db:reset     # Reset database and reseed
```

### Database Management
```bash
npx prisma studio    # Open Prisma Studio (database GUI)
npx prisma generate  # Regenerate Prisma client
npx prisma migrate dev # Run database migrations
```

## 🔧 Architecture Decisions

### Why This Tech Stack?
- **Next.js 14**: Modern full-stack framework with App Router for better performance
- **TypeScript**: Type safety reduces bugs and improves developer experience
- **Prisma**: Type-safe database access with excellent development experience
- **SQLite**: Simple setup for development, easily switchable to PostgreSQL
- **shadcn/ui**: High-quality, customizable components with Tailwind CSS

### Key Implementation Details
- **Authentication**: JWT tokens stored in localStorage with automatic refresh
- **File Storage**: Local file system with configurable upload directory
- **Database Relations**: Proper foreign key constraints with cascade deletes
- **API Design**: RESTful endpoints with consistent response format
- **Error Handling**: Comprehensive error handling with user-friendly messages

## 📈 Future Enhancements

- **Real-time Updates**: WebSocket integration for live updates
- **Email Notifications**: SMTP integration for email alerts
- **Calendar Integration**: Sync with Google Calendar or Outlook
- **Mobile App**: React Native mobile application
- **Advanced Analytics**: Detailed reporting and analytics
- **Team Management**: Advanced team and project management features
- **API Rate Limiting**: Advanced rate limiting and throttling
- **Advanced Search**: Full-text search capabilities

## 🧪 Testing the Application

### Manual Testing Checklist
1. **User Registration**: Create new accounts with different roles
2. **Authentication**: Login/logout functionality
3. **Todo Management**: Create, edit, delete, assign todos
4. **File Uploads**: Attach files to todos, download files
5. **Admin Features**: User management, system statistics
6. **Responsive Design**: Test on different screen sizes
7. **Error Handling**: Test with invalid inputs and network errors

### Sample Test Scenarios
1. Register as new user → Login → Create todo → Assign to another user
2. Login as admin → View all users → Enable/disable user accounts
3. Upload files to todos → View files page → Download files
4. Test overdue todo detection and notifications
5. Test todo filtering and search functionality

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Prisma team for the excellent ORM
- shadcn for the beautiful UI components
- The open-source community for the incredible tools and libraries

---


This Todo Management System demonstrates:

✅ **Clean Architecture**: Modular code structure with separation of concerns  
✅ **Modern Tech Stack**: Next.js 14, TypeScript, Prisma, shadcn/ui  
✅ **Security Best Practices**: JWT auth, password hashing, input validation  
✅ **Database Design**: Well-structured schema with proper relationships  
✅ **API Development**: RESTful endpoints with comprehensive error handling  
✅ **User Experience**: Responsive design, loading states, toast notifications  
✅ **File Management**: Secure file uploads with access control  
✅ **Admin Features**: User management and system administration  
✅ **Documentation**: Comprehensive README with setup instructions  
✅ **Production Ready**: Proper error handling, validation, and security measures
