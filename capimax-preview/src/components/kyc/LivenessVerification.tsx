import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  RotateCcw, 
  Check, 
  AlertCircle,
  Eye,
  Smile,
  RotateCw,
  Square,
  Play,
  StopCircle,
  Download
} from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';

interface LivenessVerificationProps {
  onCapture?: (imageData: string) => void;
  onComplete?: (result: LivenessResult) => void;
  loading?: boolean;
  error?: string;
  className?: string;
}

export interface LivenessResult {
  selfieUrl: string;
  livenessScore: number;
  detectedFace: boolean;
  timestamp: Date;
  metadata: {
    deviceType: string;
    imageQuality: number;
    lightingConditions: 'good' | 'fair' | 'poor';
  };
}

type VerificationStep = 'instructions' | 'camera-setup' | 'capture' | 'processing' | 'complete';
type LivenessInstruction = 'center-face' | 'look-straight' | 'smile' | 'blink' | 'turn-left' | 'turn-right' | 'complete';

const INSTRUCTIONS = {
  'center-face': {
    title: 'Center your face',
    description: 'Position your face in the center of the frame',
    icon: Square,
    duration: 3000
  },
  'look-straight': {
    title: 'Look straight ahead',
    description: 'Look directly at the camera',
    icon: Eye,
    duration: 2000
  },
  'smile': {
    title: 'Smile naturally',
    description: 'Give us a natural smile',
    icon: Smile,
    duration: 3000
  },
  'blink': {
    title: 'Blink slowly',
    description: 'Blink your eyes slowly and naturally',
    icon: Eye,
    duration: 2000
  },
  'turn-left': {
    title: 'Turn head slightly left',
    description: 'Slowly turn your head to the left',
    icon: RotateCcw,
    duration: 3000
  },
  'turn-right': {
    title: 'Turn head slightly right',
    description: 'Slowly turn your head to the right',
    icon: RotateCw,
    duration: 3000
  },
  'complete': {
    title: 'Perfect!',
    description: 'Liveness verification complete',
    icon: Check,
    duration: 1000
  }
};

