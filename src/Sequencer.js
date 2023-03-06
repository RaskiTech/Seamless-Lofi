import React, { Component } from 'react';
import './App.css';
import { LoadModel, Predict, GaussianRandomVector } from './Predict.js';
import './NoteVisualizer.js';
import NoteVisualizer from './NoteVisualizer.js';


var BPM = 120;
var secondsPerBeat = (1.0 / (BPM / 60));

class Sequencer extends Component {

    constructor(props) {
        super(props);

        this.state = {
            timeStep: 0, // Value between 0 and song length (in this case 64)
            model: null,
            melodyNoteArray: [],
            loadedClips: {},
            noteTreshhold: 0.35,
        }
        this.timeStepCallbackInterval = null


        this.LoadClipIntoState("kick", "Clips/Kick.wav");
        this.LoadClipIntoState("snare", "Clips/Snare.wav");
        this.LoadClipIntoState("percussion", "Clips/Percussion.wav");

        document.addEventListener('keydown', (e) => {
            if (e.key == 'a')
                this.PlayClip("kick");//addNote(this.IndexToPitch(32));
            if (e.key == 's')
                this.PlayClip("snare");//addNote(this.IndexToPitch(32 + 2));
            if (e.key == 'd')
                this.PlayClip("percussion");//addNote(this.IndexToPitch(32 + 4));
            if (e.key == 'f')
                this.PlayNote("synth", this.IndexToPitch(41), 3);
            if (e.key == 'g')
                this.PlayNote("synth", this.IndexToPitch(41 + 2), 1);
            if (e.key == 'h')
                this.PlayNote("synth", this.IndexToPitch(41 + 4), 1);
            if (e.key == 'j')
                this.PlayNote("synth", this.IndexToPitch(41 + 5), 1);
            if (e.key == 'k')
                this.PlayNote("synth", this.IndexToPitch(41 + 7), 1);
            if (e.key == 'l')
                this.PlayNote("synth", this.IndexToPitch(41 + 12), 1);
            if (e.key == 'ö')
                this.PlayNote("synth", this.IndexToPitch(41 - 12), 1);
                /*
            if (e.key == 'g')
                addNote(this.IndexToPitch(32 + 7));
            if (e.key == 'h')
                addNote(this.IndexToPitch(32 + 9));
            if (e.key == 'j')
                addNote(this.IndexToPitch(32 + 11));
            if (e.key == 'k')
                addNote(this.IndexToPitch(32 + 12));
            if (e.key == 'l')
                addNote(this.IndexToPitch(32 + 12 + 2));
            if (e.key == 'ö')
                addNote(this.IndexToPitch(32 + 12 + 4));
            if (e.key == 'ä')
                addNote(this.IndexToPitch(32 + 12 + 5));
                */
        })
    }

    async LoadClipIntoState(key, path) {
        var audioContext = new AudioContext();
        var reader = new FileReader();

        var getState = () => { return this.state; };

        reader.onload = async function() {
            var arrayBuffer = reader.result;
            var decoded = await audioContext.decodeAudioData(arrayBuffer);

            getState().loadedClips[key] = {
                sampleRate: decoded.sampleRate,
                sampleBuffer: decoded.getChannelData(0),
            };
        };

        var response = await fetch(path);
        var blob = await response.blob();
        reader.readAsArrayBuffer(blob);
    }

    async GenerateMelody() {
        var arr = await Predict(this.state.model, GaussianRandomVector(0.5, 0.5));
        this.setState({
            melodyNoteArray: arr
        });

        if (this.timeStepCallbackInterval == null)
            // clearInterval(this.timeStepCallbackInterval)
            this.timeStepCallbackInterval = setInterval(() => this.AdvanceTimeStep(), 1000 * secondsPerBeat);
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
        this.props.nodeRef.current.port.postMessage(
            {
                type: "addClip",
                startTime: 0.0,
                sampleRate: clip.sampleRate,
                sampleBuffer: clip.sampleBuffer,
            }
        );
    }

    PlayNote(instrumentName, pitch, duration) {
        this.props.nodeRef.current.port.postMessage(
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
        if (this.state.model === null)
            return

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

                this.PlayNote("synth", this.IndexToPitch(i), (endStep - timeStep) * secondsPerBeat);

            }
        }

        // Drums
        if (timeStep % 4 === 0)
            this.PlayClip("kick")
        if (timeStep % 4 === 2)
            this.PlayClip("snare")
        if (timeStep % 2 === 1)
            this.PlayClip("percussion")
    }

    render() {
        if (this.state.model === null)
            LoadModel(this.state);

        return (
            <>
                <button className="button" disabled={this.state.model === null} onClick={() => this.GenerateMelody()} >Predict</button>
                <NoteVisualizer className="NoteVisualizer" notes={this.state.melodyNoteArray} noteTreshhold={this.state.noteTreshhold} timeStep={this.state.timeStep}></NoteVisualizer>
            </>
        )
    }
}


export default Sequencer;