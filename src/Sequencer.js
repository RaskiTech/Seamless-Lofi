import React, { Component } from 'react';
import './App.css';
import { LoadModel, Predict, GaussianRandomVector } from './Predict.js';
import './NoteVisualizer.js';
import NoteVisualizer from './NoteVisualizer.js';
import BeatManager from "./BeatManager.js"


var BPM = 90.0;
var secondsPerBeat = 1.0 / (BPM / 60.0);

class Sequencer extends Component {

    constructor(props) {
        super(props);

        // State contains all the things that should update visuals
        this.state = {
            timeStep: 0, // Value between 0 and song length (in this case 64)
            model: {},
            melodyNoteArray: [],
            loadedClips: {},
            noteTreshhold: 0.32,
        }
        this.timeStepCallbackInterval = null;
        this.ambienceClipNames = {};
        this.beatManager = null;


        document.addEventListener('keydown', (e) => {
            if (e.key == 'a')
                this.PlayClip("kick");//addNote(this.IndexToPitch(32));
            if (e.key == 's')
                this.PlayClip("snare");//addNote(this.IndexToPitch(32 + 2));
            if (e.key == 'd')
                this.PlayClip("percussion");//addNote(this.IndexToPitch(32 + 4));
            if (e.key == 'f')
                this.PlayNote("electric", this.IndexToPitch(41-12), 2);
            if (e.key == 'g')
                this.PlayNote("electric", this.IndexToPitch(41-12 + 2), 2);
            if (e.key == 'h')
                this.PlayNote("electric", this.IndexToPitch(41-12 + 4), 0.5);
            if (e.key == 'j')
                this.PlayNote("electric", this.IndexToPitch(41 + 5), 1);
            if (e.key == 'k')
                this.PlayNote("synth", this.IndexToPitch(41 + 7), 1);
            if (e.key == 'l')
                this.PlayNote("synth", this.IndexToPitch(41 + 12), 1);
            if (e.key == 'ö')
                this.PlayNote("synth", this.IndexToPitch(41 - 12), 1);
        })
    }

    AudioStreamStarted() {
        this.LoadAmbienceClip("rain", "Clips/AmbianceRain.wav",         0);
        this.LoadAmbienceClip("waves", "Clips/AmbianceWaves.wav",       1);
        this.LoadAmbienceClip("birds", "Clips/AmbianceBirds.wav",       2);
        this.LoadAmbienceClip("crickets", "Clips/AmbianceCrickets.wav", 3);
        this.LoadAmbienceClip("cafe", "Clips/AmbianceCafe.wav",         4);

        this.beatManager = new BeatManager();


        this.GenerateMelody();
    }

    StartedPlaying() {
        this.props.nodeRef.port.postMessage({type: "changeAmbienceVolume", index: this.ambienceClipNames["rain"], volume: 1.5});
        this.props.nodeRef.port.postMessage({type: "changeAmbienceVolume", index: this.ambienceClipNames["cafe"], volume: 0.75});
    }
    StoppedPlaying() {
        Object.keys(this.ambienceClipNames).forEach(key => {
            this.props.nodeRef.port.postMessage({type: "changeAmbienceVolume", index: this.ambienceClipNames[key], volume: 0.0});
        })
    }

    componentDidUpdate(prevProps) {
        if (this.props.nodeRef !== null && prevProps.nodeRef === null)
            this.AudioStreamStarted();

        // Play & Pause
        if (this.props.play !== prevProps.play) {
            if (this.props.play) {
                this.StartedPlaying();
                if (this.timeStepCallbackInterval === null)
                    this.timeStepCallbackInterval = setInterval(() => this.AdvanceTimeStep(), 1000 * secondsPerBeat);
            }
            else {
                this.StoppedPlaying();
                if (this.timeStepCallbackInterval !== null)
                    clearInterval(this.timeStepCallbackInterval);
                this.timeStepCallbackInterval = null;
            }
        }
    }

    componentWillUnmount() {
        if (this.props.play)
            this.StoppedPlaying();
        if (this.timeStepCallbackInterval !== null)
            clearInterval(this.timeStepCallbackInterval);

        // This is for code reloads sake.
        this.props.ResetAudio();
    }

