import { useEffect, useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PlayCircle, Video as VideoIcon, X } from 'lucide-react';

export default function TutorialVideoModal() {
    const [isOpen, setIsOpen] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        // Show once per session
        const hasSeen = sessionStorage.getItem('hasSeenTutorial');
        if (!hasSeen) {
            const timer = setTimeout(() => {
                setIsOpen(true);
                sessionStorage.setItem('hasSeenTutorial', 'true');
            }, 1000); // Small delay for better UX
            return () => clearTimeout(timer);
        }
    }, []);

    const toggleModal = () => setIsOpen(!isOpen);

    return (
        <>
            {/* Heartbeat Animated Floating Button with Ripples */}
            <div className="fixed bottom-24 right-6 z-50">
                <div className="relative h-12 w-12 flex items-center justify-center">
                    {/* Ripple Waves */}
                    <div className="absolute inset-0 rounded-full border-2 border-primary animate-[ripple_2s_cubic-bezier(0,0.2,0.8,1)_infinite] opacity-0" />
                    <div className="absolute inset-0 rounded-full border-2 border-primary animate-[ripple_2s_cubic-bezier(0,0.2,0.8,1)_infinite] delay-700 opacity-0" />
                    
                    {/* Heartbeat Button */}
                    <button
                        onClick={toggleModal}
                        className="relative bg-primary text-primary-foreground h-12 w-12 rounded-full shadow-[0_0_15px_rgba(var(--primary),0.5)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 animate-[heartbeat_1.5s_ease-in-out_infinite] border-2 border-white/20 z-10"
                        title="Watch System Tutorial"
                    >
                        <VideoIcon className="h-6 w-6" />
                    </button>
                </div>
                
                <style dangerouslySetInnerHTML={{ __html: `
                    @keyframes heartbeat {
                        0% { transform: scale(1); }
                        15% { transform: scale(1.1); }
                        30% { transform: scale(1); }
                        45% { transform: scale(1.15); }
                        60% { transform: scale(1); }
                        100% { transform: scale(1); }
                    }
                    @keyframes ripple {
                        0% { transform: scale(1); opacity: 0.6; }
                        100% { transform: scale(2.8); opacity: 0; }
                    }
                `}} />
            </div>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-4xl p-0 overflow-hidden bg-zinc-950 border-zinc-800 rounded-2xl shadow-2xl">
                    <DialogHeader className="absolute top-0 right-0 p-4 z-10">
                        <DialogTitle className="sr-only">Tutorial Video</DialogTitle>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="bg-black/60 hover:bg-primary/80 p-2 rounded-full text-white transition-all backdrop-blur-md border border-white/10"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </DialogHeader>
                    
                    <div className="aspect-video w-full bg-black">
                        <video
                            ref={videoRef}
                            src="/video/hall Meal BAUST.mp4"
                            controls
                            autoPlay
                            className="w-full h-full object-contain"
                        />
                    </div>
                    
                    <div className="bg-zinc-900 border-t border-zinc-800 p-5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="bg-primary/20 p-3 rounded-xl shadow-inner">
                                <PlayCircle className="h-7 w-7 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg leading-tight tracking-tight">Hall Meal BAUST Tutorial</h3>
                                <p className="text-zinc-400 text-sm mt-1 max-w-md line-clamp-1">Quick guide on using the meal management system effectively.</p>
                            </div>
                        </div>
                        <Button
                           variant="secondary"
                           className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-zinc-700 px-6 font-semibold"
                           onClick={() => setIsOpen(false)}
                        >
                           Dismiss
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
