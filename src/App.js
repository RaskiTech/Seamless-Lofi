import React, { Component, useState, useRef, useEffect } from 'react';
import './App.css';
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

        console.log(`loaded module ${processorModuleName}`);
        return node;
    }
    catch(e)
    {
        console.log(`Failed to load module ${processorModuleName}. Error: \n`, e);
    }
}

function App() {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioContext = useRef(null);
    const nodeRef = useRef(null);

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
        console.log('New context instantiated')

        if (nodeRef.current === null)
        {
            nodeRef.current = await InitializeAudioWorklet(audioContext.current);
        }

        nodeRef.current.port.postMessage({"play": !isPlaying});
        setIsPlaying(!isPlaying);
    }


    const addNote = async (pitch) => {
        nodeRef.current.port.postMessage(
            {
                type: "addNote",
                instrument: "synth",
                pitch: pitch,
                startTime: 0.0,
                releaseTime: 2.0,
            }
        );
    }

    return (
        <div className="App">
            <header className="App-header">

                <span>Lofi AI music.</span>
                <span>...in development. It might not sound like it yet.</span>
                <span style={{"height": "20px"}}/>
                <button className="button" onClick={StartAudioStream} type="button" > StartAudioStream </button>
                <button className="button" disabled={nodeRef.current === null} onClick={() => addNote(440)} >Add note</button>
                <Sequencer nodeRef={nodeRef} play={isPlaying}/>

            </header>
        </div>
    );
}

export default App;