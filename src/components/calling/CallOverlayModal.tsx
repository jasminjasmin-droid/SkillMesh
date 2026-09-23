import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Phone, 
  PhoneOff, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Minimize2, 
  Maximize2, 
  Volume2, 
  ShieldCheck, 
  User, 
  Radio 
} from 'lucide-react';
import { apiSendCallSignal, apiPollCallSignals } from '../../services/upgradeApi';

export const CallOverlayModal: React.FC = () => {
  const { 
    currentUser, 
    activeCall, 
    incomingCall, 
    acceptCall, 
    declineCall, 
    endCall 
  } = useApp();

  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [callState, setCallState] = useState<'RINGING' | 'CONNECTING' | 'CONNECTED' | 'ENDED'>('RINGING');

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<any>(null);
  const pollIntervalRef = useRef<any>(null);
  const lastSignalIndexRef = useRef(0);
  const ringtoneOscillatorRef = useRef<any>(null);
  const ringtoneCtxRef = useRef<AudioContext | null>(null);

  // Play synthesized ringtone for incoming calls using Web Audio API
  useEffect(() => {
    if (incomingCall && !activeCall) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          ringtoneCtxRef.current = ctx;

          let ringStep = 0;
          const playBeep = () => {
            if (!ringtoneCtxRef.current || ringtoneCtxRef.current.state === 'closed') return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(ringStep % 2 === 0 ? 440 : 480, ctx.currentTime);
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.35);
            ringStep++;
          };

          const ringInterval = setInterval(playBeep, 800);
          return () => {
            clearInterval(ringInterval);
            if (ctx.state !== 'closed') ctx.close().catch(() => {});
          };
        }
      } catch (err) {
        console.warn('Ringtone synth notice:', err);
      }
    }
  }, [incomingCall, activeCall]);

  // Handle active call WebRTC lifecycle
  useEffect(() => {
    if (!activeCall || !currentUser) {
      // Clean up WebRTC & streams
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      setCallDuration(0);
      setCallState('RINGING');
      return;
    }

    const isCaller = activeCall.callerId === currentUser.id;
    const isVideo = activeCall.callType === 'VIDEO';
    lastSignalIndexRef.current = 0;

    let isSubscribed = true;

    async function initWebRTC() {
      try {
        // 1. Acquire media stream
        let stream: MediaStream | null = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: isVideo ? { width: { ideal: 640 }, height: { ideal: 480 } } : false,
          });
        } catch (mediaErr) {
          console.warn('User media acquisition fallback (audio only):', mediaErr);
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        }

        if (!isSubscribed) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        localStreamRef.current = stream;
        if (localVideoRef.current && isVideo) {
          localVideoRef.current.srcObject = stream;
        }

        // 2. Setup RTCPeerConnection
        const configuration: RTCConfiguration = {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
        };

        const pc = new RTCPeerConnection(configuration);
        pcRef.current = pc;

        // Add local tracks
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream!);
        });

        // Remote stream listener
        pc.ontrack = (event) => {
          const [remoteStream] = event.streams;
          if (remoteVideoRef.current && isVideo) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = remoteStream;
          }
        };

        // ICE candidate handler
        pc.onicecandidate = (event) => {
          if (event.candidate && activeCall) {
            apiSendCallSignal(activeCall.id, currentUser.id, 'ice-candidate', event.candidate);
          }
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'connected') {
            setCallState('CONNECTED');
          } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            setCallState('ENDED');
          }
        };

        // If Caller: Create Offer
        if (isCaller) {
          setCallState('RINGING');
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await apiSendCallSignal(activeCall.id, currentUser.id, 'offer', offer);
        } else {
          setCallState('CONNECTING');
        }

        // Start call duration counter once active
        timerRef.current = setInterval(() => {
          setCallDuration(prev => prev + 1);
        }, 1000);

        // 3. Signaling Poller (checks offers, answers, and ICE candidates)
        pollIntervalRef.current = setInterval(async () => {
          if (!activeCall) return;

          const { sessionStatus, signals, lastIndex } = await apiPollCallSignals(
            activeCall.id,
            currentUser.id,
            lastSignalIndexRef.current
          );

          lastSignalIndexRef.current = lastIndex;

          if (sessionStatus === 'ACCEPTED' && callState === 'RINGING') {
            setCallState('CONNECTED');
          } else if (sessionStatus === 'ENDED' || sessionStatus === 'DECLINED' || sessionStatus === 'BUSY') {
            handleEndCall();
            return;
          }

          for (const sig of signals) {
            try {
              if (sig.type === 'offer' && !isCaller) {
                await pc.setRemoteDescription(new RTCSessionDescription(sig.data));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                await apiSendCallSignal(activeCall.id, currentUser.id, 'answer', answer);
                setCallState('CONNECTED');
              } else if (sig.type === 'answer' && isCaller) {
                if (pc.signalingState !== 'stable') {
                  await pc.setRemoteDescription(new RTCSessionDescription(sig.data));
                  setCallState('CONNECTED');
                }
              } else if (sig.type === 'ice-candidate') {
                if (pc.remoteDescription) {
                  await pc.addIceCandidate(new RTCIceCandidate(sig.data));
                }
              }
            } catch (sigErr) {
              console.warn('Signaling message process notice:', sigErr);
            }
          }
        }, 1200);

      } catch (err) {
        console.warn('WebRTC initialization notice:', err);
      }
    }

    initWebRTC();

    return () => {
      isSubscribed = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [activeCall?.id, currentUser?.id]);

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = isVideoDisabled;
      });
      setIsVideoDisabled(!isVideoDisabled);
    }
  };

  const handleEndCall = async () => {
    await endCall(callDuration);
    setCallDuration(0);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 1. Render Incoming Call Prompt
  if (incomingCall && !activeCall) {
    return (
      <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
        <div className="bg-slate-900 text-white p-5 rounded-3xl border border-slate-700 shadow-2xl max-w-sm w-full space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={incomingCall.callerAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
                alt={incomingCall.callerName}
                className="w-12 h-12 rounded-2xl object-cover border-2 border-emerald-500"
              />
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-emerald-400 font-extrabold uppercase tracking-wider">
                Incoming {incomingCall.callType === 'VIDEO' ? 'Video' : 'Voice'} Call
              </p>
              <h4 className="text-sm font-bold text-white truncate">{incomingCall.callerName}</h4>
              <p className="text-[11px] text-slate-400">SkillMesh Peer Mentorship</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              id="btn-decline-call"
              onClick={declineCall}
              className="flex-1 py-2.5 rounded-xl bg-rose-600/90 hover:bg-rose-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <PhoneOff className="w-4 h-4" />
              <span>Decline</span>
            </button>

            <button
              id="btn-accept-call"
              onClick={acceptCall}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer animate-pulse"
            >
              <Phone className="w-4 h-4" />
              <span>Accept</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Render Active Call Modal
  if (!activeCall || !currentUser) return null;

  const isCaller = activeCall.callerId === currentUser.id;
  const partnerName = isCaller ? activeCall.receiverName : activeCall.callerName;
  const partnerAvatar = isCaller ? activeCall.receiverAvatar : activeCall.callerAvatar;
  const isVideo = activeCall.callType === 'VIDEO';

  // Minimized PiP View
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5">
        <div className="bg-slate-900 text-white p-3.5 rounded-2xl border border-slate-700 shadow-2xl flex items-center gap-3">
          <div className="relative">
            <img src={partnerAvatar} alt={partnerName} className="w-10 h-10 rounded-xl object-cover" />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-slate-900"></span>
          </div>
          <div>
            <p className="text-xs font-bold text-white truncate">{partnerName}</p>
            <p className="text-[11px] font-mono text-emerald-400">{formatTimer(callDuration)}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleMute}
              className={`p-2 rounded-xl text-white ${isMuted ? 'bg-rose-600' : 'bg-slate-800 hover:bg-slate-700'}`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setIsMinimized(false)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white"
              title="Maximize Call"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleEndCall}
              className="p-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
              title="End Call"
            >
              <PhoneOff className="w-3.5 h-3.5" />
            </button>
          </div>
          <audio ref={remoteAudioRef} autoPlay />
        </div>
      </div>
    );
  }

  // Full Call Modal Overlay
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-slate-950 text-white rounded-3xl border border-slate-800 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col h-[560px] relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-4 border-b border-slate-900 flex items-center justify-between bg-slate-900/60 z-10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              {isVideo ? 'Peer Video Call' : 'Peer Voice Call'} &bull; 1-on-1 Encrypted
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Minimize to Floating Bar"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video / Audio Stage */}
        <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
          {isVideo ? (
            <>
              {/* Remote Video Stream */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />

              {/* Local Video Picture-in-Picture */}
              <div className="absolute top-4 right-4 w-36 h-48 rounded-2xl overflow-hidden border-2 border-slate-700 bg-slate-900 shadow-xl z-20">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${isVideoDisabled ? 'hidden' : 'block'}`}
                />
                {isVideoDisabled && (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-500 text-xs">
                    <VideoOff className="w-6 h-6 mb-1 text-slate-600" />
                    <span>Camera off</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Audio Call Visual Stage */
            <div className="text-center space-y-4 p-8">
              <div className="relative inline-block">
                <img
                  src={partnerAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
                  alt={partnerName}
                  className="w-28 h-28 rounded-3xl object-cover border-4 border-slate-800 shadow-2xl mx-auto"
                />
                <span className="absolute -inset-2 rounded-3xl border border-emerald-500/40 animate-ping pointer-events-none"></span>
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-white">{partnerName}</h3>
                <p className="text-xs text-slate-400 mt-1">
                  {callState === 'RINGING' ? 'Ringing...' : callState === 'CONNECTING' ? 'Establishing peer connection...' : 'Connected'}
                </p>
              </div>
              <div className="inline-block px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800 font-mono text-sm text-emerald-400 font-bold">
                {formatTimer(callDuration)}
              </div>
            </div>
          )}

          {/* Hidden remote audio element */}
          <audio ref={remoteAudioRef} autoPlay />
        </div>

        {/* Bottom Control Bar */}
        <div className="p-4 bg-slate-900/90 border-t border-slate-800/80 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-400">
              {formatTimer(callDuration)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Mute Toggle */}
            <button
              onClick={toggleMute}
              className={`p-3.5 rounded-2xl transition-all cursor-pointer ${
                isMuted ? 'bg-rose-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
              title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Camera Toggle (if video call) */}
            {isVideo && (
              <button
                onClick={toggleVideo}
                className={`p-3.5 rounded-2xl transition-all cursor-pointer ${
                  isVideoDisabled ? 'bg-rose-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
                title={isVideoDisabled ? 'Turn Camera On' : 'Turn Camera Off'}
              >
                {isVideoDisabled ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>
            )}

            {/* End Call / Hang Up */}
            <button
              id="btn-end-call-active"
              onClick={handleEndCall}
              className="px-6 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-950/40 transition-all flex items-center gap-2 cursor-pointer"
            >
              <PhoneOff className="w-5 h-5" />
              <span>End Call</span>
            </button>
          </div>

          <div className="w-12"></div>
        </div>
      </div>
    </div>
  );
};
