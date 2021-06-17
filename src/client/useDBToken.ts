import { useEffect, useState } from "react";

export default ()=> {
    const [token, setToken] = useState(null);
    useEffect(()=> {
        fetch('/api/auth/dbToken').then((res)=> {
            if(res.status === 200){
                res.json().then((data)=> setToken(data));
            }else{
                fetch('/api/auth/loginAsGuest', { method: 'POST' }).then((res)=> {
                    if(res.status === 200){
                        res.json().then((data)=> {
                            setToken(data.dbToken);
                        });
                    }
                });
            }
        });
    }, []);

    return token;
};