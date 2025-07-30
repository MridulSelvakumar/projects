using { legal.document.analyzer as lda } from '../db/schema';

service UserService @(path: '/user') {

  // User management
  entity Users as projection on lda.Users;
  entity UserSessions as projection on lda.UserSessions;
  
  // User actions
  action login(username: String, password: String) returns {
    success: Boolean;
    sessionToken: String;
    user: String;
    message: String;
  };
  
  action logout(sessionToken: String) returns {
    success: Boolean;
    message: String;
  };
  
  action register(
    username: String,
    email: String,
    firstName: String,
    lastName: String,
    password: String
  ) returns {
    success: Boolean;
    user: String;
    message: String;
  };
  
  function getCurrentUser(sessionToken: String) returns String;
  function validateSession(sessionToken: String) returns Boolean;
}
