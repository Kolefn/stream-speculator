import { useEffect, useState } from "react"

export default <T>(request: () => Promise<T>, wait: boolean = false) : [T | null, Error | null]=> {
    const [response, setResponse] = useState<T | null>(null);
    const [error, setError] = useState<Error | null>(null); 
    useEffect(()=> {
        if(wait){
            return;
        }
        request()
        .then((res)=> setResponse(res))
        .catch((e)=> setError(e));
    }, [request, wait]);

    return [response, error];
}