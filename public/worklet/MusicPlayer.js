const TAU = 2 * Math.PI;
const twoOverPI = 2.0 / Math.PI;
const halfPI = Math.PI / 2;

const MASTER_VOLUME = 0.7;
const instruments = {
    "synth": {
        waveFunction: GetSynthWave,
    },
    "soundTest": {
        waveFunction: GetSoundTest,
    }
};

// Note should contain:
// instrument: string
// pitch: number
// activateTime: number 
// releaseTime: number
let notes = new Array(50);
let noteIndex = 0;
// Clip should contain:
// sampleBuffer
// activateTime
// sampleRate
let clips = new Array(30);
let clipIndex = 0;

function DontCrackOnMe(time, endTime, attackTime=0.05, releaseTime=0.05) {
    if (time < attackTime)
        return time / attackTime;
    if (time + releaseTime > endTime) {
        return (endTime - time) / releaseTime;
    }
    return 1;
}

function GetOscillatorWave(playedTime, endTime, pitch) {
    const falloffTime = 0.3;
    
    var hz = pitch * TAU;

    var wave = 0;

    // https://www.youtube.com/watch?v=ogFAHvYatWs    
    wave += 0.6  * Math.sin(1 * playedTime * hz);
    wave += 0.2  * Math.sin(2 * playedTime * hz);
    wave += 0.05 * Math.sin(4 * playedTime * hz);
    wave *=  Math.exp(-0.0025 * playedTime * hz);
    wave += wave * wave * wave;

    wave *= DontCrackOnMe(playedTime, endTime, 0.1, 0.1);
    return [wave, wave];
}

function GetSynthWave(playedTime, endTime, pitch) {

    var GetAmplitudeModification = (index, offset) => { return 1 + 0.5 * Math.sin(offset + playedTime * 5 * Math.pow(index, 2)) }
    // offset: Random value to separate different detune function calls
    var GetDetune = (offset) => { return 1; }//return 1 + 0.001 * Math.sin(playedTime * 3 + offset) }

    var GetSpeakerWave = (offset, time, pitch) => {
        var x = time * pitch;
        var f0 = 367279531.39014554 * Math.sin(439.875 * x * GetDetune(offset + 1));
        var f1 = 154510689.27153534 * Math.sin(880.125 * x * GetDetune(offset + 2));
        var f2 = 73891115.6011831 * Math.sin(1320.0 * x * GetDetune(offset + 3));
        var f3 = 19457265.59190379 * Math.sin(1759.875 * x * GetDetune(offset + 4));
        var f4 = 6808778.204142964 * Math.sin(2200.125 * x * GetDetune(offset + 5));
        var f5 = 2219744.06597633 * Math.sin(2640.0 * x * GetDetune(offset + 6));


        var wave = f0 * GetAmplitudeModification(1.0, offset) +
                   f1 * GetAmplitudeModification(2.1, offset) +
                   f2 * GetAmplitudeModification(3.3, offset) +
                   f3 * GetAmplitudeModification(4.1, offset) +
                   f4 * GetAmplitudeModification(5.5, offset) +
                   f5 * GetAmplitudeModification(6.2, offset);
        return wave;
    }

    // The weird pitch this function uses
    var functionPitch = 1.85 * 3.14159 * pitch / 440;

    var left = GetSpeakerWave(0, playedTime, functionPitch) + GetSpeakerWave(10, playedTime, functionPitch * 1.01);
    var right = GetSpeakerWave(23, playedTime, functionPitch) + GetSpeakerWave(12.3, playedTime, functionPitch * 1.01);
    //var right = left//GetSpeakerWave(10);

    var loudness = 0.0000000005 * 
        /* Attack */ (3 * Math.exp(-10 * playedTime) + 1);
    loudness *= DontCrackOnMe(playedTime, endTime, 0.01, 0.01);
    
    left *= loudness * (1 + 0.2 * Math.sin(         playedTime * 60))
    right *= loudness * (1 + 0.2 * Math.sin(3.141 + playedTime * 60))


    return [left, right];
}

function GetSoundTest(playTime, endTime, pitch) {
    
    return [0.2, 0.2];
}




function GetInstrumentSound(instrument, note, time, verbose) {
    // Get waveform of instrumet
    // Modify it with attack, release and sustain

    if (note.activateTime > time || time > note.releaseTime)
        return [0.0, 0.0];

    var sound = instrument.waveFunction(time - note.activateTime, note.releaseTime - note.activateTime, note.pitch)


    if (verbose) {
        if (sound[0] > 1 || sound[0] < -1 || sound[1] > 1 || sound[1] < -1)
            console.log("Sound wave in instrument", instrument.waveFunction.name, "was over range of [-1, 1]. It is", sound);

        console.log("Time:", time, "Note:", note, "Sound:", sound);
    }

    return sound;
}
function GetClipSound(time, clip, verbose) {
    var sound = 0;

    var clipLength = clip.sampleBuffer.length / clip.sampleRate;
    if (clip.activateTime < time && time < clip.activateTime + clipLength) {
        sound += clip.sampleBuffer[Math.floor(clip.sampleRate * (time - clip.activateTime))];
        if (verbose && sound === NaN) {
            console.log("Warning at time", time, "when clip was active from time", clip.activateTime, "and had sample rate of", clip.sampleRate);
            console.log("Sound became NaN. Sound that was added was", clip.sampleBuffer[Math.floor(clip.sampleRate * (time - clip.activateTime))], "- It is at index", Math.floor(clip.sampleRate * (time - clip.activateTime)), "in buffer", clip.sampleBuffer);
        }
        sound *= DontCrackOnMe(time - clip.activateTime, clipLength, 0.01, 0.05);
    }

    return [sound, sound];
}

export function SoundAction(event) {
    if (event.type === "addNote") {
        notes[noteIndex] = {
            instrument: event.instrument,
            pitch: event.pitch,
            activateTime: event.startTime,
            releaseTime: event.releaseTime,
        };

        noteIndex = (noteIndex + 1) % notes.length;
    }
    if (event.type === "addClip") {
        clips[clipIndex] = {
            activateTime: event.startTime,
            sampleBuffer: event.sampleBuffer,
            sampleRate: event.sampleRate,
        };

        clipIndex = (clipIndex + 1) % clips.length;
    }
}

export function GetWaveAtTime(time, verbose) {
    var output = [0.0, 0.0];

    for (var i in notes) {
        let instrument = instruments[notes[i].instrument];
        if (instrument === undefined) {
            if (verbose)
                console.log("Couldn't find instrument in note: ", notes[i]);
            continue;
        }
        var out = GetInstrumentSound(instrument, notes[i], time, verbose);
        output[0] += out[0]
        output[1] += out[1]
    }
    for (var i in clips) {
        var out = GetClipSound(time, clips[i], verbose)
        output[0] += out[0]
        output[1] += out[1]
    }

    // Force a reduction because it likely is over anyway
    var loudness = 0.2 * MASTER_VOLUME;
    output[0] *= loudness;
    output[1] *= loudness;

    if (verbose && output > 1)
        console.log("Final output was over 1, meaning the speaker will likely crack. Output was ", output);


    return output; 
}
