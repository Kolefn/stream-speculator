import { StatNumber } from '@chakra-ui/react';
import { UnixEpochTime } from '@stream-speculator/common';
import { useEffect, useState } from 'react';

const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;
const SECOND = 1000;
const zeroPad = (num: number): string => {
  if (num < 10 && num >= 0) {
    return `0${num}`;
  } else {
    return num.toString();
  }
};
const getUptimeMs = (startTime: UnixEpochTime) => Date.now() - startTime;
const getUptimeText = (ms: number): string => {
  let remain = ms;
  const hours = Math.floor(remain / HOUR);
  remain -= HOUR * hours;
  const mins = Math.floor(remain / MINUTE);
  remain -= MINUTE * mins;
  const secs = Math.floor(remain / SECOND);
  return `${zeroPad(hours)}:${zeroPad(mins)}:${zeroPad(secs)}`;
};
const Uptime = ({ startTime }: { startTime: UnixEpochTime }) => {
  const [uptimeMs, setUptimeMs] = useState(getUptimeMs(startTime));

  useEffect(() => {
    const i = setInterval(() => {
      setUptimeMs(getUptimeMs(startTime));
    }, 1000);
    return () => clearInterval(i);
  }, [startTime]);

  return <StatNumber fontSize="s">{getUptimeText(uptimeMs)}</StatNumber>;
};

export default Uptime;
