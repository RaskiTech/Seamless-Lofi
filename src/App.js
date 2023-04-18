import React, { Component, useState, useRef, useEffect } from 'react';
import './App.css';
import './Cards.css';
import { LoadModel, Predict, GaussianRandomVector } from './Predict';
import Sequencer from './Sequencer';


const InitializeAudioWorklet = async (audioContext) => {
    const processorModuleName = "bypass-processor";
    try
    {
        await audioContext.audioWorklet.addModule(`worklet/${processorModuleName}.js`);
        const node = new AudioWorkletNode(audioContext, processorModuleName, {channelCount: 2, channelCountMode: "explicit"});
        //const oscillator = audioContext.createOscillator();
        //oscillator.connect(node).connect(audioContext.destination);
        //oscillator.start();
        node.connect(audioContext.destination)

        return node;
    }
    catch(e)
    {
        console.log(`Failed to load module ${processorModuleName}. Error: \n`, e);
    }
}

function App() {
    const [isPlaying, setIsPlayingState] = useState(false);
    const audioContext = useRef(null);
    const [nodeRef, setNodeRef] = useState(null);

    const StartAudioStream = async () =>
    {
        if (!audioContext.current) {
            try { audioContext.current = new (window.AudioContext || window.webkitAudioContext)(); }
            catch(e)
            {
                console.log(`Sorry, but your browser doesn't support the Web Audio API!`, e);
                return;
            }
        } 

        if (nodeRef === null)
        {
            var newNodeRef = await InitializeAudioWorklet(audioContext.current);
            setNodeRef(newNodeRef);
            newNodeRef.port.postMessage({play: true});
        }

    }

    const SetIsPlaying = (playing) => {
        setIsPlayingState(playing);
    }

    const ResetAudio = () => {
        if (nodeRef !== null) {
            SetIsPlaying(false);
            nodeRef.port.onmessage = null;
            nodeRef.port.close();
            setNodeRef(null);
        }
    }

    return (
        <>
            <div className="card-parent top-left-cards">
                <div className="card">Lofi AI music</div>
                <div className="card"></div>
                <div className="card"></div>
            </div>
            <div className="card-parent top-right-cards">
                <div className="card">RaskiTech</div>
                <div className="card"></div>
                <div className="card"></div>
            </div>

            <header className="App-header">

                <span style={{"height": "20px"}}/>
                <button className="button" onClick={StartAudioStream} type="button" > StartAudioStream </button>
                <button className="button" disabled={nodeRef === null} onClick={() => SetIsPlaying(!isPlaying)} >{isPlaying ? "Stop" : "Start"}</button>
                <span className="subText">Use AI to generate never-ending beats to *relax and study to*</span>
                <Sequencer nodeRef={nodeRef} play={isPlaying} ResetAudio={ResetAudio}/>

            </header>
        </>
    );
}

export default App;