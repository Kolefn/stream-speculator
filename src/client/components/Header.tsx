import React from 'react';
import { useUserStore } from '../stores/userStore';

export default () => {
  const userStore = useUserStore();
  return (
    <div>
      <h3>
        💰
        {userStore.coins}
      </h3>
    </div>
  );
};
