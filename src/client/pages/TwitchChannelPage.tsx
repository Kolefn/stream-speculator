import React, { useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import usePageTitle from '../hooks/usePageTitle';
import usePathnamePage from '../hooks/usePathnamePage';
import useRequest from '../hooks/useRequest';
import { getTwitchChannelPageData } from '../api/endpoints';
import { StreamMetricType } from '../../common/types';
import useStreamMetric from '../hooks/useStreamMetric';
import Header from '../components/Header';
import PredictionCard from '../components/PredictionCard';
import usePredictions from '../hooks/usePredictions';

const TwitchChannelPage = observer(() => {
  const channelName = usePathnamePage();
  usePageTitle(`${channelName} - Twitch`);
  const [pageData] = useRequest(
    useCallback(() => getTwitchChannelPageData(channelName as string), [channelName]),
  );
  const [viewerCounts] = useStreamMetric(
    StreamMetricType.ViewerCount,
    pageData?.channel.id,
    pageData?.metrics?.viewerCount,
  );
  const [predictions] = usePredictions(pageData?.channel.id, pageData?.predictions);
  const currentViewerCount = viewerCounts.length > 0
    ? viewerCounts[viewerCounts.length - 1].value : 0;

  return (
    <div>
      <Header />
      <h1>
        {channelName}
        {' - '}
        {pageData?.channel.isLive ? 'Live' : 'Offline'}
      </h1>
      <h3>
        Viewers:
        {currentViewerCount}
      </h3>
      {
        predictions.map((p) => <PredictionCard key={p.id} prediction={p} />)
      }
    </div>
  );
});

export default TwitchChannelPage;
