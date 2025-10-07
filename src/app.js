import { signIn, getUser, signOut } from './auth';
import { getUserFragments } from './api';

const API_URL = process.env.API_URL || "http://localhost:8080";

async function init() {
  // Get our UI elements
  const userSection = document.querySelector('#user');
  const loginBtn = document.querySelector('#login');
  const logoutBtn = document.querySelector('#logout');
  // const createSection = document.querySelector('#create-fragment-section');

  // Login
  loginBtn.onclick = () => signIn();

  // Logout
  logoutBtn.onclick = async () => {
    userSection.hidden = true;
    loginBtn.hidden = false;
    logoutBtn.hidden = true;
    createSection.hidden = false;
    await signOut();
  };

  // Check if signed in
  const user = await getUser();
  if (!user) return;

  // Update UI
  userSection.hidden = false;
  userSection.querySelector('.username').innerText = user.username;
  loginBtn.hidden = true;
  logoutBtn.hidden = false;
  // createSection.hidden = false;

  // Log fragments in console
  const userFragments = await getUserFragments(user);
  console.log("User's fragments:", userFragments);


  const createBtn = document.getElementById('create-fragment');
  console.log('createBtn:', createBtn);
  const fragmentText = document.getElementById('fragment-text');
  const fragmentResult = document.getElementById('fragment-result');

  createBtn.onclick = async () => {
    console.log("button is clicked")
    const text = fragmentText.value.trim();
    if (!text) {
      console.log("No text entered");
      fragmentResult.textContent = "Please enter some text!";
      return;
    }

    try {
      console.log("in try block");
      console.log(user)
      const res = await fetch(`${API_URL}/v1/fragments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.idToken}`,
          'Content-Type': 'text/plain',
        },
        body: text,
      });
      console.log("after fetch block", res)

      const data = await res.json();
      fragmentResult.textContent = `Fragment created:\n${JSON.stringify(data, null, 2)}`;
      console.log("in try block", data);
    } catch (err) {
      fragmentResult.textContent = `Error creating fragment: ${err.message}`;
      console.log("in catch block", err);
    }
  };
}


function setupApiCheck() {
  const checkBtn = document.getElementById('check-api');
  if (checkBtn) {
    checkBtn.onclick = async () => {
      try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();
        document.getElementById('output').textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        document.getElementById('output').textContent = `Error: ${err.message}`;
      }
    };
  }
}

addEventListener('DOMContentLoaded', () => {
  init();
  setupApiCheck();
});

init()