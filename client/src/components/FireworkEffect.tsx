import { motion } from "framer-motion";

interface FireworkEffectProps {
  isVisible: boolean;
}

export default function FireworkEffect({ isVisible }: FireworkEffectProps) {
  if (!isVisible) return null;

  const colors = [
    'from-amber-500 via-yellow-500 to-orange-500',
    'from-rose-500 via-pink-500 to-purple-500',
    'from-blue-500 via-cyan-500 to-teal-500',
    'from-emerald-500 via-green-500 to-lime-500',
    'from-violet-500 via-purple-500 to-fuchsia-500',
    'from-red-500 via-orange-500 to-yellow-500'
  ];

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* 主要煙火效果 */}
      {[...Array(24)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute left-1/2 top-1/2"
          initial={{ scale: 0, opacity: 1 }}
          animate={{
            scale: [0, 3],
            opacity: [1, 0],
            x: [0, Math.cos(i * 15 * Math.PI / 180) * 160],
            y: [0, Math.sin(i * 15 * Math.PI / 180) * 160],
          }}
          transition={{
            duration: 1.5,
            ease: "easeOut",
            times: [0, 1],
            repeat: Infinity,
            repeatDelay: Math.random() * 0.5,
          }}
        >
          <div 
            className={`h-4 w-4 rounded-full bg-gradient-to-r ${colors[i % colors.length]}`}
            style={{
              boxShadow: '0 0 20px 8px rgba(255, 255, 255, 0.6)',
              transform: `rotate(${i * 15}deg)`
            }}
          />
        </motion.div>
      ))}

      {/* 背景光暈效果 */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-purple-500/20"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ 
          opacity: [0, 0.4, 0],
          scale: [0.8, 1.3, 1.5]
        }}
        transition={{ 
          duration: 1.5,
          times: [0, 0.5, 1],
          repeat: Infinity,
          repeatDelay: 0.2
        }}
      />

      {/* 放射狀光芒效果 */}
      <motion.div
        className="absolute inset-0 bg-gradient-radial from-white/40 via-transparent to-transparent"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ 
          opacity: [0, 0.6, 0],
          scale: [0.5, 1.4, 1.8]
        }}
        transition={{ 
          duration: 2,
          times: [0, 0.4, 1],
          repeat: Infinity,
          repeatDelay: 0.1
        }}
      />

      {/* 螺旋動畫效果 */}
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute top-1/2 left-1/2"
            style={{
              transform: `rotate(${i * 45}deg) translateY(-100px)`
            }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.3, 0.7, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          >
            <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${colors[i % colors.length]}`} />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}