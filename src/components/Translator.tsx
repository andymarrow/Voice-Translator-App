"use client";

import { useState, useEffect, useRef } from 'react';
import { default as languageCodesData } from '@/data/language-codes.json';
import { default as countryCodesData } from '@/data/country-codes.json';
import { FaVolumeUp } from 'react-icons/fa'; // Import the volume icon

const languageCodes: Record<string, string> = languageCodesData;
const countryCodes: Record<string, string> = countryCodesData;

const Translator = () => {
  const recognitionRef = useRef<SpeechRecognition>();

  const [isActive, setIsActive] = useState<boolean>(false);
  const [text, setText] = useState<string>('');
  const [translation, setTranslation] = useState<string>();
  const [voices, setVoices] = useState<Array<SpeechSynthesisVoice>>([]);
  const [language, setLanguage] = useState<string>('pt-BR');
  const [isManualText, setIsManualText] = useState<boolean>(false); // Track if manual input is used
  const [history, setHistory] = useState<Array<{ text: string; translation: string }>>([]); // Chat history

  const availableLanguages = Array.from(new Set(voices?.map(({ lang }) => lang)))
    .map(lang => {
      const split = lang.split('-');
      const languageCode: string = split[0];
      const countryCode: string = split[1];
      return {
        lang,
        label: languageCodes[languageCode] || lang,
        dialect: countryCodes[countryCode]
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
  const activeLanguage = availableLanguages.find(({ lang }) => language === lang);

  const availableVoices = voices?.filter(({ lang }) => lang === language);
  const activeVoice =
    availableVoices?.find(({ name }) => name.includes('Google'))
    || availableVoices?.find(({ name }) => name.includes('Luciana'))
    || availableVoices?.[0];

  useEffect(() => {
    const handleVoicesChanged = () => {
      const voices = window.speechSynthesis.getVoices();
      setVoices(voices);
    };

    // Check if voices are available initially
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      setVoices(voices);
    } else {
      // If not, listen for the voiceschanged event
      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
    }

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
    };
  }, []);

  function handleOnRecord() {
    if (isActive) {
      recognitionRef.current?.stop();
      setIsActive(false);
      return;
    }

    speak(' ');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();

    recognitionRef.current.onstart = function () {
      setIsActive(true);
    };

    recognitionRef.current.onend = function () {
      setIsActive(false);
    };

    recognitionRef.current.onresult = async function (event) {
      const transcript = event.results[0][0].transcript;
      setText(transcript);
      await translateText(transcript);
    };

    recognitionRef.current.start();
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    setText(event.target.value);
  }

  async function handleSubmit() {
    if (text.trim()) {
      await translateText(text);
    }
  }

  async function translateText(inputText: string) {
    const results = await fetch('/api/translate', {
      method: 'POST',
      body: JSON.stringify({
        text: inputText,
        language: language
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(r => r.json());

    setTranslation(results.text);
    speak(results.text);

    // Add to history
    setHistory(prev => [...prev, { text: inputText, translation: results.text }]);
  }

  function speak(text: string) {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      if (activeVoice) {
        utterance.voice = activeVoice;
      }
      window.speechSynthesis.speak(utterance);
    }, 100);  // Small delay to ensure voices are loaded
  }

  return (
    <div className="mt-12 px-4">
      <div className="max-w-lg rounded-2xl overflow-hidden mx-auto shadow-lg bg-gradient-to-r from-indigo-500 to-blue-500 p-6">
        <div className="bg-white p-4 rounded-lg shadow-md">
          <div className="bg-blue-200 rounded-lg p-3 border border-blue-300">
            <ul className="font-mono font-bold text-blue-900 uppercase px-4 py-2 border border-blue-800 rounded">
              <li>
                &gt; Translation Mode: {activeLanguage?.label}
              </li>
              <li>
                &gt; Dialect: {activeLanguage?.dialect}
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-gray-800 p-4 border-b-4 border-gray-950">
          <p className="flex items-center gap-3">
            <span className={`block rounded-full w-5 h-5 flex-shrink-0 flex-grow-0 transition-all duration-300 ${isActive ? 'bg-red-500 animate-pulse' : 'bg-red-900'} `}>
              <span className="sr-only">{isActive ? 'Actively recording' : 'Not actively recording'}</span>
            </span>
            <span className={`block rounded w-full h-5 flex-grow-1 transition-all duration-300 ${isActive ? 'bg-green-500' : 'bg-green-900'}`}>
              <span className="sr-only">{isActive ? 'Speech is being recorded' : 'Speech is not being recorded'}</span>
            </span>
          </p>
        </div>

        <div className="bg-gray-800 p-4">
          <div className="grid sm:grid-cols-2 gap-4 max-w-lg bg-white rounded-lg p-5 mx-auto shadow-md">
            <form>
              <div>
                <label className="block text-black text-[.6rem] uppercase font-bold mb-1">Language</label>
                <select className="w-full text-black text-[.7rem] rounded-md border-zinc-300 px-2 py-1 pr-7" name="language" value={language} onChange={(event) => {
                  setLanguage(event.currentTarget.value);
                }}>
                  {availableLanguages.map(({ lang, label }) => {
                    return (
                      <option key={lang} value={lang}>
                        {label} ({lang})
                      </option>
                    );
                  })}
                </select>
              </div>
            </form>
            <p>
              <button
                className={`w-full h-full uppercase font-semibold text-sm ${isActive ? 'text-white bg-red-500' : 'text-zinc-400 bg-zinc-900'} py-3 rounded-md transition-all duration-200`}
                onClick={handleOnRecord}
              >
                {isActive ? 'Stop' : 'Record'}
              </button>
            </p>
          </div>

          <div className="mt-4">
            <label className="block text-zinc-500 text-[.6rem] uppercase font-bold mb-1">Enter Text</label>
            <input
              type="text"
              className="w-full p-2 rounded border text-black border-zinc-300"
              value={text}
              onChange={handleInputChange}
              placeholder="Type here or use voice"
            />
            <button
              className="mt-2 w-full bg-blue-500 text-white py-2 rounded transition-transform duration-200 hover:scale-105"
              onClick={handleSubmit}
            >
              Translate Text
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto mt-12">
        <h2 className="text-xl font-bold mb-4">Chat History</h2>
        <div className="bg-gray-100 rounded-lg p-4 shadow-lg h-48 overflow-y-auto"> {/* Set a fixed height and enable scrolling */}
          {history.map((item, index) => (
            <div key={index} className="mb-3 p-2 rounded-lg bg-gray-500 hover:bg-gray-600 text-black transition duration-200 flex justify-between items-center">
              <div>
                <p className="font-semibold text-white">Spoken Text: {item.text}</p>
                <p className="italic text-black">Translation: {item.translation}</p>
              </div>
              <button onClick={() => speak(item.translation)} className="ml-2 text-white">
                <FaVolumeUp className="h-6 w-6" /> {/* Speak icon */}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Translator;
