import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';
import { ArrowRight, Sparkles, Globe, Zap, Star, MapPin, DollarSign, TrendingUp } from 'lucide-react';
import { Button } from '../ui/Button';

interface PropertyMarker {
  id: number;
  name: string;
  location: string;
  value: string;
  change: string;
  image: string;
  position: { x: number; y: number; z: number };
  angle: number;
}

const propertyMarkers: PropertyMarker[] = [
  {
    id: 1,
    name: "Manhattan Tower",
    location: "New York, USA",
    value: "$2.4M",
    change: "+12.4%",
    image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&q=80",
    position: { x: 0.7, y: 0.4, z: 0.5 },
    angle: 0
  },
  {
    id: 2,
    name: "Thames View",
    location: "London, UK",
    value: "$3.1M",
    change: "+8.7%",
    image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&q=80",
    position: { x: -0.3, y: 0.6, z: 0.8 },
    angle: 120
  },
  {
    id: 3,
    name: "Tokyo Bay",
    location: "Tokyo, Japan",
    value: "$1.8M",
    change: "+15.2%",
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&q=80",
    position: { x: -0.8, y: 0.2, z: -0.4 },
    angle: 240
  },
  {
    id: 4,
    name: "Dubai Marina",
    location: "Dubai, UAE",
    value: "$2.7M",
    change: "+19.3%",
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&q=80",
    position: { x: 0.4, y: -0.3, z: 0.7 },
    angle: 300
  }
];

