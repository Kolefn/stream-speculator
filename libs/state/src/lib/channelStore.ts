import { createContext, useContext } from 'react';
import { makeAutoObservable, runInAction } from 'mobx';
import { getTwitchChannelPageData, postBet } from '@stream-speculator/api';
import {
  Prediction, PredictionOutcome, StreamMetricPoint, StreamMetricType, TwitchChannel,
  fillPointGaps, DBClient, Bet, getPersonalNet
} from '@stream-speculator/common';

const updatePrediction = (
  prediction: Prediction,
  update: Partial<Prediction>,
) : Prediction => ({
  ...prediction,
  ...update,
  outcomes: update.outcomes ? Object.keys(prediction.outcomes).reduce((m: any, id) => {
    // eslint-disable-next-line no-param-reassign
    m[id] = {
      ...prediction.outcomes[id],
      ...((update.outcomes as any as { [key: string]: PredictionOutcome })[id] ?? {}),
    };

    return m;
  }, {}) : prediction.outcomes,
});

export class ChannelStore {
  loadError: Error | null = null;

  channel: TwitchChannel | null = null;

  viewerCount: StreamMetricPoint[] = [];

  predictions: Prediction[] = [];

  bets: Bet[] = [];

  selectedOutcomeId?: string;

  constructor() {
    makeAutoObservable(this);
  }

  get currentViewerCount() : number {
    return this.viewerCount.length > 0
      ? this.viewerCount[this.viewerCount.length - 1].value : 0;
  }

  async load(channelName: string) {
    try {
      const result = await getTwitchChannelPageData(channelName);
      runInAction(() => {
        this.channel = result.channel;
        this.viewerCount = result.metrics?.viewerCount ?? this.viewerCount;
        this.predictions = result.predictions ?? this.predictions;
        this.bets = result.bets ?? this.bets;
      });
    } catch (e) {
      runInAction(() => {
        this.loadError = e;
      });
    }
  }

  listenToMetrics(dbClient: DBClient) : () => void {
    return dbClient?.onChange(
      DBClient.streamMetric(this.channel?.id ?? '', StreamMetricType.ViewerCount),
      (data) => {
        const metric = data.document.data as StreamMetricPoint;
        runInAction(() => {
          this.viewerCount = fillPointGaps([...this.viewerCount, metric]);
        });
      },
      { includeSnapshot: true },
    );
  }

  listenToPredictions(dbClient: DBClient) : () => void {
    return dbClient?.onChange(
      DBClient.channels.doc(this.channel?.id ?? ''),
      (data) => {
        let update = (data.document.data as TwitchChannel).predictionUpdate as Prediction;
        if (!update) {
          return;
        }
        runInAction(() => {
          const index = this.predictions.findIndex((p) => p.id === update.id);
          if (index > -1) {
            update = this.predictions[index] = updatePrediction(
              this.predictions[index],
              update,
            );
            if(update.status === 'resolved'){
              this.predictions[index].personalNet = getPersonalNet(update, this.bets);
            }
          } else {
            this.predictions.unshift(update);
          }
        });
      },
      { includeSnapshot: true },
    );
  }

  setSelectedOutcomeId(val?: string) {
    this.selectedOutcomeId = val;
  };

  async bet(predictionId: string, outcomeId: string, coins: number) : Promise<void> {
    return postBet({ predictionId, outcomeId, coins }).then((bet)=> {
      runInAction(()=> {
        this.bets.push(bet);
        const index = this.predictions.findIndex((p)=> p.id === predictionId);
        this.predictions[index].outcomes[outcomeId].personalBet = bet.coins;
      });
    });
  }

  lockPrediction(id: string) {
    const index = this.predictions.findIndex((p)=> p.id === id);
    if(index > -1){
      this.predictions[index].status = 'locked';
    }
  }
}

export const ChannelStoreContext = createContext<ChannelStore>({} as ChannelStore);
export const useChannelStore = () => useContext(ChannelStoreContext);
