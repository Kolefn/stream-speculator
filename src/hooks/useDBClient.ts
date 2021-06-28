import { useEffect, useState } from "react";
import { default as DB } from "../common/DBClient";
import useDBToken from './useDBToken';

export default () : [DB | null, Error | null] => {
    const [client, setClient] = useState<DB|null>(null);
    const [dbToken, err] = useDBToken();
    useEffect(()=> {
        if(dbToken && !err){
            setClient(new DB(dbToken.secret));
        }
    }, [dbToken, err]);
    
    return [client, err];
};
