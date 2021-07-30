import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import usePageTitle from '../hooks/usePageTitle';
import usePathnamePage from '../hooks/usePathnamePage';
import Header from '../components/Header';
import PredictionCard from '../components/PredictionCard';
import { useChannelStore } from '../stores/channelStore';
import { useUserStore } from '../stores/userStore';

const TwitchChannelPage = observer(() => {
  const channelName = usePathnamePage();
  usePageTitle(`${channelName} - Twitch`);

  const channelStore = useChannelStore();

  const userStore = useUserStore();

  useEffect(() => {
    if (channelName) {
      channelStore.load(channelName);
    }
  }, [channelName]);

  useEffect(() => {
    if (userStore.dbClient && channelStore.channel) {
      const unsubMetric = channelStore.listenToMetrics(userStore.dbClient);
      const unsubPred = channelStore.listenToPredictions(userStore.dbClient);

      return () => {
        unsubMetric();
        unsubPred();
      };
    }
    return undefined;
  }, [userStore.dbClient, channelStore.channel]);

  return (
    <div>
      <Header />
      <h1>
        {channelName}
        {' - '}
        {channelStore.channel?.isLive ? 'Live' : 'Offline'}
      </h1>
      <h3>
        Viewers:
        {channelStore.currentViewerCount}
      </h3>
      {channelStore.predictions.map((p) => <PredictionCard key={p.id} prediction={p} />)}
    </div>
  );
});

export default TwitchChannelPage;
