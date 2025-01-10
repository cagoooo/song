import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Pause, SkipBack, Volume2, VolumeX, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Song } from "@db/schema";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MusicPlayerProps {
  song: Song;
  onClose: () => void;
}

interface LyricLine {
  time: number;
  text: string;
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

  const parsedLyrics: LyricLine[] = song.lyrics
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
        .filter((item): item is LyricLine => item !== null)
        .sort((a, b) => a.time - b.time)
    : [];

  const generateGoogleLyricsUrl = () => {
    const searchQuery = encodeURIComponent(`${song.title} ${song.artist} 歌詞`);
    return `https://www.google.com/search?q=${searchQuery}`;
  };

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
    const currentLyric = parsedLyrics.findIndex((lyric, index) =>
      currentTime >= lyric.time &&
      (!parsedLyrics[index + 1] || currentTime < parsedLyrics[index + 1].time)
    );

    if (currentLyric !== currentLyricIndex) {
      setCurrentLyricIndex(currentLyric);
    }
  }, [currentTime, parsedLyrics, currentLyricIndex]);

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
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-4">
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

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  asChild
                  className="bg-gradient-to-r from-primary/10 to-purple-500/10 hover:from-primary/20 hover:to-purple-500/20
                           border-2 border-primary/20 hover:border-primary/30
                           shadow-[0_2px_10px_rgba(var(--primary),0.1)]
                           hover:shadow-[0_2px_20px_rgba(var(--primary),0.2)]
                           transition-all duration-300"
                >
                  <a
                    href={generateGoogleLyricsUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    <span>搜尋歌詞</span>
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>點擊在 Google 中搜尋「{song.title} - {song.artist}」的歌詞</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
                  "text-center text-sm text-muted-foreground hover:text-foreground transition-colors duration-200",
                  index === currentLyricIndex && "text-lg font-semibold text-primary"
                )}
              >
                {lyric.text}
              </p>
            ))}
            {parsedLyrics.length === 0 && (
              <p className="text-center text-sm text-muted-foreground">
                這首歌還沒有歌詞...
              </p>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}