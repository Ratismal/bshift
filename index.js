let argv = require('yargs')
  .option('config', {
    describe: 'Configuration input',
    alias: 'c'
  })
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
    alias: 't',
    default: 120
  })
  .option('beats', {
    describe: 'The number of beats per bar',
    alias: 'b',
    default: 4
  })
  .option('map', {
    describe: 'How beats should be arranged, separated by commas. Leaving blank will remove from the song.',
    alias: 'm',
    default: '1,4,3,2'
  })
  .option('trim', {
    describe: 'Remove dead space from the beginning of the wav file',
    alias: 'T'
  })
  .option('shuffle', {
    describe: 'Shuffles the provided mapping every beat',
    alias: 's'
  })
  .option('debug', {
    alias: 'd',
    describe: 'Debug logging'
  }).argv;

const util = require('util');
const WaveFile = require('wavefile');
const path = require('path');
const fs = require('fs');

if (argv.config) {
  const config = JSON.parse(fs.readFileSync(argv.config));
  argv = {
    ...argv,
    ...config
  };
}

const input = fs.readFileSync(argv.input);

function debug(func, ...args) {
  if (argv.debug) console[func](...args);
}

const MAX_BEAT = argv.beats || 4;

class WavProcessor {
  constructor(wav) {
    this.wav = wav;

    this.rate = wav.fmt.sampleRate;
    this.bytesPerSecond = wav.fmt.sampleRate * wav.fmt.blockAlign;
    this.bytesPerBeat = this.bytesPerSecond / (argv.bpm / 60);

    console.log(argv.bpm);

    console.log('Sample Rate: %i\nBytes per Second: %f\nBytes per Beat: %f', this.rate, this.bytesPerSecond, this.bytesPerBeat);

    this.map = argv.map.toString().split(',').map(Number).map(n => n - 1);
    this.beats = [];

    this.samples = wav.data.samples;
    if (argv.trim) {
      this.trim();
    }

    this.bar = 0;
    this.totalBars = Math.floor(this.samples.length / this.bytesPerBeat / MAX_BEAT);

    this.lastBeat = 0;
    this.i = 0;

    this.script = [];

    this.output = Buffer.from([]);
  }

  get length() {
    return this.samples.length;
  }

  trim() {
    let i = 0;
    let threshold = argv.trim;
    if (typeof threshold !== 'number') threshold = 125;

    for (const sample of this.samples) {
      if (sample > threshold && sample < 255 - threshold) {
        break;
      }
      i++;
    }
    this.samples = this.samples.slice(this.round(i));
    console.log('Trimmed %i bytes of dead space', i);
  }

  round(i) {
    let r = i % this.wav.fmt.blockAlign;
    let b = i - r;
    return b;
  }

  next() {
    this.i += this.bytesPerBeat;
    let j = this.round(this.i);

    if (j > this.samples.length) return null;

    let slice = this.samples.slice(this.lastBeat, j);
    this.lastBeat = j;

    if (argv.debug) {
      process.stdout.clearLine();
      process.stdout.write(util.format('%f | %f\n', j, this.i));
    }

    return slice;
  }

  append(buffers) {
    this.output = Buffer.concat([this.output, ...buffers]);
  }

  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      let j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  mapBeats() {
    if (argv.shuffle) {
      this.shuffle(this.map);
      this.script.push({
        bytes: this.i,
        bar: this.bar,
        beat: this.bar * MAX_BEAT,
        seconds: this.i / this.bytesPerSecond,
        map: this.map.slice(0)
      });
    }
    let o = [];
    for (const m of this.map) {
      if (this.beats[m]) o.push(this.beats[m]);
    }
    this.append(o);
    this.beats = [];
  }

  process() {
    let i = 0;
    let slice = null;
    while (slice = this.next()) {
      this.beats.push(slice);
      if (++i >= MAX_BEAT) {
        i = 0;
        process.stdout.write(util.format('Processed bar %d/%d\r', ++this.bar, this.totalBars));

        this.mapBeats();
      }
    }
    this.mapBeats();

    this.wav.data.samples = this.output;
    return this.wav;
  }
}

void async function () {
  const wav = new WaveFile(input);
  const proc = new WavProcessor(wav);

  const processed = proc.process();

  console.log('\nDone!');

  fs.writeFileSync(argv.output, processed.toBuffer());
  if (argv.shuffle) {
    fs.writeFileSync(argv.output + '.script.json', JSON.stringify(proc.script, null, 2));
  }
}();