import React, { useCallback } from 'react';
import usePageTitle from '../hooks/usePageTitle';
import usePathnamePage from '../hooks/usePathnamePage';
import useRequest from '../hooks/useRequest';
import { getTwitchChannelPageData } from '../api/endpoints';
import { StreamMetricType } from '../common/types';
import useStreamMetric from '../hooks/useStreamMetric';

const TwitchChannelPage = () => {
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
  const currentViewerCount = viewerCounts.length > 0 ? viewerCounts[0].value : 0;
  return (
    <div>
      <h1>{channelName}</h1>
      <h3>
        Viewers:
        {currentViewerCount}
      </h3>
    </div>
  );
};

export default TwitchChannelPage;
