const argv = require('yargs')
  .option('input', {
    describe: 'File to beatshift',
    alias: 'i',
    default: 'input.wav'
  })
  .option('output', {
    describe: 'Output file',
    alias: 'o',
    default: 'output.wav'
  })
  .option('bpm', {
    describe: 'The BPM of the input file',
    alias: 'b',
    default: 120
  })
  .option('map', {
    describe: 'How beats should be arranged, separated by commas. Leaving blank will remove from the song.',
    alias: 'm',
    default: '1,4,3,2'
  })
  .option('debug', {
    describe: 'Debug logging'
  }).argv;

const WaveFile = require('wavefile');
const path = require('path');
const fs = require('fs');
const input = fs.readFileSync(argv.input);

function debug(func, ...args) {
  if (argv.debug) console[func](...args);
}

void async function () {
  const wav = new WaveFile(input);

  const rate = wav.fmt.sampleRate;
  const bitsPerSecond = rate * wav.fmt.blockAlign;
  const beatsPerSecond = argv.bpm / 60;
  const bitsPerBeat = Math.round(bitsPerSecond / beatsPerSecond);
  debug('log', bitsPerSecond, beatsPerSecond, bitsPerBeat);

  const map = argv.map.toString().split(',').map(Number).map(n => n - 1);

  let o = Buffer.from([]);
  let beats = [];
  let lastBeat = 0;
  let beat = 0;
  const MAX_BEAT = 4;
  const samples = wav.data.samples;
  for (let i = bitsPerBeat; i < samples.length; i += bitsPerBeat) {
    beats.push(samples.slice(lastBeat, i));
    if (++beat === MAX_BEAT) {
      beat = 0;
      // add to o
      for (const mapping of map) {
        if (beats[mapping]) {
          o = Buffer.concat([o, beats[mapping]]);
        }
      }
      beats = [];
    }
    lastBeat = i;
  }
  for (const mapping of map) {
    if (beats[mapping]) {
      o = Buffer.concat([o, beats[mapping]]);
    }
  }

  wav.data.samples = o;

  // const wav2 = new WaveFile();

  // wav2.fromScratch(2, wav.fmt.sampleRate, wav.bitDepth, wav.data.samples.slice(0));

  // console.log(wav);

  fs.writeFileSync(argv.output, wav.toBuffer());
}();