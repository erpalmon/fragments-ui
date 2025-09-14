// app.jsx
// modified due to react framework and the use of Vite

import { useEffect, useState } from 'react';
import { signIn, signOut, getUser } from './auth';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function init() {
        // Get our UI elements
      const currentUser = await getUser();
      if (!currentUser) return;
      setUser(currentUser);
    }
    init();
  }, []);

  return (
    <div>
      {!user ? (
        <button onClick={signIn}>Login</button>
      ) : (
        <div id="user">
          <p className="username">{user.username}</p>
          <button onClick={signOut}>Logout</button>
        </div>
      )}
    </div>
  );
}

export default App;
