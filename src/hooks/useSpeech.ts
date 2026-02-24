import { useState, useEffect, useRef, useCallback } from 'react';

export const useSpeech = () => {
  const [isMuted, setIsMuted] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const isMutedRef = useRef(false);

  // Keep refs in sync
  useEffect(() => { selectedVoiceRef.current = selectedVoice; }, [selectedVoice]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      
      if (availableVoices.length > 0 && !selectedVoiceRef.current) {
        const defaultVoice = availableVoices.find(v => v.default) || availableVoices[0];
        setSelectedVoice(defaultVoice);
      }
    };

    loadVoices();
    
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Speak text
  const speak = useCallback((text: string) => {
    if (isMutedRef.current || !text) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    if (selectedVoiceRef.current) {
      utterance.voice = selectedVoiceRef.current;
    }
    
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  // Speak text repeated N times (queued)
  const speakRepeat = useCallback((text: string, times: number = 3) => {
    if (isMutedRef.current || !text) return;

    window.speechSynthesis.cancel();

    for (let i = 0; i < times; i++) {
      const utterance = new SpeechSynthesisUtterance(text);
      if (selectedVoiceRef.current) {
        utterance.voice = selectedVoiceRef.current;
      }
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;

      if (i === 0) utterance.onstart = () => setIsSpeaking(true);
      if (i === times - 1) {
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
      }

      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // Stop speaking
  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newMuted = !prev;
      if (newMuted) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }
      return newMuted;
    });
  }, []);

  // Change voice
  const changeVoice = useCallback((voiceURI: string) => {
    setVoices(currentVoices => {
      const voice = currentVoices.find(v => v.voiceURI === voiceURI);
      if (voice) {
        setSelectedVoice(voice);
      }
      return currentVoices;
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  return {
    speak,
    speakRepeat,
    stop,
    toggleMute,
    changeVoice,
    isMuted,
    voices,
    selectedVoice,
    isSpeaking,
  };
};
