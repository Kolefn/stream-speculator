import React, { useCallback } from 'react';
import { Line as LineChart } from 'react-chartjs-2';
import usePageTitle from '../hooks/usePageTitle';
import usePathnamePage from '../hooks/usePathnamePage';
import useRequest from '../hooks/useRequest';
import { getTwitchChannelPageData, predict } from '../api/endpoints';
import { PredictionPosition, PredictionWindow, StreamMetricType } from '../../common/types';
import useStreamMetric from '../hooks/useStreamMetric';
import Header from '../components/Header';

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
      <button
        type="button"
        onClick={() => predict({
          metric: StreamMetricType.ViewerCount,
          multiplier: 1,
          window: PredictionWindow.Minute,
          threshold: currentViewerCount,
          position: PredictionPosition.Above,
          channelId: pageData?.channel.id as string,
        })}
      >
        UP
      </button>
      <button
        type="button"
        onClick={() => predict({
          metric: StreamMetricType.ViewerCount,
          multiplier: 1,
          window: PredictionWindow.Minute,
          threshold: currentViewerCount,
          position: PredictionPosition.Below,
          channelId: pageData?.channel.id as string,
        })}
      >
        DOWN
      </button>
    </div>
  );
};

export default TwitchChannelPage;
