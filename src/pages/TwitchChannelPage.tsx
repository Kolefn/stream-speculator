import React, { useCallback } from 'react';
import { Line as LineChart } from 'react-chartjs-2';
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
  const currentViewerCount = viewerCounts.length > 0
    ? viewerCounts[viewerCounts.length - 1].value : 0;
  return (
    <div>
      <h1>
        {channelName}
        {' - '}
        {pageData?.channel.isLive ? 'Live' : 'Offline'}
      </h1>
      <h3>
        Viewers:
        {currentViewerCount}
      </h3>
      <LineChart
        type="line"
        width={500}
        height={400}
        data={{
          labels: viewerCounts.map((_, i) => i.toString()),
          datasets: [{
            data: viewerCounts,
          }],
        }}
        options={{
          animation: false,
          parsing: {
            yAxisKey: 'value',
            xAxisKey: 'timestamp',
          },
          plugins: {
            title: {
              display: false,
            },
            legend: { display: false },
          },
          scales: {
            x: {
              display: false,
            },
            y: {
              display: false,
            },
          },
        }}
      />
    </div>
  );
};

export default TwitchChannelPage;
