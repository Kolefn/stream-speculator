import React, { useCallback, useEffect, useState } from 'react';
import usePageTitle from '../hooks/usePageTitle';
import usePathnamePage from '../hooks/usePathnamePage';
import useRequest from '../hooks/useRequest';
import { getTwitchChannelPageData } from '../api/endpoints';
import useDBClient from '../hooks/useDBClient';
import { default as DB } from "../common/DBClient";
import { TwitchChannel } from '../common/types';


const TwitchChannelPage = () => {
  const channelName = usePathnamePage();
  usePageTitle(`${channelName} - Twitch`);
  const [client] = useDBClient();
  const [pageData] = useRequest(
    useCallback(()=> getTwitchChannelPageData(channelName as string), [channelName])
  );
  const [viewerCount,setViewerCount] = useState(0);
  useEffect(()=> {
    if(pageData?.channel.stream && client){
      setViewerCount(pageData.channel.stream.viewerCount);
      const unsub = client.onChange(DB.channels.doc(pageData.channel.id), (latest)=> {
        const data = (latest.document.data as TwitchChannel);
        if(data.stream?.viewerCount){
          setViewerCount(data.stream?.viewerCount);
        }
      });
      return () => unsub();
    }
    return;
  }, [client, pageData]);
  return (<div><h1>{channelName}</h1><h3>Viewers: {viewerCount}</h3></div>);
};

export default TwitchChannelPage;
