"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Volume2, VolumeX, Mic, X, ArrowRight } from "lucide-react";

const LOGO = "/Logo.png";

export default function AIAgent() {
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [actions, setActions] = useState<{ label: string; href: string }[]>([]);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const recognitionRef = useRef<any>(null);
  const router = useRouter();

  // Charger les voix (asynchrone sur mobile)
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) setVoicesLoaded(true);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    // Fallback: retry après 1s si pas chargé
    const retry = setTimeout(loadVoices, 1000);
    return () => clearTimeout(retry);
  }, []);

  function pickFemaleVoice(): SpeechSynthesisVoice | null {
    if (typeof window === "undefined" || !window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return null;

    // 1. Voix françaises féminines connues
    const femaleNames = ["Amelie", "Marie", "Pauline", "Julie", "Sophie", "Natural", "Google français", "female", "Female", "femme", "Femme"];
    for (const name of femaleNames) {
      const v = voices.find(v => v.lang.startsWith("fr") && v.name.includes(name));
      if (v) return v;
    }

    // 2. Voix française quelconque
    const fr = voices.find(v => v.lang.startsWith("fr"));
    if (fr) return fr;

    // 3. Dernier recours: première voix
    return voices[0];
  }

  const cleanTextForSpeech = (text: string): string => {
    return text
      .replace(/•/g, "")
      .replace(/\bFCFA\b/g, "francs CFA")
      .replace(/\n+/g, ". ")
      .replace(/\s+/g, " ")
      .replace(/\.{2,}/g, ".")
      .trim();
  };

  const speakWithBrowser = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const doSpeak = () => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "fr-FR";
      utterance.rate = 0.95;
      utterance.pitch = 1.5;
      utterance.volume = 1;

      const voice = pickFemaleVoice();
      if (voice) utterance.voice = voice;

      const resumeInterval = setInterval(() => {
        if (window.speechSynthesis.speaking && window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }, 5000);

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => { setIsSpeaking(false); clearInterval(resumeInterval); };
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    };

    // Sur mobile, les voix peuvent ne pas être chargées immédiatement
    if (!voicesLoaded) {
      const waitVoices = setInterval(() => {
        const v = window.speechSynthesis.getVoices();
        if (v.length > 0) {
          clearInterval(waitVoices);
          setVoicesLoaded(true);
          doSpeak();
        }
      }, 200);
      // Timeout: parler quand même après 2s
      setTimeout(() => {
        clearInterval(waitVoices);
        doSpeak();
      }, 2000);
    } else {
      doSpeak();
    }
  };

  const speak = useCallback((text: string) => {
    if (!voiceEnabled) return;
    const clean = cleanTextForSpeech(text);
    if (!clean) return;
    speakWithBrowser(clean);
  }, [voiceEnabled]);

  const stopSpeaking = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const toggleVoice = () => {
    if (voiceEnabled) stopSpeaking();
    setVoiceEnabled(!voiceEnabled);
  };

  const startListening = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    stopSpeaking();
    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setIsListening(false);
      sendMessage(text);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const greetingDataRef = useRef<{ message: string; suggestions?: string[]; actions?: { label: string; href: string }[] } | null>(null);

  useEffect(() => {
    if (showWelcome) {
      fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isInitial: true }),
      })
        .then((r) => r.json())
        .then((data) => {
          greetingDataRef.current = data;
        })
        .catch(() => {});
    }
  }, [showWelcome]);

  const startAgent = () => {
    setShowWelcome(false);
    setHasGreeted(true);
    if (greetingDataRef.current) {
      setSuggestions(greetingDataRef.current.suggestions || []);
      setActions(greetingDataRef.current.actions || []);
      speak(greetingDataRef.current.message);
    } else {
      greetUser();
    }
  };

  const greetUser = async () => {
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isInitial: true }),
      });
      const data = await res.json();
      setSuggestions(data.suggestions || []);
      setActions(data.actions || []);
      speak(data.message);
    } catch {
      speak("Bonjour ! Comment puis-je vous aider ?");
    }
  };

  const sendMessage = async (text: string) => {
    setSuggestions([]);
    setActions([]);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const data = await res.json();
      setSuggestions(data.suggestions || []);
      setActions(data.actions || []);
      speak(data.message);
    } catch {
      setSuggestions(["Consulter les soldes", "Voir les transactions", "Aide"]);
      speak("Je n'ai pas pu traiter votre demande. Pouvez-vous reformuler ?");
    }
  };

  const handleSuggestion = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const handleAction = (href: string) => {
    router.push(href);
  };

  const hasContent = suggestions.length > 0 || actions.length > 0 || isSpeaking || isListening;

  if (showWelcome) {
    return (
      <div className="fixed inset-0 z-[100] bg-noir/80 backdrop-blur-sm flex items-center justify-center animate-slide-up">
        <div className="bg-noir-soft border border-or/30 rounded-3xl p-8 max-w-sm w-[90%] text-center shadow-2xl">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse shadow-lg shadow-or/30 overflow-hidden">
            <img src={LOGO} alt="Logo" className="w-full h-full object-contain p-1" />
          </div>
          <h2 className="font-display text-2xl text-blanc font-bold mb-2">Assistant CTF</h2>
          <p className="text-blanc/50 text-sm mb-6">
            Bonjour ! Je suis votre assistant intelligent. Cliquez pour activer la voix et commencer.
          </p>
          <button
            onClick={startAgent}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-or to-amber-600 text-noir font-medium hover:scale-105 transition-all shadow-lg shadow-or/20"
          >
            Activer l'assistant
          </button>
          <p className="text-blanc/30 text-xs mt-4">
            Vous pourrez ensuite me parler ou cliquer sur les suggestions
          </p>
        </div>
      </div>
    );
  }

  if (!hasContent) return null;

  return (
    <>
      {/* Indicateur vocal en haut quand l'agent parle */}
      {isSpeaking && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-md w-[90%] pointer-events-none">
          <div className="bg-noir-soft/95 backdrop-blur border border-or/20 rounded-2xl px-5 py-3 shadow-2xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 animate-pulse overflow-hidden">
              <img src={LOGO} alt="Logo" className="w-full h-full object-contain p-0.5" />
            </div>
            <div className="flex items-center gap-1 flex-1 overflow-hidden">
              <span className="inline-flex gap-0.5 shrink-0">
                <span className="w-1 h-4 bg-or rounded-full animate-pulse" />
                <span className="w-1 h-4 bg-or rounded-full animate-pulse" style={{ animationDelay: "100ms" }} />
                <span className="w-1 h-4 bg-or rounded-full animate-pulse" style={{ animationDelay: "200ms" }} />
              </span>
              <span className="text-blanc/60 text-xs truncate ml-1">Assistant CTF parle...</span>
            </div>
            <button
              onClick={stopSpeaking}
              className="text-red-400 hover:text-red-300 transition-colors shrink-0 pointer-events-auto"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Indicateur écoute en haut */}
      {isListening && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-md w-[90%]">
          <div className="bg-red-500/10 backdrop-blur border border-red-500/30 rounded-2xl px-5 py-3 shadow-2xl flex items-center gap-3">
            <Mic className="w-5 h-5 text-red-400 animate-pulse shrink-0" />
            <span className="text-red-300 text-sm">J'écoute... parlez maintenant</span>
          </div>
        </div>
      )}

      {/* Suggestions + contrôles en bas de l'écran */}
      {hasContent && !isListening && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-2xl w-[90%]">
          <div className="flex flex-col items-center gap-3">
            {/* Actions de navigation */}
            {actions.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center">
                {actions.map((action, j) => (
                  <button
                    key={j}
                    onClick={() => handleAction(action.href)}
                    className="text-xs px-4 py-2 rounded-xl bg-or/15 text-or border border-or/30 hover:bg-or/25 transition-all whitespace-nowrap flex items-center gap-1.5"
                  >
                    {action.label}
                    <ArrowRight className="w-3 h-3" />
                  </button>
                ))}
              </div>
            )}

            {/* Suggestions cliquables */}
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestions.map((suggestion, j) => (
                  <button
                    key={j}
                    onClick={() => handleSuggestion(suggestion)}
                    className="group text-xs px-4 py-2 rounded-xl bg-noir-soft/90 backdrop-blur text-blanc/70 border border-or/15 hover:bg-or/15 hover:text-or hover:border-or/30 transition-all whitespace-nowrap flex items-center gap-1.5"
                  >
                    {suggestion}
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            )}

            {/* Contrôles vocaux */}
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={isListening ? stopListening : startListening}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-lg ${
                  isListening
                    ? "bg-red-500/20 text-red-400 animate-pulse border border-red-500/30"
                    : "bg-gradient-to-br from-or to-amber-600 text-noir hover:scale-110"
                }`}
                aria-label={isListening ? "Arrêter" : "Parler"}
                title={isListening ? "Arrêter" : "Parler à l'assistant"}
              >
                <Mic className="w-5 h-5" />
              </button>
              <button
                onClick={toggleVoice}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all border ${
                  voiceEnabled
                    ? "bg-noir-soft/80 text-or border-or/20"
                    : "bg-noir-soft/80 text-blanc/30 border-blanc/10"
                }`}
                aria-label={voiceEnabled ? "Désactiver la voix" : "Activer la voix"}
                title={voiceEnabled ? "Couper le son" : "Activer le son"}
              >
                {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
