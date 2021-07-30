import { observer } from 'mobx-react-lite';
import React from 'react';
import { Link } from 'react-router-dom';
import { useUserStore } from '../stores/userStore';

export default observer(() => {
  const userStore = useUserStore();
  return (
    <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
      <h3>
        💰
        {userStore.coins}
      </h3>
      {userStore.isGuest && (
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
        <button type="button" onClick={() => userStore.loginAsGuest()}>Guest</button>
        <Link to="/api/twitch/redirectTo">Twitch</Link>
      </div>
      )}
    </div>
  );
});
