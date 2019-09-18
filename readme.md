# bshift

A simple commandline utility to reorganize beats within a wav file.

## Considerations

- bshift will only accept wave (.wav) files
- you should ensure your wave file's beginning is trimmed (no dead space) or you use the `--trim` flag
- you should ensure that BPM provided is accurate

## Usage

Download your binary from releases. Alternatively, use `node index.js`. In this readme, I'll refer to whichever you use as `bshift`.

Use `bshift --help` to get commandline usage.

### Basic Example

If you have a wav file called `input.wav` with a BPM of 120, and you want to swap beats 2 and 4...
```
bshift -i input.wav -o output.wav -t 120 -m 1,4,3,2
```
`-i` and `-o` default to `input.wav` and `output.wav` respectively. The default BPM is 120, default time signature is 4/4, and default action is swapping beats 2 and 4. So you could also just do:
```
bshift
```

### Alternate Time Signatures

Supposing `input.wav` is has a 3/4 time signature...
```
bshift -b 3 -m 1,3,2
```
You should ensure that your BPM matches the number of beats (`3`) you specify. The note that counts as a beat (`4`) is irrelevant!

### Trimming

bshift will only work properly if the dead space at the beginning of the song is trimmed. Otherwise, the beats won't line up and you'll hear popping noises. To use bshift's automatic trimming, use the `--trim` flag.

```
bshift --trim
```

By default with this flag, you will have a "threshold" of 125. bshift will remove all leading bytes until it reaches one with a value that's between `threshold` and `255 - threshold`, so by default 125-130. You can specify your own threshold, but you proooooooobably shouldn't go any higher than 125 or it'll just strip the whole song.

### Unconventional Arrangements

You aren't limited to just swapping beats! You can rearrange them however you see fit. Take them out, add more, omit some, the world's your oyster! For example, this is totally valid, even for a 4/4 song:

```
bshift -m 1,4,2,2,3,4
```

I'm not saying it'll be *good*, but definitely go for it if that's what you're into.

## Sample

Enclosed in this repository is an `input.wav` file. It's a 4/4 120BPM song that was designed so that you could clearly identify the first, second, third, and fourth beats (they increment on a minor scale). Feel free to play around with it!