import { useEffect, useState } from "react";
import { RotateCcw, Square, Volume2, VolumeX } from "lucide-react";
import { speakAnswer, stopSpeaking } from "../services/speech.js";

export default function VoiceControls({ text }) {
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (enabled && text) {
      try { setError(""); speakAnswer(text); } catch (e) { setError(e.message); }
    }
    return () => stopSpeaking();
  }, [enabled, text]);
  const toggle = () => { if (enabled) stopSpeaking(); setEnabled(!enabled); };
  const replay = () => { try { setError(""); speakAnswer(text); } catch (e) { setError(e.message); } };
  return <div className="voice-controls">
    <button type="button" onClick={toggle}>{enabled ? <VolumeX size={16}/> : <Volume2 size={16}/>} Voice {enabled ? "on" : "off"}</button>
    <button type="button" onClick={replay} disabled={!text}><RotateCcw size={16}/> Replay</button>
    <button type="button" onClick={stopSpeaking}><Square size={14}/> Stop</button>
    {error && <small role="alert">{error}</small>}
  </div>;
}
