'use client';

import React, { useState, useEffect, useRef } from 'react';
import { VideoKeyframe } from './tutorialsData';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Sparkles, 
  ShieldCheck, 
  MousePointer, 
  CheckCircle,
  Clock,
  FastForward
} from 'lucide-react';

interface InteractiveVideoSimulatorProps {
  videoData: {
    totalDurationSeconds: number;
    videoTitle: string;
    videoDescription: string;
    keyframes: VideoKeyframe[];
  };
}

export const InteractiveVideoSimulator: React.FC<InteractiveVideoSimulatorProps> = ({ videoData }) => {
  const { totalDurationSeconds, videoTitle, videoDescription, keyframes } = videoData;

  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Determine active keyframe based on currentTime
  let accumulatedTime = 0;
  let activeKeyframeIndex = 0;
  for (let i = 0; i < keyframes.length; i++) {
    const kf = keyframes[i];
    if (currentTime >= kf.timestamp && currentTime < kf.timestamp + kf.duration) {
      activeKeyframeIndex = i;
      break;
    }
    if (i === keyframes.length - 1 && currentTime >= kf.timestamp) {
      activeKeyframeIndex = i;
    }
  }

  const activeKeyframe = keyframes[activeKeyframeIndex] || keyframes[0];

  // Timer loop
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 0.2 * playbackSpeed;
          if (next >= totalDurationSeconds) {
            setIsPlaying(false);
            return totalDurationSeconds;
          }
          return next;
        });
      }, 200);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, playbackSpeed, totalDurationSeconds]);

  const handlePlayPause = () => {
    if (currentTime >= totalDurationSeconds) {
      setCurrentTime(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleRestart = () => {
    setCurrentTime(0);
    setIsPlaying(true);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTime(parseFloat(e.target.value));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div 
      ref={containerRef}
      className={`rounded-2xl border border-slate-700 bg-slate-950 overflow-hidden shadow-2xl flex flex-col ${
        isFullScreen ? 'fixed inset-0 z-50 rounded-none' : 'w-full'
      }`}
    >
      {/* Video Header Bar */}
      <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          <span className="text-xs font-bold text-white tracking-wide flex items-center space-x-1.5">
            <span>{videoTitle}</span>
            <span className="text-[10px] px-2 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
              Simulador Interativo
            </span>
          </span>
        </div>

        <div className="text-[11px] font-mono text-slate-400">
          {formatTime(currentTime)} / {formatTime(totalDurationSeconds)}
        </div>
      </div>

      {/* Video Screen / Canvas Viewport */}
      <div className="relative bg-slate-950 p-4 sm:p-8 min-h-[360px] sm:min-h-[420px] flex flex-col justify-between overflow-hidden select-none border-b border-slate-800">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

        {/* Top Simulated System App Bar */}
        <div className="relative z-10 p-3 bg-slate-900/90 backdrop-blur rounded-xl border border-slate-800 flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-2.5">
            <div className="w-6 h-6 rounded-lg bg-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-bold text-white">PrevSafe SST Engine</span>
          </div>

          <div className="flex items-center space-x-2">
            {activeKeyframe.screenState.badgeStatus && (
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold animate-bounce">
                {activeKeyframe.screenState.badgeStatus}
              </span>
            )}
            <span className="text-[10px] text-slate-400 font-mono">Auto-Demo v1.0</span>
          </div>
        </div>

        {/* Dynamic Interactive Stage */}
        <div className="relative z-10 my-auto py-6 flex flex-col items-center justify-center text-center">
          {activeKeyframe.screenState.modalOpen ? (
            <div className="w-full max-w-md p-5 bg-slate-900 border border-emerald-500/40 rounded-2xl shadow-2xl text-left space-y-3 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Ação do Sistema em Execução</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  {activeKeyframe.actionTitle}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {activeKeyframe.screenState.bannerText || 'Processando validação dos dados de SST...'}
              </p>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-emerald-300 flex items-center justify-between">
                <span>{activeKeyframe.cursorTarget.label}</span>
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
          ) : (
            <div className="w-full max-w-lg p-6 bg-slate-900/80 backdrop-blur rounded-2xl border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>{activeKeyframe.actionTitle}</span>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 text-sm text-white font-medium">
                {activeKeyframe.screenState.bannerText || videoDescription}
              </div>

              {activeKeyframe.screenState.successMessage && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs font-bold text-emerald-200 flex items-center justify-center space-x-2 animate-pulse">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>{activeKeyframe.screenState.successMessage}</span>
                </div>
              )}
            </div>
          )}

          {/* Simulated Animated Cursor */}
          <div 
            className="absolute pointer-events-none transition-all duration-700 ease-out z-30"
            style={{
              left: `${activeKeyframe.cursorTarget.x}%`,
              top: `${activeKeyframe.cursorTarget.y}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="relative">
              {/* Cursor Icon */}
              <div className="p-1 rounded-full bg-emerald-400 text-slate-950 shadow-xl shadow-emerald-400/50 ring-2 ring-white animate-pulse">
                <MousePointer className="w-4 h-4 fill-slate-950" />
              </div>

              {/* Cursor Action Label */}
              <div className="absolute left-6 top-0 px-2 py-0.5 rounded bg-slate-900 text-emerald-300 text-[10px] font-bold border border-emerald-500/40 whitespace-nowrap shadow-lg">
                {activeKeyframe.cursorTarget.label}
              </div>

              {/* Click Ripple Effect */}
              <div key={activeKeyframe.timestamp} className="absolute -inset-4 rounded-full border-2 border-emerald-400 animate-ping pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Subtitles & Narrator Transcript Bar */}
        <div className="relative z-10 p-3.5 bg-slate-900/90 backdrop-blur rounded-xl border border-slate-800 flex items-start space-x-3 shadow-md">
          <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
            <Volume2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Locução do Tutorial (Legenda em Português):</span>
            <p className="text-xs sm:text-sm text-white font-medium mt-0.5 italic">
              &ldquo;{activeKeyframe.narratorText}&rdquo;
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Controls Bar */}
      <div className="bg-slate-900 p-3 sm:p-4 space-y-3">
        {/* Timeline Scrubber Slider */}
        <div className="space-y-1">
          <div className="relative flex items-center">
            <input 
              type="range"
              min="0"
              max={totalDurationSeconds}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          {/* Keyframe Milestone Marks */}
          <div className="flex justify-between text-[10px] font-mono text-slate-400 pt-0.5">
            {keyframes.map((kf, idx) => (
              <button 
                key={idx}
                onClick={() => setCurrentTime(kf.timestamp)}
                className={`hover:text-emerald-400 transition ${
                  activeKeyframeIndex === idx ? 'text-emerald-400 font-bold' : ''
                }`}
              >
                {formatTime(kf.timestamp)} - Passo {idx + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <button 
              onClick={handlePlayPause}
              className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition active:scale-95 shadow-md shadow-emerald-950/40"
              title={isPlaying ? "Pausar Vídeo" : "Reproduzir Vídeo"}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
            </button>

            <button 
              onClick={handleRestart}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Reiniciar Vídeo"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Speed Selector */}
            <div className="flex items-center bg-slate-800 rounded-xl p-0.5 text-xs text-slate-300">
              {[1, 1.5, 2].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`px-2 py-1 rounded-lg text-xs font-semibold transition ${
                    playbackSpeed === spd 
                      ? 'bg-emerald-500 text-slate-950 shadow-sm' 
                      : 'hover:text-white'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title={isMuted ? "Ativar Áudio" : "Silenciar Áudio"}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Alternar Tela Cheia"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
