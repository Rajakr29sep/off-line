export function speakAnswer(text) {
  if (!("speechSynthesis" in window)) throw new Error("Speech synthesis is unavailable in this browser.");
  window.speechSynthesis.cancel();
  if (!text?.trim()) return;
  const utterance = new SpeechSynthesisUtterance(text.trim());
  utterance.lang = "en-IN";
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}
export function stopSpeaking() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}
