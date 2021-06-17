import React, { useEffect, useState } from 'react';
import useDBToken from './useDBToken';
import usePageTitle from './usePageTitle';
import usePathnamePage from './usePathnamePage';
import faunadb from "faunadb";

const q = faunadb.query;

const TwitchChannelPage = () => {
  const channelName = usePathnamePage();
  const [stream, setStream] : [any, Function] = useState(null);
  //const [channel, setChannel] = useState(null);
  usePageTitle(`${channelName} - Twitch`);
  useEffect(() => {
    fetch(`/api/twitch/${channelName}`).then((res)=> {
      if(res.status === 200){
        res.json().then((data)=> {
          setStream(data.stream);
          //setChannel(data.channel);
        });
      }
    });
  }, []);
  const dbToken: any = useDBToken();
  useEffect(()=> {
    if(stream && dbToken){
      const dbClient = new faunadb.Client({ secret: dbToken.secret });
      const dbStream = dbClient.stream.document(q.Ref(q.Collection("Streams"), stream.id));
      dbStream.on('snapshot', (snapshot)=> {
        console.log(snapshot);
      }).on('version', (version)=> {
        console.log(version);
      });

      dbStream.start();

      return ()=> dbStream.close();
    }
    return;
  }, [dbToken, stream]);
  return (<h1>{channelName}</h1>);
};

export default TwitchChannelPage;
