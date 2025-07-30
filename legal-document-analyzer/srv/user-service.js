const cds = require('@sap/cds');
const crypto = require('crypto');

class UserService extends cds.ApplicationService {
  
  async init() {
    console.log('🔐 User Service initializing...');

    // Login action
    this.on('login', async (req) => {
      const { username, password } = req.data;
      
      try {
        // For demo purposes, we'll use simple authentication
        // In production, use proper password hashing (bcrypt, etc.)
        
        // Check if user exists
        let user = await cds.ql.SELECT.one.from('legal.document.analyzer.Users')
          .where({ username: username });
        
        if (!user) {
          // Create demo user if doesn't exist
          const userId = cds.utils.uuid();
          user = {
            ID: userId,
            username: username,
            email: `${username}@example.com`,
            firstName: username,
            lastName: 'User',
            role: 'USER',
            isActive: true,
            lastLogin: new Date().toISOString()
          };
          
          await cds.ql.INSERT.into('legal.document.analyzer.Users').entries(user);
          console.log(`✅ Created new user: ${username}`);
        } else {
          // Update last login
          await cds.ql.UPDATE('legal.document.analyzer.Users')
            .set({ lastLogin: new Date().toISOString() })
            .where({ ID: user.ID });
        }
        
        // Create session
        const sessionToken = crypto.randomBytes(32).toString('hex');
        const sessionId = cds.utils.uuid();
        
        await cds.ql.INSERT.into('legal.document.analyzer.UserSessions').entries({
          ID: sessionId,
          user_ID: user.ID,
          sessionToken: sessionToken,
          loginTime: new Date().toISOString(),
          ipAddress: req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
          isActive: true
        });
        
        console.log(`✅ User ${username} logged in successfully`);
        
        return {
          success: true,
          sessionToken: sessionToken,
          user: user,
          message: 'Login successful'
        };
        
      } catch (error) {
        console.error('❌ Login failed:', error);
        return {
          success: false,
          sessionToken: null,
          user: null,
          message: 'Login failed: ' + error.message
        };
      }
    });

    // Logout action
    this.on('logout', async (req) => {
      const { sessionToken } = req.data;
      
      try {
        await cds.ql.UPDATE('legal.document.analyzer.UserSessions')
          .set({ 
            isActive: false,
            logoutTime: new Date().toISOString()
          })
          .where({ sessionToken: sessionToken });
        
        console.log('✅ User logged out successfully');
        
        return {
          success: true,
          message: 'Logout successful'
        };
        
      } catch (error) {
        console.error('❌ Logout failed:', error);
        return {
          success: false,
          message: 'Logout failed: ' + error.message
        };
      }
    });

    // Register action
    this.on('register', async (req) => {
      const { username, email, firstName, lastName, password } = req.data;
      
      try {
        // Check if user already exists
        const existingUser = await cds.ql.SELECT.one.from('legal.document.analyzer.Users')
          .where({ username: username });
        
        if (existingUser) {
          return {
            success: false,
            user: null,
            message: 'Username already exists'
          };
        }
        
        // Create new user
        const userId = cds.utils.uuid();
        const user = {
          ID: userId,
          username: username,
          email: email,
          firstName: firstName,
          lastName: lastName,
          role: 'USER',
          isActive: true,
          lastLogin: new Date().toISOString()
        };
        
        await cds.ql.INSERT.into('legal.document.analyzer.Users').entries(user);
        
        console.log(`✅ User ${username} registered successfully`);
        
        return {
          success: true,
          user: user,
          message: 'Registration successful'
        };
        
      } catch (error) {
        console.error('❌ Registration failed:', error);
        return {
          success: false,
          user: null,
          message: 'Registration failed: ' + error.message
        };
      }
    });

    // Get current user function
    this.on('getCurrentUser', async (req) => {
      const { sessionToken } = req.data;
      
      try {
        const session = await cds.ql.SELECT.one.from('legal.document.analyzer.UserSessions')
          .where({ sessionToken: sessionToken, isActive: true });
        
        if (!session) {
          return null;
        }
        
        const user = await cds.ql.SELECT.one.from('legal.document.analyzer.Users')
          .where({ ID: session.user_ID });
        
        return user;
        
      } catch (error) {
        console.error('❌ Get current user failed:', error);
        return null;
      }
    });

    // Validate session function
    this.on('validateSession', async (req) => {
      const { sessionToken } = req.data;
      
      try {
        const session = await cds.ql.SELECT.one.from('legal.document.analyzer.UserSessions')
          .where({ sessionToken: sessionToken, isActive: true });
        
        return !!session;
        
      } catch (error) {
        console.error('❌ Session validation failed:', error);
        return false;
      }
    });

    await super.init();
    console.log('✅ User Service initialized successfully');
  }
}

module.exports = UserService;
