import { observer } from 'mobx-react-lite';
import React from 'react';
import { useUserStore } from '../stores/userStore';

export default observer(() => {
  const userStore = useUserStore();
  return (
    <div>
      <h3>
        💰
        {userStore.coins}
      </h3>
    </div>
  );
});
