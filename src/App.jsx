import { useEffect, useState } from 'react';
import { signIn, signOut, getUser } from './auth';
import { getUserFragments } from './api';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function init() {
      const currentUser = await getUser();
      if (!currentUser) return;
      setUser(currentUser);

      // Do an authenticated request to the fragments API server and log the result
      const userFragments = await getUserFragments(currentUser);
      // Optional: also log here if you want to see it in App.jsx
      // console.log('Fragments in App.jsx', userFragments);
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