export const HeroSectionV2: React.FC = () => {
  const [selectedProperty, setSelectedProperty] = useState<PropertyMarker | null>(null);
  const [rotation, setRotation] = useState(0);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const springX = useSpring(mouseX, { damping: 50, stiffness: 400 });
  const springY = useSpring(mouseY, { damping: 50, stiffness: 400 });

  useEffect(() => {
    const interval = setInterval(() => {
      setRotation(prev => prev + 0.5);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    mouseX.set((e.clientX - centerX) * 0.01);
    mouseY.set((e.clientY - centerY) * 0.01);
  };

  return (
    <section 
      className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-gray-900 dark:to-slate-800"
      onMouseMove={handleMouseMove}
    >
      {/* Enhanced Dark Mode Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Animated gradient orbs for dark mode */}
        <motion.div
          animate={{ 
            rotate: [0, 360],
            scale: [1, 1.1, 1],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-20 right-20 w-72 h-72 bg-gradient-to-r from-emerald-400/10 to-green-400/10 dark:from-emerald-500/20 dark:to-green-500/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ 
            rotate: [360, 0],
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.15, 0.1]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-r from-emerald-400/10 to-blue-400/10 dark:from-emerald-500/15 dark:to-cyan-500/15 rounded-full blur-3xl"
        />
        
        {/* Enhanced Floating Particles with glow effect in dark mode */}
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: [-20, -100, -20],
              x: [0, Math.sin(i) * 50, 0],
              opacity: [0, 0.6, 0],
              scale: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 8 + i * 0.5,
              repeat: Infinity,
              delay: i * 0.3,
              ease: "easeInOut"
            }}
            className="absolute"
            style={{
              left: `${10 + (i * 4) % 80}%`,
              top: `${20 + (i * 3) % 60}%`
            }}
          >
            <Sparkles className="w-2 h-2 text-blue-400/40 dark:text-cyan-400/60 dark:drop-shadow-[0_0_4px_rgba(34,211,238,0.6)]" />
          </motion.div>
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
          
          {/* Center-Aligned Content */}
          <div className="text-center space-y-12">
            
            {/* Enhanced Trust Badge for dark mode */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/80 dark:bg-gray-900/80 dark:backdrop-blur-2xl backdrop-blur-xl border border-emerald-200/50 dark:border-emerald-500/30 shadow-xl dark:shadow-[0_4px_20px_rgba(16,185,129,0.15)]"
            >
              <div className="relative">
                <Star className="w-5 h-5 text-yellow-500 dark:text-yellow-400" />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0"
                >
                  <Sparkles className="w-5 h-5 text-yellow-400/60 dark:text-yellow-300/80" />
                </motion.div>
              </div>
              <span className="text-sm font-semibold text-slate-700 dark:text-gray-200">The Future of Real Estate Investment</span>
            </motion.div>

            {/* Enhanced Headlines with better dark mode gradients */}
            <div className="space-y-8 max-w-4xl mx-auto">
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-5xl lg:text-7xl font-bold leading-[1.05] tracking-tight text-slate-800 dark:text-white"
              >
                Invest in Properties,{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 dark:from-emerald-400 dark:via-green-400 dark:to-teal-400 relative">
                  Not Just Dreams
                  <motion.div
                    animate={{ 
                      scaleX: [0, 1, 0],
                      opacity: [0, 0.8, 0]
                    }}
                    transition={{ 
                      duration: 3, 
                      repeat: Infinity,
                      delay: 1
                    }}
                    className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 dark:from-emerald-400 dark:via-green-400 dark:to-teal-400 rounded-full dark:shadow-[0_2px_10px_rgba(16,185,129,0.5)]"
                  />
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="text-xl lg:text-2xl leading-relaxed text-slate-600 dark:text-gray-300 max-w-3xl mx-auto font-light"
              >
                Experience the next generation of real estate investment. 
                Own fractional shares of premium properties worldwide through 
                secure blockchain technology.
              </motion.p>
            </div>

            {/* Enhanced CTA Buttons with dark mode glow effects */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-6 justify-center items-center"
            >
              <Button 
                variant="primary"
                size="lg" 
                className="group relative px-10 py-5 text-lg font-semibold shadow-2xl hover:shadow-emerald-500/25 dark:shadow-[0_8px_30px_rgba(16,185,129,0.3)] transition-all duration-500 border-0 rounded-2xl overflow-hidden"
              >
                <motion.div
                  animate={{ x: [-100, 300] }}
                  transition={{ 
                    duration: 1.5, 
                    repeat: Infinity, 
                    delay: Math.random() * 2,
                    ease: "easeInOut" 
                  }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
                />
                <span className="relative z-10 flex items-center">
                  Start Your Journey
                  <motion.div
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <ArrowRight className="ml-3 w-5 h-5" />
                  </motion.div>
                </span>
              </Button>
              
              <Button 
                variant="ghost" 
                size="lg" 
                className="group px-10 py-5 text-lg font-semibold transition-all duration-500 rounded-2xl"
              >
                <Zap className="mr-3 w-5 h-5 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors duration-300" />
                Explore Properties
              </Button>
            </motion.div>

            {/* Enhanced Interactive 3D Globe Section */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.8 }}
              className="relative mt-20"
            >
              {/* Globe Container */}
              <div className="relative w-96 h-96 mx-auto">
                {/* Enhanced Central Globe for dark mode */}
                <motion.div
                  style={{
                    rotateY: springX,
                    rotateX: springY
                  }}
                  className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400/20 via-green-400/20 to-teal-400/20 dark:from-emerald-500/25 dark:via-green-500/20 dark:to-teal-500/15 backdrop-blur-sm border border-emerald-200/30 dark:border-emerald-400/40 shadow-2xl dark:shadow-[0_10px_50px_rgba(16,185,129,0.2)]"
                >
                  {/* Globe Surface Pattern */}
                  <div className="absolute inset-2 rounded-full overflow-hidden">
                    <motion.div
                      animate={{ rotate: rotation }}
                      transition={{ duration: 0.1, ease: "linear" }}
                      className="w-full h-full relative"
                    >
                      {/* Enhanced Grid Lines for dark mode */}
                      {Array.from({ length: 8 }).map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute border-blue-300/20 dark:border-cyan-400/30"
                          style={{
                            left: '50%',
                            top: '50%',
                            width: '200%',
                            height: '1px',
                            transformOrigin: '0 50%',
                            transform: `translate(-50%, -50%) rotate(${i * 45}deg)`,
                            boxShadow: '0 0 2px rgba(34,211,238,0.3)'
                          }}
                        />
                      ))}
                      
                      {/* Continents Outline with glow */}
                      <div className="absolute inset-4 rounded-full bg-gradient-to-br from-emerald-400/10 to-blue-400/10 dark:from-cyan-400/15 dark:to-blue-400/15" />
                    </motion.div>
                  </div>

                  {/* Enhanced Central Globe Icon */}
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <Globe className="w-12 h-12 text-blue-500/60 dark:text-cyan-400/80 dark:drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]" />
                  </motion.div>
                </motion.div>

                {/* Enhanced Floating Property Markers */}
                {propertyMarkers.map((property, index) => {
                  const angle = (rotation + property.angle) * (Math.PI / 180);
                  const radius = 200;
                  const x = Math.cos(angle) * radius * property.position.x;
                  const y = Math.sin(angle) * radius * property.position.y;
                  const z = Math.sin(angle + Math.PI/4) * property.position.z;
                  const scale = 0.8 + (z + 1) * 0.2;
                  const opacity = 0.4 + (z + 1) * 0.3;

                  return (
                    <motion.div
                      key={property.id}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ 
                        opacity: opacity,
                        scale: scale,
                        x: x,
                        y: y,
                        zIndex: Math.round(z * 10)
                      }}
                      transition={{ 
                        duration: 0.1,
                        delay: index * 0.2 
                      }}
                      whileHover={{ 
                        scale: scale * 1.2,
                        zIndex: 100
                      }}
                      className="absolute top-1/2 left-1/2 cursor-pointer"
                      onClick={() => setSelectedProperty(property)}
                      style={{
                        transform: `translate(-50%, -50%)`
                      }}
                    >
                      {/* Property Marker */}
                      <motion.div
                        animate={{ 
                          y: [0, -8, 0],
                          rotate: [0, 5, -5, 0]
                        }}
                        transition={{ 
                          duration: 3 + index * 0.5, 
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className="relative"
                      >
                        {/* Enhanced Glow Effect for dark mode */}
                        <motion.div
                          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                          className="absolute inset-0 bg-gradient-to-r from-blue-400/30 to-purple-400/30 dark:from-cyan-400/40 dark:to-purple-400/40 rounded-2xl blur-lg"
                        />
                        
                        {/* Enhanced Property Card for dark mode */}
                        <div className="relative bg-white/90 dark:bg-gray-900/90 dark:backdrop-blur-2xl backdrop-blur-xl rounded-2xl p-4 shadow-xl border border-emerald-200/50 dark:border-emerald-400/30 min-w-[200px] dark:shadow-[0_4px_20px_rgba(16,185,129,0.1)]">
                          {/* Property Image */}
                          <div className="relative w-full h-20 rounded-xl overflow-hidden mb-3">
                            <img 
                              src={property.image}
                              alt={property.name}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent" />
                          </div>
                          
                          {/* Enhanced Property Details */}
                          <div className="space-y-2">
                            <h4 className="font-semibold text-slate-800 dark:text-gray-100 text-sm">
                              {property.name}
                            </h4>
                            <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-gray-400">
                              <MapPin className="w-3 h-3 dark:text-cyan-400" />
                              {property.location}
                            </div>
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-gray-200">
                                <DollarSign className="w-3 h-3 dark:text-green-400" />
                                {property.value}
                              </div>
                              <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 dark:drop-shadow-[0_0_3px_rgba(52,211,153,0.5)]">
                                <TrendingUp className="w-3 h-3" />
                                {property.change}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                  );
                })}

                {/* Enhanced Orbit Rings for dark mode */}
                {[1, 2, 3].map((ring) => (
                  <motion.div
                    key={ring}
                    animate={{ rotate: rotation * (ring * 0.3) }}
                    transition={{ duration: 0.1, ease: "linear" }}
                    className="absolute inset-0 rounded-full border border-blue-300/10 dark:border-cyan-400/20 dark:shadow-[0_0_10px_rgba(34,211,238,0.1)]"
                    style={{
                      transform: `scale(${1 + ring * 0.15})`,
                      transformOrigin: 'center'
                    }}
                  />
                ))}
              </div>
            </motion.div>

            {/* Enhanced Bottom Statistics for dark mode */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.2 }}
              className="mt-20 pt-12"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                {[
                  { number: "$4.2B+", label: "Global Assets", icon: Globe },
                  { number: "50K+", label: "Happy Investors", icon: Star },
                  { number: "1,200+", label: "Properties", icon: MapPin },
                  { number: "22.4%", label: "Avg. Returns", icon: TrendingUp }
                ].map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 1.4 + index * 0.1 }}
                    whileHover={{ scale: 1.05, y: -5 }}
                    className="space-y-4 group cursor-pointer"
                  >
                    <motion.div 
                      whileHover={{ rotate: 360, scale: 1.1 }}
                      transition={{ duration: 0.6 }}
                      className="inline-flex p-4 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-2xl border border-emerald-200/50 dark:border-emerald-400/20 group-hover:shadow-lg dark:group-hover:shadow-[0_4px_20px_rgba(16,185,129,0.2)] transition-shadow duration-300"
                    >
                      <stat.icon className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />
                    </motion.div>
                    <div className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-transparent dark:bg-gradient-to-r dark:from-emerald-400 dark:to-green-400 dark:bg-clip-text">
                      {stat.number}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-gray-400 font-medium">
                      {stat.label}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Enhanced Selected Property Modal for dark mode */}
      <AnimatePresence>
        {selectedProperty && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 dark:bg-slate-800 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setSelectedProperty(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-emerald-200/50 dark:border-emerald-400/30 dark:shadow-[0_10px_40px_rgba(16,185,129,0.2)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-6">
                <div className="relative w-full h-48 rounded-2xl overflow-hidden">
                  <img 
                    src={selectedProperty.image}
                    alt={selectedProperty.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-gray-100">
                    {selectedProperty.name}
                  </h3>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-gray-400">
                    <MapPin className="w-4 h-4 dark:text-cyan-400" />
                    {selectedProperty.location}
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-lg font-semibold text-slate-700 dark:text-gray-200">
                      <DollarSign className="w-5 h-5 dark:text-green-400" />
                      {selectedProperty.value}
                    </div>
                    <div className="flex items-center gap-2 text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                      <TrendingUp className="w-5 h-5" />
                      {selectedProperty.change}
                    </div>
                  </div>
                </div>
                
                <Button 
                  variant="primary"
                  size="lg" 
                  className="w-full font-semibold rounded-2xl"
                >
                  Invest Now
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Scroll Indicator for dark mode */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 2 }}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20"
      >
        <motion.div
          animate={{ y: [0, 12, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-3"
        >
          <span className="text-xs text-slate-500 dark:text-gray-500 font-medium">Discover More</span>
          <div className="w-6 h-10 border-2 border-slate-300 dark:border-emerald-500/40 rounded-full flex justify-center relative overflow-hidden dark:shadow-[0_2px_10px_rgba(16,185,129,0.2)]">
            <motion.div
              animate={{ y: [0, 16, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-1.5 h-4 bg-gradient-to-b from-emerald-500 to-green-500 dark:from-emerald-400 dark:to-green-400 rounded-full mt-2"
            />
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};