export const LivenessVerification: React.FC<LivenessVerificationProps> = ({
  onCapture,
  onComplete,
  loading = false,
  error,
  className
}) => {
  const [currentStep, setCurrentStep] = useState<VerificationStep>('instructions');
  const [currentInstruction, setCurrentInstruction] = useState<LivenessInstruction>('center-face');
  const [instructionIndex, setInstructionIndex] = useState(0);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const instructionSequence: LivenessInstruction[] = [
    'center-face',
    'look-straight', 
    'smile',
    'blink',
    'turn-left',
    'turn-right',
    'complete'
  ];

  useEffect(() => {
    return () => {
      // Cleanup camera stream when component unmounts
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });

      setCameraStream(stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setCurrentStep('camera-setup');
    } catch (err) {
      console.error('Camera access error:', err);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [cameraStream]);

  const startLivenessVerification = useCallback(() => {
    setCurrentStep('capture');
    setIsRecording(true);
    setInstructionIndex(0);
    setCurrentInstruction(instructionSequence[0]);
    
    // Start recording video for liveness analysis
    if (cameraStream && videoRef.current) {
      mediaRecorderRef.current = new MediaRecorder(cameraStream);
      recordedChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.start();
    }

    // Progress through instructions
    let progressInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + (100 / instructionSequence.length / 10);
        return Math.min(newProgress, 100);
      });
    }, 100);

    // Instruction progression
    let currentIndex = 0;
    const progressThroughInstructions = () => {
      if (currentIndex < instructionSequence.length) {
        const instruction = instructionSequence[currentIndex];
        setCurrentInstruction(instruction);
        setInstructionIndex(currentIndex);
        
        setTimeout(() => {
          currentIndex++;
          if (currentIndex < instructionSequence.length) {
            progressThroughInstructions();
          } else {
            // Complete verification
            clearInterval(progressInterval);
            setIsRecording(false);
            captureFinalImage();
          }
        }, INSTRUCTIONS[instruction].duration);
      }
    };

    progressThroughInstructions();
  }, [cameraStream, instructionSequence]);

  const captureFinalImage = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageData);
        onCapture?.(imageData);
        
        // Stop recording
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
        
        setCurrentStep('processing');
        
        // Simulate processing
        setTimeout(() => {
          const result: LivenessResult = {
            selfieUrl: imageData,
            livenessScore: Math.random() * 0.2 + 0.8, // 80-100% confidence
            detectedFace: true,
            timestamp: new Date(),
            metadata: {
              deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
              imageQuality: Math.random() * 0.3 + 0.7, // 70-100% quality
              lightingConditions: 'good'
            }
          };
          
          onComplete?.(result);
          setCurrentStep('complete');
        }, 2000);
      }
    }
  }, [onCapture, onComplete]);

  const retryVerification = useCallback(() => {
    setCapturedImage(null);
    setProgress(0);
    setCurrentInstruction('center-face');
    setInstructionIndex(0);
    setCurrentStep('camera-setup');
  }, []);

  const renderInstructions = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center space-y-6"
    >
      <div className="w-20 h-20 mx-auto bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center">
        <Camera className="w-10 h-10 text-emerald-500 dark:text-emerald-400" />
      </div>
      
      <div>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
          Liveness Verification
        </h3>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          We need to verify that you are a real person by taking a live selfie
        </p>
      </div>

      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 text-left">
        <h4 className="font-semibold text-slate-900 dark:text-white mb-4">
          Before we start:
        </h4>
        <ul className="space-y-3">
          <li className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
            <Check className="w-4 h-4 text-emerald-500" />
            Ensure good lighting on your face
          </li>
          <li className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
            <Check className="w-4 h-4 text-emerald-500" />
            Look directly at the camera
          </li>
          <li className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
            <Check className="w-4 h-4 text-emerald-500" />
            Remove sunglasses and hats
          </li>
          <li className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
            <Check className="w-4 h-4 text-emerald-500" />
            Follow the on-screen instructions
          </li>
        </ul>
      </div>

      <Button
        onClick={startCamera}
        variant="primary"
        size="lg"
        className="w-full"
      >
        <Camera className="w-5 h-5 mr-2" />
        Start Verification
      </Button>
    </motion.div>
  );

  const renderCameraSetup = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center">
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
          Position Yourself
        </h3>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Make sure your face is clearly visible and well-lit
        </p>
      </div>

      <div className="relative rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-80 object-cover"
        />
        
        {/* Face Detection Overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-64 h-80 border-4 border-emerald-400 rounded-2xl border-dashed opacity-60" />
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          onClick={stopCamera}
          variant="ghost"
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          onClick={startLivenessVerification}
          variant="primary"
          className="flex-1"
          disabled={!cameraStream}
        >
          <Play className="w-4 h-4 mr-2" />
          Start Verification
        </Button>
      </div>
    </motion.div>
  );

  const renderCapture = () => {
    const CurrentIcon = INSTRUCTIONS[currentInstruction].icon;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Progress Bar */}
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
          <motion.div
            className="bg-emerald-500 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Current Instruction */}
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center">
            <CurrentIcon className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
              {INSTRUCTIONS[currentInstruction].title}
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              {INSTRUCTIONS[currentInstruction].description}
            </p>
          </div>
        </div>

        {/* Video Feed */}
        <div className="relative rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-80 object-cover"
          />
          
          {/* Recording Indicator */}
          {isRecording && (
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full text-sm">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              Recording
            </div>
          )}

          {/* Face Detection Overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={cn(
              'w-64 h-80 border-4 rounded-2xl transition-colors duration-300',
              currentInstruction === 'center-face' 
                ? 'border-emerald-400 border-solid' 
                : 'border-emerald-400/30 border-dashed'
            )} />
          </div>
        </div>

        {/* Instruction Progress */}
        <div className="text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Step {instructionIndex + 1} of {instructionSequence.length}
          </p>
        </div>
      </motion.div>
    );
  };

  const renderProcessing = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center space-y-6"
    >
      <div className="w-20 h-20 mx-auto bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
      
      <div>
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
          Processing Verification
        </h3>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Analyzing your liveness data to ensure security...
        </p>
      </div>
    </motion.div>
  );

  const renderComplete = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center space-y-6"
    >
      <div className="w-20 h-20 mx-auto bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center">
        <Check className="w-10 h-10 text-emerald-500 dark:text-emerald-400" />
      </div>
      
      <div>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
          Verification Complete!
        </h3>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Your liveness verification was successful
        </p>
      </div>

      {capturedImage && (
        <div className="flex justify-center">
          <div className="w-32 h-32 rounded-xl overflow-hidden border-2 border-emerald-200 dark:border-emerald-800">
            <img 
              src={capturedImage} 
              alt="Captured selfie"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          onClick={retryVerification}
          variant="ghost"
          className="flex-1"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Retake
        </Button>
        <Button
          onClick={() => console.log('Continue to next step')}
          variant="primary"
          className="flex-1"
        >
          Continue
        </Button>
      </div>
    </motion.div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn('w-full max-w-md mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-8', className)}
    >
      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl mb-6"
        >
          <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
          <span className="text-sm text-red-600 dark:text-red-400">
            {error}
          </span>
        </motion.div>
      )}

      {/* Hidden Canvas for Image Capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Step Content */}
      <AnimatePresence mode="wait">
        {currentStep === 'instructions' && renderInstructions()}
        {currentStep === 'camera-setup' && renderCameraSetup()}
        {currentStep === 'capture' && renderCapture()}
        {currentStep === 'processing' && renderProcessing()}
        {currentStep === 'complete' && renderComplete()}
      </AnimatePresence>
    </motion.div>
  );
};