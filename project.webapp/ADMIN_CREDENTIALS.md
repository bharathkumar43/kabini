# Admin Credentials - IMPORTANT

## Default Admin Account

Your Kabini.ai application has been configured with a default admin account for easy access.

### Login Credentials

```
Email: admin@kabini.ai
Password: Admin@123456
```

## ⚠️ CRITICAL SECURITY WARNING

**YOU MUST CHANGE THIS PASSWORD IMMEDIATELY AFTER YOUR FIRST LOGIN!**

This is a default password that should NEVER be used in a production environment. Follow these steps:

1. Login to the application using the credentials above
2. Navigate to Settings or Profile
3. Change your password to something secure and unique
4. Never share your admin credentials with anyone

## Login Instructions

1. **Start the application:**
   ```bash
   # Terminal 1 - Start Backend
   cd project.webapp/backend
   node server.js
   
   # Terminal 2 - Start Frontend
   cd project.webapp
   npm run dev
   ```

2. **Open your browser:**
   Navigate to: `http://localhost:5173`

3. **Login:**
   - Enter Email: `admin@kabini.ai`
   - Enter Password: `Admin@123456`
   - Click "Sign In"

4. **Change Password:**
   - After successful login, navigate to Settings
   - Change your password immediately

## Troubleshooting

### Issue: "Invalid email or password" Error
**Solution:**
- Make sure the backend server is running
- Check that ENABLE_LOCAL_AUTH=true in backend/.env
- Check backend console logs for admin user creation message

### Issue: "Please verify your email" Error
**Solution:**
- The admin account should be pre-verified
- If you see this error, check the database:
  ```sql
  SELECT email_verified FROM users WHERE email = 'admin@kabini.ai';
  ```
- If false, manually set to true:
  ```sql
  UPDATE users SET email_verified = true WHERE email = 'admin@kabini.ai';
  ```

### Issue: Backend Server Won't Start
**Solution:**
1. Check PostgreSQL is running
2. Verify database configuration in backend/.env
3. Check backend console for error messages

### Issue: Admin User Not Created
**Solution:**
1. Stop the backend server
2. Delete the existing admin user (if any):
   ```sql
   DELETE FROM users WHERE email = 'admin@kabini.ai';
   ```
3. Restart the backend server
4. Check console logs for admin creation message

## Backend Configuration Required

Create a file `project.webapp/backend/.env` with the following:

```bash
# Server Configuration
PORT=5000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kabini_ai
DB_USER=postgres
DB_PASSWORD=your_db_password_here
DB_SSL=false

# Authentication Configuration
JWT_SECRET=change-this-to-a-secure-random-string
AUTH_TYPE=local
ENABLE_LOCAL_AUTH=true

# Azure AD Configuration (Optional - for Microsoft Login)
AZURE_CLIENT_ID=
AZURE_TENANT_ID=

# Google OAuth Configuration (Optional - for Google Login)
GOOGLE_CLIENT_ID=

# Email Configuration (Optional - for email verification)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
EMAIL_FROM=noreply@kabini.ai
```

**⚠️ IMPORTANT:** Make sure to change the `JWT_SECRET` to a strong random string!

## Frontend Configuration Required

Create a file `project.webapp/.env.local` with the following:

```bash
# API Configuration
VITE_REACT_APP_API_URL=http://localhost:5000/api

# Authentication Configuration (Optional)
VITE_REACT_APP_AZURE_CLIENT_ID=your_azure_client_id_here
VITE_REACT_APP_AZURE_TENANT_ID=your_azure_tenant_id_here
VITE_REACT_APP_REDIRECT_URI=http://localhost:5173

# Google OAuth Configuration (Optional)
VITE_REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id_here
```

## Admin User Details

The admin account is created automatically when the backend server starts. You should see this message in the console:

```
✅ =============================================
✅ Default admin user created successfully!
✅ Email: admin@kabini.ai
✅ Password: Admin@123456
✅ Please change the password after first login
✅ =============================================
```

If you don't see this message, check the troubleshooting section above.

## Additional Notes

- The admin account has email verification bypassed (email_verified = true)
- The admin account has both 'admin' and 'user' roles
- The admin account is always active (is_active = true)
- The password meets the minimum security requirements (8+ chars, uppercase, lowercase, number)

## For Production Deployment

**NEVER use these default credentials in production!**

Before deploying to production:
1. Change the admin password to something highly secure
2. Consider creating a new admin account with a different email
3. Delete or disable the default admin account
4. Use environment-specific secrets management
5. Enable HTTPS/SSL
6. Configure proper database security
7. Set up proper logging and monitoring

---

*For detailed information about the login system, see: `LOGIN_SYSTEM_ANALYSIS.md`*

