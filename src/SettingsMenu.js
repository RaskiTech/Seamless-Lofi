import react, { useState } from 'react';


function SettingsMenu(props) {
    const [volume, setVolume] = useState(0.8);

    
    return (
        <div className={"settingsContainer " + (props.open ? "settingsOpen" : "settingsClosed")}>
            <p>Volume</p>
            <input disabled={!props.open} type="range" min="0" max="1" step="0.1" defaultValue={props.defaultVolume} onChange={(event) => props.onVolumeChange(event.target.value)}/>

            <p>Change speed</p>
            <input disabled={!props.open} type="range" min="0" max="5" step="1" defaultValue={props.defaultSpeed} onChange={(event) => props.onSpeedChange(event.target.value)}/>
        </div>
    )
}

export default SettingsMenu;