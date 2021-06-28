import React, { useCallback, useEffect } from 'react';
import usePageTitle from '../hooks/usePageTitle';
import usePathnamePage from '../hooks/usePathnamePage';
import useRequest from '../hooks/useRequest';
import { getTwitchChannelPageData } from '../api/endpoints';
import useDBClient from '../hooks/useDBClient';
import { default as DB } from "../common/DBClient";


const TwitchChannelPage = () => {
  const channelName = usePathnamePage();
  usePageTitle(`${channelName} - Twitch`);
  const [client] = useDBClient();
  const [pageData] = useRequest(
    useCallback(()=> getTwitchChannelPageData(channelName as string), [channelName])
  );
  useEffect(()=> {
    if(pageData?.channel.stream && client){
      const unsub = client.onChange(DB.channels.doc(pageData.channel.id), (latest)=> {
        console.log(latest);
      });
      return () => unsub();
    }
    return;
  }, [client, pageData]);
  return (<h1>{channelName}</h1>);
};

export default TwitchChannelPage;
