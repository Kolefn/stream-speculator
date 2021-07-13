import DB from '../../common/DBClient';
import { useUserStore } from '../stores/userStore';

export default () : [DB | null, Error | null] => {
  const store = useUserStore();
  return [store.dbClient, store.loginError];
};
