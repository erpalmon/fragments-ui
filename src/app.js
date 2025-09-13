import { signIn, getUser, signOut } from './auth';

async function init() {
  // Get our UI elements
  const userSection = document.querySelector('#user');
  const loginBtn = document.querySelector('#login');
  const logoutBtn = document.querySelector('#logout');

  // Login
  // Wire up event handlers to deal with login and logout.
  loginBtn.onclick = () => {
   // Sign-in via the Amazon Cognito Hosted UI (requires redirects), see:
    signIn();
  };


// Logout
  logoutBtn.onclick = async () => {
  // hide user info immediately in the UI
  userSection.hidden = true;
  loginBtn.hidden = false;
  logoutBtn.hidden = true;

  // call actual signout
  await signOut();
  };


  // See if we're signed in (i.e., we'll have a `user` object)
  const user = await getUser();
  if (!user) {
    return;
  }

  // Update the UI to welcome the user
  userSection.hidden = false;

  // Show the user's username
  userSection.querySelector('.username').innerText = user.username;

  // Disable the Login button
  loginBtn.hidden = true;

  logoutBtn.hidden = false;
}


// Wait for the DOM to be ready, then start the app
addEventListener('DOMContentLoaded', init);