    async LoadAmbienceClip(key, path, loadIndex) {
        this.ambienceClipNames[key] = loadIndex;

        var audioContext = new AudioContext();
        var reader = new FileReader();
        var getThis = () => { return this; };

        reader.onload = async function() {
            var arrayBuffer = reader.result;
            var decoded = await audioContext.decodeAudioData(arrayBuffer);

            getThis().props.nodeRef.port.postMessage(
                {
                    type: "loadAmbienceClip",
                    index: loadIndex,
                    sampleRate: decoded.sampleRate,
                    sampleBuffer: decoded.getChannelData(0),
                }
            )
        };

        var response = await fetch(path);
        var blob = await response.blob();
        reader.readAsArrayBuffer(blob);
    }


    async GenerateMelody() {
        var arr = await Predict(this.state.model, GaussianRandomVector(0, 1));
        this.setState({
            melodyNoteArray: arr
        });

    }

    // Converts melodyNoteArray index to hz.
    IndexToPitch(index) {
        const lowestNote = 41.20; // E1. The max is G#6. Could try 55.00 which is A1 to C7
        const twoToPowerOneTwelfth = 1.05946398436;
        return lowestNote * Math.pow(twoToPowerOneTwelfth, index);
    }

    PlayClip(name) {
        if (!this.state.loadedClips.hasOwnProperty(name)) {
            console.error("Clip", name, "isn't loaded. Check the spelling.");
            return;
        }


        var clip = this.state.loadedClips[name];
        this.props.nodeRef.port.postMessage(
            {
                type: "addClip",
                startTime: 0.0,
                sampleRate: clip.sampleRate,
                sampleBuffer: clip.sampleBuffer,
            }
        );
    }

    PlayNote(instrumentName, pitch, duration) {
        this.props.nodeRef.port.postMessage(
            {
                type: "addNote",
                instrument: instrumentName,
                pitch: pitch,
                startTime: 0.0,
                releaseTime: duration,
            }
        );
    }

    AdvanceTimeStep() {

        this.setState({timeStep: (this.state.timeStep + 1) % this.state.melodyNoteArray.length})
        var timeStep = this.state.timeStep;

        // console.log("TimeStep:", timeStep);

        // Melody
        for (var i = 0; i < this.state.melodyNoteArray[timeStep].length; i++) {
            var wasOnLastTime = timeStep > 0 && this.state.melodyNoteArray[timeStep - 1][i] > this.state.noteTreshhold;
            var onNow = this.state.melodyNoteArray[timeStep][i] > this.state.noteTreshhold;

            if (!wasOnLastTime && onNow) {
                var endStep = timeStep + 1;
                while (endStep < this.state.melodyNoteArray.length) {
                    if (!(this.state.melodyNoteArray[endStep][i] > this.state.noteTreshhold))
                        break;
                    endStep++;
                }

                const timeStepCount = endStep - timeStep; // Perhaps make all notes play a step or two longer
                this.PlayNote("electric", this.IndexToPitch(i), timeStepCount * secondsPerBeat);

            }
        }

        const AdvanceBeat = () => {
            this.beatManager.AdvanceStep();
            var clip = this.beatManager.GetNowStartingClip();
            if (clip !== null)
                this.props.nodeRef.port.postMessage({
                    type: "addClip",
                    startTime: 0.0,
                    volume: clip.volume,
                    sampleRate: clip.sampleRate,
                    sampleBuffer: clip.sampleBuffer,
                })
        }

        AdvanceBeat();
        setTimeout(AdvanceBeat, secondsPerBeat / 2.0 * 1000);
    }

    render() {
        if (Object.keys(this.state.model).length === 0)
            LoadModel(this.state);

        return (
            <>
                <button className="button" onClick={() => this.GenerateMelody()}>Predict new</button>
                <NoteVisualizer className="NoteVisualizer" notes={this.state.melodyNoteArray} noteTreshhold={this.state.noteTreshhold} timeStep={this.state.timeStep}></NoteVisualizer>
            </>
        )
    }
}


export default Sequencer;