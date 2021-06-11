import React, { useEffect } from 'react';
import usePageTitle from './usePageTitle';
import usePathnamePage from './usePathnamePage';

const TwitchChannelPage = () => {
  const channelName = usePathnamePage();
  usePageTitle(`${channelName} - Twitch`);
  useEffect(() => {
    fetch(`/api/twitch/${channelName}`);
  }, []);
  return (<h1>{channelName}</h1>);
};

export default TwitchChannelPage;
