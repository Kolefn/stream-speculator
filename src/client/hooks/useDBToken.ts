import { getDBToken, loginAsGuest } from '../api/endpoints';
import { DBToken } from '../../common/types';
import useRequest from './useRequest';

export default () : [DBToken | null, Error | null] => {
  const [dbToken, dbTokenError] = useRequest(getDBToken);
  const [loginResponse, loginError] = useRequest(loginAsGuest, !dbTokenError);
  if (dbToken) {
    return [dbToken, null];
  } if (loginResponse) {
    return [loginResponse.dbToken, null];
  } if (loginError) {
    return [null, loginError];
  }
  return [null, null];
};
