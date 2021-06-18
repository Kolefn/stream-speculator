import React, { useCallback, useEffect } from 'react';
import useDBToken from '../hooks/useDBToken';
import usePageTitle from '../hooks/usePageTitle';
import usePathnamePage from '../hooks/usePathnamePage';
import faunadb from "faunadb";
import useRequest from '../hooks/useRequest';
import { getTwitchChannelPageData } from '../api/endpoints';

const q = faunadb.query;

const TwitchChannelPage = () => {
  const channelName = usePathnamePage();
  usePageTitle(`${channelName} - Twitch`);
  const [dbToken] = useDBToken();
  const [pageData] = useRequest(
    useCallback(()=> getTwitchChannelPageData(channelName as string), [channelName])
  );
  useEffect(()=> {
    if(pageData?.stream && dbToken){
      const dbClient = new faunadb.Client({ secret: dbToken.secret });
      const dbStream = dbClient.stream.document(q.Ref(q.Collection("Streams"), pageData.stream.id));
      dbStream.on('snapshot', (snapshot)=> {
        console.log(snapshot);
      }).on('version', (version)=> {
        console.log(version);
      });

      dbStream.start();

      return ()=> dbStream.close();
    }
    return;
  }, [dbToken, pageData]);
  return (<h1>{channelName}</h1>);
};

export default TwitchChannelPage;
