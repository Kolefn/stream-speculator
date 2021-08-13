import { createContext, useContext } from 'react';
import { makeAutoObservable, runInAction } from 'mobx';
import { getTwitchChannelPageData, postBet, searchChannels } from '@stream-speculator/api';
import {
  Prediction, PredictionOutcome, StreamMetricPoint, StreamMetricType, TwitchChannel,
  fillPointGaps, DBClient, Bet, getPersonalNet, SearchResult
} from '@stream-speculator/common';

// const MOCK_SEARCH_RESULTS: SearchResult[] = [
//   {
//     displayName: 'cdewx',
//     profileImageUrl: 'https://static-cdn.jtvnw.net/jtv_user_pictures/cdewx-profile_image-22169ba7d17170db-70x70.png',
//     isLive: true,
//   },
//   {
//     displayName: 'asmongold',
//     profileImageUrl: 'https://static-cdn.jtvnw.net/jtv_user_pictures/asmongold-profile_image-f7ddcbd0332f5d28-70x70.png',
//     isLive: true,
//   },
//   {
//     displayName: 'payo',
//     profileImageUrl: 'https://static-cdn.jtvnw.net/jtv_user_pictures/996d2d80-c1c4-4dd7-99dd-074c47cf7196-profile_image-70x70.png',
//     isLive: false,
//   },
//   {
//     displayName: 'ziqoftw',
//     profileImageUrl: 'https://static-cdn.jtvnw.net/jtv_user_pictures/ziqoftw-profile_image-d4d7393232afa39e-70x70.png',
//     isLive: false,
//   }
// ];

let searchTimeout: NodeJS.Timeout | null = null;

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

const searchResultCache: { [key: string]: SearchResult[] } = {};

export class ChannelStore {
  loadError: Error | null = null;

  channel: TwitchChannel | null = null;

  viewerCount: StreamMetricPoint[] = [];

  predictions: Prediction[] = [];

  bets: Bet[] = [];

  selectedOutcomeId?: string;

  searchResults: SearchResult[] = [];

  searchSelectIndex = 0;

  searchLoading = false;

  constructor() {
    makeAutoObservable(this);
  }

  get currentViewerCount() : number {
    return this.viewerCount.length > 0
      ? this.viewerCount[this.viewerCount.length - 1].value : 0;
  }

  async load(channelName: string) {
    try {
      runInAction(()=> {
        if(this.channel && this.channel.displayName.toLocaleLowerCase() !== channelName.toLocaleLowerCase()){
          this.channel = null;
          this.predictions = [];
          this.bets = [];
          this.selectedOutcomeId = undefined;
        }
        this.loadError = null;
      });
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
        if(data.action && data.action !== 'update'){
          return;
        }
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

  search(text: string) {
    if(searchTimeout){
      clearTimeout(searchTimeout);
      searchTimeout = null;
    }

    if(!text || text.trim() === ''){
      return;
    }

    if(searchResultCache[text]){
      this.searchResults = searchResultCache[text];
      this.searchLoading = false;
      return;
    }

    searchTimeout = setTimeout(()=> {
      searchTimeout = null;
      runInAction(()=> {
        this.searchLoading = true;
      });
      searchChannels(text).then((results: SearchResult[])=> {
        searchResultCache[text] = results;
        runInAction(()=> {
          this.searchResults = results;
          this.searchLoading = false;
        });
      }).catch(()=> {
        runInAction(()=> {
          this.searchLoading = false;
        });
      });
    }, 300);
  }

  searchGoTo(displayName?: string){
    if(!displayName){
      return;
    }
    document.location.href = `/twitch/${displayName ?? this.searchResults[this.searchSelectIndex].displayName}`;
    this.searchSelectIndex = 0;
    this.searchResults = [];
  }

  searchSelect(index: number){
    this.searchSelectIndex = Math.max(0, Math.min(index, this.searchResults.length - 1));
  }
}

export const ChannelStoreContext = createContext<ChannelStore>({} as ChannelStore);
export const useChannelStore = () => useContext(ChannelStoreContext);
