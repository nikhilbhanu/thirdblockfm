// Application configuration constants

export const CROSSFADE_DURATION_MS = 2000; // 1 second
export const VOLUME_STEPS = 50; // Number of steps for volume change

export const METADATA_FETCH_URL = 'https://3ff645f3216a4de6.ngrok.app/status-json.xsl';
export const METADATA_FETCH_INTERVAL_MS = 15000; // 15 seconds

export const STATIONS = [
  {
    id: 'dreamy',
    name: 't',
    streamUrl: 'https://3ff645f3216a4de6.ngrok.app/dreamy',
    mountPoint: 'dreamy'
  },
  {
    id: 'boogie',
    name: 'b',
    streamUrl: 'https://3ff645f3216a4de6.ngrok.app/boogie',
    mountPoint: 'boogie'
  }
];
