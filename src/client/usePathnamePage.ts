import { useLocation } from 'react-router-dom';

export default () => useLocation().pathname.split('/').pop();
