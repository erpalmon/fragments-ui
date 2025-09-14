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
      // Optional API call after login:
      // await getUserFragments(currentUser);
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

export default App;  // <-- make sure this line exists
