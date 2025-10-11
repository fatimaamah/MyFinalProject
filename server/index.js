const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

const { setUserContext } = require('./middleware/auth');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const coordinatorRoutes = require('./routes/coordinatorRoutes');
const hodRoutes = require('./routes/hodRoutes');
const supervisorRoutes = require('./routes/supervisorRoutes');
const studentRoutes = require('./routes/studentRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'project-submission-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true
  }
}));

app.use(setUserContext);

app.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.redirect('/auth/login');
});

app.get('/dashboard', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }

  const roleRoutes = {
    'general_admin': '/admin/dashboard',
    'level_coordinator': '/coordinator/dashboard',
    'hod': '/hod/dashboard',
    'supervisor': '/supervisor/dashboard',
    'student': '/student/dashboard'
  };

  const redirectPath = roleRoutes[req.session.user.role];
  if (redirectPath) {
    return res.redirect(redirectPath);
  }

  res.redirect('/auth/login');
});

app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/coordinator', coordinatorRoutes);
app.use('/hod', hodRoutes);
app.use('/supervisor', supervisorRoutes);
app.use('/student', studentRoutes);

app.use((req, res) => {
  res.status(404).render('error', {
    message: 'Page Not Found',
    error: 'The page you are looking for does not exist'
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).render('error', {
    message: 'Internal Server Error',
    error: err.message
  });
});

const uploadsDir = path.join(__dirname, '../uploads');
const fs = require('fs');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Project Submission Reporting System');
});
