import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Pause, SkipBack, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Song } from "@db/schema";

interface MusicPlayerProps {
  song: Song;
  onClose: () => void;
}

export function MusicPlayer({ song, onClose }: MusicPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(-1);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressInterval = useRef<NodeJS.Timeout>();

  // 解析歌詞時間軸
  const parsedLyrics = song.lyrics
    ? song.lyrics
        .split('\n')
        .map(line => {
          const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
          if (match) {
            const [, minutes, seconds, milliseconds, text] = match;
            const time =
              parseInt(minutes) * 60 +
              parseInt(seconds) +
              parseInt(milliseconds) / 1000;
            return { time, text: text.trim() };
          }
          return null;
        })
        .filter((item): item is { time: number; text: string } => item !== null)
        .sort((a, b) => a.time - b.time)
    : [];

  useEffect(() => {
    if (song.audioUrl) {
      audioRef.current = new Audio(song.audioUrl);
      audioRef.current.volume = volume;
      
      audioRef.current.addEventListener('loadedmetadata', () => {
        if (audioRef.current) {
          setDuration(audioRef.current.duration);
        }
      });

      return () => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
        if (progressInterval.current) {
          clearInterval(progressInterval.current);
        }
      };
    }
  }, [song.audioUrl]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    // 歌詞同步
    const currentLyric = parsedLyrics.findIndex(
      (lyric, index) =>
        currentTime >= lyric.time &&
        (!parsedLyrics[index + 1] || currentTime < parsedLyrics[index + 1].time)
    );
    
    if (currentLyric !== currentLyricIndex) {
      setCurrentLyricIndex(currentLyric);
    }
  }, [currentTime, parsedLyrics]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        if (progressInterval.current) {
          clearInterval(progressInterval.current);
        }
      } else {
        audioRef.current.play();
        progressInterval.current = setInterval(() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }, 100);
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      const newTime = value[0];
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const restart = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      if (!isPlaying) {
        togglePlay();
      }
    }
  };

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">{song.title}</h3>
          <p className="text-sm text-muted-foreground">{song.artist}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleMute}
            className="w-8 h-8"
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          <Slider
            value={[isMuted ? 0 : volume * 100]}
            onValueChange={(value) => setVolume(value[0] / 100)}
            max={100}
            step={1}
            className="w-24"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={restart}
            className="w-10 h-10"
          >
            <SkipBack className="h-5 w-5" />
          </Button>
          <Button
            onClick={togglePlay}
            size="icon"
            className="w-12 h-12 rounded-full bg-primary hover:bg-primary/90"
          >
            {isPlaying ? (
              <Pause className="h-6 w-6 text-primary-foreground" />
            ) : (
              <Play className="h-6 w-6 text-primary-foreground ml-1" />
            )}
          </Button>
        </div>

        <div className="space-y-2">
          <Slider
            value={[currentTime]}
            onValueChange={handleSeek}
            max={duration}
            step={0.1}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <ScrollArea className="h-[200px] border rounded-md p-4">
          <div className="space-y-2">
            {parsedLyrics.map((lyric, index) => (
              <p
                key={index}
                className={cn(
                  "text-center transition-all duration-300",
                  index === currentLyricIndex
                    ? "text-lg font-semibold text-primary"
                    : "text-sm text-muted-foreground"
                )}
              >
                {lyric.text}
              </p>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
